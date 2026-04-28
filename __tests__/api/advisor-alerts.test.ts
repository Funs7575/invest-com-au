import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockAdminUpsert = vi.fn();
const mockAdminFrom = vi.fn(() => ({ upsert: mockAdminUpsert }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/advisor-alerts/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/advisor-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  email: "investor@example.com",
  advisor_type: "financial_planner",
  location_state: "NSW",
  location_suburb: "Sydney",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockAdminUpsert.mockResolvedValue({ error: null });
    delete process.env.RESEND_API_KEY;
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  // ── Body parsing ─────────────────────────────────────────────────────────

  it("returns 400 when body cannot be parsed", async () => {
    const req = new NextRequest("http://localhost/api/advisor-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "{{not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("returns 400 when email is missing", async () => {
    const { email: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 when email has invalid format", async () => {
    const res = await POST(makePost({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 when advisor_type is missing", async () => {
    const { advisor_type: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/advisor type/i);
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it("returns 200 with success=true on successful upsert", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("calls upsert with normalised email (lowercase+trimmed) and advisor_type", async () => {
    await POST(makePost({ ...VALID_BODY, email: "  INVESTOR@EXAMPLE.COM  " }));
    expect(mockAdminFrom).toHaveBeenCalledWith("advisor_search_alerts");
    expect(mockAdminUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "investor@example.com",
        advisor_type: "financial_planner",
        active: true,
      }),
      expect.objectContaining({ onConflict: "email,advisor_type" }),
    );
  });

  it("passes through location_state and location_suburb when provided", async () => {
    await POST(makePost(VALID_BODY));
    expect(mockAdminUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ location_state: "NSW", location_suburb: "Sydney" }),
      expect.anything(),
    );
  });

  it("sets location fields to null when not provided", async () => {
    const { location_state: _s, location_suburb: _sb, ...body } = VALID_BODY;
    await POST(makePost(body));
    expect(mockAdminUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ location_state: null, location_suburb: null }),
      expect.anything(),
    );
  });

  // ── Table-missing soft success (42P01) ────────────────────────────────────

  it("returns success=true with warning when table does not exist (42P01)", async () => {
    mockAdminUpsert.mockResolvedValue({ error: { code: "42P01", message: "table not found" } });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.warning).toMatch(/pending/i);
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it("returns 500 on unexpected DB error", async () => {
    mockAdminUpsert.mockResolvedValue({ error: { code: "XX000", message: "db crash" } });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed/i);
  });

  // ── Resend email (fire-and-forget) ────────────────────────────────────────

  it("does NOT call fetch for confirmation email when RESEND_API_KEY is unset", async () => {
    await POST(makePost(VALID_BODY));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls Resend API when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockFetch.mockResolvedValue({ ok: true });
    await POST(makePost(VALID_BODY));
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("swallows Resend fetch error and still returns 200", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockFetch.mockRejectedValue(new Error("network error"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
  });
});
