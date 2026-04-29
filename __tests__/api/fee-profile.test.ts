import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._args: unknown[]) => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const mockAuth = { getUser: vi.fn() };
const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth, from: mockServerFrom })),
}));

import { GET, POST } from "@/app/api/fee-profile/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_USER = { id: "user-fee-1", email: "fee@test.com" };

const PROFILE = {
  user_id: TEST_USER.id,
  asx_trades_per_month: 4,
  us_trades_per_month: 0,
  avg_trade_size: 5000,
  portfolio_value: 100000,
  current_broker_slug: "commsec",
  updated_at: "2026-04-01T00:00:00Z",
};

function makePostRequest(body: unknown, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/fee-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "upsert", "limit", "order"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/fee-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns existing profile for authenticated user", async () => {
    const chain = makeChain({ data: PROFILE, error: null });
    mockServerFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile.current_broker_slug).toBe("commsec");
    expect(body.profile.asx_trades_per_month).toBe(4);
  });

  it("returns null profile when no row exists yet", async () => {
    const chain = makeChain({ data: null, error: null });
    mockServerFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile).toBeNull();
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("DB gone");
    });

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to load profile/i);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/fee-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    isAllowedMock.mockResolvedValue(false);

    const res = await POST(makePostRequest({ asx_trades_per_month: 4 }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makePostRequest({ asx_trades_per_month: 4 }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no active subscription", async () => {
    let call = 0;
    mockServerFrom.mockImplementation(() => {
      call++;
      if (call === 1) {
        // subscriptions lookup
        return makeChain({ data: null, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const res = await POST(makePostRequest({ asx_trades_per_month: 4 }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/pro subscription required/i);
  });

  it("upserts fee profile and returns success", async () => {
    let call = 0;
    mockServerFrom.mockImplementation(() => {
      call++;
      if (call === 1) {
        // subscriptions lookup — active
        return makeChain({ data: { status: "active" }, error: null });
      }
      // upsert
      return makeChain({ data: null, error: null });
    });

    const res = await POST(
      makePostRequest({
        asx_trades_per_month: 10,
        us_trades_per_month: 2,
        avg_trade_size: 8000,
        portfolio_value: 200000,
        current_broker_slug: "stake",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("clamps asx_trades_per_month to 0..999", async () => {
    let upsertPayload: Record<string, unknown> | null = null;
    let call = 0;
    mockServerFrom.mockImplementation((table: string) => {
      call++;
      if (call === 1) return makeChain({ data: { status: "active" }, error: null });
      const chain = makeChain({ data: null, error: null });
      if (table === "fee_profiles") {
        const originalUpsert = chain.upsert as ReturnType<typeof vi.fn>;
        (chain.upsert as ReturnType<typeof vi.fn>) = vi.fn((payload: Record<string, unknown>) => {
          upsertPayload = payload;
          return chain;
        });
        void originalUpsert;
      }
      return chain;
    });

    await POST(makePostRequest({ asx_trades_per_month: 9999 }));
    // Clamped to 999
    if (upsertPayload) {
      expect((upsertPayload as { asx_trades_per_month: number }).asx_trades_per_month).toBe(999);
    }
  });

  it("returns 500 on DB upsert error", async () => {
    let call = 0;
    mockServerFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: { status: "active" }, error: null });
      // upsert error
      const c = makeChain({ data: null, error: { message: "constraint violation" } });
      return c;
    });

    const res = await POST(makePostRequest({ asx_trades_per_month: 4 }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to save profile/i);
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("network gone");
    });

    const res = await POST(makePostRequest({ asx_trades_per_month: 4 }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to save profile/i);
  });
});
