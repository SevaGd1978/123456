import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseVehicles, validateVehicle } from "./vehicles.js";

export const MAX_FLEET_SIZE = 40;

export class FleetError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = "FleetError";
  }
}

export function toStoredVehicle(vehicle) {
  return {
    id: vehicle.id,
    plate: vehicle.displayPlate,
    sts: vehicle.sts,
    title: vehicle.title,
    driver: vehicle.driver,
    enabled: vehicle.enabled,
  };
}

export async function saveVehicles(file, list) {
  const { vehicles, warnings } = parseVehicles(list);
  await mkdir(dirname(file), { recursive: true });
  const payload = vehicles.map(toStoredVehicle);
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { vehicles, warnings };
}

function parseOne(raw) {
  const result = validateVehicle(raw, 0);
  if (result.errors.length) {
    throw new FleetError(result.errors.map((line) => line.replace(/^запись №\d+:\s*/i, "")).join(". "));
  }
  return result.vehicle;
}

export function mergeVehiclePatch(existing, patch = {}) {
  const explicitId = patch.id != null && String(patch.id).trim() ? String(patch.id).trim() : "";
  return {
    id: explicitId || existing?.id,
    plate: patch.plate != null ? patch.plate : existing?.displayPlate || existing?.plate,
    sts: patch.sts != null ? patch.sts : existing?.sts,
    title: patch.title != null ? patch.title : existing?.title || "",
    driver: patch.driver != null ? patch.driver : existing?.driver || "",
    enabled: patch.enabled != null ? patch.enabled : existing?.enabled !== false,
  };
}

function assertUnique(vehicles, candidate, exceptId) {
  const idClash = vehicles.find((item) => item.id !== exceptId && item.id === candidate.id);
  if (idClash) {
    throw new FleetError(`Автомобиль с идентификатором «${candidate.id}» уже есть в парке`, 409);
  }
  const plateClash = vehicles.find((item) => item.id !== exceptId && item.plate === candidate.plate);
  if (plateClash) {
    throw new FleetError(`Госномер ${candidate.displayPlate} уже есть в парке`, 409);
  }
}

export async function addVehicle(file, current, payload) {
  if (current.length >= MAX_FLEET_SIZE) {
    throw new FleetError(`В автопарке уже ${current.length} машин. Максимум ${MAX_FLEET_SIZE}.`);
  }
  const vehicle = parseOne(mergeVehiclePatch(null, payload));
  assertUnique(current, vehicle, null);
  const saved = await saveVehicles(file, [...current, vehicle].map(toStoredVehicle));
  return { vehicle, ...saved };
}

export async function updateVehicle(file, current, id, payload) {
  const index = current.findIndex((item) => item.id === id);
  if (index === -1) throw new FleetError("Автомобиль не найден", 404);
  const vehicle = parseOne(mergeVehiclePatch(current[index], payload));
  assertUnique(current, vehicle, id);
  const next = current.slice();
  next[index] = vehicle;
  const saved = await saveVehicles(file, next.map(toStoredVehicle));
  return { vehicle, previousId: id, ...saved };
}

export async function deleteVehicle(file, current, id) {
  const index = current.findIndex((item) => item.id === id);
  if (index === -1) throw new FleetError("Автомобиль не найден", 404);
  const removed = current[index];
  const saved = await saveVehicles(file, current.filter((item) => item.id !== id).map(toStoredVehicle));
  return { vehicle: removed, ...saved };
}
