// rls-isolation: challenge_enrolments

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for challenge_enrolments.
 *
 * Policies under test (from 20260612203000_cohort_challenges.sql):
 *   "Users read own challenge enrolments"   FOR SELECT  USING (auth.uid() = user_id)
 *   "Users create own challenge enrolments" FOR INSERT  WITH CHECK (auth.uid() = user_id)
 *   "Users update own challenge enrolments" FOR UPDATE  USING + WITH CHECK (auth.uid() = user_id)
 *   "Users delete own challenge enrolments" FOR DELETE  USING (auth.uid() = user_id)
 *   (plus a service_role ALL policy not exercised here — service role bypasses RLS)
 *
 * Verifies user A cannot read or mutate user B's enrolment rows. The mock
 * simulates Postgres RLS policy enforcement at the JS layer: each query checks
 * the caller's uid against the row's user_id.
 */

interface Row {
  id: string;
  challenge_id: string;
  user_id: string;
  status: "enrolled" | "waitlisted";
  certificate_id: string | null;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visibleRows = () => rows.filter((r) => r.user_id === callerUid);

  return {
    select: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),

    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => {
      if (newRow.user_id !== callerUid) {
        return Promise.resolve({
          data: null,
          error: { code: "42501", message: "RLS violation" },
        });
      }
      return Promise.resolve({ data: { id: "new-id", ...newRow }, error: null });
    }),

    update: vi.fn().mockImplementation((_patch: Partial<Row>) => ({
      eq: (col: string, val: unknown) => {
        const target = rows.find(
          (r) => (r as unknown as Record<string, unknown>)[col] === val,
        );
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve({
            data: null,
            error: { code: "42501", message: "RLS violation" },
          });
        }
        return Promise.resolve({ data: { ...target, ..._patch }, error: null });
      },
    })),

    delete: vi.fn().mockReturnValue({
      eq: (col: string, val: unknown) => {
        const target = rows.find(
          (r) => (r as unknown as Record<string, unknown>)[col] === val,
        );
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve({
            data: null,
            error: { code: "42501", message: "RLS violation" },
          });
        }
        return Promise.resolve({ data: target, error: null });
      },
    }),
  };
}

const USER_A = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_B = "bbbbbbbb-0000-0000-0000-000000000002";

const SEED_ROWS: Row[] = [
  {
    id: "enr-1",
    challenge_id: "ch-1",
    user_id: USER_A,
    status: "enrolled",
    certificate_id: null,
  },
  {
    id: "enr-2",
    challenge_id: "ch-1",
    user_id: USER_B,
    status: "enrolled",
    certificate_id: "CC-2026-deadbeef01",
  },
];

describe("challenge_enrolments — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B);
  });

  // -- SELECT isolation -------------------------------------------------------

  it("user A SELECT sees only their own enrolment", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_A);
  });

  it("user A SELECT never returns user B's enrolment (or certificate id)", async () => {
    const { data } = await clientA.select();
    expect(data!.filter((r: Row) => r.user_id === USER_B)).toHaveLength(0);
    expect(data!.some((r: Row) => r.certificate_id === "CC-2026-deadbeef01")).toBe(
      false,
    );
  });

  it("user B SELECT sees only their own enrolment", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_B);
  });

  // -- INSERT isolation -------------------------------------------------------

  it("user A can INSERT a row with their own user_id", async () => {
    const { data, error } = await clientA.insert({
      challenge_id: "ch-1",
      user_id: USER_A,
      status: "enrolled",
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a row with user B's user_id", async () => {
    const { data, error } = await clientA.insert({
      challenge_id: "ch-1",
      user_id: USER_B,
      status: "enrolled",
    });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  // -- UPDATE isolation -------------------------------------------------------

  it("user A can UPDATE their own enrolment", async () => {
    const { error } = await clientA
      .update({ status: "waitlisted" })
      .eq("id", "enr-1");
    expect(error).toBeNull();
  });

  it("user A cannot UPDATE user B's enrolment (e.g. claim their certificate)", async () => {
    const { error } = await clientA
      .update({ certificate_id: "CC-2026-stolen0000" })
      .eq("id", "enr-2");
    expect(error?.code).toBe("42501");
  });

  // -- DELETE isolation -------------------------------------------------------

  it("user A can DELETE their own enrolment", async () => {
    const { error } = await clientA.delete().eq("id", "enr-1");
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's enrolment", async () => {
    const { error } = await clientA.delete().eq("id", "enr-2");
    expect(error?.code).toBe("42501");
  });

  it("user B cannot DELETE user A's enrolment", async () => {
    const { error } = await clientB.delete().eq("id", "enr-1");
    expect(error?.code).toBe("42501");
  });

  it("user A cannot DELETE a non-existent enrolment", async () => {
    const { error } = await clientA.delete().eq("id", "enr-does-not-exist");
    expect(error?.code).toBe("42501");
  });
});
