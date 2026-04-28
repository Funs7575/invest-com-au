import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "@/__tests__/helpers";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockAdminFrom = vi.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      signInWithOtp: mockSignInWithOtp,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { POST } from "@/app/api/advisor-auth/login/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADVISOR = {
  id: 7,
  name: "Bob",
  email: "bob@example.com",
  status: "active",
  auth_user_id: null as string | null,
};

function makeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "update", "eq", "or", "in"]) c[m] = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = vi.fn((cb: (v: unknown) => void) => {
    cb({ data: null, error: null });
    return Promise.resolve();
  });
  return c;
}

function post(body: Record<string, unknown>) {
  return POST(makeRequest("/api/advisor-auth/login", body));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when email is missing", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Email required" });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const res = await post({ email: "x@x.com" });
    expect(res.status).toBe(429);
  });

  // ── magic mode ───────────────────────────────────────────────────────────────

  it("magic — advisor not found → 200 obfuscated (no OTP sent)", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await post({ email: "nobody@x.com", mode: "magic" });
    expect(res.status).toBe(200);
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it("magic — sends OTP and returns 200 check-email message", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ADVISOR, error: null }));
    mockSignInWithOtp.mockResolvedValueOnce({ error: null });
    const res = await post({ email: "bob@example.com", mode: "magic" });
    expect(res.status).toBe(200);
    expect(mockSignInWithOtp).toHaveBeenCalledOnce();
    expect(await res.json()).toMatchObject({ success: true });
  });

  it("magic — OTP error → 500", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ADVISOR, error: null }));
    mockSignInWithOtp.mockResolvedValueOnce({ error: { message: "SMTP timeout" } });
    const res = await post({ email: "bob@example.com", mode: "magic" });
    expect(res.status).toBe(500);
  });

  // ── password mode ─────────────────────────────────────────────────────────────

  it("password — advisor not found → 404", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await post({ email: "nobody@x.com", mode: "password", password: "pw12345678" });
    expect(res.status).toBe(404);
  });

  it("password — missing password → 400", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ADVISOR, error: null }));
    const res = await post({ email: "bob@example.com", mode: "password" });
    expect(res.status).toBe(400);
  });

  it("password — invalid credentials → 401 with friendly message", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ADVISOR, error: null }));
    mockSignInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid login credentials" },
    });
    const res = await post({ email: "bob@example.com", mode: "password", password: "wrongpw" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Wrong email or password." });
  });

  it("password — success links auth_user_id and returns 200", async () => {
    const chain = makeChain({ data: ADVISOR, error: null });
    mockAdminFrom.mockReturnValue(chain);
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "new-user-uuid" } },
      error: null,
    });
    const res = await post({ email: "bob@example.com", mode: "password", password: "correctpw" });
    expect(res.status).toBe(200);
    expect(chain.update).toHaveBeenCalled();
  });

  // ── signup mode ───────────────────────────────────────────────────────────────

  it("signup — password too short → 400", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ADVISOR, error: null }));
    const res = await post({ email: "bob@example.com", mode: "signup", password: "short" });
    expect(res.status).toBe(400);
  });

  it("signup — auth_user_id already set → 409", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: { ...ADVISOR, auth_user_id: "existing-uuid" }, error: null }),
    );
    const res = await post({ email: "bob@example.com", mode: "signup", password: "longpassword" });
    expect(res.status).toBe(409);
  });

  it("signup — already registered Supabase error → 409", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ADVISOR, error: null }));
    mockSignUp.mockResolvedValueOnce({
      data: null,
      error: { message: "User already registered" },
    });
    const res = await post({ email: "bob@example.com", mode: "signup", password: "longpassword" });
    expect(res.status).toBe(409);
  });

  it("signup — success with session → logged in (needsConfirmation false)", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ADVISOR, error: null }));
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: "new-uuid" }, session: { access_token: "tok" } },
      error: null,
    });
    const res = await post({ email: "bob@example.com", mode: "signup", password: "longpassword" });
    expect(res.status).toBe(200);
    expect((await res.json()).needsConfirmation).toBe(false);
  });

  it("signup — success without session → needsConfirmation true", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ADVISOR, error: null }));
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: "new-uuid" }, session: null },
      error: null,
    });
    const res = await post({ email: "bob@example.com", mode: "signup", password: "longpassword" });
    expect(res.status).toBe(200);
    expect((await res.json()).needsConfirmation).toBe(true);
  });

  // ── edge cases ────────────────────────────────────────────────────────────────

  it("unknown mode → 400", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ADVISOR, error: null }));
    const res = await post({ email: "bob@example.com", mode: "teleport" });
    expect(res.status).toBe(400);
  });

  it("unexpected exception → 500", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("DB exploded");
    });
    const res = await post({ email: "bob@example.com" });
    expect(res.status).toBe(500);
  });
});
