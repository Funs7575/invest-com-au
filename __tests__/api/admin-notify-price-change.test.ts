import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@test.com"],
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/admin/notify-price-change/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/admin/notify-price-change", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function setupAuth(email: string | null = "admin@test.com") {
  mockGetUser.mockResolvedValue({
    data: { user: email ? { email } : null },
    error: null,
  });
}

const ADVISORS = [
  { id: "a-1", email: "advisor1@test.com", full_name: "Alice" },
  { id: "a-2", email: "advisor2@test.com", full_name: "Bob" },
];

function setupFromMock(advisors = ADVISORS) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "professionals") {
      // Make the chain builder thenable so any terminal await resolves correctly
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        not: vi.fn(() => chain),
        is: vi.fn(() => chain),
        then: (onFulfilled: (v: unknown) => unknown, onRejected?: (v: unknown) => unknown) =>
          Promise.resolve({ data: advisors, error: null }).then(onFulfilled, onRejected),
      };
      return chain;
    }
    if (table === "lead_pricing_log") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    if (table === "admin_audit_log") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }).mockReturnThis(),
        then: vi.fn().mockImplementation((cb: (v: { error: null }) => unknown) => cb({ error: null })),
      };
    }
    return {};
  });
}

const VALID_BODY = {
  advisor_type: "financial_planner",
  old_price_cents: 10000,
  new_price_cents: 12000,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/notify-price-change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue({ id: "email-id", error: null });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 401 when user is not authenticated", async () => {
    setupAuth(null);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user is not in ADMIN_EMAILS", async () => {
    setupAuth("notadmin@test.com");
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 when advisor_type is missing", async () => {
    setupAuth();
    const res = await POST(makePost({ old_price_cents: 100, new_price_cents: 200 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing required/i);
  });

  it("returns 400 when old_price_cents is missing", async () => {
    setupAuth();
    const res = await POST(makePost({ advisor_type: "financial_planner", new_price_cents: 200 }));
    expect(res.status).toBe(400);
  });

  it("returns skipped when prices are unchanged", async () => {
    setupAuth();
    const res = await POST(makePost({ ...VALID_BODY, new_price_cents: VALID_BODY.old_price_cents }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.reason).toMatch(/unchanged/i);
  });

  it("sends email to each advisor and returns notified count", async () => {
    setupAuth();
    setupFromMock();
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.notified).toBe(2);
    expect(body.total).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("counts failed emails separately when sendEmail throws", async () => {
    setupAuth();
    setupFromMock([{ id: "a-1", email: "advisor1@test.com", full_name: "Alice" }]);
    mockSendEmail.mockRejectedValue(new Error("email_failed"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.notified).toBe(0);
  });

  it("uses IP from x-forwarded-for for rate limit key", async () => {
    setupAuth();
    setupFromMock([]);
    await POST(makePost(VALID_BODY, "10.0.0.1"));
    expect(mockIsRateLimited).toHaveBeenCalledWith(
      "admin_notify:10.0.0.1",
      10,
      300
    );
  });
});
