import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (email: unknown) => typeof email === "string" && email.includes("@"),
}));

const mockCreateRateLimiter = vi.hoisted(() => vi.fn<() => boolean>().mockReturnValue(false));
vi.mock("@/lib/rate-limiter", () => ({
  createRateLimiter: vi.fn(() => mockCreateRateLimiter),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/switch-story/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_BODY = {
  source_broker_slug: "commsec",
  dest_broker_slug: "stake",
  display_name: "Jane Smith",
  email: "jane@example.com",
  title: "Best switch ever",
  body: "Moved to Stake and it was great experience.",
  source_rating: 3,
  dest_rating: 5,
};

const SOURCE_BROKER = { id: 1, name: "CommSec", slug: "commsec" };
const DEST_BROKER = { id: 2, name: "Stake", slug: "stake" };

function makeRequest(body: unknown, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/switch-story", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "limit", "insert"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/switch-story", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRateLimiter.mockReturnValue(false); // not rate limited by default
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    process.env.RESEND_API_KEY = "re_test";
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/switch-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  it("returns 400 when source broker slug is missing", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, source_broker_slug: undefined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/source broker is required/i);
  });

  it("returns 400 when source and dest are the same broker", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, dest_broker_slug: "commsec" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/must be different/i);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/valid email/i);
  });

  it("returns 400 for source_rating out of 1-5 range", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, source_rating: 6 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/source broker rating must be 1-5/i);
  });

  it("returns 400 when display_name is too short", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, display_name: "A" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/display name/i);
  });

  it("returns 400 when story body is too short", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, body: "Short." }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/story body.*required/i);
  });

  it("returns 429 when rate limit is hit", async () => {
    mockCreateRateLimiter.mockReturnValue(true);

    // Set up brokers to pass validation
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call <= 2) return makeChain({ data: call === 1 ? SOURCE_BROKER : DEST_BROKER, error: null });
      return makeChain({ data: [], error: null });
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 404 when source broker not found", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: null, error: null }); // source not found
      return makeChain({ data: DEST_BROKER, error: null });
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/source broker not found/i);
  });

  it("returns 409 when duplicate story already exists", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call <= 2) return makeChain({ data: call === 1 ? SOURCE_BROKER : DEST_BROKER, error: null });
      // duplicate check returns existing
      return makeChain({ data: [{ id: 99 }], error: null });
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already shared a story/i);
  });

  it("submits story and sends verification email", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: SOURCE_BROKER, error: null });
      if (call === 2) return makeChain({ data: DEST_BROKER, error: null });
      if (call === 3) return makeChain({ data: [], error: null }); // no duplicate
      return makeChain({ data: null, error: null });               // insert
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns 200 even when verification email fails (non-blocking)", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: SOURCE_BROKER, error: null });
      if (call === 2) return makeChain({ data: DEST_BROKER, error: null });
      if (call === 3) return makeChain({ data: [], error: null });
      return makeChain({ data: null, error: null });
    });
    mockFetch.mockRejectedValue(new Error("Resend down"));

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 when DB insert fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: SOURCE_BROKER, error: null });
      if (call === 2) return makeChain({ data: DEST_BROKER, error: null });
      if (call === 3) return makeChain({ data: [], error: null });
      // insert fails
      return makeChain({ data: null, error: { message: "insert error" } });
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to submit/i);
  });
});
