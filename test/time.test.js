import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextCheckAt, zonedParts } from "../src/time.js";
import { parseCheckTime } from "../src/config.js";

describe("schedule", () => {
  it("parses evening check time", () => {
    assert.deepEqual(parseCheckTime("20:00"), { hour: 20, minute: 0 });
    assert.throws(() => parseCheckTime("26:00"), /Некорректное время/);
  });

  it("plans the next 20:00 Europe/Moscow run", () => {
    const now = new Date("2026-09-10T10:00:00Z");
    const next = nextCheckAt(now, { hour: 20, minute: 0 }, "Europe/Moscow");
    const parts = zonedParts(next, "Europe/Moscow");
    assert.equal(parts.hour, 20);
    assert.equal(parts.minute, 0);
    assert.ok(next.getTime() > now.getTime());
  });
});
