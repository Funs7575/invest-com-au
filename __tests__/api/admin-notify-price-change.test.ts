/**
 * Tests for POST /api/admin/notify-price-change
 *
 * Uses its own custom auth (createClient + ADMIN_EMAILS).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsRateLimited = vi.fn(async () => false);
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockSendEmail = vi.fn(async () => undefined);
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not",
    "or", "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ADMIN_EMAILS is a plain constant, we mock the entire lib/admin module
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: () => ["admin@invest.com.au"],
}));

import { POST } from "@/app/api/admin/notify-price-change/route";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/notify-price-change", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4", "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const VALID_BODY = {
  advisor_type: "mortgage_broker",
  old_price_cents: 1000,
  new_price_cents: 1500,
  field_changed: "price_cents",
};

describe("POST /api/admin/notify-price-change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
    });
    mockIsRateLimited.mockResolvedValue(false);
    // Default: no active advisors
    mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
  });

  it("returns 401 when user not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user not in admin list", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u2", email: "notadmin@example.com" } },
    });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 when required fields missing", async () => {
    const res = await POST(makeReq({ advisor_type: "mortgage_broker" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with skipped=true when prices are the same", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, old_price_cents: 1000, new_price_cents: 1000 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(true);
  });

  it("returns 200 with notified=0 when no active advisors found", async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.notified).toBe(0);
  });

  it("returns 200 and sends emails when active advisors exist", async () => {
    const advisorsBuilder = makeBuilder({
      data: [
        { id: 1, name: "John Smith", email: "john@example.com", type: "mortgage_broker" },
        { id: 2, name: "Jane Doe", email: "jane@example.com", type: "mortgage_broker" },
      ],
      error: null,
    });
    mockFrom
      .mockReturnValueOnce(advisorsBuilder) // professionals fetch
      .mockReturnValue(makeBuilder()); // subsequent inserts
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.notified).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });
});
