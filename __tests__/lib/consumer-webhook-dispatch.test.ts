/**
 * Tests for lib/consumer-webhook-dispatch.ts
 *
 * Covers:
 *  - fireConsumerWebhook: event filtering, HMAC signing, delivery logging,
 *    no-subscribers path, timeout/network error path, missing signing_secret
 *  - retryFailedConsumerWebhooks: skips succeeded, skips at-cap, retries
 *    latest-failed, skips deactivated hooks, skips missing-secret hooks
 *  - buildConsumerSignature: deterministic HMAC output
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Logger mock ───────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────

// Per-test-configurable state
let mockHooks: Record<string, unknown>[] = [];
let mockDeliveries: Record<string, unknown>[] = [];
let insertedDeliveries: Record<string, unknown>[] = [];
let updatedDeliveries: { id: string; patch: Record<string, unknown> }[] = [];
let hookLookupResult: Record<string, unknown> | null = null;

function makeChain() {
  // Chainable Supabase-style builder. Terminals return promises.
  const chain: Record<string, unknown> = {};

  // The chain accumulates filter state so maybeSingle/order can return
  // the right data.
  const state: { table?: string; filters: [string, unknown][]; inFilters: [string, unknown[]][]; updatePatch?: Record<string, unknown>; insertRow?: Record<string, unknown> } = { filters: [], inFilters: [] };

  chain.select = vi.fn((_cols?: string, _opts?: unknown) => {
    return chain;
  });
  chain.eq = vi.fn((_col: string, val: unknown) => {
    state.filters.push([_col, val]);
    return chain;
  });
  chain.in = vi.fn((_col: string, vals: unknown[]) => {
    state.inFilters.push([_col, vals]);
    return chain;
  });
  chain.gte = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.contains = vi.fn((_col: string, _val: unknown) => {
    // For contains("events", [event]) — just return all hooks; tests control mockHooks
    return chain;
  });
  chain.update = vi.fn((patch: Record<string, unknown>) => {
    state.updatePatch = patch;
    return chain;
  });
  chain.insert = vi.fn((row: Record<string, unknown>) => {
    state.insertRow = row;
    insertedDeliveries.push(row);
    return Promise.resolve({ data: null, error: null });
  });
  chain.maybeSingle = vi.fn(() => {
    return Promise.resolve({ data: hookLookupResult, error: null });
  });

  // Override insert to track and resolve immediately
  // (already done above — insert returns a promise)

  // .update(...).eq(id).eq() → then await → { data, error }
  // We make update + eq chain resolve with null error via then
  chain.then = (
    resolve: (v: { data: unknown; error: unknown }) => unknown,
  ) => {
    if (state.updatePatch) {
      const id = state.filters.find(([col]) => col === "id")?.[1] as string | undefined;
      if (id) updatedDeliveries.push({ id, patch: state.updatePatch });
      const inIds = state.inFilters.find(([col]) => col === "id")?.[1] as string[] | undefined;
      if (inIds) for (const inId of inIds) updatedDeliveries.push({ id: inId, patch: state.updatePatch });
    }
    return Promise.resolve(resolve({ data: null, error: null }));
  };

  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      // Hooks query
      if (table === "api_consumer_webhooks") {
        const chain = makeChain();
        // Override insert (not used on hooks table in dispatch)
        // Override the final resolution for select queries
        chain.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
          return Promise.resolve(resolve({ data: mockHooks, error: null }));
        };
        // maybeSingle for hook lookup in retry worker
        chain.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: hookLookupResult, error: null }),
        );
        return chain;
      }
      // Deliveries table
      if (table === "consumer_webhook_deliveries") {
        const chain = makeChain();
        // Preserve the update-tracking `then` from makeChain (closes over this
        // chain's state) so .update(...).eq/.in(...) records updatedDeliveries;
        // fall back to returning mockDeliveries for plain SELECT chains.
        const trackingThen = chain.then as (
          resolve: (v: { data: unknown; error: unknown }) => unknown,
        ) => unknown;
        chain.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
          trackingThen((res: { data: unknown; error: unknown }) =>
            resolve({ ...res, data: mockDeliveries }),
          );
        // Override insert to track rows
        chain.insert = vi.fn((row: Record<string, unknown>) => {
          insertedDeliveries.push(row);
          return Promise.resolve({ data: null, error: null });
        });
        return chain;
      }
      return makeChain();
    },
  }),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import {
  fireConsumerWebhook,
  retryFailedConsumerWebhooks,
  buildConsumerSignature,
  type FetchSender,
} from "@/lib/consumer-webhook-dispatch";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSender(status = 200): FetchSender {
  return vi.fn(async (_url, _body, _sig) => ({
    status,
    bodyText: status < 300 ? "ok" : "error",
  }));
}

function makeHook(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: "wh-1",
    url: "https://consumer.example/hook",
    events: ["broker.updated"],
    signing_secret: "test-secret-for-signing",
    is_active: true,
    ...overrides,
  };
}

// ── Tests: buildConsumerSignature ────────────────────────────────────────────

describe("buildConsumerSignature", () => {
  it("produces a sha256= prefixed hex HMAC", () => {
    const sig = buildConsumerSignature('{"event":"broker.updated"}', "secret");
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    const body = '{"a":1}';
    expect(buildConsumerSignature(body, "s")).toBe(buildConsumerSignature(body, "s"));
  });

  it("differs for different secrets", () => {
    const body = '{"a":1}';
    expect(buildConsumerSignature(body, "s1")).not.toBe(buildConsumerSignature(body, "s2"));
  });

  it("differs for different body", () => {
    expect(buildConsumerSignature("body1", "s")).not.toBe(buildConsumerSignature("body2", "s"));
  });
});

// ── Tests: fireConsumerWebhook ────────────────────────────────────────────────

describe("fireConsumerWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHooks = [];
    mockDeliveries = [];
    insertedDeliveries = [];
    updatedDeliveries = [];
    hookLookupResult = null;
  });

  it("returns without sending when there are no subscribers", async () => {
    mockHooks = [];
    const sender = makeSender(200);
    await fireConsumerWebhook("broker.updated", { broker_slug: "commsec" }, sender);
    expect(sender).not.toHaveBeenCalled();
    expect(insertedDeliveries).toHaveLength(0);
  });

  it("sends POST and logs a successful delivery", async () => {
    mockHooks = [makeHook()];
    const sender = makeSender(200);
    await fireConsumerWebhook("broker.updated", { broker_slug: "commsec" }, sender);

    expect(sender).toHaveBeenCalledTimes(1);
    const [url, body, sig] = (sender as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string, string];
    expect(url).toBe("https://consumer.example/hook");

    // Body must be valid JSON with event + ts + data fields
    const parsed = JSON.parse(body) as { event: string; ts: number; data: unknown };
    expect(parsed.event).toBe("broker.updated");
    expect(typeof parsed.ts).toBe("number");
    expect((parsed.data as Record<string, unknown>).broker_slug).toBe("commsec");

    // Signature must be the HMAC of the body with the hook's signing_secret
    const expected = buildConsumerSignature(body, "test-secret-for-signing");
    expect(sig).toBe(expected);

    // Delivery row inserted: success, needs_retry=false
    expect(insertedDeliveries).toHaveLength(1);
    expect(insertedDeliveries[0].response_status).toBe(200);
    expect(insertedDeliveries[0].needs_retry).toBe(false);
    expect(insertedDeliveries[0].delivered_at).not.toBeNull();
  });

  it("logs failure and sets needs_retry=true on non-2xx response", async () => {
    mockHooks = [makeHook()];
    const sender = makeSender(503);
    await fireConsumerWebhook("savings.updated", { broker_id: "b1" }, sender);

    expect(insertedDeliveries).toHaveLength(1);
    expect(insertedDeliveries[0].response_status).toBe(503);
    expect(insertedDeliveries[0].needs_retry).toBe(true);
    expect(insertedDeliveries[0].delivered_at).toBeNull();
  });

  it("logs error_message and sets needs_retry=true when fetch throws", async () => {
    mockHooks = [makeHook()];
    const throwingSender: FetchSender = vi.fn(async () => {
      throw new Error("connection refused");
    });
    await fireConsumerWebhook("health_score.updated", { broker_slug: "stake" }, throwingSender);

    expect(insertedDeliveries).toHaveLength(1);
    expect(insertedDeliveries[0].error_message).toContain("connection refused");
    expect(insertedDeliveries[0].needs_retry).toBe(true);
    expect(insertedDeliveries[0].response_status).toBeNull();
  });

  it("logs a skipped-delivery row and does not call sender when signing_secret is null", async () => {
    mockHooks = [makeHook({ signing_secret: null })];
    const sender = makeSender(200);
    await fireConsumerWebhook("broker.updated", { broker_slug: "stake" }, sender);

    expect(sender).not.toHaveBeenCalled();
    expect(insertedDeliveries).toHaveLength(1);
    expect(insertedDeliveries[0].error_message).toContain("No signing_secret");
    expect(insertedDeliveries[0].needs_retry).toBe(false);
  });

  it("fans out to multiple subscribers independently", async () => {
    mockHooks = [
      makeHook({ id: "wh-1", url: "https://a.example/hook" }),
      makeHook({ id: "wh-2", url: "https://b.example/hook", signing_secret: "other-secret" }),
    ];
    const sender = makeSender(200);
    await fireConsumerWebhook("broker.updated", {}, sender);

    expect(sender).toHaveBeenCalledTimes(2);
    expect(insertedDeliveries).toHaveLength(2);
  });
});

// ── Tests: retryFailedConsumerWebhooks ───────────────────────────────────────

describe("retryFailedConsumerWebhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHooks = [];
    mockDeliveries = [];
    insertedDeliveries = [];
    updatedDeliveries = [];
    hookLookupResult = null;
  });

  it("returns zeroed stats when there are no failed deliveries", async () => {
    mockDeliveries = [];
    const stats = await retryFailedConsumerWebhooks(makeSender(200));
    expect(stats).toEqual({
      groups: 0,
      retried: 0,
      skipped_succeeded: 0,
      skipped_max_attempts: 0,
      skipped_no_secret: 0,
      skipped_hook_gone: 0,
    });
  });

  it("retries a failed delivery and inserts a new attempt row", async () => {
    const payload = { broker_slug: "commsec" };
    mockDeliveries = [
      {
        id: "d-1",
        webhook_id: "wh-1",
        event_type: "broker.updated",
        payload,
        response_status: 500,
        attempt_count: 1,
        needs_retry: true,
      },
    ];
    hookLookupResult = makeHook();
    const sender = makeSender(200);

    const stats = await retryFailedConsumerWebhooks(sender);

    expect(stats.groups).toBe(1);
    expect(stats.retried).toBe(1);
    expect(sender).toHaveBeenCalledTimes(1);

    // A new delivery row should be inserted for the retry attempt
    const retryRow = insertedDeliveries.find(
      (d) => (d.attempt_count as number) > 1,
    );
    expect(retryRow).toBeDefined();
    expect(retryRow!.needs_retry).toBe(false); // succeeded
    expect(retryRow!.delivered_at).not.toBeNull();
  });

  it("skips groups at the max attempt cap and marks them done", async () => {
    const payload = { broker_slug: "stake" };
    // 5 failed attempts — at cap
    mockDeliveries = Array.from({ length: 5 }, (_, i) => ({
      id: `d-${i}`,
      webhook_id: "wh-1",
      event_type: "broker.updated",
      payload,
      response_status: 503,
      attempt_count: 1,
      needs_retry: true,
    }));
    hookLookupResult = makeHook();
    const sender = makeSender(200);

    const stats = await retryFailedConsumerWebhooks(sender);

    expect(stats.skipped_max_attempts).toBe(1);
    expect(stats.retried).toBe(0);
    expect(sender).not.toHaveBeenCalled();
  });

  it("skips and disables retry when hook is gone or inactive", async () => {
    const payload = { broker_id: "b1" };
    mockDeliveries = [
      {
        id: "d-1",
        webhook_id: "wh-deleted",
        event_type: "savings.updated",
        payload,
        response_status: null,
        attempt_count: 1,
        needs_retry: true,
      },
    ];
    hookLookupResult = null; // hook not found
    const sender = makeSender(200);

    const stats = await retryFailedConsumerWebhooks(sender);

    expect(stats.skipped_hook_gone).toBe(1);
    expect(stats.retried).toBe(0);
    expect(sender).not.toHaveBeenCalled();
  });

  it("skips and disables retry when hook has no signing_secret", async () => {
    const payload = { broker_id: "b2" };
    mockDeliveries = [
      {
        id: "d-1",
        webhook_id: "wh-1",
        event_type: "savings.updated",
        payload,
        response_status: 503,
        attempt_count: 1,
        needs_retry: true,
      },
    ];
    hookLookupResult = makeHook({ signing_secret: null });
    const sender = makeSender(200);

    const stats = await retryFailedConsumerWebhooks(sender);

    expect(stats.skipped_no_secret).toBe(1);
    expect(stats.retried).toBe(0);
    expect(sender).not.toHaveBeenCalled();
  });

  it("clears needs_retry on ALL sibling rows in a group, not just the latest, on successful retry", async () => {
    // Two byte-identical (webhook, event, payload) failures — e.g. the
    // timestamp-less broker.updated event fired across two cron runs while the
    // subscriber was down. Both rows are needs_retry=true in the same group.
    const payload = { broker_slug: "commsec" };
    mockDeliveries = [
      {
        id: "d-old",
        webhook_id: "wh-1",
        event_type: "broker.updated",
        payload,
        response_status: 503,
        attempt_count: 1,
        needs_retry: true,
      },
      {
        id: "d-new",
        webhook_id: "wh-1",
        event_type: "broker.updated",
        payload,
        response_status: 503,
        attempt_count: 1,
        needs_retry: true,
      },
    ];
    hookLookupResult = makeHook();
    const sender = makeSender(200);

    const stats = await retryFailedConsumerWebhooks(sender);

    // Single group (identical key), one real retry.
    expect(stats.groups).toBe(1);
    expect(stats.retried).toBe(1);

    // BOTH original rows must be marked needs_retry=false — not just the latest.
    const clearedIds = updatedDeliveries
      .filter((u) => u.patch.needs_retry === false)
      .map((u) => u.id);
    expect(clearedIds).toContain("d-old");
    expect(clearedIds).toContain("d-new");
  });

  it("clears needs_retry on ALL sibling rows when a group hits the attempt cap", async () => {
    // 5 identical-payload failures = at cap; every row must be cleared so none
    // is left orphaned as needs_retry=true.
    const payload = { broker_slug: "stake" };
    mockDeliveries = Array.from({ length: 5 }, (_, i) => ({
      id: `cap-${i}`,
      webhook_id: "wh-1",
      event_type: "broker.updated",
      payload,
      response_status: 503,
      attempt_count: 1,
      needs_retry: true,
    }));
    hookLookupResult = makeHook();
    const sender = makeSender(200);

    const stats = await retryFailedConsumerWebhooks(sender);

    expect(stats.skipped_max_attempts).toBe(1);
    const clearedIds = updatedDeliveries
      .filter((u) => u.patch.needs_retry === false)
      .map((u) => u.id);
    for (let i = 0; i < 5; i++) {
      expect(clearedIds).toContain(`cap-${i}`);
    }
  });

  it("groups separate events for the same webhook_id independently", async () => {
    const payloadA = { broker_slug: "commsec" };
    const payloadB = { broker_id: "b2" };
    mockDeliveries = [
      {
        id: "d-1",
        webhook_id: "wh-1",
        event_type: "broker.updated",
        payload: payloadA,
        response_status: 503,
        attempt_count: 1,
        needs_retry: true,
      },
      {
        id: "d-2",
        webhook_id: "wh-1",
        event_type: "savings.updated",
        payload: payloadB,
        response_status: 503,
        attempt_count: 1,
        needs_retry: true,
      },
    ];
    hookLookupResult = makeHook();
    const sender = makeSender(200);

    const stats = await retryFailedConsumerWebhooks(sender);

    // Two distinct groups
    expect(stats.groups).toBe(2);
    expect(stats.retried).toBe(2);
    expect(sender).toHaveBeenCalledTimes(2);
  });
});
