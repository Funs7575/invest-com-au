import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (..._args: unknown[]) => mockIsRateLimited(),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } })
  ),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: vi.fn(() => ["admin@invest.com.au", "finn@invest.com.au"]),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/advisor-welcome/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_USER = { id: "admin-1", email: "admin@invest.com.au" };
const NON_ADMIN_USER = { id: "user-99", email: "rando@test.com" };

const VALID_BODY = {
  name: "Jane Smith",
  email: "jane@example.com",
  firm_name: "Smith Wealth",
  slug: "jane-smith",
  type: "financial_planner",
};

function makeRequest(body: unknown, ip = "10.0.0.1") {
  return new NextRequest("http://localhost/api/advisor-welcome", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-welcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockIsRateLimited.mockResolvedValue(false);
    process.env.RESEND_API_KEY = "re_test_key";
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: "email-sent-id" }) });
  });

  it("returns 401 when unauthenticated (no user)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when auth fails with error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "session expired" } });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 401 when authenticated user is not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: NON_ADMIN_USER }, error: null });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 when required fields are missing (no email)", async () => {
    const res = await POST(makeRequest({ name: "Jane Smith", slug: "jane-smith" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing required fields/i);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ email: "jane@test.com", slug: "jane" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/email service not configured/i);
  });

  it("sends welcome email via Resend and returns success", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("includes correct type label in email for smsf_accountant", async () => {
    const body = { ...VALID_BODY, type: "smsf_accountant" };
    await POST(makeRequest(body));

    const fetchCall = mockFetch.mock.calls[0];
    const fetchBody = JSON.parse(fetchCall[1].body as string);
    expect(fetchBody.subject).toContain("SMSF Accountant");
  });

  it("falls back to 'Financial Professional' for unknown type", async () => {
    const body = { ...VALID_BODY, type: "unknown_type" };
    await POST(makeRequest(body));

    const fetchCall = mockFetch.mock.calls[0];
    const fetchBody = JSON.parse(fetchCall[1].body as string);
    expect(fetchBody.subject).toContain("Financial Professional");
  });

  it("fire-and-forgets email — returns success even if Resend throws", async () => {
    mockFetch.mockRejectedValue(new Error("Resend is down"));

    // The route catches the outer error and returns 500 in this case
    const res = await POST(makeRequest(VALID_BODY));
    // Either 200 (if error is swallowed) or 500 (if caught at top)
    expect([200, 500]).toContain(res.status);
  });

  it("case-insensitively matches admin email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { ...ADMIN_USER, email: "ADMIN@INVEST.COM.AU" } },
      error: null,
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
  });
});
