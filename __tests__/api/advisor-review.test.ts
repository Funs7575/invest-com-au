import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const isRateLimitedMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>(() => Promise.resolve(false)));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: isRateLimitedMock }));

vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@invest.com.au" }));

const serverFromMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: serverFromMock })),
}));

// Admin client mock — controls professional_leads engagement lookup
const adminFromMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: adminFromMock })),
}));

const fetchMock = vi.fn<(input: unknown, init?: unknown) => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

import { POST } from "@/app/api/advisor-review/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function chain(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "limit", "insert"]) b[m] = vi.fn(() => b);
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (cb: (v: unknown) => void) => { cb(result); return Promise.resolve(); };
  return b;
}

/**
 * Build an admin-client chain that returns a result from the final .limit() call.
 * The chain is: from(table) → select() → eq() → eq() → limit() → resolves with result.
 */
function adminChain(result: unknown) {
  const b: Record<string, unknown> = {};
  const terminal = () => Promise.resolve(result);
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.limit = vi.fn(() => terminal());
  return b;
}

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/advisor-review", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "5.5.5.5" },
  });
}

const VALID = {
  professional_id: "pro-1",
  reviewer_name: "Alice",
  reviewer_email: "alice@example.com",
  rating: 5,
  communication_rating: 5,
  expertise_rating: 4,
  value_for_money_rating: 4,
  used_services: true,
  title: "Excellent advisor",
  body: "I have been working with this advisor for two years and found the service outstanding.",
};

/**
 * Sets up the standard happy-path:
 *   1. professional lookup → found
 *   2. duplicate email check → empty (no duplicate)
 *   3. insert → optional error
 * The admin engagement check is configured separately via adminFromMock.
 */
function setupHappyPath(insertErr: unknown = null) {
  serverFromMock.mockReturnValueOnce(chain({ data: { id: "pro-1", name: "Bob", slug: "bob-sydney" } }));
  serverFromMock.mockReturnValueOnce(chain({ data: [] })); // duplicate check
  serverFromMock.mockReturnValueOnce(chain({ error: insertErr })); // insert
}

/** No matching engagement lead found. */
function setupNoEngagement() {
  adminFromMock.mockReturnValueOnce(adminChain({ data: [], error: null }));
}

