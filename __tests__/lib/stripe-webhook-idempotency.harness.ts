/**
 * Stripe webhook idempotency replay harness (V-NEW-03).
 *
 * Purpose: every Stripe webhook handler must be idempotent — the same event
 * can arrive multiple times (Stripe retries on non-2xx, network blips, worker
 * crashes). This harness:
 *   1. Creates a Supabase mock whose `stripe_webhook_events` table tracks
 *      processing/done state across repeated handler calls.
 *   2. Replays a handler N times (default 3) with the same signed event body.
 *   3. Collects per-call results and per-table write counts.
 *   4. Exposes assertion helpers used by every DD-* idempotency test.
 *
 * Usage in a test file:
 *
 *   import { createIdempotencyHarness, makeStripeEvent, makeWebhookRequest }
 *     from "@/__tests__/lib/stripe-webhook-idempotency.harness";
 *
 *   const harness = createIdempotencyHarness({ profileData: { id: "u1" } });
 *
 *   vi.mock("@/lib/supabase/admin", () => ({
 *     createAdminClient: () => ({ from: harness.mockFrom }),
 *   }));
 *
 *   beforeEach(() => { vi.clearAllMocks(); harness.reset(); });
 *
 *   it("converges on 3 replays", async () => {
 *     const evt = makeStripeEvent("customer.subscription.created", subData, "evt_001");
 *     mockConstructEvent.mockReturnValue(evt);
 *     const results = await harness.replay(POST, () => makeWebhookRequest(JSON.stringify(evt)));
 *     harness.assertAllSucceeded(results);
 *     harness.assertDuplicatesShortCircuited(results);
 *     harness.assertConverged("subscriptions", "upsert", 1);
 *   });
 *
 * Convention for idempotency test location (DD-* gate accepts either):
 *   __tests__/api/webhooks/stripe/<handler>.idempotency.test.ts
 *   Any file under __tests__/ with the marker:
 *     // idempotency-tested: stripe
 */

import { vi } from "vitest";
import { NextRequest } from "next/server";
import type Stripe from "stripe";

// ── Public types ─────────────────────────────────────────────────────────────

export interface TableCall {
  method: string;
  args: unknown[];
}

export interface ReplayResult {
  /** 0-based call index */
  callIndex: number;
  status: number;
  body: Record<string, unknown>;
  /** true when handler returned { received: true, duplicate: true } */
  isDuplicate: boolean;
  /** true when handler returned { received: true, inflight: true } */
  isInflight: boolean;
}

