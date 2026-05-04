/**
 * A-94 auth hardening tests — analytics-dashboard and verify-professional.
 *
 * analytics-dashboard: bearer path now uses requireCronAuth (entropy floor +
 *   constant-time); a wrong bearer no longer silently falls through to cookie auth.
 *
 * verify-professional: isAuthorised upgraded to constant-time compare + entropy
 *   floor for both ADMIN_API_KEY and CRON_SECRET paths.
 *
 * quotes/[slug]/review is a false positive — CRON_SECRET is used as an HMAC
 * signing key there, not as a bearer auth credential. Not tested here.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn().mockResolvedValue(true),
  ipKey: vi.fn((ip: string) => `ip:${ip}`),
}));

vi.mock("@/lib/verify-abn", () => ({
  verifyAbn: vi.fn().mockResolvedValue({ valid: true, entityName: "Test Co" }),
  normaliseAbn: vi.fn((s: string) => s.replace(/\s/g, "")),
}));

vi.mock("@/lib/verify-afsl", () => ({
  verifyAfsl: vi.fn().mockResolvedValue({ valid: true, holderName: "Test Co" }),
  normaliseAfsl: vi.fn((s: string) => s.replace(/\s/g, "")),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// analytics-dashboard imports @supabase/ssr dynamically — stub it
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  })),
}));

import { GET as analyticsGET } from "@/app/api/analytics-dashboard/route";
import { POST as verifyPOST } from "@/app/api/verify-professional/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_CRON = "test-cron-secret-long-enough-16";
const VALID_ADMIN_KEY = "test-admin-key-long-enough-16ch";
const SHORT_SECRET = "short";

function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  authHeader?: string,
): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader !== undefined) headers["authorization"] = authHeader;
  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ── analytics-dashboard ────────────────────────────────────────────────────────

describe("GET /api/analytics-dashboard — auth (A-94)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = VALID_CRON;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 401 when no auth and no cookie", async () => {
    const res = await analyticsGET(
      makeRequest("GET", "http://localhost/api/analytics-dashboard"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong bearer key", async () => {
    const res = await analyticsGET(
      makeRequest("GET", "http://localhost/api/analytics-dashboard", undefined, "Bearer wrong-key"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 500 (fail-closed) when CRON_SECRET not set and bearer present", async () => {
    delete process.env.CRON_SECRET;
    const res = await analyticsGET(
      makeRequest("GET", "http://localhost/api/analytics-dashboard", undefined, `Bearer ${VALID_CRON}`),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/misconfigured/i);
  });

  it("passes auth with valid CRON_SECRET bearer", async () => {
    const res = await analyticsGET(
      makeRequest("GET", "http://localhost/api/analytics-dashboard", undefined, `Bearer ${VALID_CRON}`),
    );
    // Auth passed — business logic may fail without real DB but not 401/500-misconfigured
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(500);
  });

  it("wrong bearer does NOT fall through to cookie auth", async () => {
    // Previously a wrong bearer would fall through to the cookie path.
    // Now it must return 401 immediately (bad bearer = reject).
    const res = await analyticsGET(
      new NextRequest("http://localhost/api/analytics-dashboard", {
        method: "GET",
        headers: {
          authorization: "Bearer wrong-key",
          cookie: "sb-session=fake",
        },
      }),
    );
    expect(res.status).toBe(401);
  });
});

// ── verify-professional ────────────────────────────────────────────────────────

describe("POST /api/verify-professional — auth (A-94)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = VALID_CRON;
    process.env.ADMIN_API_KEY = VALID_ADMIN_KEY;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.ADMIN_API_KEY;
  });

  it("returns 401 when no auth header", async () => {
    const res = await verifyPOST(
      makeRequest("POST", "http://localhost/api/verify-professional", { professional_id: 1 }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong key", async () => {
    const res = await verifyPOST(
      makeRequest("POST", "http://localhost/api/verify-professional", { professional_id: 1 }, "Bearer bad-key"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET too short (entropy floor)", async () => {
    process.env.CRON_SECRET = SHORT_SECRET;
    delete process.env.ADMIN_API_KEY;
    const res = await verifyPOST(
      makeRequest("POST", "http://localhost/api/verify-professional", { professional_id: 1 }, `Bearer ${SHORT_SECRET}`),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when ADMIN_API_KEY too short (entropy floor)", async () => {
    delete process.env.CRON_SECRET;
    process.env.ADMIN_API_KEY = SHORT_SECRET;
    const res = await verifyPOST(
      makeRequest("POST", "http://localhost/api/verify-professional", { professional_id: 1 }, `Bearer ${SHORT_SECRET}`),
    );
    expect(res.status).toBe(401);
  });

  it("passes auth with valid CRON_SECRET", async () => {
    delete process.env.ADMIN_API_KEY;
    const res = await verifyPOST(
      makeRequest("POST", "http://localhost/api/verify-professional", { professional_id: 1 }, `Bearer ${VALID_CRON}`),
    );
    expect(res.status).not.toBe(401);
  });

  it("passes auth with valid ADMIN_API_KEY", async () => {
    delete process.env.CRON_SECRET;
    const res = await verifyPOST(
      makeRequest("POST", "http://localhost/api/verify-professional", { professional_id: 1 }, `Bearer ${VALID_ADMIN_KEY}`),
    );
    expect(res.status).not.toBe(401);
  });
});
