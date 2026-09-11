import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPlate, normalizePlate, parseVehicles } from "../src/vehicles.js";

describe("vehicles", () => {
  it("normalizes Cyrillic plates", () => {
    assert.equal(normalizePlate("а 101 кн-77"), "A101KH77");
    assert.equal(formatPlate("А101КН77"), "А 101 КН 77");
  });

  it("accepts a 30-car fleet and rejects a broken STS", () => {
    const list = Array.from({ length: 30 }, (_, index) => ({
      plate: `А${String(100 + index).padStart(3, "0")}АА77`,
      sts: `77АА${String(100000 + index).padStart(6, "0")}`,
      title: `Авто ${index + 1}`,
    }));

    const { vehicles, warnings } = parseVehicles(list);
    assert.equal(vehicles.length, 30);
    assert.equal(warnings.length, 0);

    assert.throws(
      () => parseVehicles([{ plate: "А100АА77", sts: "1" }]),
      /СТС/,
    );
  });
});