/** Matching engagement lead found. */
function setupEngagementMatch() {
  adminFromMock.mockReturnValueOnce(adminChain({ data: [{ id: 42 }], error: null }));
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRateLimitedMock.mockResolvedValue(false);
    delete process.env.RESEND_API_KEY;
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  });

  it("returns 429 when rate-limited", async () => {
    isRateLimitedMock.mockResolvedValueOnce(true);
    expect((await POST(makeReq(VALID))).status).toBe(429);
  });

  it("returns 400 when professional_id is missing", async () => {
    expect((await POST(makeReq({ ...VALID, professional_id: undefined }))).status).toBe(400);
  });

  it("returns 400 when rating is missing", async () => {
    expect((await POST(makeReq({ ...VALID, rating: undefined }))).status).toBe(400);
  });

  it("returns 400 when body text is missing", async () => {
    expect((await POST(makeReq({ ...VALID, body: "" }))).status).toBe(400);
  });

  it("returns 400 when rating is 0 (below range)", async () => {
    const res = await POST(makeReq({ ...VALID, rating: 0 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/rating/i);
  });

  it("returns 400 when rating is 6 (above range)", async () => {
    expect((await POST(makeReq({ ...VALID, rating: 6 }))).status).toBe(400);
  });

  it("returns 400 when communication_rating is invalid", async () => {
    expect((await POST(makeReq({ ...VALID, communication_rating: 0 }))).status).toBe(400);
  });

  it("returns 400 when expertise_rating is missing", async () => {
    expect((await POST(makeReq({ ...VALID, expertise_rating: undefined }))).status).toBe(400);
  });

  it("returns 400 when review body is shorter than 50 chars", async () => {
    expect((await POST(makeReq({ ...VALID, body: "Short review." }))).status).toBe(400);
  });

  it("returns 400 when review body exceeds the max length (5000 chars)", async () => {
    const res = await POST(makeReq({ ...VALID, body: "A".repeat(5001) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/5000 characters or fewer/i);
  });

  it("returns 400 when title exceeds the max length (160 chars)", async () => {
    const res = await POST(makeReq({ ...VALID, title: "T".repeat(161) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/title/i);
  });

  it("returns 400 when reviewer_name exceeds the max length (100 chars)", async () => {
    const res = await POST(makeReq({ ...VALID, reviewer_name: "N".repeat(101) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/i);
  });

  it("returns 400 when reviewer_email exceeds the max length (200 chars)", async () => {
    // Construct an address that is syntactically valid but over 200 chars.
    const longEmail = `${"a".repeat(195)}@b.com`;
    const res = await POST(makeReq({ ...VALID, reviewer_email: longEmail }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
  });

  it("accepts a body at the max length boundary (5000 chars)", async () => {
    setupNoEngagement();
    setupHappyPath();
    const res = await POST(makeReq({ ...VALID, body: "A".repeat(5000) }));
    expect(res.status).toBe(200);
  });

  it("returns 400 when used_services is not boolean", async () => {
    expect((await POST(makeReq({ ...VALID, used_services: "yes" }))).status).toBe(400);
  });

  it("returns 400 when reviewer_email format is invalid", async () => {
    expect((await POST(makeReq({ ...VALID, reviewer_email: "not-an-email" }))).status).toBe(400);
  });

  it("returns 404 when advisor is not found", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: null }));
    expect((await POST(makeReq(VALID))).status).toBe(404);
  });

  it("returns 409 when reviewer has already reviewed this advisor", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: { id: "pro-1", name: "Bob", slug: "bob" } }));
    serverFromMock.mockReturnValueOnce(chain({ data: [{ id: 7 }] })); // duplicate found
    expect((await POST(makeReq(VALID))).status).toBe(409);
  });

  it("returns 500 when insert fails", async () => {
    setupNoEngagement();
    setupHappyPath({ message: "db error" });
    expect((await POST(makeReq(VALID))).status).toBe(500);
  });

  it("returns 200 on success without RESEND_API_KEY — no email sent", async () => {
    setupNoEngagement();
    setupHappyPath();
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 200 with RESEND_API_KEY — fires admin email", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    setupNoEngagement();
    setupHappyPath();
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((fetchMock.mock.calls[0]?.[0] as unknown as string)).toContain("resend.com");
  });

  it("returns 200 even when Resend email send throws (non-blocking catch)", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    setupNoEngagement();
    setupHappyPath();
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    expect((await POST(makeReq(VALID))).status).toBe(200);
  });

  it("auto-flags reviews containing profanity (status=flagged)", async () => {
    setupNoEngagement();
    setupHappyPath();
    const body = "This advisor is a complete bastard and I hate them so much and would not recommend.";
    const res = await POST(makeReq({ ...VALID, body }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/reviewed by our team/i);
  });

  it("auto-flags reviews containing spam URLs (status=flagged)", async () => {
    setupNoEngagement();
    setupHappyPath();
    const body = "Check out https://spam.example.com for better advice — this advisor is merely adequate for daily use.";
    const res = await POST(makeReq({ ...VALID, body }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/reviewed by our team/i);
  });

  it("skips duplicate check and engagement check when no reviewer_email provided", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: { id: "pro-1", name: "Bob", slug: "bob" } }));
    serverFromMock.mockReturnValueOnce(chain({ error: null })); // insert (no dup check)
    const res = await POST(makeReq({ ...VALID, reviewer_email: undefined }));
    expect(res.status).toBe(200);
    // Admin client should NOT have been called (no email to match against)
    expect(adminFromMock).not.toHaveBeenCalled();
  });

  // ── Engagement verification (verified_engagement) ────────────────────────

  describe("engagement verification", () => {
    it("sets verified_engagement=false when no matching lead found", async () => {
      setupNoEngagement();
      // Capture the insert call to check what was passed
      let insertPayload: unknown = null;
      const insertChain = chain({ error: null });
      (insertChain.insert as ReturnType<typeof vi.fn>).mockImplementation((payload: unknown) => {
        insertPayload = payload;
        return Promise.resolve({ error: null });
      });
      serverFromMock.mockReturnValueOnce(chain({ data: { id: "pro-1", name: "Bob", slug: "bob" } }));
      serverFromMock.mockReturnValueOnce(chain({ data: [] })); // dup check
      serverFromMock.mockReturnValueOnce(insertChain);

      await POST(makeReq(VALID));
      expect(insertPayload).toMatchObject({ verified_engagement: false });
    });

    it("sets verified_engagement=true when a matching lead exists", async () => {
      setupEngagementMatch();
      let insertPayload: unknown = null;
      const insertChain = chain({ error: null });
      (insertChain.insert as ReturnType<typeof vi.fn>).mockImplementation((payload: unknown) => {
        insertPayload = payload;
        return Promise.resolve({ error: null });
      });
      serverFromMock.mockReturnValueOnce(chain({ data: { id: "pro-1", name: "Bob", slug: "bob" } }));
      serverFromMock.mockReturnValueOnce(chain({ data: [] }));
      serverFromMock.mockReturnValueOnce(insertChain);

      await POST(makeReq(VALID));
      expect(insertPayload).toMatchObject({ verified_engagement: true });
      // verified_at should be an ISO date string
      expect(typeof (insertPayload as Record<string, unknown>)["verified_at"]).toBe("string");
    });

    it("continues successfully even if engagement check throws (non-blocking)", async () => {
      // Simulate admin client failure
      adminFromMock.mockImplementationOnce(() => {
        throw new Error("admin db connection refused");
      });
      setupHappyPath();
      const res = await POST(makeReq(VALID));
      // Still 200 — engagement check is best-effort
      expect(res.status).toBe(200);
    });

    it("does not call admin client when reviewer_email is absent", async () => {
      serverFromMock.mockReturnValueOnce(chain({ data: { id: "pro-1", name: "Bob", slug: "bob" } }));
      serverFromMock.mockReturnValueOnce(chain({ error: null }));
      await POST(makeReq({ ...VALID, reviewer_email: undefined }));
      expect(adminFromMock).not.toHaveBeenCalled();
    });
  });
});
