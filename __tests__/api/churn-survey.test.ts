import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/churn-survey/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeChain(result: { error: unknown }) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn(() => c);
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

const VALID_BODY = {
  email: "user@example.com",
  reason_code: "too_expensive",
  comment: "The price went up.",
  stripe_subscription_id: "sub_abc123",
  plan_label: "Pro Monthly",
  months_active: 3,
};

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/churn-survey", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/churn-survey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockAdminFrom.mockReturnValue(makeChain({ error: null }));
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("returns 400 when email is missing", async () => {
    const { email: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await POST(makePost({ ...VALID_BODY, email: "not-valid" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 when reason_code is missing", async () => {
    const { reason_code: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/reason_code/i);
  });

  it("returns 400 when reason_code is not in allowlist", async () => {
    const res = await POST(makePost({ ...VALID_BODY, reason_code: "hacked" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/reason_code/i);
  });

  // ── Allowed reason_code values ────────────────────────────────────────────

  it.each([
    "too_expensive",
    "not_enough_value",
    "missing_feature",
    "switching_product",
    "temporary_pause",
    "other",
  ])("accepts reason_code='%s'", async (reason_code) => {
    const res = await POST(makePost({ ...VALID_BODY, reason_code }));
    expect(res.status).toBe(200);
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it("returns 200 with ok=true on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("inserts required fields into churn_surveys", async () => {
    await POST(makePost(VALID_BODY));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.subscriber_email).toBe("user@example.com");
    expect(row.reason_code).toBe("too_expensive");
  });

  it("normalises email to lowercase", async () => {
    await POST(makePost({ ...VALID_BODY, email: "USER@EXAMPLE.COM" }));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.subscriber_email).toBe("user@example.com");
  });

  it("passes through optional fields when provided", async () => {
    await POST(makePost(VALID_BODY));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.comment).toBe("The price went up.");
    expect(row.stripe_subscription_id).toBe("sub_abc123");
    expect(row.plan_label).toBe("Pro Monthly");
    expect(row.months_active).toBe(3);
  });

  it("truncates comment to 2000 characters", async () => {
    const longComment = "x".repeat(2500);
    await POST(makePost({ ...VALID_BODY, comment: longComment }));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect((row.comment as string).length).toBeLessThanOrEqual(2000);
  });

  it("truncates plan_label to 100 characters", async () => {
    const longLabel = "p".repeat(150);
    await POST(makePost({ ...VALID_BODY, plan_label: longLabel }));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect((row.plan_label as string).length).toBeLessThanOrEqual(100);
  });

  it("rounds months_active to integer", async () => {
    await POST(makePost({ ...VALID_BODY, months_active: 3.7 }));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.months_active).toBe(4);
  });

  it("sets optional fields to null when not provided", async () => {
    await POST(makePost({ email: "a@b.com", reason_code: "other" }));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.comment).toBeNull();
    expect(row.stripe_subscription_id).toBeNull();
    expect(row.plan_label).toBeNull();
    expect(row.months_active).toBeNull();
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it("returns 500 when DB insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ error: { message: "constraint violation" } }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("insert_failed");
  });
});
