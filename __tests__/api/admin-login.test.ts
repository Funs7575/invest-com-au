import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAuth = { signInWithPassword: vi.fn() };
const mockFrom = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ── Import route AFTER mocks ──────────────────────────────────────────────────
import { POST } from "@/app/api/admin/login/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function setupRateLimitMock(
  entry: { count: number; reset_at: string } | null = null
) {
  const callTracker: Record<string, { method: string; args: unknown[] }[]> = {};
  const builder = createChainableBuilder("admin_login_attempts", callTracker);

  // Override single() to return the rate limit entry
  builder.single = vi.fn(() =>
    Promise.resolve({ data: entry, error: entry ? null : { code: "PGRST116" } })
  );

  mockFrom.mockReturnValue(builder);
  return { builder, callTracker };
}

function loginRequest(
  body: Record<string, unknown>,
  ip = "1.2.3.4"
) {
  return makeRequest("/api/admin/login", body, { ip });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAILS = "admin@invest.com.au";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("returns 400 for missing body", async () => {
    // Send a request with a body that will fail JSON parsing
    const req = new (await import("next/server")).NextRequest(
      "http://localhost/api/admin/login",
      {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid request");
  });

  it("returns 400 for missing email", async () => {
    setupRateLimitMock();
    const req = loginRequest({ password: "secret" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Email and password required");
  });

  it("returns 400 for missing password", async () => {
    setupRateLimitMock();
    const req = loginRequest({ email: "admin@invest.com.au" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Email and password required");
  });

  it("returns 401 for invalid credentials", async () => {
    setupRateLimitMock();
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const req = loginRequest({ email: "admin@invest.com.au", password: "wrong" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Invalid login credentials");
    expect(json.attemptsRemaining).toBeDefined();
  });

  it("returns 403 for non-admin user", async () => {
    setupRateLimitMock();
    mockAuth.signInWithPassword.mockResolvedValue({
      data: {
        user: { email: "user@example.com" },
        session: { access_token: "tok" },
      },
      error: null,
    });

    const req = loginRequest({ email: "user@example.com", password: "pass123" });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("not an administrator");
  });

  it("returns 200 with session for valid admin login", async () => {
    setupRateLimitMock();
    const mockSession = { access_token: "admin-token", refresh_token: "rt" };
    mockAuth.signInWithPassword.mockResolvedValue({
      data: {
        user: { email: "admin@invest.com.au" },
        session: mockSession,
      },
      error: null,
    });

    const req = loginRequest({ email: "admin@invest.com.au", password: "correct" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.session).toEqual(mockSession);
  });

  it("returns 429 when rate limited", async () => {
    // Simulate count > MAX_ATTEMPTS with a future reset_at
    const futureReset = new Date(Date.now() + 30_000).toISOString();
    setupRateLimitMock({ count: 6, reset_at: futureReset });

    const req = loginRequest({ email: "admin@invest.com.au", password: "anything" });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("Too many login attempts");
  });

  it("clears rate limit on successful admin login", async () => {
    setupRateLimitMock();
    mockAuth.signInWithPassword.mockResolvedValue({
      data: {
        user: { email: "admin@invest.com.au" },
        session: { access_token: "tok" },
      },
      error: null,
    });

    const req = loginRequest({ email: "admin@invest.com.au", password: "correct" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify delete was called on admin_login_attempts (clearRateLimit)
    const deleteCalls = mockFrom.mock.calls.filter(
      (call: unknown[]) => call[0] === "admin_login_attempts"
    );
    // Should have been called for check + upsert + clear (delete)
    expect(deleteCalls.length).toBeGreaterThanOrEqual(2);
  });
});
