import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockGetUser,
  mockFrom,
  mockRefreshConnectAccountStatus,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRefreshConnectAccountStatus: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/stripe-connect", () => ({
  refreshConnectAccountStatus: mockRefreshConnectAccountStatus,
}));

import { POST } from "@/app/api/pros/connect/refresh/route";

const USER = { id: "user-uuid-1", email: "pro@example.com" };

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/connect/refresh", { method: "POST" });
}

// from().select().or().maybeSingle() — terminal maybeSingle().
function makeLookupChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.or = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/pros/connect/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockRefreshConnectAccountStatus.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Auth required." });
  });

  it("returns 404 when the pro has no Connect account", async () => {
    mockFrom.mockReturnValueOnce(makeLookupChain({ data: { id: 7, stripe_connect_account_id: null } }));
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No Connect account." });
  });

  it("returns 404 when the pro row is missing entirely", async () => {
    mockFrom.mockReturnValueOnce(makeLookupChain({ data: null }));
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it("refreshes the account status and returns ok", async () => {
    mockFrom.mockReturnValueOnce(
      makeLookupChain({ data: { id: 7, stripe_connect_account_id: "acct_123" } }),
    );
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockRefreshConnectAccountStatus).toHaveBeenCalledWith("acct_123");
  });
});
