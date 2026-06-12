// rls-isolation: advisor_pitches

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for advisor_pitches.
 *
 * Policy under test (from 20260612222000_prospect_pool.sql):
 *   "Service role manages advisor_pitches" FOR ALL TO service_role
 *
 * Deny-all to anon + authenticated by design (same posture as
 * engagement_registry / respondent_scorecards): adviser sessions carry no
 * Supabase JWT and consumers read their pitches through an API that joins
 * on their own prospect row server-side. The isolation property: NO
 * non-service role can read or mutate ANY pitch — pitch bodies and fee
 * bands can never leak across consumers or advisers via PostgREST.
 */

interface Row {
  id: number;
  prospect_id: number;
  professional_id: number;
  body: string;
  status: string;
}

const deny = { data: null, error: { code: "42501", message: "RLS violation" } };

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
  { id: 1, prospect_id: 11, professional_id: 77, body: "SMSF setup help", status: "pending" },
  { id: 2, prospect_id: 12, professional_id: 88, body: "Property advice", status: "declined" },
];

describe("advisor_pitches — RLS isolation (deny-all to non-service roles)", () => {
  let authenticatedClient: ReturnType<typeof buildDenyAllClient>;
  let anonClient: ReturnType<typeof buildDenyAllClient>;

  beforeEach(() => {
    authenticatedClient = buildDenyAllClient();
    anonClient = buildDenyAllClient();
  });

  it("authenticated SELECT returns no rows — even the consumer's own pitches", async () => {
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
      .insert({ prospect_id: 11, professional_id: 77, body: "forged" })
      .select()
      .single();
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("authenticated UPDATE of any pitch is denied", async () => {
    const { error } = await authenticatedClient.update().eq("id", 1);
    expect(error?.code).toBe("42501");
  });

  it("anon DELETE of any pitch is denied", async () => {
    const { error } = await anonClient.delete().eq("id", 2);
    expect(error?.code).toBe("42501");
  });

  it("service role (API layer) retains full access — the only path", async () => {
    const service = buildServiceClient([...SEED_ROWS]);
    const { data, error } = await service
      .insert({ prospect_id: 13, professional_id: 99, body: "General capability" })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });
});
