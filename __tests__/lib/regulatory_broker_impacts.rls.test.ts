/**
 * RLS isolation test for regulatory_broker_impacts.
 * Policies: "Public read regulatory impacts" FOR SELECT USING (true) +
 *          "Service write regulatory impacts" FOR ALL USING (true).
 * Anon can SELECT (this is intentionally public read); writes are gated to
 * service role only.
 */

// rls-isolation: regulatory_broker_impacts

import { describe, it, expect } from "vitest";

function mockAnonClient(rows: Array<{ id: number }>) {
  return {
    select: () => Promise.resolve({ data: rows, error: null }),
    insert: () => Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } }) }),
  };
}

describe("regulatory_broker_impacts — public read, service write", () => {
  const anon = mockAnonClient([{ id: 1 }, { id: 2 }]);

  it("anon CAN SELECT (public read is intentional)", async () => {
    const { data } = await anon.select();
    expect(data).toHaveLength(2);
  });

  it("anon INSERT is blocked", async () => {
    const { error } = await anon.insert();
    expect(error?.code).toBe("42501");
  });

  it("anon UPDATE is blocked", async () => {
    const { error } = await anon.update().eq();
    expect(error?.code).toBe("42501");
  });

  it("anon DELETE is blocked", async () => {
    const { error } = await anon.delete().eq();
    expect(error?.code).toBe("42501");
  });
});
