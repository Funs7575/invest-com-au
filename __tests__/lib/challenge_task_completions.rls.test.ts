// rls-isolation: challenge_task_completions

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for challenge_task_completions.
 *
 * This table has NO direct user_id column — ownership is scoped THROUGH the
 * parent enrolment. Policies (from 20260612203000_cohort_challenges.sql):
 *   "Users read own task completions"   FOR SELECT USING (
 *       EXISTS (SELECT 1 FROM challenge_enrolments e
 *               WHERE e.id = challenge_task_completions.enrolment_id
 *                 AND e.user_id = auth.uid()))
 *   "Users create own task completions" FOR INSERT WITH CHECK (… same EXISTS …)
 *   "Users delete own task completions" FOR DELETE USING (… same EXISTS …)
 *   (plus a service_role ALL policy not exercised here — service role bypasses RLS)
 *
 * There is deliberately NO UPDATE policy: completions are append-only, so an
 * UPDATE under the authenticated role is denied by default-deny RLS.
 *
 * The mock simulates that EXISTS subquery at the JS layer by resolving each
 * row's `enrolment_id` to its owning user via an enrolment→owner map, then
 * comparing against the caller's uid — so a row "belongs to" the caller only
 * when its parent enrolment does.
 */

interface Row {
  id: string;
  enrolment_id: string;
  task_key: string;
}

const USER_A = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_B = "bbbbbbbb-0000-0000-0000-000000000002";

// Which user owns each enrolment (the RLS EXISTS-subquery join target).
const ENROLMENT_OWNER: Record<string, string> = {
  "enr-a": USER_A,
  "enr-b": USER_B,
};

function ownerOfRow(row: Pick<Row, "enrolment_id">): string | undefined {
  return ENROLMENT_OWNER[row.enrolment_id];
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  // SELECT returns only rows whose parent enrolment is owned by the caller.
  const visibleRows = () => rows.filter((r) => ownerOfRow(r) === callerUid);

  return {
    select: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),

    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => {
      // WITH CHECK: the parent enrolment must belong to the caller.
      if (ownerOfRow(newRow as Pick<Row, "enrolment_id">) !== callerUid) {
        return Promise.resolve({
          data: null,
          error: { code: "42501", message: "RLS violation" },
        });
      }
      return Promise.resolve({ data: { id: "new-id", ...newRow }, error: null });
    }),

    delete: vi.fn().mockReturnValue({
      eq: (col: string, val: unknown) => {
        const target = rows.find(
          (r) => (r as unknown as Record<string, unknown>)[col] === val,
        );
        if (!target || ownerOfRow(target) !== callerUid) {
          return Promise.resolve({
            data: null,
            error: { code: "42501", message: "RLS violation" },
          });
        }
        return Promise.resolve({ data: target, error: null });
      },
    }),

    // No UPDATE policy exists for the authenticated role — completions are
    // append-only. Any attempted UPDATE is denied by default-deny RLS.
    update: vi.fn().mockImplementation(() => ({
      eq: () =>
        Promise.resolve({
          data: null,
          error: { code: "42501", message: "RLS violation (no UPDATE policy)" },
        }),
    })),
  };
}

const SEED_ROWS: Row[] = [
  { id: "tc-1", enrolment_id: "enr-a", task_key: "ir21-d01-set-goal" },
  { id: "tc-2", enrolment_id: "enr-b", task_key: "ir21-d01-set-goal" },
];

describe("challenge_task_completions — RLS isolation (scoped via parent enrolment)", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B);
  });

  // -- SELECT isolation -------------------------------------------------------

  it("user A SELECT sees only completions under their own enrolment", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].enrolment_id).toBe("enr-a");
  });

  it("user A SELECT never returns completions under user B's enrolment", async () => {
    const { data } = await clientA.select();
    expect(data!.filter((r: Row) => r.enrolment_id === "enr-b")).toHaveLength(0);
  });

  it("user B SELECT sees only their own completions", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].enrolment_id).toBe("enr-b");
  });

  // -- INSERT isolation -------------------------------------------------------

  it("user A can INSERT a completion under their own enrolment", async () => {
    const { data, error } = await clientA.insert({
      enrolment_id: "enr-a",
      task_key: "ir21-d02-investor-profile",
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a completion under user B's enrolment", async () => {
    const { data, error } = await clientA.insert({
      enrolment_id: "enr-b",
      task_key: "ir21-d02-investor-profile",
    });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  // -- DELETE isolation -------------------------------------------------------

  it("user A can DELETE their own completion", async () => {
    const { error } = await clientA.delete().eq("id", "tc-1");
    expect(error).toBeNull();
  });

  it("user A cannot DELETE a completion under user B's enrolment", async () => {
    const { error } = await clientA.delete().eq("id", "tc-2");
    expect(error?.code).toBe("42501");
  });

  it("user B cannot DELETE user A's completion", async () => {
    const { error } = await clientB.delete().eq("id", "tc-1");
    expect(error?.code).toBe("42501");
  });

  // -- UPDATE denied (append-only; no UPDATE policy) --------------------------

  it("no UPDATE is permitted for the authenticated role (append-only)", async () => {
    const { error } = await clientA
      .update({ task_key: "tampered" })
      .eq("id", "tc-1");
    expect(error?.code).toBe("42501");
  });
});
