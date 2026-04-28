import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

const mockIsRateLimited = vi.hoisted(() => vi.fn().mockResolvedValue(false));
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

const mockAuth = { getUser: vi.fn() };
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth, from: mockFrom })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/broker-outreach/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_USER = { id: "admin-1", email: "admin@invest.com.au" };
const NON_ADMIN = { id: "user-1", email: "user@example.com" };

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/broker-outreach", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function makeInsertChain() {
  return { insert: vi.fn(() => Promise.resolve({ error: null })) };
}

const VALID_BODY = {
  to_email: "contact@brokerco.com",
  to_name: "Jane Smith",
  broker_name: "Broker Co",
  broker_slug: "broker-co",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/broker-outreach", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, RESEND_API_KEY: "re_test_key" };
    mockAuth.getUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockIsRateLimited.mockResolvedValue(false);
    mockFrom.mockReturnValue(makeInsertChain());
    mockFetch.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-admin user", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: NON_ADMIN }, error: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makePost({ to_email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(makePost({ ...VALID_BODY, to_email: "notanemail" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid email/i);
  });

  it("returns 500 when RESEND_API_KEY is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/not configured/i);
  });

  it("returns 502 when Resend API returns an error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: vi.fn().mockResolvedValue("invalid_to"),
    });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(502);
  });

  it("returns 200 on success and logs outreach", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    // Verify Resend was called with correct recipient
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );

    // Verify outreach log insert
    expect(mockFrom).toHaveBeenCalledWith("broker_outreach_log");
  });

  it("uses IP from x-forwarded-for for rate limit key", async () => {
    await POST(makePost(VALID_BODY, "9.9.9.9"));
    expect(mockIsRateLimited).toHaveBeenCalledWith(
      "broker_outreach:9.9.9.9",
      expect.any(Number),
      expect.any(Number),
    );
  });
});
