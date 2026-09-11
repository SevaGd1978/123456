import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const emptyState = () => ({
  version: 1,
  updatedAt: null,
  lastCheck: null,
  nextCheckAt: null,
  history: [],
  vehicles: {},
});

export async function loadState(file) {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return {
      ...emptyState(),
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      vehicles: parsed.vehicles && typeof parsed.vehicles === "object" ? parsed.vehicles : {},
    };
  } catch (error) {
    if (error.code === "ENOENT") return emptyState();
    throw error;
  }
}

export async function saveState(file, state) {
  await mkdir(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  const payload = { ...state, updatedAt: new Date().toISOString() };
  await writeFile(temp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rename(temp, file);
  return payload;
}

export function snapshotVehicle(vehicle, { fines = [], error = null, checkedAt }) {
  return {
    id: vehicle.id,
    plate: vehicle.plate,
    displayPlate: vehicle.displayPlate,
    sts: vehicle.sts,
    title: vehicle.title,
    driver: vehicle.driver,
    enabled: vehicle.enabled,
    checkedAt,
    error,
    fines,
  };
}

export function pushHistory(state, entry, limit) {
  const history = [entry, ...(state.history || [])].slice(0, limit);
  return { ...state, lastCheck: entry, history };
}

export async function forgetVehicle(file, id) {
  const state = await loadState(file);
  if (!state.vehicles[id]) return state;
  const vehicles = { ...state.vehicles };
  delete vehicles[id];
  return saveState(file, { ...state, vehicles });
}

export async function syncVehicleRecord(file, { fromId, vehicle }) {
  const state = await loadState(file);
  const toId = vehicle.id;
  const current = state.vehicles[fromId] || state.vehicles[toId];
  if (!current) return state;

  const vehicles = { ...state.vehicles };
  if (fromId && fromId !== toId) delete vehicles[fromId];
  vehicles[toId] = {
    ...current,
    id: vehicle.id,
    plate: vehicle.plate,
    displayPlate: vehicle.displayPlate,
    sts: vehicle.sts,
    title: vehicle.title,
    driver: vehicle.driver,
    enabled: vehicle.enabled,
  };
  return saveState(file, { ...state, vehicles });
}