export interface IdempotencyHarness {
  mockFrom: ReturnType<typeof vi.fn>;
  replay(
    handler: (req: NextRequest) => Promise<Response>,
    makeRequest: () => NextRequest,
    times?: number,
  ): Promise<ReplayResult[]>;
  assertAllSucceeded(results: ReplayResult[]): void;
  assertDuplicatesShortCircuited(results: ReplayResult[], expectedDuplicates?: number): void;
  /** Assert `method` on `table` was called exactly `n` times across all replays */
  assertConverged(table: string, method: string, n: number): void;
  getCalls(table: string): TableCall[];
  /** Call in beforeEach after vi.clearAllMocks() */
  reset(): void;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createIdempotencyHarness(options?: {
  /** Data returned from profiles.single/maybeSingle (for subscription lookup) */
  profileData?: { id: string } | null;
  /** Data returned from subscriptions.maybeSingle (for out-of-order guard) */
  subscriptionData?: { updated_at: string; status: string } | null;
}): IdempotencyHarness {
  const profileData = options?.profileData ?? { id: "user-uuid-harness" };
  const subscriptionData = options?.subscriptionData ?? null;

  // ── stripe_webhook_events state machine ──────────────────────────────────
  // Tracks event_id → status across repeated handler calls.
  // First INSERT for an event_id succeeds; subsequent ones return code 23505.
  const swState = new Map<string, "processing" | "done" | "error">();
  const swStarted = new Map<string, string>();

  function buildStripeWebhookEventsTable() {
    return {
      insert(data: Record<string, unknown>) {
        const eventId = String(data.event_id ?? "");
        if (swState.has(eventId)) {
          // Simulate PK unique-violation — idempotency guard fires
          return Promise.resolve({
            error: {
              code: "23505",
              message: "duplicate key value violates unique constraint",
            },
          });
        }
        swState.set(eventId, "processing");
        swStarted.set(eventId, String(data.started_at ?? new Date().toISOString()));
        return Promise.resolve({ error: null });
      },
      select(_fields: string) {
        const eqFn = (col: string, val: string) => ({
          maybeSingle() {
            if (col === "event_id") {
              const current = swState.get(val);
              if (!current) return Promise.resolve({ data: null, error: null });
              return Promise.resolve({
                data: { status: current, started_at: swStarted.get(val) ?? new Date(0).toISOString() },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          },
        });
        return { eq: eqFn };
      },
      update(data: Record<string, unknown>) {
        const eqFn = (_col: string, val: string) => {
          const newStatus = data.status as "done" | "error" | "processing" | undefined;
          if (newStatus && swState.has(val)) swState.set(val, newStatus);
          return Promise.resolve({ error: null });
        };
        return { eq: eqFn };
      },
    };
  }

  // ── Generic chainable builder with call tracking ──────────────────────────
  const allCalls: Record<string, TableCall[]> = {};

  function record(table: string, method: string, args: unknown[]) {
    (allCalls[table] ??= []).push({ method, args });
  }

  function makeChainable(table: string) {
    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    const CHAIN = [
      "select", "insert", "upsert", "update", "delete",
      "eq", "neq", "not", "is", "or", "filter",
      "order", "limit", "gte", "lte", "in",
    ] as const;
    for (const m of CHAIN) {
      builder[m] = vi.fn((...args: unknown[]) => {
        record(table, m, args);
        return builder;
      });
    }
    builder.single = vi.fn(() => {
      record(table, "single", []);
      if (table === "profiles") return Promise.resolve({ data: profileData, error: null });
      if (table === "subscriptions") return Promise.resolve({ data: subscriptionData, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    builder.maybeSingle = vi.fn(() => {
      record(table, "maybeSingle", []);
      if (table === "profiles") return Promise.resolve({ data: profileData, error: null });
      if (table === "subscriptions") return Promise.resolve({ data: subscriptionData, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    return builder;
  }

  const mockFrom = vi.fn((table: string) => {
    if (table === "stripe_webhook_events") return buildStripeWebhookEventsTable();
    record(table, "__from__", []);
    return makeChainable(table);
  });

  // ── Harness implementation ────────────────────────────────────────────────
  return {
    mockFrom,

    async replay(handler, makeRequest, times = 3) {
      const results: ReplayResult[] = [];
      for (let i = 0; i < times; i++) {
        const res = await handler(makeRequest());
        let body: Record<string, unknown>;
        try {
          body = (await res.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }
        results.push({
          callIndex: i,
          status: res.status,
          body,
          isDuplicate: body.duplicate === true,
          isInflight: body.inflight === true,
        });
      }
      return results;
    },

    assertAllSucceeded(results) {
      for (const r of results) {
        if (r.status !== 200) {
          throw new Error(`Call ${r.callIndex}: expected HTTP 200, got ${r.status}`);
        }
      }
    },

    assertDuplicatesShortCircuited(results, expectedDuplicates = 2) {
      const dups = results.filter((r) => r.isDuplicate || r.isInflight);
      if (dups.length !== expectedDuplicates) {
        const detail = results.map((r) => JSON.stringify(r.body)).join(", ");
        throw new Error(
          `Expected ${expectedDuplicates} duplicate/inflight short-circuits, got ${dups.length}. Bodies: [${detail}]`,
        );
      }
    },

    assertConverged(table, method, n) {
      const calls = (allCalls[table] ?? []).filter((c) => c.method === method);
      if (calls.length !== n) {
        throw new Error(
          `Convergence failure on ${table}.${method}: expected ${n} call(s), got ${calls.length}`,
        );
      }
    },

    getCalls(table) {
      return allCalls[table] ?? [];
    },

    reset() {
      for (const k of Object.keys(allCalls)) delete allCalls[k];
      swState.clear();
      swStarted.clear();
      mockFrom.mockClear();
    },
  };
}

// ── Convenience builders ──────────────────────────────────────────────────────

export function makeStripeEvent(
  type: string,
  data: Record<string, unknown>,
  eventId = `evt_test_${Date.now()}`,
): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    api_version: "2023-10-16" as Stripe.LatestApiVersion,
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object: data },
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as unknown as Stripe.Event;
}

export function makeWebhookRequest(body: string, signature = "sig_test"): NextRequest {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
  });
}
