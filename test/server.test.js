import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { loadVehicles } from "../src/vehicles.js";

describe("http api", () => {
  let dir;
  let server;
  let baseUrl;
  let vehiclesFile;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "fleet-api-"));
    vehiclesFile = new URL("../config/vehicles.example.json", import.meta.url).pathname;
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

  it("serves the dispatch board", async () => {
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Смена 20:00/);
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
});
