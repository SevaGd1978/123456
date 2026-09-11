import assert from "node:assert/strict";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { loadVehicles } from "../src/vehicles.js";

const exampleFile = new URL("../config/vehicles.example.json", import.meta.url).pathname;

describe("http api", () => {
  let dir;
  let server;
  let baseUrl;
  let vehiclesFile;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "fleet-api-"));
    vehiclesFile = join(dir, "vehicles.json");
    await copyFile(exampleFile, vehiclesFile);
    const config = loadConfig({
      DATA_FILE: join(dir, "state.json"),
      VEHICLES_FILE: vehiclesFile,
      FINES_PROVIDER: "demo",
      REQUEST_DELAY_MS: "0",
      CHECK_CONCURRENCY: "10",
      RETRY_ATTEMPTS: "1",
      TIMEZONE: "Europe/Moscow",
    });

    const app = createApp({
      config,
      loadFleet: () => loadVehicles(vehiclesFile),
      getNextCheck: () => new Date("2026-09-10T17:00:00Z"),
    });
    server = app.server;
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });

  it("serves the dispatch board with fleet editor controls", async () => {
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Смена 20:00/);
    assert.match(html, /Редактировать автопарк/);
    assert.match(html, /Добавить машину/);
    const help = await fetch(baseUrl);
    assert.match(await help.text(), /CLOUD_API_TOKEN/);
  });

  it("returns a 30-car dashboard after a check", async () => {
    const check = await fetch(`${baseUrl}/api/check`, { method: "POST" });
    assert.equal(check.status, 200);
    const payload = await check.json();
    assert.equal(payload.ok, true);

    const dashboard = await fetch(`${baseUrl}/api/dashboard`).then((response) => response.json());
    assert.equal(dashboard.fleet.vehicles, 30);
    assert.equal(dashboard.vehicles.length, 30);
    assert.equal(dashboard.checking, false);
  });

  it("adds, edits and deletes a vehicle while keeping fine history on plate change", async () => {
    const created = await fetch(`${baseUrl}/api/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plate: "А199КН77",
        sts: "77АМ199001",
        title: "ГАЗель Next",
        driver: "Смена Б",
      }),
    });
    assert.equal(created.status, 201);
    const added = await created.json();
    assert.equal(added.vehicle.plate, "A199KH77");
    assert.equal(added.vehicles.length, 31);

    const checked = await fetch(`${baseUrl}/api/check`, { method: "POST" });
    assert.equal(checked.status, 200);

    const patched = await fetch(`${baseUrl}/api/vehicles/${encodeURIComponent(added.vehicle.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plate: "К700ОК77", title: "ГАЗель смена А" }),
    });
    assert.equal(patched.status, 200);
    const updated = await patched.json();
    assert.equal(updated.vehicle.id, added.vehicle.id);
    assert.equal(updated.vehicle.plate, "K700OK77");
    assert.equal(updated.vehicle.title, "ГАЗель смена А");

    const detail = await fetch(`${baseUrl}/api/vehicles/${encodeURIComponent(added.vehicle.id)}`).then((response) =>
      response.json(),
    );
    assert.equal(detail.displayPlate.includes("700"), true);
    assert.ok(detail.snapshot);
    assert.equal(detail.snapshot.id, added.vehicle.id);

    const removed = await fetch(`${baseUrl}/api/vehicles/${encodeURIComponent(added.vehicle.id)}`, {
      method: "DELETE",
    });
    assert.equal(removed.status, 200);
    const afterDelete = await removed.json();
    assert.equal(afterDelete.vehicles.length, 30);

    const missing = await fetch(`${baseUrl}/api/vehicles/${encodeURIComponent(added.vehicle.id)}`);
    assert.equal(missing.status, 404);
  });
});
