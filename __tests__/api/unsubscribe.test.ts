import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
const mockAdminFrom = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/unsubscribe/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/unsubscribe", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

function setupTables(options: {
  captureIds?: { id: string }[];
  profileIds?: { id: string }[];
} = {}) {
  const { captureIds = null, profileIds = null } = options;
  const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

  mockAdminFrom.mockImplementation((table: string) => {
    const chain = createChainableBuilder(table, supabaseCalls);
    chain.then = vi.fn(
      (cb: (v: { data: unknown; error: null; count: number }) => void) => {
        if (table === "email_captures") {
          cb({ data: captureIds, error: null, count: captureIds?.length ?? 0 });
        } else if (table === "profiles") {
          cb({ data: profileIds, error: null, count: profileIds?.length ?? 0 });
        } else {
          cb({ data: null, error: null, count: 0 });
        }
        return Promise.resolve();
      },
    );
    return chain;
  });

  return supabaseCalls;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/unsubscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockFetch.mockResolvedValue({ ok: true });
    delete process.env.RESEND_API_KEY;
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ email: "user@example.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    setupTables();
    const res = await POST(makePost("not-json"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/json/i);
  });

  it("returns 400 when email is missing", async () => {
    setupTables();
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
  });

  it("returns 400 when email has no @ sign", async () => {
    setupTables();
    const res = await POST(makePost({ email: "notanemail" }));
    expect(res.status).toBe(400);
  });

  it("includes IP in rate limit key", async () => {
    setupTables();
    await POST(makePost({ email: "user@example.com" }, "5.5.5.5"));
    const key = mockIsRateLimited.mock.calls[0]?.[0] as string;
    expect(key).toContain("5.5.5.5");
  });

  it("always returns success even when email not found", async () => {
    setupTables(); // captureIds = null → updated = false
    const res = await POST(makePost({ email: "ghost@example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("updates email_captures with unsubscribed=true and newsletter_opt_in=false", async () => {
    const supabaseCalls = setupTables({ captureIds: [{ id: "cap-1" }] });
    await POST(makePost({ email: "user@example.com" }));

    const updateCall = supabaseCalls["email_captures"]?.find(
      (c) => c.method === "update",
    );
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.unsubscribed).toBe(true);
    expect(updateArgs.newsletter_opt_in).toBe(false);
  });

  it("updates quiz_leads with unsubscribed=true", async () => {
    const supabaseCalls = setupTables({ captureIds: [{ id: "cap-1" }] });
    await POST(makePost({ email: "user@example.com" }));

    const updateCall = supabaseCalls["quiz_leads"]?.find(
      (c) => c.method === "update",
    );
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.unsubscribed).toBe(true);
  });

  it("marks demand-alert prospects unsubscribed, scoped to the demand-alert prefix", async () => {
    const supabaseCalls = setupTables({ captureIds: [{ id: "cap-1" }] });
    await POST(makePost({ email: "user@example.com" }));

    const calls = supabaseCalls["prospects"] ?? [];
    const updateCall = calls.find((c) => c.method === "update");
    expect((updateCall?.args[0] as Record<string, unknown>).status).toBe("unsubscribed");
    // Scoping filters protect BD-agent-owned prospects rows.
    const likeCall = calls.find((c) => c.method === "like");
    expect(likeCall?.args).toEqual(["external_id", "demand-alert:%"]);
    const eqCalls = calls.filter((c) => c.method === "eq");
    expect(eqCalls.map((c) => c.args)).toContainEqual(["source", "other"]);
    expect(eqCalls.map((c) => c.args)).toContainEqual(["contact_email", "user@example.com"]);
  });

  it("updates profiles email preferences when account exists", async () => {
    const supabaseCalls = setupTables({
      captureIds: [{ id: "cap-1" }],
      profileIds: [{ id: "prof-1" }],
    });
    await POST(makePost({ email: "user@example.com" }));

    const updateCall = supabaseCalls["profiles"]?.find(
      (c) => c.method === "update",
    );
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.email_newsletter).toBe(false);
    expect(updateArgs.email_fee_alerts).toBe(false);
    expect(updateArgs.email_deal_alerts).toBe(false);
    expect(updateArgs.email_weekly_digest).toBe(false);
  });

  it("sanitizes email to lowercase and trimmed before DB operations", async () => {
    const supabaseCalls = setupTables({ captureIds: [{ id: "cap-1" }] });
    await POST(makePost({ email: "  User@EXAMPLE.COM  " }));

    const eqCall = supabaseCalls["email_captures"]?.find(
      (c) => c.method === "eq",
    );
    expect(eqCall?.args[1]).toBe("user@example.com");
  });

  it("calls Resend Contacts sync when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    setupTables({ captureIds: [{ id: "cap-1" }] });
    await POST(makePost({ email: "user@example.com" }));

    const resendCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === "string" && (call[0] as string).includes("resend.com"),
    );
    expect(resendCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("does not call Resend when RESEND_API_KEY is absent", async () => {
    setupTables({ captureIds: [{ id: "cap-1" }] });
    await POST(makePost({ email: "user@example.com" }));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns success message referencing Invest.com.au when email found", async () => {
    setupTables({ captureIds: [{ id: "cap-1" }] });
    const res = await POST(makePost({ email: "user@example.com" }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/Invest\.com\.au/i);
  });
});
