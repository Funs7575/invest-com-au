import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

let mockUser: { id: string; email?: string } | null = null;
let mockAccountRow: { id: number } | null = null;
let mockCookie: string | undefined = undefined;
let mockOtpResult: { ok: boolean; email?: string; reason?: string } = { ok: false, reason: "missing" };

const mockFrom = vi.fn(() => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: mockAccountRow, error: null }),
  };
  return chain;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: mockFrom,
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "listing_owner_verified" && mockCookie
        ? { name, value: mockCookie }
        : undefined,
  }),
}));

vi.mock("@/lib/listing-owner-cookie", () => ({
  LISTING_OWNER_COOKIE_NAME: "listing_owner_verified",
  verifyListingOwnerCookie: () => mockOtpResult,
}));

import { requireListingOwnerSession } from "@/lib/require-listing-owner-session";

describe("requireListingOwnerSession", () => {
  beforeEach(() => {
    mockUser = null;
    mockAccountRow = null;
    mockCookie = undefined;
    mockOtpResult = { ok: false, reason: "missing" };
    vi.clearAllMocks();
  });

  it("returns null when neither JWT nor OTP cookie present", async () => {
    expect(await requireListingOwnerSession()).toBeNull();
  });

  it("returns JWT session when user has listing_owner_accounts row", async () => {
    mockUser = { id: "u1", email: "owner@example.com" };
    mockAccountRow = { id: 7 };
    const r = await requireListingOwnerSession();
    expect(r).toEqual({ kind: "jwt", userId: "u1", accountId: 7 });
  });

  it("falls back to OTP cookie when JWT lookup misses", async () => {
    mockUser = null;
    mockAccountRow = null;
    mockCookie = "valid-cookie";
    mockOtpResult = { ok: true, email: "otpowner@example.com" };
    const r = await requireListingOwnerSession();
    expect(r).toEqual({ kind: "otp", email: "otpowner@example.com" });
  });

  it("returns null when OTP cookie verification fails", async () => {
    mockUser = null;
    mockCookie = "tampered";
    mockOtpResult = { ok: false, reason: "bad_signature" };
    expect(await requireListingOwnerSession()).toBeNull();
  });

  it("prefers JWT path even when OTP cookie is also present", async () => {
    mockUser = { id: "u1", email: "owner@example.com" };
    mockAccountRow = { id: 7 };
    mockCookie = "valid-cookie";
    mockOtpResult = { ok: true, email: "otpowner@example.com" };
    const r = await requireListingOwnerSession();
    expect(r?.kind).toBe("jwt");
  });
});
