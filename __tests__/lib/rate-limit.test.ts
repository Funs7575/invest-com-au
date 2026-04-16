import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests for lib/rate-limit.ts — the Supabase-server-client backed
 * window rate limiter (distinct from rate-limit-db.ts which is the
 * token-bucket variant).
 *
 * The implementation is fail-open: any DB error returns false
 * (allow). These tests cover the main paths:
 *   - first request → row created → allowed
 *   - subsequent requests within window → counter increments
 *   - request that pushes counter > max → blocked
 *   - request after window expiry → counter resets, allowed
 *   - DB throw at any point → fail open (allowed)
 */

interface Row {
  key: string;
  count: number;
  window_start: string;
}

let rows: Map<string, Row>;
let throwOnNextSelect = false;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      from: (_table: string) => {
        const state: { key?: string; payload?: Partial<Row> } = {};

        const builder: Record<string, unknown> = {};

        builder.select = vi.fn().mockReturnValue(builder);

        builder.upsert = vi.fn(async (payload: Row) => {
          rows.set(payload.key, { ...payload });
          return { error: null };
        });

        builder.update = vi.fn((payload: Partial<Row>) => {
          state.payload = payload;
          return builder;
        });

        builder.eq = vi.fn((col: string, val: string) => {
          if (col === "key") state.key = val;
          // If this completes a pending update, apply it now
          if (state.payload && state.key) {
            const existing = rows.get(state.key);
            if (existing) {
              rows.set(state.key, { ...existing, ...state.payload });
            }
            // Reset state and return resolved promise
            state.payload = undefined;
            return Promise.resolve({ error: null }) as unknown;
          }
          return builder;
        });

        builder.single = vi.fn(async () => {
          if (throwOnNextSelect) {
            throwOnNextSelect = false;
            throw new Error("simulated DB failure");
          }
          if (!state.key) return { data: null, error: null };
          const found = rows.get(state.key);
          return { data: found ?? null, error: found ? null : { code: "PGRST116" } };
        });

        return builder;
      },
    }),
}));

import { isRateLimited } from "@/lib/rate-limit";

beforeEach(() => {
  rows = new Map();
  throwOnNextSelect = false;
});

describe("isRateLimited", () => {
  it("allows the first request and creates the row", async () => {
    const blocked = await isRateLimited("first-call", 5, 60);
    expect(blocked).toBe(false);
    expect(rows.has("first-call")).toBe(true);
    expect(rows.get("first-call")?.count).toBe(1);
  });

  it("allows subsequent requests up to the max", async () => {
    // First call seeds the row
    await isRateLimited("counter-test", 3, 60);

    // 2nd, 3rd allowed — count goes from 1 → 2 → 3
    expect(await isRateLimited("counter-test", 3, 60)).toBe(false);
    expect(await isRateLimited("counter-test", 3, 60)).toBe(false);
    expect(rows.get("counter-test")?.count).toBe(3);
  });

  it("blocks once the count exceeds max", async () => {
    // Pre-populate at the limit
    rows.set("over-limit", {
      key: "over-limit",
      count: 5,
      window_start: new Date().toISOString(),
    });

    // Next call increments to 6 which is > 5
    const blocked = await isRateLimited("over-limit", 5, 60);
    expect(blocked).toBe(true);
    expect(rows.get("over-limit")?.count).toBe(6);
  });

  it("resets the window when the previous window has expired", async () => {
    // Seed a stale window 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    rows.set("stale-window", {
      key: "stale-window",
      count: 99,
      window_start: twoHoursAgo,
    });

    // Window is 60 minutes — the stale row should be reset, not blocked
    const blocked = await isRateLimited("stale-window", 5, 60);
    expect(blocked).toBe(false);
    expect(rows.get("stale-window")?.count).toBe(1);
    expect(
      new Date(rows.get("stale-window")!.window_start).getTime()
    ).toBeGreaterThan(new Date(twoHoursAgo).getTime());
  });

  it("keeps separate counters per key", async () => {
    // Pre-populate user-a at the limit, leave user-b fresh
    rows.set("user-a", {
      key: "user-a",
      count: 5,
      window_start: new Date().toISOString(),
    });

    expect(await isRateLimited("user-a", 5, 60)).toBe(true);
    // user-b's first call should still be allowed
    expect(await isRateLimited("user-b", 5, 60)).toBe(false);
  });

  it("fails open when the DB throws", async () => {
    throwOnNextSelect = true;
    const blocked = await isRateLimited("dbfail", 5, 60);
    expect(blocked).toBe(false);
  });

  it("uses defaults when called without max/window args", async () => {
    // Default is 10 req per 60 min — first call should be allowed
    const blocked = await isRateLimited("defaults");
    expect(blocked).toBe(false);
    expect(rows.get("defaults")?.count).toBe(1);
  });
});
