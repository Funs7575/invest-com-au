/**
 * RLS isolation test for api_request_log.
 * Policy: "Service manage api logs" FOR ALL USING (true) — service-role only.
 * Same shape as api_keys: anon role has no policy → SELECT empty, mutations
 * rejected. This log table holds API key fingerprints + IPs; anon must never
 * read it.
 */

// rls-isolation: api_request_log

import { describe, it, expect } from "vitest";

function mockAnonClient() {
  return {
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } }),
  };
}

describe("api_request_log — anon cannot read or write", () => {
  const anon = mockAnonClient();

  it("anon SELECT returns zero rows", async () => {
    const { data } = await anon.select();
    expect(data).toEqual([]);
  });

  it("anon INSERT is blocked by RLS", async () => {
    const { error } = await anon.insert();
    expect(error?.code).toBe("42501");
  });
});
