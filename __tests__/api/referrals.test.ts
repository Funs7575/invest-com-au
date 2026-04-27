import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const isRateLimitedMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>(() => Promise.resolve(false)));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: isRateLimitedMock }));

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}));

const adminFromMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: adminFromMock })),
}));

import { GET, POST } from "@/app/api/referrals/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function chain(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "insert", "order", "filter"]) b[m] = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (cb: (v: unknown) => void) => { cb(result); return Promise.resolve(); };
  return b;
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/referrals", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "4.4.4.4" },
  });
}

const USER = { id: "user-abc" };
const CODE_ROW = { code: "ABCD1234", created_at: "2026-01-01T00:00:00Z" };

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: USER } });
  });

  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    expect((await GET()).status).toBe(401);
  });

  it("returns 200 with existing referral code and stats", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: CODE_ROW })); // code lookup
    adminFromMock.mockReturnValueOnce(chain({ data: [{ id: 1, status: "rewarded", reward_granted: true, created_at: "2026-01-02T00:00:00Z" }] })); // referrals
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe("ABCD1234");
    expect(json.stats.total_referred).toBe(1);
    expect(json.stats.rewards_earned).toBe(1);
    expect(json.referral_url).toContain("ABCD1234");
  });

  it("generates a new referral code when none exists", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: null })); // code lookup: none
    adminFromMock.mockReturnValueOnce(chain({ data: { code: "NEWCODE1", created_at: "2026-04-27T00:00:00Z" }, error: null })); // insert
    adminFromMock.mockReturnValueOnce(chain({ data: [] })); // referrals
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe("NEWCODE1");
  });

  it("returns 500 when both code insert attempts fail (collision + fallback)", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: null })); // no existing code
    adminFromMock.mockReturnValueOnce(chain({ data: null, error: { message: "unique violation" } })); // first insert fails
    adminFromMock.mockReturnValueOnce(chain({ data: null, error: { message: "unique violation" } })); // retry fails
    expect((await GET()).status).toBe(500);
  });

  it("returns stats broken down by status", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: CODE_ROW }));
    adminFromMock.mockReturnValueOnce(chain({
      data: [
        { id: 1, status: "pending", reward_granted: false, created_at: "2026-01-01T00:00:00Z" },
        { id: 2, status: "converted", reward_granted: false, created_at: "2026-01-02T00:00:00Z" },
        { id: 3, status: "rewarded", reward_granted: true, created_at: "2026-01-03T00:00:00Z" },
      ],
    }));
    const json = await (await GET()).json();
    expect(json.stats.total_referred).toBe(3);
    expect(json.stats.converted).toBe(2); // converted + rewarded
    expect(json.stats.rewards_earned).toBe(1);
  });
});

// ── POST tests ─────────────────────────────────────────────────────────────────

describe("POST /api/referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: USER } });
    isRateLimitedMock.mockResolvedValue(false);
  });

  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    expect((await POST(postReq({ referral_code: "ABCD1234" }))).status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    isRateLimitedMock.mockResolvedValueOnce(true);
    expect((await POST(postReq({ referral_code: "ABCD1234" }))).status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/referrals", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("returns 400 when referral_code is too short (< 4 chars)", async () => {
    expect((await POST(postReq({ referral_code: "AB" }))).status).toBe(400);
  });

  it("returns 400 when referral_code contains special characters", async () => {
    expect((await POST(postReq({ referral_code: "AB!@#$%^" }))).status).toBe(400);
  });

  it("returns 400 when referral_code is too long (> 16 chars)", async () => {
    expect((await POST(postReq({ referral_code: "ABCDEFGHIJK12345678" }))).status).toBe(400);
  });

  it("returns 404 when referral code is not found in DB", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: null }));
    expect((await POST(postReq({ referral_code: "ABCD1234" }))).status).toBe(404);
  });

  it("returns 400 when user tries to use their own referral code", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: { user_id: USER.id, code: "ABCD1234" } }));
    const res = await POST(postReq({ referral_code: "ABCD1234" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/cannot refer yourself/i) });
  });

  it("returns 409 when user was already referred", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: { user_id: "other-user", code: "ABCD1234" } }));
    adminFromMock.mockReturnValueOnce(chain({ data: { id: 5 } })); // already referred
    expect((await POST(postReq({ referral_code: "ABCD1234" }))).status).toBe(409);
  });

  it("returns 500 when referral insert fails", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: { user_id: "other-user", code: "ABCD1234" } }));
    adminFromMock.mockReturnValueOnce(chain({ data: null })); // not yet referred
    adminFromMock.mockReturnValueOnce(chain({ error: { message: "db error" } })); // insert fails
    expect((await POST(postReq({ referral_code: "ABCD1234" }))).status).toBe(500);
  });

  it("returns 200 on successful referral redemption", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: { user_id: "other-user", code: "ABCD1234" } }));
    adminFromMock.mockReturnValueOnce(chain({ data: null })); // not yet referred
    adminFromMock.mockReturnValueOnce(chain({ error: null })); // insert ok
    const res = await POST(postReq({ referral_code: "ABCD1234" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
