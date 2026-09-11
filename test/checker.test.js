import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { checkFleet } from "../src/checker.js";
import { loadConfig } from "../src/config.js";
import { createDemoProvider } from "../src/providers/demo.js";
import { loadVehicles } from "../src/vehicles.js";

describe("fleet check", () => {
  let dir;
  let vehicles;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "fleet-fines-"));
    ({ vehicles } = await loadVehicles(new URL("../config/vehicles.example.json", import.meta.url).pathname));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("checks all 30 cars through the demo provider", async () => {
    assert.equal(vehicles.length, 30);
    const config = {
      ...loadConfig({
        DATA_FILE: join(dir, "state.json"),
        CHECK_CONCURRENCY: "5",
        REQUEST_DELAY_MS: "0",
        RETRY_ATTEMPTS: "1",
        TIMEZONE: "UTC",
      }),
    };
    const first = await checkFleet({
      vehicles,
      provider: createDemoProvider({ today: "2026-09-10" }),
      config,
      clock: { now: () => new Date("2026-09-10T17:00:00Z"), delay: (fn) => fn() },
    });

    assert.equal(first.entry.vehiclesChecked, 30);
    assert.equal(first.entry.okCount, 30);
    assert.equal(Object.keys(first.state.vehicles).length, 30);
    assert.ok(first.summary.unpaidCount >= 0);

    const second = await checkFleet({
      vehicles,
      provider: createDemoProvider({ today: "2026-09-10" }),
      config,
      clock: { now: () => new Date("2026-09-10T17:05:00Z"), delay: (fn) => fn() },
    });
    assert.equal(second.appeared.length, 0);

    const one = await checkFleet({
      vehicles,
      provider: createDemoProvider({ today: "2026-09-10" }),
      config,
      ids: [vehicles[0].id],
      clock: { now: () => new Date("2026-09-10T17:10:00Z"), delay: (fn) => fn() },
    });
    assert.equal(one.entry.vehiclesChecked, 1);
  });
});
