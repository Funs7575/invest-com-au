/**
 * Tests for POST /api/pros/connect/onboarding
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockCreateConnectOnboardingLink } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "u1", email: "pro@example.com" } }, error: null })),
  mockCreateConnectOnboardingLink: vi.fn(async () => ({ url: "https://connect.stripe.com/setup/s_123" })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/stripe-connect", () => ({
  createConnectOnboardingLink: mockCreateConnectOnboardingLink,
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/pros/connect/onboarding/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/connect/onboarding", { method: "POST" });
}

function makeProChain(proData: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select","eq","or","in","maybeSingle"]) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: proData, error: null }));
  return chain;
}

describe("POST /api/pros/connect/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "pro@example.com" } }, error: null });
    mockCreateConnectOnboardingLink.mockResolvedValue({ url: "https://connect.stripe.com/setup/s_123" });
    mockAdminFrom.mockReturnValue(makeProChain({ id: 42, email: "pro@example.com" }));
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

  it("returns 404 when pro not found", async () => {
    mockAdminFrom.mockReturnValue(makeProChain(null));
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns 503 when Stripe Connect not configured", async () => {
    mockCreateConnectOnboardingLink.mockResolvedValue({ unavailable: "no_secret" });
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
  });

  it("returns 502 when onboarding link creation fails", async () => {
    mockCreateConnectOnboardingLink.mockResolvedValue({ detail: "Error creating account link" });
    const res = await POST(makeReq());
    expect(res.status).toBe(502);
  });

  it("returns 200 with onboarding url on success", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toContain("connect.stripe.com");
  });
});
