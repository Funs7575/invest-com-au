import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getSuppressedSet,
  isSuppressed,
  suppress,
  unsuppress,
} from "@/lib/email-suppression";

interface Row {
  id: string;
  contact_email: string;
  reason: string;
  suppressed_at: string;
  metadata: Record<string, unknown>;
}

let rows: Row[] = [];
let nextId = 1;
let throwOn: "select" | "insert" | "delete" | null = null;

// Minimal fake of @supabase/supabase-js shaped to the helper's call sites.
// Mirrors the rate-limit-db tests' approach.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (_table: string) => {
      const state: {
        whereEmail?: string;
        whereIn?: string[];
        upsertPayload?: { contact_email: string; reason: string; metadata: Record<string, unknown> };
      } = {};
      const builder = {
        select: (_cols?: string) => builder,
        eq: (col: string, val: string) => {
          if (col === "contact_email") state.whereEmail = val.toLowerCase();
          return builder;
        },
        in: (col: string, vals: string[]) => {
          if (col === "contact_email") state.whereIn = vals.map((v) => v.toLowerCase());
          return builder;
        },
        maybeSingle: async () => {
          if (throwOn === "select") return { data: null, error: { message: "boom" } };
          const found = rows.find((r) => r.contact_email === state.whereEmail);
          return { data: found ?? null, error: null };
        },
        insert: async (payload: { contact_email: string; reason: string; metadata?: Record<string, unknown> }) => {
          if (throwOn === "insert") return { error: { message: "boom", code: "XX000" } };
          const lower = payload.contact_email.toLowerCase();
          if (rows.find((r) => r.contact_email === lower)) {
            return { error: { code: "23505", message: "duplicate" } };
          }
          rows.push({
            id: String(nextId++),
            contact_email: lower,
            reason: payload.reason,
            suppressed_at: new Date().toISOString(),
            metadata: payload.metadata ?? {},
          });
          return { error: null };
        },
        upsert: async (
          payload: { contact_email: string; reason: string; metadata: Record<string, unknown>; suppressed_at: string },
          _opts: unknown,
        ) => {
          const lower = payload.contact_email.toLowerCase();
          const existing = rows.find((r) => r.contact_email === lower);
          if (existing) {
            existing.reason = payload.reason;
            existing.metadata = payload.metadata;
            existing.suppressed_at = payload.suppressed_at;
          } else {
            rows.push({
              id: String(nextId++),
              contact_email: lower,
              reason: payload.reason,
              suppressed_at: payload.suppressed_at,
              metadata: payload.metadata,
            });
          }
          return { error: null };
        },
        delete: (_opts?: { count?: string }) => ({
          eq: async (col: string, val: string) => {
            if (throwOn === "delete") return { count: null, error: { message: "boom" } };
            if (col !== "contact_email") return { count: 0, error: null };
            const before = rows.length;
            rows = rows.filter((r) => r.contact_email !== val.toLowerCase());
            return { count: before - rows.length, error: null };
          },
        }),
        // bulk select: select() then in() then await
        then: undefined as undefined, // not used
      } as unknown as {
        select: (cols?: string) => typeof builder;
        eq: (col: string, val: string) => typeof builder;
        in: (col: string, vals: string[]) => typeof builder;
        maybeSingle: () => Promise<{ data: Row | null; error: { message: string } | null }>;
        insert: (payload: Row) => Promise<{ error: { code?: string; message: string } | null }>;
        upsert: (payload: Row, opts: unknown) => Promise<{ error: { message: string } | null }>;
        delete: (opts?: unknown) => { eq: (col: string, val: string) => Promise<{ count: number | null; error: { message: string } | null }> };
      };
      // For getSuppressedSet: `await supabase.from(...).select('contact_email').in(...)`.
      // The chain ends without maybeSingle; we make `.in()` return a thenable.
      const makeInAwaitable = () => ({
        then(
          onFulfilled?: (
            v: { data: Array<{ contact_email: string }> | null; error: { message: string } | null },
          ) => unknown,
        ) {
          const result =
            throwOn === "select"
              ? { data: null, error: { message: "boom" } }
              : (() => {
                  const set = new Set(state.whereIn ?? []);
                  return {
                    data: rows
                      .filter((r) => set.has(r.contact_email))
                      .map((r) => ({ contact_email: r.contact_email })),
                    error: null,
                  };
                })();
          return Promise.resolve(onFulfilled ? onFulfilled(result) : result);
        },
      });
      builder.in = (col: string, vals: string[]) => {
        if (col === "contact_email") state.whereIn = vals.map((v) => v.toLowerCase());
        return makeInAwaitable() as unknown as typeof builder;
      };
      return builder;
    },
  }),
}));

