import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

const mockIsSuppressed = vi.fn();
vi.mock("@/lib/email-suppression", () => ({
  isSuppressed: (...args: unknown[]) => mockIsSuppressed(...args),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST, GET } from "@/app/api/rate-alerts/route";

function makePost(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/rate-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/rate-alerts");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function makeUpsertBuilder(error: unknown = null) {
  return { upsert: vi.fn(() => Promise.resolve({ error })) };
}

function makeUpdateDeleteBuilder() {
  const b: Record<string, unknown> = {};
  b.update = vi.fn(() => b);
  b.delete = vi.fn(() => b);
  b.eq = vi.fn(() => Promise.resolve({ error: null }));
  return b;
}

beforeEach(() => {
  mockIsRateLimited.mockResolvedValue(false);
  mockIsSuppressed.mockResolvedValue(false);
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  process.env.RESEND_API_KEY = "test-resend-key";
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/rate-alerts", () => {
  it("rejects with 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/rate-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects with 400 when product_kind is unknown", async () => {
    const res = await POST(
      makePost({ email: "u@example.com", product_kind: "share_broker", threshold_pct: 5 }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects with 400 when threshold_pct is out of range", async () => {
    const res = await POST(
      makePost({ email: "u@example.com", product_kind: "savings_account", threshold_pct: 75 }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(
      makePost({ email: "u@example.com", product_kind: "savings_account", threshold_pct: 5 }),
    );
    expect(res.status).toBe(429);
  });

  it("silently 200s the honeypot path", async () => {
    const res = await POST(
      makePost({
        email: "u@example.com",
        product_kind: "savings_account",
        threshold_pct: 5,
        website: "spam",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockServerFrom).not.toHaveBeenCalled();
  });

  it("silently 200s when the email is on the suppression list", async () => {
    mockIsSuppressed.mockResolvedValueOnce(true);
    const res = await POST(
      makePost({ email: "blocked@example.com", product_kind: "savings_account", threshold_pct: 5 }),
    );
    expect(res.status).toBe(200);
    expect(mockServerFrom).not.toHaveBeenCalled();
  });

  it("upserts the subscription on a clean POST and sends a verification email", async () => {
    const builder = makeUpsertBuilder(null);
    mockServerFrom.mockReturnValueOnce(builder);

    const res = await POST(
      makePost({ email: "u@example.com", product_kind: "savings_account", threshold_pct: 5.25 }),
    );

    expect(res.status).toBe(200);
    expect(mockServerFrom).toHaveBeenCalledWith("rate_alert_subscriptions");
    expect(builder.upsert).toHaveBeenCalledTimes(1);
    const call = builder.upsert.mock.calls[0] as unknown as [Record<string, unknown>, Record<string, unknown>];
    const [payload, opts] = call;
    expect(payload.threshold_bps).toBe(525);
    expect(payload.email).toBe("u@example.com");
    expect(payload.product_kind).toBe("savings_account");
    expect(payload.verified).toBe(false);
    expect(opts).toEqual({ onConflict: "email,product_kind" });
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.any(Object));
  });

  it("returns 500 when the upsert fails", async () => {
    mockServerFrom.mockReturnValueOnce(makeUpsertBuilder({ message: "boom" }));
    const res = await POST(
      makePost({ email: "u@example.com", product_kind: "term_deposit", threshold_pct: 4.0 }),
    );
    expect(res.status).toBe(500);
  });

  it("succeeds even when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    mockServerFrom.mockReturnValueOnce(makeUpsertBuilder(null));
    const res = await POST(
      makePost({ email: "u@example.com", product_kind: "term_deposit", threshold_pct: 4.5 }),
    );
    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("GET /api/rate-alerts (verify / unsubscribe)", () => {
  it("returns 400 when neither token is supplied", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
  });

  it("marks a row verified when verify token is supplied", async () => {
    const builder = makeUpdateDeleteBuilder();
    mockServerFrom.mockReturnValueOnce(builder);
    const res = await GET(makeGet({ verify: "abc123" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("verified");
    expect(builder.update).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("verify_token", "abc123");
  });

  it("deletes a row when unsubscribe token is supplied", async () => {
    const builder = makeUpdateDeleteBuilder();
    mockServerFrom.mockReturnValueOnce(builder);
    const res = await GET(makeGet({ unsubscribe: "xyz789" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("unsubscribed");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("unsubscribe_token", "xyz789");
  });
});
