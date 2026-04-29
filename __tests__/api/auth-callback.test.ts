import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

const mockIdentifyUser = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/posthog/server", () => ({
  identifyUser: (...a: unknown[]) => mockIdentifyUser(...a),
}));

const mockExchangeCode = vi.fn();
const mockVerifyOtp = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: (...a: unknown[]) => mockExchangeCode(...a),
        verifyOtp: (...a: unknown[]) => mockVerifyOtp(...a),
        getUser: () => mockGetUser(),
      },
    })
  ),
}));

import { GET } from "@/app/auth/callback/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/auth/callback");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const MOCK_USER = { id: "user-abc123", email: "user@example.com" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
  });

  it("redirects to auth-error when error param present", async () => {
    const res = await GET(makeReq({ error: "access_denied", error_code: "otp_expired" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("auth-error");
    expect(mockIdentifyUser).not.toHaveBeenCalled();
  });

  it("redirects to auth-error when PKCE exchangeCodeForSession fails", async () => {
    mockExchangeCode.mockResolvedValue({ error: { message: "Invalid code", status: 400 } });
    const res = await GET(makeReq({ code: "bad-code" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("auth-error");
    expect(mockIdentifyUser).not.toHaveBeenCalled();
  });

  it("calls identifyUser and redirects to /account on PKCE success", async () => {
    mockExchangeCode.mockResolvedValue({ error: null });
    const res = await GET(makeReq({ code: "valid-code" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/account");
    expect(mockIdentifyUser).toHaveBeenCalledWith(MOCK_USER.id, { email: MOCK_USER.email });
  });

  it("calls identifyUser with custom next path on PKCE success", async () => {
    mockExchangeCode.mockResolvedValue({ error: null });
    const res = await GET(makeReq({ code: "valid-code", next: "/advisor-portal" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/advisor-portal");
    expect(mockIdentifyUser).toHaveBeenCalled();
  });

  it("does not call identifyUser when user is null after PKCE success", async () => {
    mockExchangeCode.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeReq({ code: "valid-code" }));
    expect(res.status).toBe(307);
    expect(mockIdentifyUser).not.toHaveBeenCalled();
  });

  it("redirects to auth-error when verifyOtp fails", async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: "OTP expired", status: 400 } });
    const res = await GET(makeReq({ token_hash: "bad-hash", type: "magiclink" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("auth-error");
    expect(mockIdentifyUser).not.toHaveBeenCalled();
  });

  it("calls identifyUser and redirects on OTP success", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    const res = await GET(makeReq({ token_hash: "valid-hash", type: "magiclink" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/account");
    expect(mockIdentifyUser).toHaveBeenCalledWith(MOCK_USER.id, { email: MOCK_USER.email });
  });

  it("redirects to auth-error when no code or token_hash in request", async () => {
    const res = await GET(makeReq({}));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("auth-error");
    expect(mockIdentifyUser).not.toHaveBeenCalled();
  });

  it("prevents open redirect — only allows same-origin relative next paths", async () => {
    mockExchangeCode.mockResolvedValue({ error: null });
    const res = await GET(makeReq({ code: "code", next: "https://evil.com/steal" }));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).not.toContain("evil.com");
    expect(loc).toContain("/account");
  });
});
