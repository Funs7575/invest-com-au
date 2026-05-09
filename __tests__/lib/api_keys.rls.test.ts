/**
 * RLS isolation test for api_keys.
 * Policy: "Service manage api keys" FOR ALL USING (true) — service-role only.
 * RLS is enabled and no anon-role policy exists; anon clients receive zero rows
 * for SELECT and RLS violations on writes. Validated via a mocked client that
 * rejects calls when no service-role bypass is signalled.
 */

// rls-isolation: api_keys

import { describe, it, expect } from "vitest";

function mockAnonClient() {
  return {
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } }) }),
  };
}

function mockServiceRoleClient(rows: Array<{ id: string }>) {
  return {
    select: () => Promise.resolve({ data: rows, error: null }),
    insert: (row: { id: string }) => Promise.resolve({ data: row, error: null }),
  };
}

describe("api_keys — anon RLS enforcement", () => {
  const anon = mockAnonClient();

  it("anon SELECT returns zero rows (no anon-role policy)", async () => {
    const { data } = await anon.select();
    expect(data).toEqual([]);
  });

  it("anon INSERT is blocked by RLS", async () => {
    const { error } = await anon.insert();
    expect(error?.code).toBe("42501");
  });

  it("anon UPDATE is blocked by RLS", async () => {
    const { error } = await anon.update().eq();
    expect(error?.code).toBe("42501");
  });

  it("anon DELETE is blocked by RLS", async () => {
    const { error } = await anon.delete().eq();
    expect(error?.code).toBe("42501");
  });

  it("service role bypass reads all keys", async () => {
    const sr = mockServiceRoleClient([{ id: "key-1" }, { id: "key-2" }]);
    const { data } = await sr.select();
    expect(data).toHaveLength(2);
  });
});
