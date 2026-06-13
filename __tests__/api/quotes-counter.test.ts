import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAdminFrom = vi.fn();
const { mockIsFlagEnabled, mockSendCounter } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(),
  mockSendCounter: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ from: mockAdminFrom })) }));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: vi.fn(() => false) }));
vi.mock("@/lib/feature-flags", () => ({ isFlagEnabled: (...a: unknown[]) => mockIsFlagEnabled(...a) }));
vi.mock("@/lib/quote-emails", () => ({ sendCounterOfferToAdvisorEmail: (...a: unknown[]) => mockSendCounter(...a) }));
vi.mock("@/lib/logger", () => ({ logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) }));

import { isRateLimited } from "@/lib/rate-limit";

const CTX = { params: Promise.resolve({ slug: "smsf-help" }) };
function req(body: unknown) {
  return new NextRequest("http://localhost/api/quotes/smsf-help/counter", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.1.1.1" },
    body: JSON.stringify(body),
  });
}
const auction = { id: 10, slug: "smsf-help", job_title: "SMSF setup", contact_email: "jo@x.com", status: "open" };
function auctionChain(data: unknown) {
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data }) };
}
function bidChain(data: unknown) {
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data }) };
}
function updateChain(error: unknown = null) {
  const upd = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error }) });
  return { update: upd, _update: upd };
}

describe("POST /api/quotes/[slug]/counter (idea #11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRateLimited).mockResolvedValue(false);
    mockIsFlagEnabled.mockResolvedValue(true);
    mockSendCounter.mockResolvedValue(true);
  });

  it("404 (dormant) when flag off", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    mockAdminFrom.mockReturnValueOnce(auctionChain(auction));
    const { POST } = await import("@/app/api/quotes/[slug]/counter/route");
    expect((await POST(req({ contact_email: "jo@x.com", bid_id: 5, counter_amount: 220000 }), CTX)).status).toBe(404);
  });

  it("403 when the email doesn't match the owner", async () => {
    mockAdminFrom.mockReturnValueOnce(auctionChain(auction));
    const { POST } = await import("@/app/api/quotes/[slug]/counter/route");
    expect((await POST(req({ contact_email: "no@x.com", bid_id: 5, counter_amount: 220000 }), CTX)).status).toBe(403);
  });

  it("409 when a pending counter already exists on the bid", async () => {
    mockAdminFrom
      .mockReturnValueOnce(auctionChain(auction))
      .mockReturnValueOnce(bidChain({ id: 5, advisor_id: 1, bid_amount: 300000, status: "active", counter_status: "pending" }));
    const { POST } = await import("@/app/api/quotes/[slug]/counter/route");
    expect((await POST(req({ contact_email: "jo@x.com", bid_id: 5, counter_amount: 220000 }), CTX)).status).toBe(409);
  });

  it("records the counter (pending) and emails the adviser", async () => {
    const upd = updateChain();
    mockAdminFrom
      .mockReturnValueOnce(auctionChain(auction))
      .mockReturnValueOnce(bidChain({ id: 5, advisor_id: 1, bid_amount: 300000, status: "active", counter_status: null }))
      .mockReturnValueOnce(upd) // update bid
      .mockReturnValueOnce(bidChain({ name: "Adviser One", email: "a1@x.com" })); // advisor lookup
    const { POST } = await import("@/app/api/quotes/[slug]/counter/route");
    const res = await POST(req({ contact_email: "jo@x.com", bid_id: 5, counter_amount: 220000 }), CTX);

    expect(res.status).toBe(200);
    expect(upd._update).toHaveBeenCalledWith(
      expect.objectContaining({ counter_amount: 220000, counter_status: "pending", counter_at: expect.any(String) }),
    );
    expect(mockSendCounter).toHaveBeenCalledWith("a1@x.com", "Adviser", "SMSF setup", "smsf-help", 300000, 220000);
  });

  it("400 when the bid is not active", async () => {
    mockAdminFrom
      .mockReturnValueOnce(auctionChain(auction))
      .mockReturnValueOnce(bidChain({ id: 5, advisor_id: 1, bid_amount: 300000, status: "won", counter_status: null }));
    const { POST } = await import("@/app/api/quotes/[slug]/counter/route");
    expect((await POST(req({ contact_email: "jo@x.com", bid_id: 5, counter_amount: 220000 }), CTX)).status).toBe(400);
  });
});
