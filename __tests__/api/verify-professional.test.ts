import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

const mockVerifyAbn = vi.fn();
const mockNormaliseAbn = vi.fn((s: string) => s.replace(/\s/g, ""));
vi.mock("@/lib/verify-abn", () => ({
  verifyAbn: (...args: unknown[]) => mockVerifyAbn(...args),
  normaliseAbn: (...args: unknown[]) => mockNormaliseAbn(...args),
}));

const mockVerifyAfsl = vi.fn();
const mockNormaliseAfsl = vi.fn((s: string) => s.replace(/\s/g, ""));
vi.mock("@/lib/verify-afsl", () => ({
  verifyAfsl: (...args: unknown[]) => mockVerifyAfsl(...args),
  normaliseAfsl: (...args: unknown[]) => mockNormaliseAfsl(...args),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/verify-professional/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, authToken?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return new NextRequest("http://localhost/api/verify-professional", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const PROFESSIONAL = {
  id: 42,
  slug: "jane-advisor",
  name: "Jane Advisor",
  email: "jane@advisor.com",
  type: "financial_advisor",
  abn: "51824753556",
  afsl_number: "123456",
  verified: false,
  verification_method: null,
  health_status: "active",
};

function setupAdminMocks(
  proData: typeof PROFESSIONAL | null = PROFESSIONAL,
  updateError: Error | null = null
) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "professionals") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: proData,
          error: proData ? null : new Error("not found"),
        }),
        update: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: updateError });
          return Promise.resolve();
        }),
      };
    }
    // admin_action_log
    return {
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/verify-professional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_API_KEY", "test-admin-key");
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    mockIsAllowed.mockResolvedValue(true);
    mockVerifyAbn.mockResolvedValue({ valid: true, abn: "51824753556", status: "Active", error: null });
    mockVerifyAfsl.mockResolvedValue({ valid: true, afsl: "123456", licenceStatus: "Current", error: null });
    setupAdminMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await POST(makePost({ professional_id: 42 }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization token is wrong", async () => {
    const res = await POST(makePost({ professional_id: 42 }, "wrong-key"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when both env keys are unset", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    vi.stubEnv("CRON_SECRET", "");
    const res = await POST(makePost({ professional_id: 42 }, "test-admin-key"));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ professional_id: 42 }, "test-admin-key"));
    expect(res.status).toBe(429);
  });

  it("returns 400 when professional_id is missing", async () => {
    const res = await POST(makePost({}, "test-admin-key"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/professional_id/i);
  });

  it("returns 404 when professional not found", async () => {
    setupAdminMocks(null);
    const res = await POST(makePost({ professional_id: 99 }, "test-admin-key"));
    expect(res.status).toBe(404);
  });

  it("returns outcome=passed when ABN check passes", async () => {
    mockVerifyAfsl.mockResolvedValue(null); // no AFSL to check
    const res = await POST(
      makePost({ professional_id: 42, abn: "51824753556" }, "test-admin-key")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outcome).toBe("passed");
    expect(body.method).toContain("abn");
  });

  it("returns outcome=passed when AFSL check passes", async () => {
    mockVerifyAbn.mockResolvedValue(null); // no ABN to check
    const res = await POST(
      makePost({ professional_id: 42, afsl_number: "123456" }, "test-admin-key")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outcome).toBe("passed");
    expect(body.method).toContain("afsl");
  });

  it("returns outcome=passed with method=abn+afsl when both pass", async () => {
    const res = await POST(
      makePost({ professional_id: 42, abn: "51824753556", afsl_number: "123456" }, "test-admin-key")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outcome).toBe("passed");
    expect(body.method).toBe("abn+afsl");
  });

  it("returns outcome=failed when ABN check fails", async () => {
    mockVerifyAbn.mockResolvedValue({ valid: false, abn: "51824753556", status: "Cancelled", error: "ABN is cancelled" });
    const res = await POST(
      makePost({ professional_id: 42, abn: "51824753556" }, "test-admin-key")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outcome).toBe("failed");
  });

  it("returns outcome=partial when no env vars for external checks (both null results)", async () => {
    mockVerifyAbn.mockResolvedValue(null);
    mockVerifyAfsl.mockResolvedValue(null);
    // Force the route to have null ABN/AFSL on the pro record too
    setupAdminMocks({ ...PROFESSIONAL, abn: null, afsl_number: null });
    const res = await POST(makePost({ professional_id: 42 }, "test-admin-key"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outcome).toBe("partial");
  });

  it("always writes to admin_action_log", async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "admin_action_log") {
        return { insert: insertMock };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: PROFESSIONAL, error: null }),
        update: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => { cb({ data: null, error: null }); return Promise.resolve(); }),
      };
    });

    await POST(makePost({ professional_id: 42 }, "test-admin-key"));
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("accepts CRON_SECRET as valid bearer token", async () => {
    const res = await POST(makePost({ professional_id: 42 }, "test-cron-secret"));
    expect(res.status).toBe(200);
  });
});
