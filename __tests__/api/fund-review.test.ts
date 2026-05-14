import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

let fundRow: { id: number; title: string; slug: string } | null = { id: 1, title: "Pengana Fund", slug: "pengana-fund" };
let fundError: { message: string } | null = null;
let insertError: { message: string } | null = null;

const adminFromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: adminFromMock })),
}));

const fetchMock = vi.fn<(input: unknown, init?: unknown) => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

import { POST } from "@/app/api/fund-review/route";

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/fund-review", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9" },
  });
}

const VALID_BODY = {
  fund_slug: "pengana-fund",
  display_name: "Jane Doe",
  email: "jane@example.com",
  rating: 5,
  title: "Great fund",
  body: "I have held this fund for 3 years and the manager has been transparent.",
};

function chain(result: unknown): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "limit", "insert"]) {
    b[m] = vi.fn(() => b);
  }
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (cb: (v: unknown) => void) => { cb(result); return Promise.resolve(); };
  return b;
}

function setupHappyPath(existing: { id: number }[] | null = null) {
  adminFromMock.mockReturnValueOnce(chain({ data: fundRow, error: fundError }));
  adminFromMock.mockReturnValueOnce(chain({ data: existing }));
  adminFromMock.mockReturnValueOnce(chain({ error: insertError }));
}

describe("POST /api/fund-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isValidEmailMock.mockReturnValue(true);
    rateLimitFn.mockReturnValue(false);
    fundRow = { id: 1, title: "Pengana Fund", slug: "pengana-fund" };
    fundError = null;
    insertError = null;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "email-1" }), { status: 200 }));
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/fund-review", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when fund_slug is missing", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, fund_slug: undefined }));
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
    const res = await POST(makeReq({ ...VALID_BODY, performance_rating: 6 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/performance_rating/i);
  });

  it("returns 400 when hold_period_months is negative", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, hold_period_months: -1 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/hold_period_months/i);
  });

  it("returns 429 when rate-limited", async () => {
    rateLimitFn.mockReturnValueOnce(true);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 404 when fund does not exist", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: null, error: null }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 409 when user has already reviewed this fund recently", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: fundRow, error: null }));
    adminFromMock.mockReturnValueOnce(chain({ data: [{ id: 99 }] }));
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

  it("HTML-escapes display_name + fund title in verification email", async () => {
    process.env.RESEND_API_KEY = "test-resend-key";
    fundRow = { id: 1, title: "Evil <img src=x onerror=alert(1)> Fund", slug: "pengana-fund" };
    setupHappyPath();
    const res = await POST(makeReq({ ...VALID_BODY, display_name: "<script>alert(1)</script> Mallory" }));
    expect(res.status).toBe(200);
    const fetchBody = JSON.parse((fetchMock.mock.calls[0]?.[1] as { body: string }).body);
    expect(fetchBody.html).not.toContain("<script>");
    expect(fetchBody.html).not.toContain("<img src=x");
    expect(fetchBody.html).toContain("&lt;script&gt;");
    expect(fetchBody.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});
