import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

function makeBuilder(result: unknown = { data: {}, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is",
    "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const { mockIsAllowed, mockGetUser, mockFrom, mockIsValidEmail, mockIsDisposableEmail, mockIsSuppressed, mockSendEmail } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })),
  mockFrom: vi.fn(() => makeBuilder()),
  mockIsValidEmail: vi.fn(() => true),
  mockIsDisposableEmail: vi.fn(() => false),
  mockIsSuppressed: vi.fn(async () => false),
  mockSendEmail: vi.fn(async () => ({ id: "email-id" })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: mockIsValidEmail,
  isDisposableEmail: mockIsDisposableEmail,
}));

vi.mock("@/lib/email-suppression", () => ({
  isSuppressed: mockIsSuppressed,
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

import { POST } from "@/app/api/switch-intent/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/switch-intent", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const validBody = {
  product_kind: "super_fund",
  email: "test@example.com",
};

describe("/api/switch-intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockIsValidEmail.mockReturnValue(true);
    mockIsDisposableEmail.mockReturnValue(false);
    mockIsSuppressed.mockResolvedValue(false);
    mockFrom.mockImplementation(() => makeBuilder({ data: {}, error: null }));
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/switch-intent", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    mockIsValidEmail.mockReturnValue(false);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is disposable", async () => {
    mockIsDisposableEmail.mockReturnValue(true);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid product_kind", async () => {
    const res = await POST(makeReq({ ...validBody, product_kind: "invalid_kind" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 success on honeypot (website field filled)", async () => {
    const res = await POST(makeReq({ ...validBody, website: "http://spam.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 200 when email is suppressed (silent drop)", async () => {
    mockIsSuppressed.mockResolvedValue(true);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 200 on successful submission", async () => {
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
