import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

const mockRpc = vi.fn();

// The route also reaches for the admin client (service-role) for the
// enquiries-count increment + fallback update. Without this mock the real
// client tries to initialise, fails on missing env vars in tests, throws
// inside the outer try/catch, and the route returns 500. Aliasing admin
// onto the same mock surface keeps the existing test setup working.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: unknown) => String(s),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

// The listing_enquiry_intake feature flag was added in the launch-ops pass.
// In test environments NEXT_PUBLIC_SUPABASE_URL is a placeholder, so the real
// implementation short-circuits to `false` (flag off → 503 kill-switch).
// Mock it to return `true` by default so the existing tests cover their
// intended code paths. Individual tests that verify the kill-switch can
// override via mockIsFlagEnabled.mockResolvedValueOnce(false).
const mockIsFlagEnabled = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));

import { POST } from "@/app/api/listings/enquire/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/listings/enquire", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  listing_id: 42,
  user_name: "Jane Smith",
  user_email: "jane@example.com",
  user_phone: "+61412345678",
  message: "Interested in this opportunity.",
};

const ACTIVE_LISTING = { id: 42, status: "active", title: "Startup Opportunity" };
const EMAIL_LISTING = { contact_email: "seller@example.com", title: "Startup Opportunity", slug: "startup-opportunity" };

/** Creates a minimal chainable query builder resolving to `result`. */
function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "single", "insert", "update"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/listings/enquire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockIsFlagEnabled.mockResolvedValue(true);
    // Default: listing found + active
    mockFrom.mockReturnValue(makeChain({ data: ACTIVE_LISTING, error: null }));
    mockRpc.mockResolvedValue({ error: null });
    mockSendEmail.mockResolvedValue(undefined);
  });

  // ── Kill switch ───────────────────────────────────────────────────────────

  it("returns 503 when listing_enquiry_intake flag is off", async () => {
    mockIsFlagEnabled.mockResolvedValueOnce(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/service_unavailable|unavailable/i);
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/listings/enquire", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "bad{json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when listing_id is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, listing_id: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/listing_id/i);
  });

  it("returns 400 when listing_id is not a number", async () => {
    const res = await POST(makePost({ ...VALID_BODY, listing_id: "not-a-number" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/listing_id/i);
  });

  it("returns 400 when user_name is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, user_name: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/user_name/i);
  });

  it("returns 400 when user_name is blank whitespace", async () => {
    const res = await POST(makePost({ ...VALID_BODY, user_name: "   " }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/user_name/i);
  });

  it("returns 400 when user_email is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, user_email: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/user_email/i);
  });

  it("returns 400 when user_email is invalid", async () => {
    const res = await POST(makePost({ ...VALID_BODY, user_email: "not-an-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/user_email/i);
  });

  it("returns 400 when investor_type is not in allowed list", async () => {
    const res = await POST(makePost({ ...VALID_BODY, investor_type: "hacker" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/investor_type/i);
  });

  it("accepts all valid investor_type values", async () => {
    const validTypes = [
      "domestic", "foreign_individual", "foreign_corporate",
      "visa_applicant", "individual", "corporate", "family_office",
    ];
    for (const investor_type of validTypes) {
      vi.clearAllMocks();
      mockIsFlagEnabled.mockResolvedValue(true);
      mockIsRateLimited.mockResolvedValue(false);
      // Need two calls: one for listing lookup, one for email lookup
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeChain({ data: ACTIVE_LISTING, error: null });
        if (callCount === 2) return makeChain({ error: null });
        return makeChain({ data: EMAIL_LISTING, error: null });
      });
      mockRpc.mockResolvedValue({ error: null });
      const res = await POST(makePost({ ...VALID_BODY, investor_type }));
      expect(res.status).toBe(201);
    }
  });

  // ── Listing lookup ─────────────────────────────────────────────────────────

  it("returns 404 when listing not found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("returns 410 when listing is not active", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: { ...ACTIVE_LISTING, status: "sold" }, error: null }),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toMatch(/no longer accepting/i);
  });

  // ── Insert error ──────────────────────────────────────────────────────────

  it("returns 500 when DB insert fails", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: ACTIVE_LISTING, error: null });
      return makeChain({ data: null, error: { message: "insert failed" } });
    });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it("returns 201 on success", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: ACTIVE_LISTING, error: null });
      if (callCount === 2) return makeChain({ data: null, error: null }); // insert
      return makeChain({ data: EMAIL_LISTING, error: null }); // email lookup
    });
    mockRpc.mockResolvedValue({ error: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("fires email notification best-effort and still returns 201 if email throws", async () => {
    mockSendEmail.mockRejectedValue(new Error("resend down"));
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: ACTIVE_LISTING, error: null });
      if (callCount === 2) return makeChain({ data: null, error: null });
      return makeChain({ data: EMAIL_LISTING, error: null });
    });
    mockRpc.mockResolvedValue({ error: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);
  });

  it("falls back to manual enquiries increment when RPC fails", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: ACTIVE_LISTING, error: null });
      if (callCount === 2) return makeChain({ data: null, error: null });
      if (callCount === 3) return makeChain({ data: EMAIL_LISTING, error: null });
      return makeChain({ data: null, error: null }); // fallback update
    });
    mockRpc.mockResolvedValue({ error: { message: "function not found", code: "PGRST202" } });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);
    // fallback update was called
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });
});
