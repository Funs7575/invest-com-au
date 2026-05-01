import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
const mockIsValidEmail = vi.fn();
const mockIsDisposableEmail = vi.fn();
const mockFrom = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (...args: unknown[]) => mockIsValidEmail(...args),
  isDisposableEmail: (...args: unknown[]) => mockIsDisposableEmail(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.stubGlobal("fetch", mockFetch);

// ── Import after mocks ────────────────────────────────────────────────────────

import { POST } from "@/app/api/verify-otp/send/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/verify-otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

// Chainable builder that is thenable so `await chain` resolves.
function makeChain() {
  const c: Record<string, unknown> = {};
  for (const m of ["update", "insert", "eq", "is"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = vi.fn((resolve: (v: unknown) => void) => {
    resolve({});
    return Promise.resolve({});
  });
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/verify-otp/send", () => {
  let savedKey: string | undefined;
  let savedEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    savedKey = process.env.RESEND_API_KEY;
    savedEnv = process.env.NODE_ENV;
    delete process.env.RESEND_API_KEY;
    // Default to dev-mode behavior so existing test cases keep working.
    vi.stubEnv("NODE_ENV", "test");
    mockIsRateLimited.mockResolvedValue(false);
    mockIsValidEmail.mockReturnValue(true);
    mockIsDisposableEmail.mockReturnValue(false);
    mockFrom.mockReturnValue(makeChain());
    mockFetch.mockResolvedValue({ ok: true, text: async () => "" });
  });

  afterEach(() => {
    if (savedKey !== undefined) process.env.RESEND_API_KEY = savedKey;
    else delete process.env.RESEND_API_KEY;
    vi.unstubAllEnvs();
    if (savedEnv !== undefined) vi.stubEnv("NODE_ENV", savedEnv);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makePost({ email: "a@b.com" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Too many") });
  });

  it("passes IP-keyed rate limit args (5 per 10 min)", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    await POST(makePost({ email: "a@b.com" }, "10.0.0.1"));
    expect(mockIsRateLimited).toHaveBeenCalledWith("otp-send:10.0.0.1", 5, 10);
  });

  it("returns 400 for malformed JSON body", async () => {
    const req = new NextRequest("http://localhost/api/verify-otp/send", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid request" });
  });

  it("returns 400 for invalid email", async () => {
    mockIsValidEmail.mockReturnValueOnce(false);
    const res = await POST(makePost({ email: "not-valid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for disposable email", async () => {
    mockIsDisposableEmail.mockReturnValueOnce(true);
    const res = await POST(makePost({ email: "x@mailnull.com" }));
    expect(res.status).toBe(400);
  });

  it("invalidates previous unused OTPs for the same email", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await POST(makePost({ email: "alice@example.com" }));
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ used_at: expect.any(String) })
    );
    expect(chain.is).toHaveBeenCalledWith("used_at", null);
  });

  it("inserts new OTP with correct structure (6-digit code, 10-min expiry)", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await POST(makePost({ email: "alice@example.com" }));
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "alice@example.com",
        code: expect.stringMatching(/^\d{6}$/),
        expires_at: expect.any(String),
      })
    );
    const insertCall = (chain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    const expiry = new Date(insertCall.expires_at as string).getTime();
    expect(expiry).toBeGreaterThan(Date.now() + 9 * 60 * 1000);
    expect(expiry).toBeLessThan(Date.now() + 11 * 60 * 1000);
  });

  it("normalizes email to lowercase before DB operations", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await POST(makePost({ email: "Alice@EXAMPLE.COM" }));
    expect(chain.eq).toHaveBeenCalledWith("email", "alice@example.com");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@example.com" })
    );
  });

  it("does not call fetch when RESEND_API_KEY is absent", async () => {
    await POST(makePost({ email: "a@b.com" }));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls Resend API when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockFetch.mockResolvedValueOnce({ ok: true });
    await POST(makePost({ email: "a@b.com" }));
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns 200 with devSkipped flag in dev when key absent", async () => {
    const res = await POST(makePost({ email: "a@b.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, devSkipped: true });
  });

  it("returns 200 { success: true } on successful send", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "" });
    const res = await POST(makePost({ email: "a@b.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns 503 in production when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await POST(makePost({ email: "a@b.com" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("not configured") });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 502 when Resend responds non-OK", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => '{"name":"validation_error","message":"domain not verified"}',
    });
    const res = await POST(makePost({ email: "a@b.com" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("couldn't send") });
  });

  it("returns 502 when Resend fetch throws", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    const res = await POST(makePost({ email: "a@b.com" }));
    expect(res.status).toBe(502);
  });
});
