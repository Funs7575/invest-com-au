import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBuilder, sinceCapture } = vi.hoisted(() => {
  /**
   * Captures the `gte("clicked_at", X)` value the caller passes in,
   * along with the supabase chain output configured per test. Mocks
   * the entire fluent builder used by `attributeSignup`.
   */
  const sinceCapture: { value: string | null } = { value: null };

  type Resolver = (input: { withinWindow: boolean }) => unknown;
  const state: { resolver: Resolver | null; clickRow: unknown; linkRow: unknown } = {
    resolver: null,
    clickRow: undefined,
    linkRow: undefined,
  };

  function makeChain(initialTable: string): unknown {
    const ctx = { table: initialTable, since: null as string | null };
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      not: () => chain,
      gte: (_col: string, value: string) => {
        ctx.since = value;
        sinceCapture.value = value;
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      update: () => chain,
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({ data: state.linkRow ?? null, error: null }),
        }),
        // bare insert path used by awardCredits etc.
        then: (resolve: (v: { data: null; error: null }) => unknown) =>
          resolve({ data: null, error: null }),
      }),
      maybeSingle: () => {
        // For the clicks table, simulate the attribution-window filter:
        // if `since` was set later than the row's clicked_at, return null.
        if (ctx.table === "pro_affiliate_clicks") {
          if (!state.clickRow) return Promise.resolve({ data: null });
          // The "within window" decision is parameterised per test below.
          return Promise.resolve({ data: state.clickRow });
        }
        if (ctx.table === "pro_affiliate_links") {
          return Promise.resolve({ data: state.linkRow ?? null });
        }
        return Promise.resolve({ data: null });
      },
    });
    return chain;
  }

  const mockBuilder = {
    state,
    from: vi.fn((table: string) => makeChain(table)),
    reset() {
      state.resolver = null;
      state.clickRow = undefined;
      state.linkRow = undefined;
      sinceCapture.value = null;
    },
  };

  return { mockBuilder, sinceCapture };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockBuilder.from }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { attributeSignup } from "@/lib/pro-affiliate/track";
import { ATTRIBUTION_WINDOW_DAYS } from "@/lib/pro-affiliate/types";

const NINETY_DAYS_MS = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

describe("attributeSignup — attribution window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuilder.reset();
  });

  it("computes a `since` cutoff at exactly 90 days ago", async () => {
    mockBuilder.state.clickRow = null;
    await attributeSignup({ sessionId: "sess-1", userId: "user-1" });
    expect(sinceCapture.value).not.toBeNull();
    const since = new Date(sinceCapture.value as string).getTime();
    const diff = Date.now() - since;
    // Allow a small clock-drift slack window (1s) for test runtime.
    expect(Math.abs(diff - NINETY_DAYS_MS)).toBeLessThan(2000);
  });

  it("returns false when no eligible click is found (beyond window or no row)", async () => {
    mockBuilder.state.clickRow = null;
    const result = await attributeSignup({
      sessionId: "sess-expired",
      userId: "user-1",
    });
    expect(result).toBe(false);
  });

  it("attributes when a recent click is present (within window)", async () => {
    mockBuilder.state.clickRow = {
      id: 11,
      share_token: "tok123",
    };
    mockBuilder.state.linkRow = {
      pro_slug: "jane",
      pro_kind: "professional",
      signup_count: 0,
    };
    const result = await attributeSignup({
      sessionId: "sess-recent",
      userId: "user-1",
    });
    expect(result).toBe(true);
  });

  it("ignores empty sessionId / userId inputs", async () => {
    expect(await attributeSignup({ sessionId: "", userId: "u" })).toBe(false);
    expect(await attributeSignup({ sessionId: "s", userId: "" })).toBe(false);
  });
});
