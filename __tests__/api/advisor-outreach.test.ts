import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } })
  ),
}));

const mockGetAdminEmails = vi.fn(() => ["admin@invest.com.au"]);
vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => mockGetAdminEmails(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/advisor-outreach/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_USER = { id: "admin-id", email: "admin@invest.com.au" };

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/advisor-outreach", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.1.1.1",
    },
    body: JSON.stringify(body),
  });
}

const BASE_BODY = {
  to_email: "jane@janesmith.com.au",
  to_name: "Jane Smith",
  firm_name: "Jane Smith Financial",
  advisor_type: "financial_planner",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-outreach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: "email-1" }) });
    process.env.RESEND_API_KEY = "re_test_key";
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 401 when auth errors out", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: new Error("session expired") });
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user is not in admin emails list", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u2", email: "notadmin@example.com" } },
      error: null,
    });
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 when to_email is missing", async () => {
    const res = await POST(makePost({ ...BASE_BODY, to_email: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email|name/i);
  });

  it("returns 400 when to_name is missing", async () => {
    const res = await POST(makePost({ ...BASE_BODY, to_name: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/not configured/i);
  });

  it("calls Resend with correct to_email", async () => {
    await POST(makePost(BASE_BODY));
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.to).toBe("jane@janesmith.com.au");
  });

  it("maps advisor_type to label in email subject", async () => {
    await POST(makePost(BASE_BODY));
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.subject).toContain("Jane Smith Financial");
  });

  it("uses first name (Jane) in email greeting", async () => {
    await POST(makePost(BASE_BODY));
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.html).toContain("Hi Jane");
  });

  it("falls back to 'Financial Professional' for unknown advisor_type", async () => {
    await POST(makePost({ ...BASE_BODY, advisor_type: "wizard" }));
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.html).toContain("Financial Professional");
  });

  it("returns success:true on happy path", async () => {
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("ETIMEDOUT"));
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(500);
  });
});
