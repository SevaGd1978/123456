import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseVehicles } from "./vehicles.js";

export async function saveVehicles(file, list) {
  const { vehicles, warnings } = parseVehicles(list);
  await mkdir(dirname(file), { recursive: true });
  const payload = vehicles.map((vehicle) => ({
    id: vehicle.id,
    plate: vehicle.displayPlate,
    sts: vehicle.sts,
    title: vehicle.title,
    driver: vehicle.driver,
    enabled: vehicle.enabled,
  }));
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { vehicles, warnings };
}
