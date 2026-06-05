import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

function makeBuilder(result: unknown = { data: [], error: null }) {
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

const { mockIsAllowed, mockFrom, mockBuildWealthStack, mockIsValidEmail, mockIsDisposableEmail, mockSendEmail } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockFrom: vi.fn(),
  mockBuildWealthStack: vi.fn(() => ({
    stackId: "stack_abc123",
    components: [],
  })),
  mockIsValidEmail: vi.fn(() => true),
  mockIsDisposableEmail: vi.fn(() => false),
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
    auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/wealth-stack", () => ({
  buildWealthStack: mockBuildWealthStack,
  STACK_KINDS: ["share_broker", "super_fund", "savings_account", "crypto_exchange", "robo_advisor"],
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: mockIsValidEmail,
  isDisposableEmail: mockIsDisposableEmail,
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

import { POST } from "@/app/api/wealth-stack/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/wealth-stack", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

describe("/api/wealth-stack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockBuildWealthStack.mockReturnValue({ stackId: "stack_abc123", components: [] });
    mockIsValidEmail.mockReturnValue(true);
    mockIsDisposableEmail.mockReturnValue(false);
    // Default: brokers and weights return empty arrays
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ answers: [] }));
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/wealth-stack", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid amount enum", async () => {
    const res = await POST(makeReq({ answers: [], amount: "gigantic" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with stack on valid request (no answers)", async () => {
    const res = await POST(makeReq({ answers: [] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("stack");
  });

  it("returns 200 with stack for valid full request", async () => {
    const res = await POST(makeReq({
      answers: ["answer1", "answer2"],
      goal: "growth",
      amount: "medium",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("stack");
    expect(json.stack.stackId).toMatch(/^stack_/);
  });

  it("returns 200 and ignores email send for request with email", async () => {
    const res = await POST(makeReq({
      answers: ["answer1"],
      email: "test@example.com",
    }));
    expect(res.status).toBe(200);
  });

  it("strips internal commercial fields from brokers before they reach the response", async () => {
    const broker = {
      slug: "stake", name: "Stake", status: "active", platform_type: "share_broker",
      rating: 4.5, cpa_value: 400, monthly_sponsorship_fee: 1500, commission_type: "cpa",
      affiliate_priority: "high", commission_value: 400, estimated_epc: 12.5, promoted_placement: true,
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeBuilder({ data: [broker], error: null });
      return makeBuilder({ data: [], error: null });
    });
    const res = await POST(makeReq({ answers: ["x"] }));
    expect(res.status).toBe(200);

    // The brokers handed to the scorer (and thus embedded in stack.components)
    // must be sanitised — this is a public, unauthenticated endpoint.
    const calls = mockBuildWealthStack.mock.calls as unknown as Array<[{ perKind: Record<string, { brokers: Record<string, unknown>[] }> }]>;
    const passed = calls[0]![0].perKind.share_broker!.brokers[0]!;
    expect(passed.slug).toBe("stake");
    for (const f of [
      "cpa_value", "monthly_sponsorship_fee", "commission_type",
      "affiliate_priority", "commission_value", "estimated_epc", "promoted_placement",
    ]) {
      expect(passed).not.toHaveProperty(f);
    }
  });

  it("returns 500 when brokers query fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "brokers") {
        return makeBuilder({ data: null, error: { message: "DB error" } });
      }
      return makeBuilder({ data: [], error: null });
    });
    const res = await POST(makeReq({ answers: [] }));
    expect(res.status).toBe(500);
  });
});
