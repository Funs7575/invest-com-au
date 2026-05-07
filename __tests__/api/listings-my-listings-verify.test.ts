import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { makeRequest } from "@/__tests__/helpers";

const TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockIsRateLimited = vi.fn().mockResolvedValue(false);
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

import { POST } from "@/app/api/listings/my-listings/verify/route";
import {
  LISTING_OWNER_COOKIE_NAME,
  verifyListingOwnerCookie,
} from "@/lib/listing-owner-cookie";

const VALID_CODE = "123456";
const FUTURE_EXPIRY = new Date(Date.now() + 5 * 60 * 1000).toISOString();

function mockOtpRow(overrides: Partial<{
  code: string;
  expires_at: string;
  used_at: string | null;
  id: number;
}> = {}) {
  return {
    id: overrides.id ?? 99,
    code: overrides.code ?? VALID_CODE,
    expires_at: overrides.expires_at ?? FUTURE_EXPIRY,
    used_at: overrides.used_at ?? null,
  };
}

function setupOtpQuery(otp: ReturnType<typeof mockOtpRow> | null) {
  // First .from() call = SELECT, second = UPDATE.
  let n = 0;
  mockAdminFrom.mockImplementation(() => {
    n++;
    if (n === 1) {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: otp, error: null }),
      };
    }
    return {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

describe("POST /api/listings/my-listings/verify", () => {
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.LISTING_OWNER_COOKIE_SECRET;
    process.env.LISTING_OWNER_COOKIE_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.LISTING_OWNER_COOKIE_SECRET;
    } else {
      process.env.LISTING_OWNER_COOKIE_SECRET = originalSecret;
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new (await import("next/server")).NextRequest(
      "http://localhost/api/listings/my-listings/verify",
      {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when email or code missing", async () => {
    const req = makeRequest("/api/listings/my-listings/verify", {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const req = makeRequest("/api/listings/my-listings/verify", {
      email: "not-an-email",
      code: VALID_CODE,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 on per-IP burst rate limit", async () => {
    mockIsRateLimited.mockImplementation((key: string) =>
      Promise.resolve(key.startsWith("my-listings-verify:")),
    );
    const req = makeRequest("/api/listings/my-listings/verify", {
      email: "owner@example.com",
      code: VALID_CODE,
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 429 on per-email rate limit", async () => {
    mockIsRateLimited.mockImplementation((key: string) =>
      Promise.resolve(key.startsWith("my-listings-verify-email:")),
    );
    const req = makeRequest("/api/listings/my-listings/verify", {
      email: "owner@example.com",
      code: VALID_CODE,
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 400 when no active OTP found", async () => {
    setupOtpQuery(null);
    const req = makeRequest("/api/listings/my-listings/verify", {
      email: "owner@example.com",
      code: VALID_CODE,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/no active code/i);
  });

  it("returns 400 when OTP expired", async () => {
    setupOtpQuery(
      mockOtpRow({
        expires_at: new Date(Date.now() - 1000).toISOString(),
      }),
    );
    const req = makeRequest("/api/listings/my-listings/verify", {
      email: "owner@example.com",
      code: VALID_CODE,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/expired/i);
  });

  it("returns 400 on incorrect code (timing-safe compare)", async () => {
    setupOtpQuery(mockOtpRow({ code: VALID_CODE }));
    const req = makeRequest("/api/listings/my-listings/verify", {
      email: "owner@example.com",
      code: "000000",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/incorrect code/i);
  });

  it("returns 400 on length-mismatched code (timing-safe compare)", async () => {
    setupOtpQuery(mockOtpRow({ code: VALID_CODE }));
    const req = makeRequest("/api/listings/my-listings/verify", {
      email: "owner@example.com",
      code: "12345", // 5 chars
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 + sets signed cookie on valid code", async () => {
    setupOtpQuery(mockOtpRow({ code: VALID_CODE }));
    const req = makeRequest("/api/listings/my-listings/verify", {
      email: "owner@example.com",
      code: VALID_CODE,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(LISTING_OWNER_COOKIE_NAME);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=strict");
    expect(setCookie).toContain("Path=/");

    // Extract the cookie value and round-trip verify it.
    const match = setCookie.match(
      new RegExp(`${LISTING_OWNER_COOKIE_NAME}=([^;]+)`),
    );
    expect(match).not.toBeNull();
    if (match) {
      const verdict = verifyListingOwnerCookie(match[1], {
        expectedEmail: "owner@example.com",
      });
      expect(verdict.ok).toBe(true);
      if (verdict.ok) expect(verdict.email).toBe("owner@example.com");
    }
  });

  it("normalises submitted email + code (trims) before checks", async () => {
    setupOtpQuery(mockOtpRow({ code: VALID_CODE }));
    const req = makeRequest("/api/listings/my-listings/verify", {
      email: "  Owner@Example.COM  ",
      code: ` ${VALID_CODE} `,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") || "";
    const match = setCookie.match(
      new RegExp(`${LISTING_OWNER_COOKIE_NAME}=([^;]+)`),
    );
    if (match) {
      const verdict = verifyListingOwnerCookie(match[1]);
      if (verdict.ok) expect(verdict.email).toBe("owner@example.com");
    }
  });

  it("returns 503 when cookie secret is missing (fails closed)", async () => {
    const original = process.env.LISTING_OWNER_COOKIE_SECRET;
    delete process.env.LISTING_OWNER_COOKIE_SECRET;
    setupOtpQuery(mockOtpRow({ code: VALID_CODE }));
    const req = makeRequest("/api/listings/my-listings/verify", {
      email: "owner@example.com",
      code: VALID_CODE,
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    if (original !== undefined) {
      process.env.LISTING_OWNER_COOKIE_SECRET = original;
    } else {
      process.env.LISTING_OWNER_COOKIE_SECRET = TEST_SECRET;
    }
    // Restore for subsequent tests.
    process.env.LISTING_OWNER_COOKIE_SECRET = TEST_SECRET;
  });
});
