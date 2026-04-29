import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: (...args: unknown[]) => mockServerFrom(...args) }),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST, GET } from "@/app/api/fee-alerts/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/fee-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/fee-alerts");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function makeUpsertBuilder(error: unknown = null) {
  return {
    upsert: vi.fn(() => Promise.resolve({ error })),
  };
}

function makeUpdateDeleteBuilder() {
  const b: Record<string, unknown> = {};
  b.update = vi.fn(() => b);
  b.delete = vi.fn(() => b);
  b.eq = vi.fn(() => Promise.resolve({ error: null }));
  return b;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/fee-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    process.env.RESEND_API_KEY = "re_test_key";
    mockServerFrom.mockReturnValue(makeUpsertBuilder());
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ email: "user@example.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makePost({ brokerSlugs: ["stake"] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it("returns 200 and upserts subscription on success", async () => {
    const builder = makeUpsertBuilder();
    mockServerFrom.mockReturnValue(builder);
    const res = await POST(makePost({ email: "user@example.com", brokerSlugs: ["stake"] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.com" }),
      expect.any(Object),
    );
  });

  it("returns 500 when DB upsert fails", async () => {
    mockServerFrom.mockReturnValue(makeUpsertBuilder({ message: "insert failed" }));
    const res = await POST(makePost({ email: "user@example.com" }));
    expect(res.status).toBe(500);
  });

  it("sends verification email via Resend when API key is set", async () => {
    await POST(makePost({ email: "user@example.com" }));
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("skips verification email when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;
    await POST(makePost({ email: "user@example.com" }));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("defaults alertType and frequency when not provided", async () => {
    const builder = makeUpsertBuilder();
    mockServerFrom.mockReturnValue(builder);
    await POST(makePost({ email: "user@example.com" }));
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ alert_type: "any", frequency: "instant" }),
      expect.any(Object),
    );
  });
});

describe("GET /api/fee-alerts (verify/unsubscribe)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServerFrom.mockReturnValue(makeUpdateDeleteBuilder());
  });

  it("returns 400 when no token is provided", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
  });

  it("marks subscription as verified on verify param", async () => {
    const builder = makeUpdateDeleteBuilder();
    mockServerFrom.mockReturnValue(builder);
    const res = await GET(makeGet({ verify: "abc123" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.action).toBe("verified");
    expect(builder.update).toHaveBeenCalledWith({ verified: true });
  });

  it("deletes subscription on unsubscribe param", async () => {
    const builder = makeUpdateDeleteBuilder();
    mockServerFrom.mockReturnValue(builder);
    const res = await GET(makeGet({ unsubscribe: "tok123" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.action).toBe("unsubscribed");
    expect(builder.delete).toHaveBeenCalled();
  });
});
