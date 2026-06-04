import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

function makePost(body: string, signature = "test-sig"): NextRequest {
  return new NextRequest("http://localhost/api/marketplace/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body,
  });
}

/**
 * A thenable Supabase query-builder stub. Every builder method returns the
 * same chain; awaiting the chain (or calling `.maybeSingle()`) resolves to
 * `result`. `insertResult` lets a caller distinguish the terminal result of
 * an `.insert(...)` (used for the idempotency claim) from a `.maybeSingle()`
 * read (used to inspect the existing idempotency row).
 */
function makeDbChain(
  result: unknown = { data: null, error: null },
  insertResult: { error: unknown } = { error: null }
) {
  const c: Record<string, unknown> = {};
  let lastWasInsert = false;
  for (const m of ["select", "eq", "update", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.insert = vi.fn(() => {
    lastWasInsert = true;
    return c;
  });
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  // Awaiting the chain itself resolves to insertResult after an insert,
  // otherwise to `{ error: null }` (update / fire-and-forget paths).
  c.then = (cb: (v: unknown) => unknown) => {
    const v = lastWasInsert ? insertResult : { error: null };
    lastWasInsert = false;
    return Promise.resolve(cb(v));
  };
  return c;
}

/**
 * Default table router: idempotency claim succeeds (no error), everything
 * else returns the broker-enrichment row. Individual tests override per table.
 */
function defaultFromRouter() {
  return (table: string) => {
    if (table === "stripe_webhook_events") {
      return makeDbChain({ data: null, error: null }, { error: null });
    }
    return makeDbChain(
      { data: { company_name: "CommSec", email: "admin@commsec.com.au" }, error: null },
      { error: null }
    );
  };
}

function makeWalletTopupEvent(overrides: Record<string, unknown> = {}, id = "evt_wallet_1") {
  return {
    id,
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

function makeAutoTopupEvent(overrides: Record<string, unknown> = {}, id = "evt_auto_1") {
  return {
    id,
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
    // The marketplace endpoint fails closed without its own secret. Stub it
    // explicitly — CI's env block sets only STRIPE_WEBHOOK_SECRET, NOT the
    // marketplace one, so without this the happy-path tests would 500.
    vi.stubEnv("STRIPE_MARKETPLACE_WEBHOOK_SECRET", "whsec_marketplace_test");
    mockCreditWallet.mockResolvedValue({ id: "txn-1" });
    mockAdminFrom.mockImplementation(defaultFromRouter());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  // ── Fail-closed secret (finding: no STRIPE_WEBHOOK_SECRET fallback) ──────────

  it("returns 500 and does NOT verify when STRIPE_MARKETPLACE_WEBHOOK_SECRET is unset", async () => {
    vi.stubEnv("STRIPE_MARKETPLACE_WEBHOOK_SECRET", "");
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(500);
    // Must NOT borrow the platform secret — constructEvent is never reached.
    expect(mockConstructEvent).not.toHaveBeenCalled();
    expect(mockCreditWallet).not.toHaveBeenCalled();
  });

  it("does NOT fall back to STRIPE_WEBHOOK_SECRET when marketplace secret is unset", async () => {
    vi.stubEnv("STRIPE_MARKETPLACE_WEBHOOK_SECRET", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_platform_main");
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(500);
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("verifies against the marketplace secret (not the platform secret)", async () => {
    vi.stubEnv("STRIPE_MARKETPLACE_WEBHOOK_SECRET", "whsec_marketplace_only");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_platform_main");
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent());
    await POST(makePost("{}"));
    expect(mockConstructEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "whsec_marketplace_only"
    );
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

  // ── Happy paths ──────────────────────────────────────────────────────────────

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

  it("claims the event in stripe_webhook_events before processing", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent());
    await POST(makePost("{}"));
    expect(mockAdminFrom).toHaveBeenCalledWith("stripe_webhook_events");
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
    mockConstructEvent.mockReturnValue({ id: "evt_unknown_1", type: "charge.expired", data: { object: {} } });
    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  // ── Event-level idempotency (finding: no event-level idempotency guard) ──────

  it("short-circuits a duplicate event already marked 'done' WITHOUT re-crediting", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent({}, "evt_dup_done"));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "stripe_webhook_events") {
        // INSERT collides (23505); the existing row is 'done'.
        return makeDbChain(
          { data: { status: "done", started_at: new Date().toISOString() }, error: null },
          { error: { code: "23505", message: "duplicate key" } }
        );
      }
      return makeDbChain(
        { data: { company_name: "CommSec", email: "x@y.com" }, error: null },
        { error: null }
      );
    });

    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    // No money movement, no audit row, no invoice update on the replay.
    expect(mockCreditWallet).not.toHaveBeenCalled();
    expect(mockAdminFrom).not.toHaveBeenCalledWith("admin_audit_log");
    expect(mockAdminFrom).not.toHaveBeenCalledWith("marketplace_invoices");
  });

  it("treats an in-flight 'processing' duplicate (younger than 5 min) as in-flight, no re-credit", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent({}, "evt_dup_inflight"));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "stripe_webhook_events") {
        return makeDbChain(
          { data: { status: "processing", started_at: new Date().toISOString() }, error: null },
          { error: { code: "23505", message: "duplicate key" } }
        );
      }
      return makeDbChain(
        { data: { company_name: "CommSec", email: "x@y.com" }, error: null },
        { error: null }
      );
    });

    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.inflight).toBe(true);
    expect(mockCreditWallet).not.toHaveBeenCalled();
    expect(mockAdminFrom).not.toHaveBeenCalledWith("admin_audit_log");
  });

  it("re-takes a STALE 'processing' duplicate (older than 5 min) and processes it once", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent({}, "evt_dup_stale"));
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "stripe_webhook_events") {
        return makeDbChain(
          { data: { status: "processing", started_at: stale }, error: null },
          { error: { code: "23505", message: "duplicate key" } }
        );
      }
      return makeDbChain(
        { data: { company_name: "CommSec", email: "x@y.com" }, error: null },
        { error: null }
      );
    });

    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.duplicate).toBeUndefined();
    expect(json.inflight).toBeUndefined();
    // Stale crash was re-taken → the side effects DO run this time.
    expect(mockCreditWallet).toHaveBeenCalledTimes(1);
    expect(mockAdminFrom).toHaveBeenCalledWith("admin_audit_log");
  });

  it("processes anyway (fail-open) when the idempotency claim errors with a non-23505 code", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent({}, "evt_claim_err"));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "stripe_webhook_events") {
        return makeDbChain(
          { data: null, error: null },
          { error: { code: "08006", message: "connection failure" } }
        );
      }
      return makeDbChain(
        { data: { company_name: "CommSec", email: "x@y.com" }, error: null },
        { error: null }
      );
    });

    const res = await POST(makePost("{}"));
    expect(res.status).toBe(200);
    // We do not block real events on an idempotency-table outage.
    expect(mockCreditWallet).toHaveBeenCalledTimes(1);
  });

  it("a first delivery that 500s leaves the event re-takeable (marks 'error', does not mark 'done')", async () => {
    mockConstructEvent.mockReturnValue(makeWalletTopupEvent({}, "evt_first_fail"));
    mockCreditWallet.mockRejectedValue(new Error("optimistic lock failure"));

    const updateStatuses: string[] = [];
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "stripe_webhook_events") {
        const chain = makeDbChain({ data: null, error: null }, { error: null }) as Record<
          string,
          ReturnType<typeof vi.fn>
        >;
        const origUpdate = chain.update;
        chain.update = vi.fn((patch: { status?: string }) => {
          if (patch?.status) updateStatuses.push(patch.status);
          return origUpdate(patch);
        });
        return chain;
      }
      return makeDbChain(
        { data: { company_name: "CommSec", email: "x@y.com" }, error: null },
        { error: null }
      );
    });

    const res = await POST(makePost("{}"));
    expect(res.status).toBe(500);
    // The terminal stamp must be 'error', never 'done', so Stripe's retry
    // can re-take the stale row and re-run the un-completed side effects.
    expect(updateStatuses).toContain("error");
    expect(updateStatuses).not.toContain("done");
  });
});
