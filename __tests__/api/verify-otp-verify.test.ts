import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { POST } from "@/app/api/verify-otp/verify/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/verify-otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const FUTURE = new Date(Date.now() + 10 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

/**
 * Returns a chain that supports:
 *  - .select().eq().is().order().limit().maybeSingle() → resolves to maybeSingleResult
 *  - .update().eq() → awaitable (thenable)
 */
function makeChain(maybeSingleResult: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "is", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() => Promise.resolve(maybeSingleResult));
  // Makes `await chain` resolve (used for the update().eq() expression)
  c.then = vi.fn((resolve: (v: unknown) => void) => {
    resolve({});
    return Promise.resolve({});
  });
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/verify-otp/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makePost({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Too many") });
  });

  it("passes IP-keyed rate limit args (10 per 5 min)", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    await POST(makePost({ email: "a@b.com", code: "111111" }, "5.5.5.5"));
    expect(mockIsRateLimited).toHaveBeenCalledWith("otp-verify:5.5.5.5", 10, 5);
  });

  it("returns 400 for malformed JSON body", async () => {
    const req = new NextRequest("http://localhost/api/verify-otp/verify", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid request" });
  });

  it("returns 400 when code field is missing", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makePost({ email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Email and code required" });
  });

  it("returns 400 when no active OTP is found for the email", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makePost({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("No active code") });
  });

  it("returns 400 when OTP is expired", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: { id: 1, code: "123456", expires_at: PAST, used_at: null }, error: null })
    );
    const res = await POST(makePost({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("expired") });
  });

  it("returns 400 when submitted code does not match stored code", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: { id: 1, code: "999999", expires_at: FUTURE, used_at: null }, error: null })
    );
    const res = await POST(makePost({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Incorrect") });
  });

  it("returns 200 { success, verified } and marks OTP used when code matches", async () => {
    const chain = makeChain({
      data: { id: 42, code: "123456", expires_at: FUTURE, used_at: null },
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    const res = await POST(makePost({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, verified: true });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ used_at: expect.any(String) })
    );
    expect(chain.eq).toHaveBeenCalledWith("id", 42);
  });

  it("normalizes email to lowercase before querying the DB", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    await POST(makePost({ email: "ALICE@EXAMPLE.COM", code: "000000" }));
    expect(chain.eq).toHaveBeenCalledWith("email", "alice@example.com");
  });
});
