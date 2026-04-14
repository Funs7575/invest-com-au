import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory fake of rate_limit_buckets
interface Row {
  scope: string;
  key: string;
  tokens: number;
  max_tokens: number;
  refill_per_sec: number;
  refilled_at: string;
}

let rows: Row[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (_table: string) => {
      // Mini chainable builder that only supports the subset used by
      // rate-limit-db: select → eq → eq → maybeSingle, insert, update → eq → eq
      const state: {
        scope?: string;
        key?: string;
        payload?: Partial<Row>;
      } = {};
      const builder = {
        select: () => builder,
        insert: async (payload: Row) => {
          const existing = rows.find(
            (r) => r.scope === payload.scope && r.key === payload.key,
          );
          if (existing) {
            return { error: { code: "23505", message: "duplicate" } };
          }
          rows.push({ ...payload });
          return { error: null };
        },
        update: (payload: Partial<Row>) => {
          state.payload = payload;
          return builder;
        },
        eq: (col: string, val: string) => {
          if (col === "scope") state.scope = val;
          if (col === "key") state.key = val;
          // If we've completed the eq chain AND we have a pending update
          if (
            state.scope !== undefined &&
            state.key !== undefined &&
            state.payload
          ) {
            const idx = rows.findIndex(
              (r) => r.scope === state.scope && r.key === state.key,
            );
            if (idx >= 0) rows[idx] = { ...rows[idx], ...state.payload };
            return Promise.resolve({ error: null }) as unknown as typeof builder;
          }
          return builder;
        },
        maybeSingle: async () => {
          const found = rows.find(
            (r) => r.scope === state.scope && r.key === state.key,
          );
          return { data: found || null, error: null };
        },
      };
      return builder as unknown as Record<string, unknown>;
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

import { isAllowed, bucketPreset, ipKey } from "@/lib/rate-limit-db";

beforeEach(() => {
  rows = [];
});

describe("isAllowed", () => {
  it("allows the first call", async () => {
    expect(await isAllowed("test", "k1", { max: 5, refillPerSec: 1 })).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokens).toBe(4);
  });

  it("allows up to max calls then denies", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await isAllowed("test", "k2", { max: 5, refillPerSec: 0.001 })).toBe(true);
    }
    // 6th should be denied
    expect(await isAllowed("test", "k2", { max: 5, refillPerSec: 0.001 })).toBe(false);
  });

  it("keeps different keys separate", async () => {
    expect(await isAllowed("test", "userA", { max: 1, refillPerSec: 0.001 })).toBe(true);
    expect(await isAllowed("test", "userB", { max: 1, refillPerSec: 0.001 })).toBe(true);
    // userA is exhausted but userB still OK
    expect(await isAllowed("test", "userA", { max: 1, refillPerSec: 0.001 })).toBe(false);
  });

  it("keeps different scopes separate", async () => {
    expect(await isAllowed("scope-a", "k", { max: 1, refillPerSec: 0.001 })).toBe(true);
    expect(await isAllowed("scope-b", "k", { max: 1, refillPerSec: 0.001 })).toBe(true);
    expect(await isAllowed("scope-a", "k", { max: 1, refillPerSec: 0.001 })).toBe(false);
  });

  it("skips the check when max is zero", async () => {
    expect(await isAllowed("test", "k", { max: 0, refillPerSec: 1 })).toBe(true);
  });
});

describe("bucketPreset", () => {
  it("returns sane defaults", () => {
    expect(bucketPreset("perMinute").max).toBe(10);
    expect(bucketPreset("perHour").max).toBe(60);
    expect(bucketPreset("perDay").max).toBe(500);
  });
});

describe("ipKey", () => {
  it("prefers x-forwarded-for", () => {
    const req = { headers: new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }) };
    expect(ipKey(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = { headers: new Headers({ "x-real-ip": "9.9.9.9" }) };
    expect(ipKey(req)).toBe("9.9.9.9");
  });

  it("falls back to user agent when no IP header", () => {
    const req = { headers: new Headers({ "user-agent": "curl/8.0" }) };
    expect(ipKey(req)).toBe("ua:curl/8.0");
  });
});
