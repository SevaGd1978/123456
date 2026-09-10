import { describeProvider } from "./providers/index.js";

export function maskSts(sts = "") {
  const value = String(sts);
  if (value.length <= 4) return "••••";
  return `${"•".repeat(value.length - 4)}${value.slice(-4)}`;
}

export function vehicleRow(vehicle, snapshot, summary) {
  const unpaid = (snapshot?.fines || []).filter((fine) => !fine.paid);
  const nextDiscount = unpaid
    .filter((fine) => fine.discountAvailable)
    .sort((a, b) => (a.discountDaysLeft ?? 99) - (b.discountDaysLeft ?? 99))[0];

  return {
    id: vehicle.id,
    plate: vehicle.plate,
    displayPlate: vehicle.displayPlate,
    stsMasked: maskSts(vehicle.sts),
    title: vehicle.title,
    driver: vehicle.driver,
    enabled: vehicle.enabled,
    checkedAt: snapshot?.checkedAt || null,
    error: snapshot?.error || null,
    summary,
    nextDiscount: nextDiscount
      ? {
          daysLeft: nextDiscount.discountDaysLeft,
          until: nextDiscount.discountUntil,
          amount: nextDiscount.discountAmount,
        }
      : null,
  };
}

export function buildDashboard({ vehicles, state, config, nextCheck, checking }) {
  const rows = vehicles.map((vehicle) => {
    const snapshot = state.vehicles[vehicle.id];
    const fines = snapshot?.fines || [];
    const unpaid = fines.filter((fine) => !fine.paid);
    const summary = {
      total: fines.length,
      unpaidCount: unpaid.length,
      unpaidAmount: Math.round(unpaid.reduce((sum, fine) => sum + fine.amount, 0) * 100) / 100,
      discountCount: unpaid.filter((fine) => fine.discountAvailable).length,
    };
    return vehicleRow(vehicle, snapshot, summary);
  });

  const fleet = rows.reduce(
    (acc, row) => ({
      vehicles: acc.vehicles + 1,
      enabled: acc.enabled + (row.enabled ? 1 : 0),
      unpaidCount: acc.unpaidCount + row.summary.unpaidCount,
      unpaidAmount: Math.round((acc.unpaidAmount + row.summary.unpaidAmount) * 100) / 100,
      errors: acc.errors + (row.error ? 1 : 0),
      withFines: acc.withFines + (row.summary.unpaidCount > 0 ? 1 : 0),
    }),
    { vehicles: 0, enabled: 0, unpaidCount: 0, unpaidAmount: 0, errors: 0, withFines: 0 },
  );

  return {
    checking: Boolean(checking),
    provider: config.provider,
    timezone: config.timezone,
    checkTime: `${String(config.checkTime.hour).padStart(2, "0")}:${String(config.checkTime.minute).padStart(2, "0")}`,
    discount: config.discount,
    nextCheckAt: nextCheck ? nextCheck.toISOString() : null,
    lastCheck: state.lastCheck,
    providerInfo: describeProvider(config),
    fleet,
    vehicles: rows,
    history: (state.history || []).slice(0, 14),
  };
}
