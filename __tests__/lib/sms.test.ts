import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { sendSms, normalisePhoneNumber } from "@/lib/sms";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL };
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_FROM_NUMBER;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("normalisePhoneNumber", () => {
  it("accepts a valid E.164 number unchanged", () => {
    expect(normalisePhoneNumber("+61412345678")).toBe("+61412345678");
    expect(normalisePhoneNumber("+15551234567")).toBe("+15551234567");
  });

  it("auto-prepends +61 to bare 04xx numbers (most common AU input)", () => {
    expect(normalisePhoneNumber("0412345678")).toBe("+61412345678");
  });

  it("strips whitespace before normalising", () => {
    expect(normalisePhoneNumber("0412 345 678")).toBe("+61412345678");
    expect(normalisePhoneNumber("+61 412 345 678")).toBe("+61412345678");
  });

  it("returns null for invalid input", () => {
    expect(normalisePhoneNumber("hello")).toBe(null);
    expect(normalisePhoneNumber("+0123")).toBe(null); // too short
    expect(normalisePhoneNumber("")).toBe(null);
  });
});

describe("sendSms", () => {
  it("soft-fails with 'No API credentials' when env vars are missing", async () => {
    const res = await sendSms({ to: "+61412345678", body: "test" });
    expect(res).toEqual({ ok: false, error: "No API credentials" });
  });

  it("rejects an invalid phone number even with creds set", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "tok_test";
    process.env.TWILIO_FROM_NUMBER = "+15550001234";
    const res = await sendSms({ to: "garbage", body: "test" });
    expect(res).toEqual({ ok: false, error: "Invalid phone number" });
  });

  it("rejects bodies longer than 1600 chars", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "tok_test";
    process.env.TWILIO_FROM_NUMBER = "+15550001234";
    const res = await sendSms({ to: "+61412345678", body: "x".repeat(1601) });
    expect(res).toEqual({ ok: false, error: "SMS body too long" });
  });

  it("returns ok:true on a 2xx Twilio response", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "tok_test";
    process.env.TWILIO_FROM_NUMBER = "+15550001234";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response("{}", { status: 201 })) as unknown as typeof fetch;
    try {
      const res = await sendSms({ to: "+61412345678", body: "Hi from invest.com.au" });
      expect(res).toEqual({ ok: true });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns the HTTP status on Twilio error", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "tok_test";
    process.env.TWILIO_FROM_NUMBER = "+15550001234";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response("error", { status: 400 })) as unknown as typeof fetch;
    try {
      const res = await sendSms({ to: "+61412345678", body: "Hi" });
      expect(res).toEqual({ ok: false, error: "HTTP 400" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
