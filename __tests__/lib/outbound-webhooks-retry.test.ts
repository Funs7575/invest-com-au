import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

let deliveriesData: unknown[] = [];
let endpointRow: Record<string, unknown> | null = null;

function makeChain() {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "gte", "order", "eq", "update", "insert"]) c[m] = vi.fn(() => c);
  // Endpoint lookup terminates in .maybeSingle()
  c.maybeSingle = () => Promise.resolve({ data: endpointRow, error: null });
  // Deliveries fetch terminates in .order() then await → chain.then
  c.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data: deliveriesData, error: null }));
  return c;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => makeChain(),
    rpc: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
  }),
}));

import { retryFailedOutboundWebhooks } from "@/lib/outbound-webhooks";

describe("retryFailedOutboundWebhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    endpointRow = {
      id: 1,
      url: "https://sub.example/hook",
      signing_secret: "whsec_test",
      owner_kind: "professional",
      owner_id: "p1",
      event_subscriptions: ["brief.accepted"],
      enabled: true,
    };
    // Retried delivery fails again — we only assert it was re-attempted.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, text: async () => "down" })),
    );
  });

  it("retries latest-failed groups, skips succeeded + over-cap", async () => {
    deliveriesData = [
      // group A (endpoint 1): single failure → retry
      { endpoint_id: 1, event_type: "brief.accepted", payload: { a: 1 }, response_status: 500, delivered_at: "2026-05-20T01:00:00Z" },
      // group B (endpoint 2): failed then succeeded → skip
      { endpoint_id: 2, event_type: "brief.done", payload: { b: 2 }, response_status: 500, delivered_at: "2026-05-20T01:00:00Z" },
      { endpoint_id: 2, event_type: "brief.done", payload: { b: 2 }, response_status: 200, delivered_at: "2026-05-20T02:00:00Z" },
      // group C (endpoint 3): 5 failures → at cap → skip
      ...Array.from({ length: 5 }, (_, i) => ({
        endpoint_id: 3,
        event_type: "x",
        payload: { c: 3 },
        response_status: 500,
        delivered_at: `2026-05-20T0${i}:30:00Z`,
      })),
    ];

    const stats = await retryFailedOutboundWebhooks();
    expect(stats.groups).toBe(3);
    expect(stats.retried).toBe(1);
    expect(stats.skipped_succeeded).toBe(1);
    expect(stats.skipped_max_attempts).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns zeroed stats when there are no recent deliveries", async () => {
    deliveriesData = [];
    const stats = await retryFailedOutboundWebhooks();
    expect(stats).toEqual({
      groups: 0,
      retried: 0,
      skipped_succeeded: 0,
      skipped_max_attempts: 0,
      skipped_endpoint_gone: 0,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
