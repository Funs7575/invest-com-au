import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
const mockAdminFrom = vi.fn();
const mockIsValidEmail = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (email: string) => mockIsValidEmail(email),
}));

vi.mock("@/lib/utm", () => ({
  extractUtm: (_body: unknown, _url: unknown) => ({
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: null,
    referral_url: null,
  }),
  utmForInsert: (utm: Record<string, string | null>) => {
    const out: Record<string, string> = {};
    if (utm.utm_source) out.utm_source = utm.utm_source;
    if (utm.utm_medium) out.utm_medium = utm.utm_medium;
    return out;
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/developer-leads/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_BODY = {
  full_name: "Alice Investor",
  email: "alice@example.com",
  investor_type: "retail",
  phone: "0412345678",
  investment_amount_range: "500k-1m",
  fund_id: 42,
  message: "Interested in the fund",
};

function makePost(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/developer-leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// Default result is { error: null }, but a test passes `{ error: { message } }`
// to simulate DB failure, so the param is widened to `error: PostgrestError-ish | null`.
type InsertResult = { error: { message: string } | null };
function makeInsertChain(result: InsertResult = { error: null }) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn().mockResolvedValue(result);
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/developer-leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockIsValidEmail.mockReturnValue(true);
    mockAdminFrom.mockReturnValue(makeInsertChain());
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(makePost("not-json"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 400 when full_name is too short", async () => {
    const res = await POST(makePost({ ...VALID_BODY, full_name: "A" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid name/i);
  });

  it("returns 400 when full_name is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, full_name: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when full_name exceeds 120 chars", async () => {
    const res = await POST(makePost({ ...VALID_BODY, full_name: "A".repeat(121) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    mockIsValidEmail.mockReturnValue(false);
    const res = await POST(makePost({ ...VALID_BODY, email: "bad-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid email/i);
  });

  it("returns 400 when investor_type is not in allowed list", async () => {
    const res = await POST(makePost({ ...VALID_BODY, investor_type: "hni" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid investor_type/i);
  });

  it("accepts all valid investor_type values", async () => {
    for (const type of ["retail", "wholesale", "smsf", "foreign"]) {
      const chain = makeInsertChain();
      mockAdminFrom.mockReturnValue(chain);
      const res = await POST(makePost({ ...VALID_BODY, investor_type: type }));
      expect(res.status).toBe(200);
    }
  });

  it("returns 500 when DB insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeInsertChain({ error: { message: "constraint violation" } }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("returns 200 and inserts lead on success", async () => {
    const chain = makeInsertChain();
    mockAdminFrom.mockReturnValue(chain);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockAdminFrom).toHaveBeenCalledWith("developer_leads");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Alice Investor",
        email: "alice@example.com",
        investor_type: "retail",
        fund_id: 42,
      }),
    );
  });

  it("inserts UTM fields from extracted UTM params", async () => {
    const chain = makeInsertChain();
    mockAdminFrom.mockReturnValue(chain);
    await POST(makePost(VALID_BODY));
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ utm_source: "google", utm_medium: "cpc" }),
    );
  });

  it("uses rate-limit key derived from x-forwarded-for IP", async () => {
    const req = makePost(VALID_BODY, { "x-forwarded-for": "9.8.7.6, 1.1.1.1" });
    await POST(req);
    expect(mockIsRateLimited).toHaveBeenCalledWith(
      expect.stringContaining("9.8.7.6"),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("returns 200 even when notifyAdmin would fail (fire-and-forget)", async () => {
    // Admin notification failing should not affect the 200 response since
    // the insert already succeeded and the notification is void fire-and-forget.
    process.env.RESEND_API_KEY = "key";
    process.env.LEADS_NOTIFY_EMAIL = "admin@invest.com.au";
    const chain = makeInsertChain();
    mockAdminFrom.mockReturnValue(chain);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    delete process.env.RESEND_API_KEY;
    delete process.env.LEADS_NOTIFY_EMAIL;
  });
});
