import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Logger } from "@/lib/logger";
import type Stripe from "stripe";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { upsertSubscription } from "@/lib/stripe-webhook/lib/upsert-subscription";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLog(): Logger {
  return { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } as unknown as Logger;
}

/** Build a minimal Stripe.Subscription for test purposes. */
function makeSub(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: "sub_test_001",
    customer: "cus_test",
    status: "active",
    items: { data: [{ price: { id: "price_monthly", recurring: { interval: "month" } } }] },
    current_period_start: now - 86400,
    current_period_end: now + 86400 * 29,
    cancel_at_period_end: false,
    canceled_at: null,
    cancel_at: null,
    ...overrides,
  } as unknown as Stripe.Subscription;
}

/**
 * Build a chainable Supabase query mock for a sequence of table calls.
 * Designed to handle: profiles.select().eq().single() and
 * subscriptions.select().eq().maybeSingle() + subscriptions.upsert()
 */
function makeAdmin({
  profileData,
  subscriptionData,
  upsertError = null,
}: {
  profileData: { id: string } | null;
  subscriptionData?: { updated_at: string; status: string } | null;
  upsertError?: { message: string } | null;
}): { client: SupabaseClient<Database>; upsertSpy: ReturnType<typeof vi.fn> } {
  const upsertSpy = vi.fn().mockResolvedValue({ error: upsertError });

  const fromMock = vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: profileData, error: null }),
      };
    }
    if (table === "subscriptions") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: subscriptionData ?? null,
          error: null,
        }),
        upsert: upsertSpy,
      };
    }
    return {};
  });

  return {
    client: { from: fromMock } as unknown as SupabaseClient<Database>,
    upsertSpy,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("upsertSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early without upserting when no profile is found for the customer", async () => {
    const { client, upsertSpy } = makeAdmin({ profileData: null });
    const log = makeLog();
    await upsertSubscription(makeSub(), client, log);
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledOnce();
  });

  it("resolves the customer id when customer is an object (not a string)", async () => {
    const { client, upsertSpy } = makeAdmin({
      profileData: { id: "user-uuid-1" },
    });
    const log = makeLog();
    const sub = makeSub({ customer: { id: "cus_obj" } as unknown as Stripe.Customer });
    await upsertSubscription(sub, client, log);
    expect(upsertSpy).toHaveBeenCalledOnce();
  });

  it("skips the upsert when the existing updated_at is newer than the incoming event time", async () => {
    const futureTs = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { client, upsertSpy } = makeAdmin({
      profileData: { id: "user-uuid-2" },
      subscriptionData: { updated_at: futureTs, status: "active" },
    });
    const log = makeLog();

    const sub = makeSub({
      current_period_start: Math.floor((Date.now() - 5 * 60 * 1000) / 1000),
      cancel_at: null,
    });

    await upsertSubscription(sub, client, log);
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledOnce();
  });

  it("upserts when no existing subscription row exists (first time)", async () => {
    const { client, upsertSpy } = makeAdmin({
      profileData: { id: "user-uuid-3" },
      subscriptionData: null,
    });
    const log = makeLog();
    await upsertSubscription(makeSub(), client, log);
    expect(upsertSpy).toHaveBeenCalledOnce();
    expect(log.error).not.toHaveBeenCalled();
  });

  it("upserts when the existing updated_at is older than the incoming event time", async () => {
    // existing.updated_at = 2h ago; incoming current_period_start = 30min ago
    // stripeEventTime = 30min ago > 2h ago → guard does NOT fire → upsert runs
    const oldTs = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const recentStart = Math.floor((Date.now() - 30 * 60 * 1000) / 1000);
    const { client, upsertSpy } = makeAdmin({
      profileData: { id: "user-uuid-4" },
      subscriptionData: { updated_at: oldTs, status: "active" },
    });
    const log = makeLog();
    await upsertSubscription(makeSub({ current_period_start: recentStart }), client, log);
    expect(upsertSpy).toHaveBeenCalledOnce();
    expect(log.error).not.toHaveBeenCalled();
  });

  it("logs an error when the upsert returns an error", async () => {
    const { client } = makeAdmin({
      profileData: { id: "user-uuid-5" },
      upsertError: { message: "DB constraint violation" },
    });
    const log = makeLog();
    await upsertSubscription(makeSub(), client, log);
    expect(log.error).toHaveBeenCalledOnce();
  });

  it("upserts with the correct onConflict column (stripe_subscription_id)", async () => {
    const { client, upsertSpy } = makeAdmin({
      profileData: { id: "user-uuid-6" },
    });
    const log = makeLog();
    await upsertSubscription(makeSub({ id: "sub_unique_001" }), client, log);
    const [, opts] = upsertSpy.mock.calls[0] as [unknown, { onConflict: string }];
    expect(opts.onConflict).toBe("stripe_subscription_id");
  });

  it("sets canceled_at to null when canceled_at is absent", async () => {
    const { client, upsertSpy } = makeAdmin({
      profileData: { id: "user-uuid-7" },
    });
    const log = makeLog();
    await upsertSubscription(makeSub({ canceled_at: null }), client, log);
    const [data] = upsertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(data.canceled_at).toBeNull();
  });

  it("sets cancel_at_period_end correctly", async () => {
    const { client, upsertSpy } = makeAdmin({
      profileData: { id: "user-uuid-8" },
    });
    const log = makeLog();
    await upsertSubscription(makeSub({ cancel_at_period_end: true }), client, log);
    const [data] = upsertSpy.mock.calls[0] as [Record<string, unknown>];
    expect(data.cancel_at_period_end).toBe(true);
  });
});
