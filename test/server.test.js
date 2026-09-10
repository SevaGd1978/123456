import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createApp, normalizePlate } from "../server.js";

describe("normalizePlate", () => {
  it("normalizes Cyrillic letters and separators", () => {
    assert.equal(normalizePlate("а 001 аа-77"), "A001AA77");
  });
});

describe("HTTP server", () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createApp();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  it("serves the application", async () => {
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /АвтоСлед/);
  });

  it("finds a public record with Cyrillic input", async () => {
    const response = await fetch(
      `${baseUrl}/api/search?plate=${encodeURIComponent("А001АА77")}`,
    );
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.results.length, 1);
    assert.equal(data.results[0].plate, "А001АА77");
  });

  it("rejects an invalid plate", async () => {
    const response = await fetch(`${baseUrl}/api/search?plate=123`);
    assert.equal(response.status, 400);
  });

  it("prevents path traversal", async () => {
    const response = await fetch(`${baseUrl}/..%2Fserver.js`);
    assert.equal(response.status, 403);
  });
});
