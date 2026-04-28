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

function setupHappyPath(insertErr: unknown = null) {
  serverFromMock.mockReturnValueOnce(chain({ data: { id: "pro-1", name: "Bob", slug: "bob-sydney" } }));
  serverFromMock.mockReturnValueOnce(chain({ data: [] })); // duplicate check
  serverFromMock.mockReturnValueOnce(chain({ error: insertErr })); // insert
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
    setupHappyPath({ message: "db error" });
    expect((await POST(makeReq(VALID))).status).toBe(500);
  });

  it("returns 200 on success without RESEND_API_KEY — no email sent", async () => {
    setupHappyPath();
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 200 with RESEND_API_KEY — fires admin email", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    setupHappyPath();
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((fetchMock.mock.calls[0]?.[0] as unknown as string)).toContain("resend.com");
  });

  it("returns 200 even when Resend email send throws (non-blocking catch)", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    setupHappyPath();
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    expect((await POST(makeReq(VALID))).status).toBe(200);
  });

  it("auto-flags reviews containing profanity (status=flagged)", async () => {
    setupHappyPath();
    const body = "This advisor is a complete bastard and I hate them so much and would not recommend.";
    const res = await POST(makeReq({ ...VALID, body }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/reviewed by our team/i);
  });

  it("auto-flags reviews containing spam URLs (status=flagged)", async () => {
    setupHappyPath();
    const body = "Check out https://spam.example.com for better advice — this advisor is merely adequate for daily use.";
    const res = await POST(makeReq({ ...VALID, body }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/reviewed by our team/i);
  });

  it("skips duplicate check when no reviewer_email provided", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: { id: "pro-1", name: "Bob", slug: "bob" } }));
    serverFromMock.mockReturnValueOnce(chain({ error: null })); // insert (no dup check)
    const res = await POST(makeReq({ ...VALID, reviewer_email: undefined }));
    expect(res.status).toBe(200);
  });
});
