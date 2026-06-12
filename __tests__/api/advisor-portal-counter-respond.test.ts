import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();
const { mockIsFlagEnabled, mockIsAllowed, mockSendResult } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(),
  mockIsAllowed: vi.fn(),
  mockSendResult: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: () => mockGetUser() } })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));
// Mock feature-flags (not auction-rounds) so the real state-machine helpers
// (normaliseCounterStatus) still run inside the route.
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));
vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: (...a: unknown[]) => mockIsAllowed(...a) }));
vi.mock("@/lib/quote-emails", () => ({
  sendCounterOfferResultEmail: (...a: unknown[]) => mockSendResult(...a),
}));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function req(body: unknown) {
  return new NextRequest("http://localhost/api/advisor-portal/counter-respond", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** A bid row carrying a pending counter on an open public_job. */
function pendingBid(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    advisor_id: 1,
    bid_amount: 300000,
    counter_amount: 220000,
    counter_status: "pending",
    advisor_auctions: {
      id: 10,
      slug: "smsf-help",
      job_title: "SMSF setup",
      contact_name: "Jo Client",
      contact_email: "jo@x.com",
      status: "open",
      source: "public_job",
    },
    ...overrides,
  };
}

function advisorChain(id: number | null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: id == null ? null : { id } }),
  };
}
function bidLookupChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  };
}
function updateChain(error: unknown = null) {
  const eq2 = vi.fn().mockResolvedValue({ error });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const update = vi.fn().mockReturnValue({ eq: eq1 });
  return { update, _update: update };
}
function advisorNameChain(name: string) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { name } }),
  };
}

describe("POST /api/advisor-portal/counter-respond", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "adviser@x.com" } } });
    mockIsAllowed.mockResolvedValue(true);
    mockIsFlagEnabled.mockResolvedValue(true);
    mockSendResult.mockResolvedValue(true);
  });

  it("401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/advisor-portal/counter-respond/route");
    expect((await POST(req({ bid_id: 5, action: "accept" }))).status).toBe(401);
  });

  it("404 (dormant) when the auction_rounds flag is off — fully gated", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const { POST } = await import("@/app/api/advisor-portal/counter-respond/route");
    const res = await POST(req({ bid_id: 5, action: "accept" }));
    expect(res.status).toBe(404);
    // Never touched the DB.
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const { POST } = await import("@/app/api/advisor-portal/counter-respond/route");
    expect((await POST(req({ bid_id: 5, action: "accept" }))).status).toBe(429);
  });

  it("400 on invalid body", async () => {
    const { POST } = await import("@/app/api/advisor-portal/counter-respond/route");
    expect((await POST(req({ bid_id: 5, action: "maybe" }))).status).toBe(400);
  });

  it("ACCEPT updates bid_amount to the counter figure and marks accepted", async () => {
    const upd = updateChain();
    mockAdminFrom
      .mockReturnValueOnce(advisorChain(1)) // professionals (advisor)
      .mockReturnValueOnce(bidLookupChain(pendingBid())) // bid + auction
      .mockReturnValueOnce(upd) // update
      .mockReturnValueOnce(advisorNameChain("Adviser One")); // name for email

    const { POST } = await import("@/app/api/advisor-portal/counter-respond/route");
    const res = await POST(req({ bid_id: 5, action: "accept" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.action).toBe("accept");
    expect(upd._update).toHaveBeenCalledWith({ bid_amount: 220000, counter_status: "accepted" });
    // Consumer emailed with accepted=true and the agreed amount.
    expect(mockSendResult).toHaveBeenCalledWith(
      "jo@x.com", "Jo", "SMSF setup", "smsf-help", "Adviser One", true, 220000,
    );
  });

  it("DECLINE marks declined and leaves bid_amount untouched", async () => {
    const upd = updateChain();
    mockAdminFrom
      .mockReturnValueOnce(advisorChain(1))
      .mockReturnValueOnce(bidLookupChain(pendingBid()))
      .mockReturnValueOnce(upd)
      .mockReturnValueOnce(advisorNameChain("Adviser One"));

    const { POST } = await import("@/app/api/advisor-portal/counter-respond/route");
    const res = await POST(req({ bid_id: 5, action: "decline" }));

    expect(res.status).toBe(200);
    expect(upd._update).toHaveBeenCalledWith({ counter_status: "declined" });
    // Email reflects decline + the original bid amount (300000), not the counter.
    expect(mockSendResult).toHaveBeenCalledWith(
      "jo@x.com", "Jo", "SMSF setup", "smsf-help", "Adviser One", false, 300000,
    );
  });

  it("400 when there is no pending counter on the bid", async () => {
    mockAdminFrom
      .mockReturnValueOnce(advisorChain(1))
      .mockReturnValueOnce(bidLookupChain(pendingBid({ counter_status: "declined" })));
    const { POST } = await import("@/app/api/advisor-portal/counter-respond/route");
    const res = await POST(req({ bid_id: 5, action: "accept" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no pending counter/i);
  });

  it("404 when the bid isn't this advisor's (lookup returns null)", async () => {
    mockAdminFrom
      .mockReturnValueOnce(advisorChain(1))
      .mockReturnValueOnce(bidLookupChain(null));
    const { POST } = await import("@/app/api/advisor-portal/counter-respond/route");
    expect((await POST(req({ bid_id: 5, action: "accept" }))).status).toBe(404);
  });

  it("400 when the auction is no longer open", async () => {
    const closed = pendingBid();
    (closed.advisor_auctions as Record<string, unknown>).status = "awarded";
    mockAdminFrom
      .mockReturnValueOnce(advisorChain(1))
      .mockReturnValueOnce(bidLookupChain(closed));
    const { POST } = await import("@/app/api/advisor-portal/counter-respond/route");
    expect((await POST(req({ bid_id: 5, action: "accept" }))).status).toBe(400);
  });
});
