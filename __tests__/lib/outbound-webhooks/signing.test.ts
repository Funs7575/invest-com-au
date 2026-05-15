import { describe, it, expect } from "vitest";
import {
  generateSigningSecret,
  signPayload,
} from "@/lib/outbound-webhooks";
import { createHmac } from "node:crypto";

describe("generateSigningSecret", () => {
  it("returns a whsec_ prefixed hex string of >= 50 chars", () => {
    const secret = generateSigningSecret();
    expect(secret.startsWith("whsec_")).toBe(true);
    expect(secret.length).toBeGreaterThanOrEqual(50);
  });

  it("generates unique secrets across calls", () => {
    const a = generateSigningSecret();
    const b = generateSigningSecret();
    expect(a).not.toBe(b);
  });
});

describe("signPayload", () => {
  it("uses HMAC-SHA256 over `<ts>.<payload>` with the secret", () => {
    const ts = 1700000000;
    const payload = JSON.stringify({ event: "brief.accepted", brief_id: 42 });
    const secret = "whsec_test_secret";

    const expected = createHmac("sha256", secret)
      .update(`${ts}.${payload}`)
      .digest("hex");

    const header = signPayload(ts, payload, secret);
    expect(header).toBe(`t=${ts},v1=${expected}`);
  });

  it("changes when payload changes (tamper detection)", () => {
    const ts = 1700000000;
    const secret = "whsec_test_secret";
    const a = signPayload(ts, JSON.stringify({ x: 1 }), secret);
    const b = signPayload(ts, JSON.stringify({ x: 2 }), secret);
    expect(a).not.toBe(b);
  });

  it("changes when timestamp changes (replay protection)", () => {
    const payload = JSON.stringify({ x: 1 });
    const secret = "whsec_test_secret";
    const a = signPayload(1700000000, payload, secret);
    const b = signPayload(1700000001, payload, secret);
    expect(a).not.toBe(b);
  });

  it("changes when secret changes (no cross-tenant leakage)", () => {
    const ts = 1700000000;
    const payload = JSON.stringify({ x: 1 });
    const a = signPayload(ts, payload, "whsec_one");
    const b = signPayload(ts, payload, "whsec_two");
    expect(a).not.toBe(b);
  });
});
