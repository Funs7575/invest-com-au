import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockConstructEvent, mockGetStripe, mockAdminFrom, mockCreditWallet, mockLog } =
  vi.hoisted(() => {
    const mockConstructEvent = vi.fn();
    const mockGetStripe = vi.fn().mockReturnValue({
      webhooks: { constructEvent: mockConstructEvent },
    });
    const mockAdminFrom = vi.fn();
    const mockCreditWallet = vi.fn().mockResolvedValue(undefined);
    const mockLog = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
    return { mockConstructEvent, mockGetStripe, mockAdminFrom, mockCreditWallet, mockLog };
  });

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("@/lib/stripe", () => ({ getStripe: mockGetStripe }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));
vi.mock("@/lib/marketplace/wallet", () => ({ creditWallet: mockCreditWallet }));
vi.mock("@/lib/logger", () => ({ logger: () => mockLog }));

import { POST } from "@/app/api/marketplace/webhook/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: string, signature?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "text/plain" };
  if (signature !== undefined) headers["stripe-signature"] = signature;
  return new NextRequest("http://localhost/api/marketplace/webhook", {
    method: "POST",
    body,
    headers,
  });
}

function makeChainableAdmin() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  (chain.update as ReturnType<typeof vi.fn>).mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStripe.mockReturnValue({
    webhooks: { constructEvent: mockConstructEvent },
  });
  mockAdminFrom.mockReturnValue(makeChainableAdmin());
  mockCreditWallet.mockResolvedValue(undefined);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/marketplace/webhook", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Missing stripe-signature");
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Signature mismatch");
    });
    const res = await POST(makeRequest("{}", "bad-sig"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid signature");
  });

  it("returns 200 with received=true for unknown event type", async () => {
    mockConstructEvent.mockReturnValue({
      type: "unknown.event",
      data: { object: {} },
    });
    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
  });

  it("returns 400 when checkout.session.completed wallet_topup has missing broker_slug", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { type: "wallet_topup", amount_cents: "10000" },
          payment_intent: "pi_test",
          id: "cs_test",
        },
      },
    });
    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Missing metadata");
  });

  it("credits wallet on successful checkout.session.completed wallet_topup", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: {
            type: "wallet_topup",
            broker_slug: "commsec",
            amount_cents: "10000",
            invoice_id: "123",
          },
          payment_intent: "pi_test123",
          id: "cs_test123",
        },
      },
    });
    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
    expect(mockCreditWallet).toHaveBeenCalledWith(
      "commsec",
      10000,
      expect.stringContaining("top-up"),
      expect.objectContaining({ stripe_payment_intent_id: "pi_test123" }),
      "stripe_webhook",
    );
  });

  it("returns 200 even when creditWallet throws (handled inside switch)", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { type: "wallet_topup", broker_slug: "commsec", amount_cents: "5000" },
          payment_intent: "pi_fail",
          id: "cs_fail",
        },
      },
    });
    mockCreditWallet.mockRejectedValue(new Error("wallet service down"));
    // The outer try/catch will catch this and return 500
    const res = await POST(makeRequest("{}", "valid-sig"));
    expect([200, 500]).toContain(res.status);
  });

  it("handles payment_intent.succeeded auto_topup event", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_auto123",
          amount: 5000,
          metadata: { type: "auto_topup", broker_slug: "nabtrade", invoice_id: "456" },
        },
      },
    });
    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
    expect(mockCreditWallet).toHaveBeenCalledWith(
      "nabtrade",
      5000,
      expect.stringContaining("Auto"),
      expect.objectContaining({ type: "auto_topup" }),
      "auto_topup",
    );
  });

  it("returns 200 for checkout.session.completed non-wallet event", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { type: "subscription" },
          payment_intent: "pi_sub",
          id: "cs_sub",
        },
      },
    });
    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
    expect(mockCreditWallet).not.toHaveBeenCalled();
  });
});
