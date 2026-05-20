/**
 * Tests for POST /api/pros/connect/refresh
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockRefreshConnectAccountStatus } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "u1", email: "pro@example.com" } }, error: null })),
  mockRefreshConnectAccountStatus: vi.fn(async () => undefined),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/stripe-connect", () => ({
  refreshConnectAccountStatus: mockRefreshConnectAccountStatus,
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/pros/connect/refresh/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/connect/refresh", { method: "POST" });
}

function makeProChain(proData: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select","eq","or","in","maybeSingle"]) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: proData, error: null }));
  return chain;
}

describe("POST /api/pros/connect/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "pro@example.com" } }, error: null });
    mockRefreshConnectAccountStatus.mockResolvedValue(undefined);
    mockAdminFrom.mockReturnValue(makeProChain({ id: 42, stripe_connect_account_id: "acct_test123" }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 404 when pro has no Connect account", async () => {
    mockAdminFrom.mockReturnValue(makeProChain({ id: 42, stripe_connect_account_id: null }));
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns 404 when pro not found", async () => {
    mockAdminFrom.mockReturnValue(makeProChain(null));
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns 200 on successful refresh", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
