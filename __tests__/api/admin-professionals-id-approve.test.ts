/**
 * Tests for POST /api/admin/professionals/[id]/approve
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "1.2.3.4"),
}));

const mockSendProApproved = vi.fn(async () => true);
vi.mock("@/lib/pro-onboarding-emails", () => ({
  sendProApproved: (...args: unknown[]) => mockSendProApproved(...args),
}));

vi.mock("@/lib/pro-onboarding", () => ({
  STARTER_FREE_CREDITS: 10,
  STARTER_CREDIT_CENTS_PER_CREDIT: 100,
}));

const mockMaybeSingle = vi.fn(async () => ({
  data: { id: 42, email: "pro@example.com", name: "John Smith", verification_status: "pending", credit_balance_cents: 0 },
  error: null,
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete",
    "eq", "neq", "order", "limit", "gte", "lte", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  b.maybeSingle = vi.fn(() => mockMaybeSingle());
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/admin/professionals/[id]/approve/route";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/professionals/42/approve", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4", "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function makeCtx(id = "42") {
  return { params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> };
}

describe("POST /api/admin/professionals/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true, email: "admin@invest.com.au", userId: "u1",
    });
    mockIsAllowed.mockResolvedValue(true);
    mockSendProApproved.mockResolvedValue(true);

    // Default: professional found and pending
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 42,
        email: "pro@example.com",
        name: "John Smith",
        verification_status: "pending",
        credit_balance_cents: 0,
      },
      error: null,
    });

    const b = makeBuilder({ data: null, error: null });
    (b.maybeSingle as ReturnType<typeof vi.fn>).mockImplementation(() => mockMaybeSingle());
    mockFrom.mockReturnValue(b);
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 400 when id param is non-numeric", async () => {
    const res = await POST(makeReq({}), makeCtx("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when professional not found", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(404);
  });

  it("returns 409 when professional already verified", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 42,
        email: "pro@example.com",
        name: "John Smith",
        verification_status: "verified",
        credit_balance_cents: 0,
      },
      error: null,
    });
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(409);
  });

  it("returns 200 on successful approve with default body", async () => {
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // Default grant_starter_credits=true, STARTER_FREE_CREDITS=10
    expect(json.starter_credits_granted).toBe(10);
  });

  it("returns 200 with 0 credits when grant_starter_credits=false", async () => {
    const res = await POST(makeReq({ grant_starter_credits: false }), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.starter_credits_granted).toBe(0);
  });
});
