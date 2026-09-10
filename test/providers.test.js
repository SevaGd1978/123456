import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeFine } from "../src/fines.js";
import { createAssistProvider } from "../src/providers/assist.js";
import { createCloudProvider } from "../src/providers/cloud.js";
import { toGibddPlate, toGibddSts } from "../src/vehicles.js";

const vehicle = {
  plate: "A101KH77",
  displayPlate: "А 101 КН 77",
  sts: "77АМ100001",
};

describe("free fines APIs", () => {
  it("converts plate and STS for GIBDD APIs", () => {
    assert.equal(toGibddPlate("A101KH77"), "А101КН77");
    assert.equal(toGibddSts("50 58 794047"), "5058794047");
    assert.equal(toGibddSts("77АМ100001"), "77АМ100001");
  });

  it("maps API Assist JSON into a fine", () => {
    const fine = normalizeFine(
      {
        enable_discount: true,
        date_discount: "2026-04-29 00:00:00",
        num_post: "18810550260330143671",
        sum: 750,
        division_name: "УГИБДД",
        date_post: "2026-03-30",
        paid: false,
      },
      { discount: { percent: 25, days: 30 }, today: "2026-04-01" },
    );
    assert.equal(fine.uin, "18810550260330143671");
    assert.equal(fine.amount, 750);
    assert.equal(fine.decisionDate, "2026-03-30");
    assert.equal(fine.discountAvailable, true);
  });

  it("requests Assist by STS and returns unpaid fines", async () => {
    const calls = [];
    const provider = createAssistProvider({
      key: "test-key",
      timeoutMs: 5000,
      fetchImpl: async (url) => {
        calls.push(url);
        return new Response(
          JSON.stringify({
            success: 1,
            fines: [{ num_post: "18810572260413020388", sum: 500, date_post: "2026-04-13", paid: false }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    const fines = await provider.checkVehicle(vehicle);
    assert.equal(fines.length, 1);
    assert.match(calls[0], /sts=77/);
    assert.match(calls[0], /key=test-key/);
  });

  it("surfaces an invalid Assist key", async () => {
    const provider = createAssistProvider({
      key: "bad",
      timeoutMs: 5000,
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: "Invalid access key", error_code: 40301 }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
    });
    await assert.rejects(() => provider.checkVehicle(vehicle), /Invalid access key/);
  });

  it("maps API-CLOUD rez[] payload", async () => {
    const provider = createCloudProvider({
      token: "cloud-token",
      timeoutMs: 5000,
      fetchImpl: async (url) => {
        assert.match(url, /type=fines/);
        assert.match(url, /token=cloud-token/);
        return new Response(
          JSON.stringify({
            status: 200,
            num: 1,
            rez: [{ NumPost: "18810123201130511194", Summa: 500, DatePost: "2026-01-30", KoAPcode: "12.9ч.2" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });
    const fines = await provider.checkVehicle(vehicle);
    assert.equal(fines[0].Summa, 500);
  });
});
