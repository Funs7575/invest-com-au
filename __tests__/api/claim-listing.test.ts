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

import { POST } from "@/app/api/claim-listing/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_BODY = {
  claim_type: "broker",
  target_slug: "acme-brokers",
  full_name: "Jane Smith",
  email: "jane@example.com",
  company_role: "Director",
  phone: "0412345678",
  message: "I am the registered owner of this brokerage.",
};

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/claim-listing", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

function setupInsert(error: { message: string } | null = null) {
  const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};
  const chain = createChainableBuilder("listing_claims", supabaseCalls);
  chain.then = vi.fn((cb: (v: { data: null; error: typeof error; count: number }) => void) => {
    cb({ data: null, error, count: 0 });
    return Promise.resolve();
  });
  mockAdminFrom.mockReturnValue(chain);
  return supabaseCalls;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/claim-listing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockFetch.mockResolvedValue({ ok: true });
    delete process.env.RESEND_API_KEY;
    delete process.env.LEADS_NOTIFY_EMAIL;
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("returns 400 on invalid JSON", async () => {
    setupInsert();
    const res = await POST(makePost("not-json"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/json/i);
  });

  it("returns 400 for invalid claim_type", async () => {
    setupInsert();
    const res = await POST(makePost({ ...VALID_BODY, claim_type: "invalid" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/claim_type/i);
  });

  it("accepts all valid claim_type values", async () => {
    for (const type of ["broker", "advisor", "listing"]) {
      setupInsert();
      const res = await POST(makePost({ ...VALID_BODY, claim_type: type }));
      expect(res.status).toBe(200);
    }
  });

  it("returns 400 when target_slug is empty", async () => {
    setupInsert();
    const res = await POST(makePost({ ...VALID_BODY, target_slug: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when target_slug exceeds 200 chars", async () => {
    setupInsert();
    const res = await POST(makePost({ ...VALID_BODY, target_slug: "a".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when full_name is too short (< 2 chars)", async () => {
    setupInsert();
    const res = await POST(makePost({ ...VALID_BODY, full_name: "X" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/name/i);
  });

  it("returns 400 when full_name exceeds 120 chars", async () => {
    setupInsert();
    const res = await POST(makePost({ ...VALID_BODY, full_name: "A".repeat(121) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    setupInsert();
    const res = await POST(makePost({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 500 when DB insert fails", async () => {
    setupInsert({ message: "constraint violation" });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("returns 200 with success=true on valid submission", async () => {
    setupInsert();
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("inserts all required fields into listing_claims", async () => {
    const supabaseCalls = setupInsert();
    await POST(makePost(VALID_BODY));

    const insertCall = supabaseCalls["listing_claims"]?.find(
      (c) => c.method === "insert",
    );
    const args = insertCall?.args[0] as Record<string, unknown>;
    expect(args.claim_type).toBe("broker");
    expect(args.target_slug).toBe("acme-brokers");
    expect(args.full_name).toBe("Jane Smith");
    expect(args.email).toBe("jane@example.com");
  });

  it("trims optional fields before DB insert", async () => {
    const supabaseCalls = setupInsert();
    await POST(makePost({
      ...VALID_BODY,
      company_role: "  CEO  ",
      phone: "  0400111222  ",
      message: "  Hello  ",
    }));

    const insertCall = supabaseCalls["listing_claims"]?.find(
      (c) => c.method === "insert",
    );
    const args = insertCall?.args[0] as Record<string, unknown>;
    expect(args.company_role).toBe("CEO");
    expect(args.phone).toBe("0400111222");
    expect(args.message).toBe("Hello");
  });

  it("stores null for optional fields when absent", async () => {
    const supabaseCalls = setupInsert();
    const body = { claim_type: "advisor", target_slug: "my-advisor", full_name: "Jo Smith", email: "jo@example.com" };
    await POST(makePost(body));

    const insertCall = supabaseCalls["listing_claims"]?.find(
      (c) => c.method === "insert",
    );
    const args = insertCall?.args[0] as Record<string, unknown>;
    expect(args.company_role).toBeNull();
    expect(args.phone).toBeNull();
    expect(args.message).toBeNull();
  });

  it("fire-and-forget admin notification sent when RESEND vars set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.LEADS_NOTIFY_EMAIL = "admin@invest.com.au";
    setupInsert();

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);

    // Allow micro-task queue to flush the void promise
    await new Promise((r) => setTimeout(r, 0));

    const resendCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === "string" && (call[0] as string).includes("resend.com"),
    );
    expect(resendCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("includes IP in rate limit key", async () => {
    setupInsert();
    await POST(makePost(VALID_BODY, "7.7.7.7"));
    const key = mockIsRateLimited.mock.calls[0]?.[0] as string;
    expect(key).toContain("7.7.7.7");
  });
});
