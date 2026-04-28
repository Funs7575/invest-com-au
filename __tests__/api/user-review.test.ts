import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const isValidEmailMock = vi.hoisted(() => vi.fn<(e: string) => boolean>(() => true));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (email: string) => isValidEmailMock(email),
}));

const rateLimitFn = vi.hoisted(() => vi.fn<() => boolean>(() => false));

vi.mock("@/lib/rate-limiter", () => ({
  createRateLimiter: () => rateLimitFn,
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

// Broker lookup and review insert results — mutated per test
let brokerRow: { id: number; name: string; slug: string } | null = { id: 1, name: "CommSec", slug: "commsec" };
let brokerError: { message: string } | null = null;
let insertError: { message: string } | null = null;

const adminFromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: adminFromMock })),
}));

// Capture fetch calls (Resend email)
const fetchMock = vi.fn<(input: unknown, init?: unknown) => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

import { POST } from "@/app/api/user-review/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/user-review", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9" },
  });
}

const VALID_BODY = {
  broker_slug: "commsec",
  display_name: "Jane Doe",
  email: "jane@example.com",
  rating: 5,
  title: "Great broker",
  body: "I have used CommSec for years and it is excellent.",
};

/** Returns a chainable builder that resolves to `result` when awaited. */
function chain(result: unknown): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "limit", "insert"]) {
    b[m] = vi.fn(() => b);
  }
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (cb: (v: unknown) => void) => { cb(result); return Promise.resolve(); };
  return b;
}

function setupHappyPath(reviews: { id: number }[] | null = null) {
  // 1. Broker lookup
  adminFromMock.mockReturnValueOnce(chain({ data: brokerRow, error: brokerError }));
  // 2. Duplicate check
  adminFromMock.mockReturnValueOnce(chain({ data: reviews }));
  // 3. Insert
  adminFromMock.mockReturnValueOnce(chain({ error: insertError }));
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/user-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isValidEmailMock.mockReturnValue(true);
    rateLimitFn.mockReturnValue(false);
    brokerRow = { id: 1, name: "CommSec", slug: "commsec" };
    brokerError = null;
    insertError = null;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "email-1" }), { status: 200 }));
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/user-review", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when broker_slug is missing", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, broker_slug: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    isValidEmailMock.mockReturnValueOnce(false);
    const res = await POST(makeReq({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is 0 (below range)", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, rating: 0 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/rating/i);
  });

  it("returns 400 when rating is 6 (above range)", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, rating: 6 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is a float (non-integer)", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, rating: 3.5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when display_name is too short (< 2 chars)", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, display_name: "J" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too short (< 3 chars)", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, title: "ok" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when review body is too short (< 10 chars)", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, body: "Short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when a dimension rating is out of 1-5 range", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, fees_rating: 6 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/fees_rating/i);
  });

  it("returns 400 when experience_months is negative", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, experience_months: -1 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/experience_months/i);
  });

  it("returns 429 when rate-limited", async () => {
    rateLimitFn.mockReturnValueOnce(true);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 404 when broker does not exist", async () => {
    // Broker lookup returns null
    adminFromMock.mockReturnValueOnce(chain({ data: null, error: null }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 409 when user has already reviewed this broker recently", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: brokerRow, error: null })); // broker found
    adminFromMock.mockReturnValueOnce(chain({ data: [{ id: 99 }] }));           // duplicate exists
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(409);
  });

  it("returns 500 on DB insert error", async () => {
    insertError = { message: "unique constraint violation" };
    setupHappyPath();
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("returns 200 on success without RESEND_API_KEY — no email sent", async () => {
    delete process.env.RESEND_API_KEY;
    setupHappyPath();
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 200 on success with RESEND_API_KEY — fires verification email", async () => {
    process.env.RESEND_API_KEY = "test-resend-key";
    setupHappyPath();
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const fetchArg = fetchMock.mock.calls[0]?.[0] as string;
    expect(fetchArg).toContain("resend.com");
  });

  it("returns 200 even when Resend email send throws (non-blocking)", async () => {
    process.env.RESEND_API_KEY = "test-resend-key";
    setupHappyPath();
    fetchMock.mockRejectedValueOnce(new Error("network error"));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
  });
});
