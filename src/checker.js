import { diffFines, normalizeFines, summarize } from "./fines.js";
import { loadState, pushHistory, saveState, snapshotVehicle } from "./store.js";
import { mapPool, sleep, todayInTimeZone, withRetry } from "./time.js";

function mergeSummary(items) {
  return items.reduce(
    (acc, item) => ({
      total: acc.total + item.total,
      unpaidCount: acc.unpaidCount + item.unpaidCount,
      unpaidAmount: Math.round((acc.unpaidAmount + item.unpaidAmount) * 100) / 100,
      discountCount: acc.discountCount + item.discountCount,
      discountAmount: Math.round((acc.discountAmount + item.discountAmount) * 100) / 100,
      expiringSoon: acc.expiringSoon + item.expiringSoon,
    }),
    { total: 0, unpaidCount: 0, unpaidAmount: 0, discountCount: 0, discountAmount: 0, expiringSoon: 0 },
  );
}

export async function checkFleet({
  vehicles,
  provider,
  config,
  ids,
  clock = { now: () => new Date(), delay: (fn, wait) => setTimeout(fn, wait) },
} = {}) {
  const startedAt = clock.now();
  const today = todayInTimeZone(config.timezone, startedAt);
  const scoped = Array.isArray(ids) && ids.length;
  const selected = scoped
    ? vehicles.filter((vehicle) => ids.includes(vehicle.id))
    : vehicles.filter((vehicle) => vehicle.enabled);
  const enabled = selected;
  const previous = await loadState(config.dataFile);
  const nextVehicles = { ...previous.vehicles };
  const appeared = [];
  const paid = [];
  const settled = [];
  const errors = [];
  let delayGate = Promise.resolve();

  let launched = 0;
  const results = await mapPool(enabled, config.concurrency, async (vehicle) => {
    const turn = delayGate.then(async () => {
      if (launched > 0) await sleep(config.requestDelayMs, clock);
      launched += 1;
    });
    delayGate = turn;
    await turn;

    try {
      const raw = await withRetry(() => provider.checkVehicle(vehicle), {
        attempts: config.retryAttempts,
        delayMs: Math.max(config.requestDelayMs, 500),
        clock,
      });
      const fines = normalizeFines(raw, { discount: config.discount, today });
      const previousFines = previous.vehicles[vehicle.id]?.fines || [];
      const changes = diffFines(previousFines, fines);

      for (const fine of changes.appeared) appeared.push({ vehicle, fine });
      for (const fine of changes.paid) paid.push({ vehicle, fine });
      for (const fine of changes.settled) settled.push({ vehicle, fine });

      const snapshot = snapshotVehicle(vehicle, {
        fines,
        error: null,
        checkedAt: clock.now().toISOString(),
      });
      nextVehicles[vehicle.id] = snapshot;
      return { ok: true, vehicle, summary: summarize(fines) };
    } catch (error) {
      errors.push({ vehicle, message: error.message });
      const previousSnapshot = previous.vehicles[vehicle.id];
      nextVehicles[vehicle.id] = snapshotVehicle(vehicle, {
        fines: previousSnapshot?.fines || [],
        error: error.message,
        checkedAt: clock.now().toISOString(),
      });
      return { ok: false, vehicle, summary: summarize(previousSnapshot?.fines || []) };
    }
  });

  const fleetSummary = mergeSummary(results.map((item) => item.summary));
  const entry = {
    startedAt: startedAt.toISOString(),
    finishedAt: clock.now().toISOString(),
    provider: provider.name,
    vehiclesChecked: enabled.length,
    okCount: results.filter((item) => item.ok).length,
    errorCount: errors.length,
    appearedCount: appeared.length,
    paidCount: paid.length,
    settledCount: settled.length,
    summary: fleetSummary,
    errors: errors.map((item) => ({
      plate: item.vehicle.displayPlate,
      message: item.message,
    })),
  };

  const state = await saveState(
    config.dataFile,
    pushHistory({ ...previous, vehicles: nextVehicles }, entry, config.historyLimit),
  );

  return { state, appeared, paid, settled, errors, summary: fleetSummary, entry };
}