beforeEach(() => {
  rows = [];
  nextId = 1;
  throwOn = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isSuppressed", () => {
  it("returns false for an unknown address", async () => {
    expect(await isSuppressed("ghost@example.com")).toBe(false);
  });

  it("returns true after suppressing the same address", async () => {
    await suppress("user@example.com", "manual_unsubscribe");
    expect(await isSuppressed("user@example.com")).toBe(true);
  });

  it("is case-insensitive", async () => {
    await suppress("Mixed@Example.COM", "complaint");
    expect(await isSuppressed("mixed@example.com")).toBe(true);
    expect(await isSuppressed("MIXED@example.com")).toBe(true);
  });

  it("returns false for an empty email", async () => {
    expect(await isSuppressed("")).toBe(false);
  });

  it("fails open (returns false) on a query error", async () => {
    throwOn = "select";
    expect(await isSuppressed("anything@example.com")).toBe(false);
  });
});

describe("suppress", () => {
  it("is idempotent — second call with same address returns inserted=false", async () => {
    const first = await suppress("dup@example.com", "hard_bounce");
    expect(first.inserted).toBe(true);
    const second = await suppress("dup@example.com", "complaint");
    expect(second.inserted).toBe(false);
    // Original reason preserved
    expect(rows[0]?.reason).toBe("hard_bounce");
  });

  it("force=true overwrites the prior row", async () => {
    await suppress("force@example.com", "hard_bounce");
    await suppress("force@example.com", "admin", { force: true, metadata: { who: "fin" } });
    expect(rows[0]?.reason).toBe("admin");
    expect(rows[0]?.metadata).toEqual({ who: "fin" });
  });

  it("stores email lower-cased", async () => {
    await suppress("MixedCase@example.com", "complaint");
    expect(rows[0]?.contact_email).toBe("mixedcase@example.com");
  });
});

describe("getSuppressedSet", () => {
  it("returns the lower-cased subset of suppressed addresses", async () => {
    await suppress("a@example.com", "hard_bounce");
    await suppress("b@example.com", "manual_unsubscribe");
    const result = await getSuppressedSet(["A@example.com", "c@example.com", "B@example.com"]);
    expect(result.has("a@example.com")).toBe(true);
    expect(result.has("b@example.com")).toBe(true);
    expect(result.has("c@example.com")).toBe(false);
    expect(result.size).toBe(2);
  });

  it("returns an empty set for an empty input", async () => {
    expect((await getSuppressedSet([])).size).toBe(0);
  });

  it("fails open (returns empty set) on a query error", async () => {
    throwOn = "select";
    expect((await getSuppressedSet(["x@example.com"])).size).toBe(0);
  });
});

describe("unsuppress", () => {
  it("removes a previously-suppressed address", async () => {
    await suppress("rm@example.com", "complaint");
    const { removed } = await unsuppress("rm@example.com");
    expect(removed).toBe(true);
    expect(await isSuppressed("rm@example.com")).toBe(false);
  });

  it("returns removed=false if the address was never suppressed", async () => {
    const { removed } = await unsuppress("nope@example.com");
    expect(removed).toBe(false);
  });
});
