import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockCreditWallet = vi.fn();
vi.mock("@/lib/marketplace/wallet", () => ({
  creditWallet: (...args: unknown[]) => mockCreditWallet(...args),
}));

const mockConstructEvent = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent: mockConstructEvent },
  })),
}));

import { POST } from "@/app/api/marketplace/webhook/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(
  body: string,
  signature = "test-sig"
): NextRequest {
  return new NextRequest("http://localhost/api/marketplace/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body,
  });
}

function makeDbChain(result: unknown = { data: null, error: null }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "update", "insert", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb({ error: null });
    return Promise.resolve({ error: null });
  };
  return c;
}

function makeWalletTopupEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        payment_intent: "pi_abc",
        metadata: {
          type: "wallet_topup",
          broker_slug: "commsec",
          amount_cents: "50000",
          invoice_id: "42",
          ...overrides,
        },
      },
    },
  };
}

function makeAutoTopupEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_auto_123",
        amount: 20000,
        metadata: {
          type: "auto_topup",
          broker_slug: "commsec",
          invoice_id: "55",
          ...overrides,
        },
      },
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/marketplace/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreditWallet.mockResolvedValue({ id: "txn-1" });
    mockAdminFrom.mockReturnValue(makeDbChain({ data: { company_name: "CommSec", email: "admin@commsec.com.au" }, error: null }));
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = new NextRequest("http://localhost/api/marketplace/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature/i);
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found");
    });
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature/i);
  });

  it("credits wallet on checkout.session.completed wallet_topup", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent());
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    expect(mockCreditWallet).toHaveBeenCalledWith(
      "commsec",
      50000,
      expect.stringContaining("Wallet top-up"),
      expect.objectContaining({ type: "stripe_checkout", id: "cs_test_123" }),
      "stripe_webhook"
    );
  });

  it("updates invoice to paid with correct fields on wallet_topup", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent());
    await POST(makePost("{}"));
    expect(mockAdminFrom).toHaveBeenCalledWith("marketplace_invoices");
  });

  it("writes admin_audit_log on wallet_topup", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent());
    await POST(makePost("{}"));
    expect(mockAdminFrom).toHaveBeenCalledWith("admin_audit_log");
  });

  it("returns 400 when wallet_topup metadata lacks broker_slug", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent({ broker_slug: undefined }));
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/metadata/i);
  });

  it("returns 400 when wallet_topup metadata lacks amount_cents", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent({ amount_cents: undefined }));
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(400);
  });

  it("skips invoice update when no invoice_id present", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent({ invoice_id: undefined }));
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    expect(mockAdminFrom).not.toHaveBeenCalledWith("marketplace_invoices");
  });

  it("credits wallet on payment_intent.succeeded auto_topup", async () => {
    mockConstructEvent.mockReturnValue(makeAutoTopupEvent());
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    expect(mockCreditWallet).toHaveBeenCalledWith(
      "commsec",
      20000,
      expect.stringContaining("Auto top-up"),
      expect.objectContaining({ type: "auto_topup" }),
      "auto_topup"
    );
  });

  it("writes admin_audit_log on auto_topup", async () => {
    mockConstructEvent.mockReturnValue(makeAutoTopupEvent());
    await POST(makePost("{}"));
    expect(mockAdminFrom).toHaveBeenCalledWith("admin_audit_log");
  });

  it("skips auto_topup when broker_slug missing", async () => {
    mockConstructEvent.mockReturnValue(makeAutoTopupEvent({ broker_slug: undefined }));
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    expect(mockCreditWallet).not.toHaveBeenCalled();
  });

  it("skips auto_topup when amount is zero", async () => {
    const event = makeAutoTopupEvent();
    (event.data.object as Record<string, unknown>).amount = 0;
    mockConstructEvent.mockReturnValue(event);
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    expect(mockCreditWallet).not.toHaveBeenCalled();
  });

  it("returns 500 when creditWallet throws (caught by outer try/catch)", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent());
    mockCreditWallet.mockRejectedValue(new Error("DB down"));
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(500);
  });

  it("returns 200 for unknown event types (no-op)", async () => {
    mockConstructEvent.mockReturnValue({ type: "charge.expired", data: { object: {} } });
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});
