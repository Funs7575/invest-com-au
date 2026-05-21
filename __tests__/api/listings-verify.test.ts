import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsRateLimited, mockIsValidEmail, mockSignCookie, mockAdminFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn(),
  mockIsValidEmail: vi.fn(),
  mockSignCookie: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: mockIsValidEmail,
}));

vi.mock("@/lib/listing-owner-cookie", () => ({
  signListingOwnerCookie: mockSignCookie,
  LISTING_OWNER_COOKIE_NAME: "listing_owner_verified",
  LISTING_OWNER_COOKIE_MAX_AGE_S: 3600,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/listings/my-listings/verify/route";

function makeReq(body: unknown, opts?: { raw?: string }): NextRequest {
  return new NextRequest("http://localhost/api/listings/my-listings/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9" },
    body: opts?.raw ?? JSON.stringify(body),
  });
}

// from("email_otps").select().eq().is().order().limit().maybeSingle()
function makeOtpSelectChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// from("email_otps").update().eq() resolves
function makeOtpUpdateChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve({ error: null }));
  return chain;
}

const future = () => new Date(Date.now() + 60_000).toISOString();
const past = () => new Date(Date.now() - 60_000).toISOString();

describe("POST /api/listings/my-listings/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockIsValidEmail.mockReturnValue(true);
    mockSignCookie.mockReturnValue("signed-cookie-value");
  });

  it("returns 429 on the per-IP burst cap", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makeReq({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(429);
  });

  it("returns 429 on the per-IP cumulative cap", async () => {
    mockIsRateLimited.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const res = await POST(makeReq({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(429);
  });

  it("returns 429 on the per-email cap", async () => {
    mockIsRateLimited
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const res = await POST(makeReq({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await POST(makeReq(null, { raw: "{not json" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request" });
  });

  it("returns 400 on a body that fails the schema", async () => {
    const res = await POST(makeReq({ email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on an invalid email address", async () => {
    mockIsValidEmail.mockReturnValueOnce(false);
    const res = await POST(makeReq({ email: "bad", code: "123456" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Please enter a valid email address." });
  });

  it("returns 400 when the code is empty after trimming", async () => {
    const res = await POST(makeReq({ email: "a@b.com", code: "   " }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Code is required." });
  });

  it("returns 400 when no active OTP is found", async () => {
    mockAdminFrom.mockReturnValueOnce(makeOtpSelectChain({ data: null }));
    const res = await POST(makeReq({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No active code found. Please request a new one." });
  });

  it("returns 400 when the OTP is expired", async () => {
    mockAdminFrom.mockReturnValueOnce(
      makeOtpSelectChain({ data: { id: 1, code: "123456", expires_at: past(), used_at: null } }),
    );
    const res = await POST(makeReq({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Code has expired. Please request a new one." });
  });

  it("returns 400 when the code length differs", async () => {
    mockAdminFrom.mockReturnValueOnce(
      makeOtpSelectChain({ data: { id: 1, code: "123456", expires_at: future(), used_at: null } }),
    );
    const res = await POST(makeReq({ email: "a@b.com", code: "999" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Incorrect code. Please try again." });
  });

  it("returns 400 when the code is wrong (same length)", async () => {
    mockAdminFrom.mockReturnValueOnce(
      makeOtpSelectChain({ data: { id: 1, code: "123456", expires_at: future(), used_at: null } }),
    );
    const res = await POST(makeReq({ email: "a@b.com", code: "654321" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Incorrect code. Please try again." });
  });

  it("happy path: marks OTP used, signs cookie, returns 200 with Set-Cookie", async () => {
    mockAdminFrom
      .mockReturnValueOnce(
        makeOtpSelectChain({ data: { id: 5, code: "123456", expires_at: future(), used_at: null } }),
      )
      .mockReturnValueOnce(makeOtpUpdateChain());
    const res = await POST(makeReq({ email: "Owner@Example.com", code: "123456" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, verified: true });
    expect(mockSignCookie).toHaveBeenCalledWith("owner@example.com");
    expect(res.cookies.get("listing_owner_verified")?.value).toBe("signed-cookie-value");
  });

  it("returns 503 when cookie signing throws (misconfiguration)", async () => {
    mockAdminFrom
      .mockReturnValueOnce(
        makeOtpSelectChain({ data: { id: 5, code: "123456", expires_at: future(), used_at: null } }),
      )
      .mockReturnValueOnce(makeOtpUpdateChain());
    mockSignCookie.mockImplementationOnce(() => {
      throw new Error("no secret");
    });
    const res = await POST(makeReq({ email: "a@b.com", code: "123456" }));
    expect(res.status).toBe(503);
  });
});
