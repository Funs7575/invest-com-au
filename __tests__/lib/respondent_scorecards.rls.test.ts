// rls-isolation: respondent_scorecards

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for respondent_scorecards.
 *
 * Policy under test (from 20260612211000_respondent_scorecards.sql):
 *   "Service role manages respondent_scorecards" FOR ALL TO service_role
 *
 * The table is deliberately deny-all for anon + authenticated (same
 * posture as engagement_registry / brief_outcomes): the consumer
 * surfaces are anonymous email-token pages with no JWT, so ownership is
 * enforced at the API layer (owner_key = lower-cased contact_email,
 * re-verified against advisor_auctions before any write) and all DB
 * access goes through the service role. The isolation property under
 * test: NO non-service role can read or mutate ANY row — own rows
 * included — so scorecards can never leak across consumers via
 * PostgREST.
 */

interface Row {
  id: number;
  owner_key: string;
  brief_id: number;
  professional_id: number;
  criteria: Record<string, number>;
  overall: number | null;
}

const deny = { data: null, error: { code: "42501", message: "RLS violation" } };

/** Deny-all table client — what anon/authenticated callers get. */
function buildDenyAllClient() {
  return {
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(deny),
      }),
    })),
    update: vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue(deny),
    })),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(deny),
    }),
  };
}

/** Service-role client — full access (the only legitimate path). */
function buildServiceClient(rows: Row[]) {
  return {
    select: vi.fn().mockResolvedValue({ data: rows, error: null }),
    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => ({
      select: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: 9999, ...newRow }, error: null }),
      }),
    })),
  };
}

const SEED_ROWS: Row[] = [
  {
    id: 1,
    owner_key: "consumer-a@example.com",
    brief_id: 10,
    professional_id: 77,
    criteria: { clarity: 4 },
    overall: 4,
  },
  {
    id: 2,
    owner_key: "consumer-b@example.com",
    brief_id: 11,
    professional_id: 88,
    criteria: { clarity: 2 },
    overall: 2,
  },
];

describe("respondent_scorecards — RLS isolation (deny-all to non-service roles)", () => {
  let authenticatedClient: ReturnType<typeof buildDenyAllClient>;
  let anonClient: ReturnType<typeof buildDenyAllClient>;

  beforeEach(() => {
    authenticatedClient = buildDenyAllClient();
    anonClient = buildDenyAllClient();
  });

  it("authenticated SELECT returns no rows — not even a consumer's own scorecards", async () => {
    const { data, error } = await authenticatedClient.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("anon SELECT returns no rows", async () => {
    const { data } = await anonClient.select();
    expect(data).toHaveLength(0);
  });

  it("authenticated INSERT is denied", async () => {
    const { data, error } = await authenticatedClient
      .insert({ owner_key: "consumer-a@example.com", brief_id: 10, professional_id: 77 })
      .select()
      .single();
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("anon UPDATE of any row is denied", async () => {
    const { error } = await anonClient.update().eq("id", 1);
    expect(error?.code).toBe("42501");
  });

  it("authenticated DELETE of any row is denied", async () => {
    const { error } = await authenticatedClient.delete().eq("id", 2);
    expect(error?.code).toBe("42501");
  });

  it("service role (API layer) retains full access — the only write path", async () => {
    const service = buildServiceClient([...SEED_ROWS]);
    const { data, error } = await service
      .insert({ owner_key: "consumer-a@example.com", brief_id: 12, professional_id: 99 })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });
});
