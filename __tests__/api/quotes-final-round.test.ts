import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAdminFrom = vi.fn();
const { mockIsFlagEnabled, mockSendInvite } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(),
  mockSendInvite: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ from: mockAdminFrom })) }));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: vi.fn(() => false) }));
vi.mock("@/lib/feature-flags", () => ({ isFlagEnabled: (...a: unknown[]) => mockIsFlagEnabled(...a) }));
vi.mock("@/lib/quote-emails", () => ({ sendFinalRoundInviteEmail: (...a: unknown[]) => mockSendInvite(...a) }));
vi.mock("@/lib/logger", () => ({ logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) }));

import { isRateLimited } from "@/lib/rate-limit";

const CTX = { params: Promise.resolve({ slug: "smsf-help" }) };
function req(body: unknown) {
  return new NextRequest("http://localhost/api/quotes/smsf-help/final-round", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.1.1.1" },
    body: JSON.stringify(body),
  });
}

function auctionChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  };
}
// Thenable chain: select/eq/in all chain; awaiting resolves to { data }.
function eligibleBidsChain(data: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.then = (f: (v: unknown) => unknown) => Promise.resolve({ data }).then(f);
  return chain;
}
const openAuction = {
  id: 10, slug: "smsf-help", job_title: "SMSF setup", contact_email: "jo@x.com",
  status: "open", final_round_started_at: null, final_round_ends_at: null,
};

describe("POST /api/quotes/[slug]/final-round", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRateLimited).mockResolvedValue(false);
    mockIsFlagEnabled.mockResolvedValue(true);
    mockSendInvite.mockResolvedValue(true);
  });

  it("404 (dormant) when flag off", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    mockAdminFrom.mockReturnValueOnce(auctionChain(openAuction));
    const { POST } = await import("@/app/api/quotes/[slug]/final-round/route");
    const res = await POST(req({ contact_email: "jo@x.com", bid_ids: [1] }), CTX);
    expect(res.status).toBe(404);
  });

  it("403 when the email doesn't match the owner", async () => {
    mockAdminFrom.mockReturnValueOnce(auctionChain(openAuction));
    const { POST } = await import("@/app/api/quotes/[slug]/final-round/route");
    const res = await POST(req({ contact_email: "someone@else.com", bid_ids: [1] }), CTX);
    expect(res.status).toBe(403);
  });

  it("409 when a final round was already started", async () => {
    mockAdminFrom.mockReturnValueOnce(
      auctionChain({ ...openAuction, final_round_started_at: "2026-06-12T10:00:00Z" }),
    );
    const { POST } = await import("@/app/api/quotes/[slug]/final-round/route");
    const res = await POST(req({ contact_email: "jo@x.com", bid_ids: [1] }), CTX);
    expect(res.status).toBe(409);
  });

  it("400 when none of the chosen bids are eligible", async () => {
    mockAdminFrom
      .mockReturnValueOnce(auctionChain(openAuction))
      .mockReturnValueOnce(eligibleBidsChain([]));
    const { POST } = await import("@/app/api/quotes/[slug]/final-round/route");
    const res = await POST(req({ contact_email: "jo@x.com", bid_ids: [1] }), CTX);
    expect(res.status).toBe(400);
  });

  it("opens the round: stamps the window, bumps chosen bids to round 2, emails invitees", async () => {
    const eligibleBids = [
      { id: 11, advisor_id: 1, bid_amount: 300000, status: "active" },
      { id: 12, advisor_id: 2, bid_amount: 250000, status: "active" },
    ];
    const eligibleChain = eligibleBidsChain(eligibleBids);
    // auction update: .update().eq().eq() → resolves { error }
    const auctionUpdEq2 = vi.fn().mockResolvedValue({ error: null });
    const auctionUpdEq1 = vi.fn().mockReturnValue({ eq: auctionUpdEq2 });
    const auctionUpdate = { update: vi.fn().mockReturnValue({ eq: auctionUpdEq1 }) };
    // bids round-2 update: .update().in() → resolves
    const bidsUpdate = { update: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ error: null }) }) };
    // advisor email lookup: .select().in() → resolves data
    const advisorsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: 1, name: "Adviser One", email: "a1@x.com" },
          { id: 2, name: "Adviser Two", email: "a2@x.com" },
        ],
      }),
    };
    mockAdminFrom
      .mockReturnValueOnce(auctionChain(openAuction)) // load auction
      .mockReturnValueOnce(eligibleChain) // eligible bids
      .mockReturnValueOnce(auctionUpdate) // stamp window
      .mockReturnValueOnce(bidsUpdate) // round_number=2
      .mockReturnValueOnce(advisorsChain); // advisor emails

    const { POST } = await import("@/app/api/quotes/[slug]/final-round/route");
    const res = await POST(req({ contact_email: "jo@x.com", bid_ids: [11, 12] }), CTX);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.invited).toBe(2);
    // Window stamped on the auction.
    expect(auctionUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ final_round_started_at: expect.any(String), final_round_ends_at: expect.any(String) }),
    );
    // Chosen bids bumped to round 2.
    expect(bidsUpdate.update).toHaveBeenCalledWith({ round_number: 2 });
    // Both invitees emailed.
    expect(mockSendInvite).toHaveBeenCalledTimes(2);
  });
});
