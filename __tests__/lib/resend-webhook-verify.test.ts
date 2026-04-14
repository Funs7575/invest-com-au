import { describe, it, expect, vi } from "vitest";
import crypto from "node:crypto";
import {
  verifyResendSignature,
  extractSvixHeaders,
} from "@/lib/resend-webhook-verify";

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

function makeSignedRequest(secret: string, body: string) {
  const id = "msg_01abcDEF";
  const ts = Math.floor(Date.now() / 1000).toString();
  const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const keyBytes = Buffer.from(keyB64, "base64");
  const signed = `${id}.${ts}.${body}`;
  const sig = crypto.createHmac("sha256", keyBytes).update(signed).digest("base64");
  return {
    svixId: id,
    svixTimestamp: ts,
    svixSignature: `v1,${sig}`,
  };
}

const SECRET = "whsec_" + Buffer.from("test-secret-key-material").toString("base64");

describe("verifyResendSignature", () => {
  it("accepts a freshly signed payload", () => {
    const body = JSON.stringify({ type: "email.bounced", data: { email_id: "id" } });
    const headers = makeSignedRequest(SECRET, body);
    expect(verifyResendSignature(SECRET, body, headers)).toBe(true);
  });

  it("rejects when the body has been tampered with", () => {
    const body = JSON.stringify({ type: "email.bounced", data: { email_id: "id" } });
    const headers = makeSignedRequest(SECRET, body);
    const tampered = JSON.stringify({ type: "email.bounced", data: { email_id: "attacker" } });
    expect(verifyResendSignature(SECRET, tampered, headers)).toBe(false);
  });

  it("rejects when the wrong secret is used", () => {
    const body = "hello";
    const headers = makeSignedRequest(SECRET, body);
    const otherSecret = "whsec_" + Buffer.from("wrong-secret").toString("base64");
    expect(verifyResendSignature(otherSecret, body, headers)).toBe(false);
  });

  it("rejects when headers are missing", () => {
    expect(
      verifyResendSignature(SECRET, "body", { svixId: null, svixTimestamp: null, svixSignature: null }),
    ).toBe(false);
  });

  it("rejects a timestamp outside the 5 minute window", () => {
    const body = "hello";
    const id = "msg_old";
    const ts = (Math.floor(Date.now() / 1000) - 10 * 60).toString(); // 10 min ago
    const keyBytes = Buffer.from(SECRET.slice(6), "base64");
    const signed = `${id}.${ts}.${body}`;
    const sig = crypto.createHmac("sha256", keyBytes).update(signed).digest("base64");
    expect(
      verifyResendSignature(SECRET, body, {
        svixId: id,
        svixTimestamp: ts,
        svixSignature: `v1,${sig}`,
      }),
    ).toBe(false);
  });

  it("rejects a non-numeric timestamp", () => {
    const body = "hello";
    const headers = makeSignedRequest(SECRET, body);
    expect(
      verifyResendSignature(SECRET, body, { ...headers, svixTimestamp: "not-a-number" }),
    ).toBe(false);
  });

  it("accepts the first matching version when multiple are present", () => {
    const body = "payload";
    const { svixId, svixTimestamp, svixSignature } = makeSignedRequest(SECRET, body);
    const multi = `v1,junk ${svixSignature}`;
    expect(
      verifyResendSignature(SECRET, body, {
        svixId,
        svixTimestamp,
        svixSignature: multi,
      }),
    ).toBe(true);
  });
});

describe("extractSvixHeaders", () => {
  it("pulls each svix header", () => {
    const headers = new Headers({
      "svix-id": "id",
      "svix-timestamp": "123",
      "svix-signature": "v1,abc",
    });
    expect(extractSvixHeaders(headers)).toEqual({
      svixId: "id",
      svixTimestamp: "123",
      svixSignature: "v1,abc",
    });
  });

  it("returns null for missing headers", () => {
    expect(extractSvixHeaders(new Headers())).toEqual({
      svixId: null,
      svixTimestamp: null,
      svixSignature: null,
    });
  });
});
