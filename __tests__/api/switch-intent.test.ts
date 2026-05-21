import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsAllowed = vi.fn();
const mockIsValidEmail = vi.fn();
const mockIsDisposableEmail = vi.fn();
const mockIsSuppressed = vi.fn();
const mockSendEmail = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({ insert: (...args: unknown[]) => mockInsert(...args) })),
  })),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (...args: unknown[]) => mockIsValidEmail(...args),
  isDisposableEmail: (...args: unknown[]) => mockIsDisposableEmail(...args),
}));

vi.mock("@/lib/email-suppression", () => ({
  isSuppressed: (...args: unknown[]) => mockIsSuppressed(...args),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/switch-intent/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/switch-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawReq(raw: string): NextRequest {
  return new NextRequest("http://localhost/api/switch-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw,
  });
}

const VALID = {
  product_kind: "super_fund",
  from_provider: "Old Super",
  to_provider: "New Super",
  email: "user@example.com",
  estimated_balance: 50000,
  reason: "fees",
  notes: "switch please",
};

describe("POST /api/switch-intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockIsValidEmail.mockReturnValue(true);
    mockIsDisposableEmail.mockReturnValue(false);
    mockIsSuppressed.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue(undefined);
    mockInsert.mockResolvedValue({ error: null });
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(makeRawReq("{nope"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 for a zod-invalid body (bad product_kind)", async () => {
    const res = await POST(makeReq({ ...VALID, product_kind: "crypto" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });

  it("returns success without inserting when honeypot is filled", async () => {
    const res = await POST(makeReq({ ...VALID, website: "http://spam" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 400 when email fails the secondary validity check", async () => {
    mockIsValidEmail.mockReturnValueOnce(false);
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Valid email required." });
  });

  it("returns 400 for a disposable email", async () => {
    mockIsDisposableEmail.mockReturnValueOnce(true);
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Please use a real email address." });
  });

  it("silently succeeds (no insert) when the email is suppressed", async () => {
    mockIsSuppressed.mockResolvedValueOnce(true);
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("happy path — inserts the row, lowercases email, sends verify email", async () => {
    const res = await POST(makeReq({ ...VALID, email: "User@Example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledOnce();
    const row = mockInsert.mock.calls[0]![0] as Record<string, unknown>;
    expect(row).toMatchObject({
      product_kind: "super_fund",
      email: "user@example.com",
      estimated_balance_cents: 5000000,
      reason: "fees",
    });
    expect(row.verify_token).toEqual(expect.any(String));
    expect(row.unsubscribe_token).toEqual(expect.any(String));
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it("returns 500 when the insert fails", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "boom" } });
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to submit" });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
