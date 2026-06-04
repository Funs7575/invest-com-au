import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockServerFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServerFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  }),
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

function makeInsertBuilder(error: unknown = null) {
  return { insert: vi.fn(() => Promise.resolve({ error })) };
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
  // Default to an anonymous visitor — the common subscribe path.
  mockGetUser.mockResolvedValue({ data: { user: null } });
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

  it("inserts (not upserts) for an anonymous subscriber and sends a verification email", async () => {
    // Anon RLS grants INSERT only — an upsert would 500. The route must
    // .insert() for unauthenticated visitors.
    const builder = makeInsertBuilder(null);
    mockServerFrom.mockReturnValueOnce(builder);

    const res = await POST(
      makePost({ email: "u@example.com", product_kind: "savings_account", threshold_pct: 5.25 }),
    );

    expect(res.status).toBe(200);
    expect(mockServerFrom).toHaveBeenCalledWith("rate_alert_subscriptions");
    expect(builder.insert).toHaveBeenCalledTimes(1);
    const call = builder.insert.mock.calls[0] as unknown as [Record<string, unknown>];
    const [payload] = call;
    expect(payload.threshold_bps).toBe(525);
    expect(payload.email).toBe("u@example.com");
    expect(payload.product_kind).toBe("savings_account");
    expect(payload.verified).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.any(Object));
  });

  it("treats a duplicate (23505) anon insert as success (200, not 500)", async () => {
    // Re-subscribing the same (email, product_kind) hits the unique index.
    // A unique-violation means "already subscribed" — report 200, not 500.
    const builder = makeInsertBuilder({ code: "23505", message: "duplicate key value" });
    mockServerFrom.mockReturnValueOnce(builder);

    const res = await POST(
      makePost({ email: "dupe@example.com", product_kind: "savings_account", threshold_pct: 5 }),
    );

    expect(res.status).toBe(200);
    expect(builder.insert).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when an anon insert fails with a non-23505 error", async () => {
    mockServerFrom.mockReturnValueOnce(
      makeInsertBuilder({ code: "42501", message: "permission denied" }),
    );
    const res = await POST(
      makePost({ email: "u@example.com", product_kind: "term_deposit", threshold_pct: 4.0 }),
    );
    expect(res.status).toBe(500);
  });

  it("upserts for an authenticated subscriber (FOR ALL policy permits it)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    const builder = makeUpsertBuilder(null);
    mockServerFrom.mockReturnValueOnce(builder);

    const res = await POST(
      makePost({ email: "auth@example.com", product_kind: "term_deposit", threshold_pct: 4.5 }),
    );

    expect(res.status).toBe(200);
    expect(builder.upsert).toHaveBeenCalledTimes(1);
    const call = builder.upsert.mock.calls[0] as unknown as [Record<string, unknown>, Record<string, unknown>];
    const [payload, opts] = call;
    expect(payload.threshold_bps).toBe(450);
    expect(opts).toEqual({ onConflict: "email,product_kind" });
  });

  it("returns 500 when an authenticated upsert fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    mockServerFrom.mockReturnValueOnce(makeUpsertBuilder({ message: "boom" }));
    const res = await POST(
      makePost({ email: "auth@example.com", product_kind: "term_deposit", threshold_pct: 4.0 }),
    );
    expect(res.status).toBe(500);
  });

  it("succeeds even when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    mockServerFrom.mockReturnValueOnce(makeInsertBuilder(null));
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
