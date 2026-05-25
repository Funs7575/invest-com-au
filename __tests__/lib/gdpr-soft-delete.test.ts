import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SOFT_DELETE_ENTITY_TABLES,
  PII_REDACTION_MAP,
  markUserEntitiesDeleted,
  clearUserEntitiesDeleted,
  redactUserEntities,
} from "@/lib/gdpr-soft-delete";

/**
 * Builds a chainable Supabase mock that records every .from(table) update
 * call as { table, payload, filters } and resolves each terminal await to the
 * configured result. The update chain used by the helpers is:
 *   from(t).update(payload).eq(col,val).is(col,val)          [mark/clear-2nd]
 *   from(t).update(payload).eq(col,val).not(col,op,val).is()  [clear/redact]
 * Both `.is(...)` and `.not(...).is(...)` are terminal-awaitable, so every
 * link returns a thenable that also exposes the next link.
 */
interface RecordedCall {
  table: string;
  payload: Record<string, unknown>;
}

function makeClient(opts: {
  errorTables?: Set<string>;
}): { client: SupabaseClient; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const errorTables = opts.errorTables ?? new Set<string>();

  const from = vi.fn((table: string) => ({
    update: (payload: Record<string, unknown>) => {
      const result = {
        error: errorTables.has(table) ? { message: "boom" } : null,
      };
      // Each filter method returns a thenable that resolves to `result`,
      // and also exposes the remaining filter methods for further chaining.
      const makeThenable = (): Record<string, unknown> => {
        const node: Record<string, unknown> = {
          then: (resolve: (v: typeof result) => unknown) => {
            calls.push({ table, payload });
            return Promise.resolve(result).then(resolve);
          },
          eq: () => makeThenable(),
          is: () => makeThenable(),
          not: () => makeThenable(),
        };
        return node;
      };
      return makeThenable();
    },
  }));

  return { client: { from } as unknown as SupabaseClient, calls };
}

describe("gdpr-soft-delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes the 5 user-facing entity tables and a PII map for each", () => {
    expect(SOFT_DELETE_ENTITY_TABLES).toEqual([
      "professionals",
      "broker_accounts",
      "investor_profiles",
      "business_accounts",
      "listing_owner_accounts",
    ]);
    for (const table of SOFT_DELETE_ENTITY_TABLES) {
      expect(PII_REDACTION_MAP[table]).toBeDefined();
    }
  });

  it("PII map replaces NOT NULL columns with placeholders, nulls the rest", () => {
    // professionals.name is NOT NULL → placeholder, not null
    expect(PII_REDACTION_MAP.professionals.name).toBe("Deleted user");
    expect(PII_REDACTION_MAP.professionals.email).toBeNull();
    // broker_accounts.email is NOT NULL → must be a non-null placeholder
    expect(PII_REDACTION_MAP.broker_accounts.email).toMatch(/@/);
    expect(PII_REDACTION_MAP.broker_accounts.full_name).toBe("Deleted user");
    // business_accounts.business_name is NOT NULL → placeholder
    expect(PII_REDACTION_MAP.business_accounts.business_name).toBe("Deleted account");
  });

  it("markUserEntitiesDeleted writes deleted_at to every entity table", async () => {
    const { client, calls } = makeClient({});
    const result = await markUserEntitiesDeleted(client, "u-1", "2026-05-25T00:00:00Z");
    expect(result.failedTables).toEqual([]);
    expect(calls).toHaveLength(SOFT_DELETE_ENTITY_TABLES.length);
    for (const call of calls) {
      expect(call.payload).toEqual({ deleted_at: "2026-05-25T00:00:00Z" });
    }
  });

  it("markUserEntitiesDeleted collects (does not throw on) per-table errors", async () => {
    const { client } = makeClient({ errorTables: new Set(["broker_accounts"]) });
    const result = await markUserEntitiesDeleted(client, "u-1");
    expect(result.failedTables).toEqual(["broker_accounts"]);
  });

  it("clearUserEntitiesDeleted nulls deleted_at across tables", async () => {
    const { client, calls } = makeClient({});
    const result = await clearUserEntitiesDeleted(client, "u-1");
    expect(result.failedTables).toEqual([]);
    expect(calls).toHaveLength(SOFT_DELETE_ENTITY_TABLES.length);
    for (const call of calls) {
      expect(call.payload).toEqual({ deleted_at: null });
    }
  });

  it("redactUserEntities applies the PII map plus pii_redacted_at per table", async () => {
    const { client, calls } = makeClient({});
    const result = await redactUserEntities(client, "u-1", "2026-05-25T00:00:00Z");
    expect(result.failedTables).toEqual([]);
    expect(calls).toHaveLength(SOFT_DELETE_ENTITY_TABLES.length);

    const proCall = calls.find((c) => c.table === "professionals");
    expect(proCall?.payload).toMatchObject({
      name: "Deleted user",
      email: null,
      pii_redacted_at: "2026-05-25T00:00:00Z",
    });
    const investorCall = calls.find((c) => c.table === "investor_profiles");
    expect(investorCall?.payload).toEqual({
      display_name: null,
      pii_redacted_at: "2026-05-25T00:00:00Z",
    });
  });
});
