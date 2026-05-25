import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetUser, mockServerFrom, mockAdminFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockServerFrom: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockServerFrom,
    }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from "@/app/api/startups/round/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/startups/round", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const SAFE_BODY = {
  instrument: "safe",
  target_aud_cents: 500_000_00,
  min_ticket_aud_cents: 1_000_00,
  valuation_cap_aud_cents: 5_000_000_00,
  discount_pct: 20,
  wholesale_only: true,
};

function makeServerFromMock(
  profileData: { id: string; status: string } | null,
  openRoundData: { id: string } | null = null
) {
  return (table: string) => {
    const data = table === "startup_profiles" ? profileData : openRoundData;
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data }),
    };
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/startups/round", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Capital-raising is gated OFF by default; these tests cover the
    // post-gate business logic, so enable the flag for the suite.
    vi.stubEnv("STARTUP_RAISES_ENABLED", "true");
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    // Active profile, no open round (success default)
    mockServerFrom.mockImplementation(makeServerFromMock({ id: "sp-1", status: "active" }, null));
    // Admin insert succeeds
    mockAdminFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "round-1" }, error: null }),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq(SAFE_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid instrument enum", async () => {
    const res = await POST(makeReq({ ...SAFE_BODY, instrument: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on SAFE without valuation cap", async () => {
    const res = await POST(makeReq({ ...SAFE_BODY, valuation_cap_aud_cents: null }));
    expect(res.status).toBe(400);
    const json: { error: string } = await res.json();
    expect(json.error).toMatch(/valuation cap/i);
  });

  it("returns 400 on convertible_note without interest_rate_pct", async () => {
    const body = {
      instrument: "convertible_note",
      target_aud_cents: 500_000_00,
      min_ticket_aud_cents: 1_000_00,
      maturity_months: 24,
      wholesale_only: true,
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(400);
    const json: { error: string } = await res.json();
    expect(json.error).toMatch(/interest rate/i);
  });

  it("returns 404 when no startup profile found", async () => {
    mockServerFrom.mockImplementation(makeServerFromMock(null, null));
    const res = await POST(makeReq(SAFE_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 403 when startup profile is in draft status", async () => {
    mockServerFrom.mockImplementation(makeServerFromMock({ id: "sp-1", status: "draft" }, null));
    const res = await POST(makeReq(SAFE_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 409 when an open round already exists", async () => {
    mockServerFrom.mockImplementation(
      makeServerFromMock({ id: "sp-1", status: "active" }, { id: "existing-round" })
    );
    const res = await POST(makeReq(SAFE_BODY));
    expect(res.status).toBe(409);
  });

  it("returns 500 on DB insert error", async () => {
    mockAdminFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Insert failed" } }),
    });
    const res = await POST(makeReq(SAFE_BODY));
    expect(res.status).toBe(500);
  });

  it("returns 200 with roundId on success", async () => {
    const res = await POST(makeReq(SAFE_BODY));
    expect(res.status).toBe(200);
    const json: { success: boolean; roundId: string } = await res.json();
    expect(json.success).toBe(true);
    expect(json.roundId).toBe("round-1");
  });
});
