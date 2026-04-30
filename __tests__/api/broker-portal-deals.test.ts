import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();
const mockGetAdminEmails = vi.fn(() => ["admin@invest.com.au"]);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => mockGetAdminEmails(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// broker-portal/deals uses createServerClient from @supabase/ssr directly
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

import { GET, PUT } from "@/app/api/broker-portal/deals/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER = { id: "user-123" };
const BROKER_ACCOUNT = { id: "acct-1", broker_slug: "commsec", status: "active" };

function makeGet(cookie = "auth-cookie=tok"): NextRequest {
  return new NextRequest("http://localhost/api/broker-portal/deals", {
    method: "GET",
    headers: { cookie },
  });
}

function makePut(body: unknown, cookie = "auth-cookie=tok"): NextRequest {
  return new NextRequest("http://localhost/api/broker-portal/deals", {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

function setupAdminMock(opts: {
  account?: typeof BROKER_ACCOUNT | null;
  broker?: Record<string, unknown> | null;
  updateError?: { message: string } | null;
} = {}) {
  const { account = BROKER_ACCOUNT, broker = {}, updateError = null } = opts;

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "broker_accounts") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: account }),
      };
    }
    if (table === "brokers") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: broker }),
        update: vi.fn().mockReturnThis(),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
  });

  // For PUT the update chain ends with .eq() returning an error or not
  if (updateError !== null) {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_accounts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: account }),
        };
      }
      if (table === "brokers") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: updateError }),
          })),
        };
      }
      return {};
    });
  }
}

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/broker-portal/deals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 401 when no active broker account found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ account: null });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns deal fields for authenticated broker", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({
      broker: {
        deal: true,
        deal_text: "$0 brokerage first month",
        deal_expiry: "2026-06-30",
        deal_terms: "New accounts only",
        deal_category: "no_brokerage",
        deal_verified_date: "2026-04-01T00:00:00Z",
      },
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deal).toBe(true);
    expect(body.deal_text).toBe("$0 brokerage first month");
    expect(body.deal_expiry).toBe("2026-06-30");
  });

  it("returns defaults when broker has no active deal", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ broker: { deal: null, deal_text: null } });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deal).toBe(false);
    expect(body.deal_text).toBe("");
  });
});

// ── PUT tests ─────────────────────────────────────────────────────────────────

describe("PUT /api/broker-portal/deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PUT(makePut({ deal_enabled: true, deal_text: "Offer" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when deal_enabled=true but deal_text is empty", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock();
    const res = await PUT(makePut({ deal_enabled: true, deal_text: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/deal text is required/i);
  });

  it("returns 400 when deal_text exceeds 200 characters", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock();
    const res = await PUT(makePut({ deal_enabled: true, deal_text: "a".repeat(201) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/200 characters/i);
  });

  it("returns 400 when deal_terms exceeds 500 characters", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock();
    const res = await PUT(makePut({ deal_enabled: true, deal_text: "Good deal", deal_terms: "t".repeat(501) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/500 characters/i);
  });

  it("returns 400 when deal_expiry is in the past", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock();
    const res = await PUT(
      makePut({ deal_enabled: true, deal_text: "Offer", deal_expiry: "2020-01-01" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/future/i);
  });

  it("successfully updates deal and returns success=true", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_accounts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: BROKER_ACCOUNT }),
        };
      }
      if (table === "brokers") {
        return {
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        };
      }
      return {};
    });
    const futureExpiry = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const res = await PUT(
      makePut({ deal_enabled: true, deal_text: "Great offer", deal_expiry: futureExpiry }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("returns 500 when DB update fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ updateError: { message: "DB down" } });
    const res = await PUT(makePut({ deal_enabled: true, deal_text: "Offer" }));
    expect(res.status).toBe(500);
  });

  it("disabling deal sets deal=false and clears text fields", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    const updateMock = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_accounts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: BROKER_ACCOUNT }),
        };
      }
      if (table === "brokers") {
        return { update: updateMock };
      }
      return {};
    });
    const res = await PUT(makePut({ deal_enabled: false }));
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ deal: false, deal_text: null }));
  });
});
