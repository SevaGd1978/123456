import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeDiscount, diffFines, normalizeFine, parseAmount, parseDate } from "../src/fines.js";

describe("fines", () => {
  it("parses dates and money from mixed formats", () => {
    assert.equal(parseDate("12.03.2026"), "2026-03-12");
    assert.equal(parseAmount("1 500,50 ₽"), 1500.5);
  });

  it("computes the 25% / 30-day discount window", () => {
    const fine = normalizeFine(
      {
        uin: "1881012026030100000012345",
        amount: 1000,
        decisionDate: "01.03.2026",
        article: "12.9 ч.2",
      },
      { discount: { percent: 25, days: 30 }, today: "2026-03-10" },
    );

    assert.equal(fine.discountAvailable, true);
    assert.equal(fine.discountAmount, 750);
    assert.equal(fine.discountUntil, "2026-03-31");
    assert.equal(fine.discountDaysLeft, 21);
  });

  it("detects new, paid and disappeared fines", () => {
    const previous = [
      { key: "a", paid: false, amount: 500 },
      { key: "b", paid: false, amount: 700 },
    ];
    const current = [
      { key: "a", paid: true, amount: 500 },
      { key: "c", paid: false, amount: 1000 },
    ];
    const diff = diffFines(previous, current);
    assert.deepEqual(diff.appeared.map((item) => item.key), ["c"]);
    assert.deepEqual(diff.paid.map((item) => item.key), ["a"]);
    assert.deepEqual(diff.settled.map((item) => item.key), ["b"]);
  });
});
