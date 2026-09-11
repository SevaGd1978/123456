import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  addVehicle,
  deleteVehicle,
  mergeVehiclePatch,
  saveVehicles,
  updateVehicle,
} from "../src/vehicles-file.js";

const sample = {
  id: "car-01",
  plate: "А101КН77",
  sts: "77АМ100001",
  title: "Toyota Camry",
  driver: "Иванов",
  enabled: true,
};

describe("fleet editing", () => {
  const dirs = [];
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function fleetFile() {
    const dir = await mkdtemp(join(tmpdir(), "fleet-edit-"));
    dirs.push(dir);
    const file = join(dir, "vehicles.json");
    const saved = await saveVehicles(file, [sample]);
    return { file, vehicles: saved.vehicles };
  }

  it("keeps a stable id when the plate changes", () => {
    const merged = mergeVehiclePatch(sample, { plate: "А199КН77" });
    assert.equal(merged.id, "car-01");
    assert.equal(merged.plate, "А199КН77");
  });

  it("adds, updates and deletes a vehicle on disk", async () => {
    const { file, vehicles } = await fleetFile();

    const created = await addVehicle(file, vehicles, {
      plate: "А199КН77",
      sts: "77АМ199001",
      title: "ГАЗель",
      driver: "Смена Б",
    });
    assert.equal(created.vehicles.length, 2);
    assert.equal(created.vehicle.id, "A199KH77");
    assert.equal(created.vehicle.title, "ГАЗель");

    const updated = await updateVehicle(file, created.vehicles, "car-01", {
      plate: "К777ОК77",
      title: "Camry смена А",
    });
    assert.equal(updated.vehicle.id, "car-01");
    assert.equal(updated.vehicle.plate, "K777OK77");
    assert.equal(updated.previousId, "car-01");

    const removed = await deleteVehicle(file, updated.vehicles, "car-01");
    assert.equal(removed.vehicles.length, 1);
    assert.equal(removed.vehicles[0].id, "A199KH77");
  });

  it("rejects a duplicate plate", async () => {
    const { file, vehicles } = await fleetFile();
    await assert.rejects(
      () => addVehicle(file, vehicles, { plate: "А101КН77", sts: "77АМ100099" }),
      /уже есть/,
    );
  });
});
