import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

import { GET } from "@/app/api/listings/my-listings/route";
import {
  signListingOwnerCookie,
  LISTING_OWNER_COOKIE_NAME,
  LISTING_OWNER_COOKIE_MAX_AGE_S,
} from "@/lib/listing-owner-cookie";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(
  email?: string,
  options: { cookieValue?: string } = {},
): NextRequest {
  const url = email
    ? `http://localhost/api/listings/my-listings?email=${encodeURIComponent(email)}`
    : "http://localhost/api/listings/my-listings";
  const headers: Record<string, string> = {};
  if (options.cookieValue !== undefined) {
    headers.cookie = `${LISTING_OWNER_COOKIE_NAME}=${options.cookieValue}`;
  }
  return new NextRequest(url, { method: "GET", headers });
}

const SAMPLE_LISTINGS = [
  {
    id: 1,
    title: "Cafe for Sale",
    slug: "cafe-for-sale",
    vertical: "business",
    status: "active",
    asking_price_cents: 500000,
    price_display: "$500k",
    listing_type: "business",
    views: 10,
    enquiries: 2,
    created_at: "2026-01-01",
    expires_at: "2026-12-31",
  },
];

const SAMPLE_ENQUIRIES = [
  {
    id: 10,
    listing_id: 1,
    user_name: "Bob",
    user_email: "bob@example.com",
    message: "Interested",
    created_at: "2026-01-02",
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/listings/my-listings (B-09a OTP gate)", () => {
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
  });

  // ── Input validation ────────────────────────────────────────────────────────

  it("returns 400 when email param is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await GET(makeGet("not-an-email"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/valid email/i);
  });

  // ── Cookie gate ─────────────────────────────────────────────────────────────

  it("returns 401 when no cookie present", async () => {
    const res = await GET(makeGet("owner@example.com"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/verification required/i);
    expect(json.code).toBe("cookie_missing");
    expect(json.next).toBe("/api/verify-otp/send");
  });

  it("returns 401 when cookie is malformed", async () => {
    const res = await GET(
      makeGet("owner@example.com", { cookieValue: "not-a-valid-cookie" }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("cookie_malformed");
  });

  it("returns 401 when cookie has wrong (tampered) signature", async () => {
    const valid = signListingOwnerCookie("owner@example.com");
    // Flip a byte in the HMAC half.
    const [payload, hmac] = valid.split(".");
    const tamperedHmac =
      hmac && hmac.length > 0
        ? (hmac[0] === "A" ? "B" : "A") + hmac.slice(1)
        : "AAAA";
    const res = await GET(
      makeGet("owner@example.com", {
        cookieValue: `${payload}.${tamperedHmac}`,
      }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toMatch(/cookie_(bad_signature|malformed)/);
  });

  it("returns 401 when cookie was issued for a different email", async () => {
    // Cookie issued for victim@example.com but caller passes
    // attacker@example.com — this is the central B-09 attack vector
    // we must block. The signature is valid; the email mismatch is what
    // catches it.
    const cookieForVictim = signListingOwnerCookie("victim@example.com");
    const res = await GET(
      makeGet("attacker@example.com", { cookieValue: cookieForVictim }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("cookie_email_mismatch");
  });

  it("returns 401 when cookie is expired", async () => {
    // iat far in the past so exp is also in the past.
    const expiredAt = Date.now() - (LISTING_OWNER_COOKIE_MAX_AGE_S + 60) * 1000;
    const expiredCookie = signListingOwnerCookie(
      "owner@example.com",
      expiredAt,
    );
    const res = await GET(
      makeGet("owner@example.com", { cookieValue: expiredCookie }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("cookie_expired");
  });

  // ── Authorised path ────────────────────────────────────────────────────────

  it("returns 200 with listings + enquiries when cookie is valid", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi
            .fn()
            .mockResolvedValue({ data: SAMPLE_LISTINGS, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockResolvedValue({ data: SAMPLE_ENQUIRIES, error: null }),
      };
    });
    const cookie = signListingOwnerCookie("owner@example.com");
    const res = await GET(
      makeGet("owner@example.com", { cookieValue: cookie }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toHaveLength(1);
    expect(json.enquiries["1"]).toHaveLength(1);
    expect(json.enquiries["1"][0].user_name).toBe("Bob");
  });

  it("returns empty arrays when valid cookie but no listings owned", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const cookie = signListingOwnerCookie("owner@example.com");
    const res = await GET(
      makeGet("owner@example.com", { cookieValue: cookie }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toEqual([]);
    expect(json.enquiries).toEqual({});
  });

  it("normalises email case before matching cookie + querying", async () => {
    let capturedEmail: string | undefined;
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn((_col: string, val: string) => {
        capturedEmail = val;
        return {
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    });
    const cookie = signListingOwnerCookie("owner@example.com");
    const res = await GET(
      makeGet("Owner@Example.COM", { cookieValue: cookie }),
    );
    expect(res.status).toBe(200);
    expect(capturedEmail).toBe("owner@example.com");
  });

  // ── DB error paths ─────────────────────────────────────────────────────────

  it("returns 500 when listings fetch fails (cookie valid)", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "db error" } }),
    });
    const cookie = signListingOwnerCookie("owner@example.com");
    const res = await GET(
      makeGet("owner@example.com", { cookieValue: cookie }),
    );
    expect(res.status).toBe(500);
  });

  it("returns listings without enquiries when enquiries fetch fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi
            .fn()
            .mockResolvedValue({ data: SAMPLE_LISTINGS, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: "boom" } }),
      };
    });
    const cookie = signListingOwnerCookie("owner@example.com");
    const res = await GET(
      makeGet("owner@example.com", { cookieValue: cookie }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toHaveLength(1);
    expect(json.enquiries).toEqual({});
  });

  // ── Refresh-window edge cases ──────────────────────────────────────────────

  it("accepts a cookie whose exp is just inside the window", async () => {
    // Issue with `now` ≈ now; exp will be `now + 1h`. Verify still valid.
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const issuedAt = Date.now() - (LISTING_OWNER_COOKIE_MAX_AGE_S - 30) * 1000;
    const cookie = signListingOwnerCookie("owner@example.com", issuedAt);
    const res = await GET(
      makeGet("owner@example.com", { cookieValue: cookie }),
    );
    expect(res.status).toBe(200);
  });

  it("rejects a cookie whose exp is exactly now (boundary expired)", async () => {
    // iat = now - max_age, so exp = now. Verify uses `nowS >= payload.exp`,
    // so this should fail closed.
    const issuedAt = Date.now() - LISTING_OWNER_COOKIE_MAX_AGE_S * 1000;
    const cookie = signListingOwnerCookie("owner@example.com", issuedAt);
    const res = await GET(
      makeGet("owner@example.com", { cookieValue: cookie }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("cookie_expired");
  });

  // ── Misc ───────────────────────────────────────────────────────────────────

  it("returns 500 on unexpected thrown error after cookie verifies", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    const cookie = signListingOwnerCookie("owner@example.com");
    const res = await GET(
      makeGet("owner@example.com", { cookieValue: cookie }),
    );
    expect(res.status).toBe(500);
  });
});
