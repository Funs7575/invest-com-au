import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockGetUser,
  mockFrom,
  mockCreateConnectOnboardingLink,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockCreateConnectOnboardingLink: vi.fn(),
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
  createConnectOnboardingLink: mockCreateConnectOnboardingLink,
}));

vi.mock("@/lib/seo", () => ({ SITE_URL: "https://invest.test" }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/pros/connect/onboarding/route";

const USER = { id: "user-uuid-1", email: "pro@example.com" };

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/connect/onboarding", { method: "POST" });
}

// from().select().or().in().maybeSingle() — terminal maybeSingle().
function makeLookupChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.or = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/pros/connect/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
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

  it("returns 404 when no matching pro is found", async () => {
    mockFrom.mockReturnValueOnce(makeLookupChain({ data: null }));
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Pro not found." });
  });

  it("returns the onboarding url on success", async () => {
    mockFrom.mockReturnValueOnce(makeLookupChain({ data: { id: 7, email: "pro@example.com" } }));
    mockCreateConnectOnboardingLink.mockResolvedValueOnce({ url: "https://stripe.test/onboard" });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://stripe.test/onboard" });
    expect(mockCreateConnectOnboardingLink).toHaveBeenCalledWith(
      expect.objectContaining({ professionalId: 7, email: "pro@example.com" }),
    );
  });

  it("returns 503 when Stripe secret is missing", async () => {
    mockFrom.mockReturnValueOnce(makeLookupChain({ data: { id: 7, email: "pro@example.com" } }));
    mockCreateConnectOnboardingLink.mockResolvedValueOnce({ url: null, unavailable: "no_secret" });
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Stripe Connect not configured." });
  });

  it("returns 502 when the link could not be created", async () => {
    mockFrom.mockReturnValueOnce(makeLookupChain({ data: { id: 7, email: "pro@example.com" } }));
    mockCreateConnectOnboardingLink.mockResolvedValueOnce({
      url: null,
      detail: "stripe down",
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "stripe down" });
  });
});
