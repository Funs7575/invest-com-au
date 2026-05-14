import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ─── Mutable test state ──────────────────────────────────────────────

interface MemberRow {
  id: number;
  team_id: number;
  professional_id: number;
  status: "pending" | "active" | "removed";
}
interface TeamRow {
  id: number;
  verification_status: "draft" | "submitted" | "verified" | "rejected" | "suspended";
}
interface BriefRow {
  id: number;
  accepted_by_team_id: number | null;
  accepted_by_professional_id: number | null;
  accepted_at?: string;
}
interface ReferralRow {
  id: number;
  brief_id: number;
  from_team_id: number;
  to_team_id: number;
  from_professional_id: number | null;
  note: string | null;
  status: "pending" | "accepted" | "declined" | "expired";
  responded_at: string | null;
  responded_by_professional_id: number | null;
  created_at: string;
}

let members: MemberRow[] = [];
let teams: TeamRow[] = [];
let briefs: BriefRow[] = [];
let referrals: ReferralRow[] = [];
let nextReferralId = 1;

function reset() {
  members = [
    // Team 1 — verified, with pro 100 as active member.
    { id: 1, team_id: 1, professional_id: 100, status: "active" },
    // Team 2 — verified, with pro 200 as active member.
    { id: 2, team_id: 2, professional_id: 200, status: "active" },
    // Team 3 — verified, no overlap.
    { id: 3, team_id: 3, professional_id: 300, status: "active" },
  ];
  teams = [
    { id: 1, verification_status: "verified" },
    { id: 2, verification_status: "verified" },
    { id: 3, verification_status: "verified" },
  ];
  briefs = [
    {
      id: 500,
      accepted_by_team_id: null,
      accepted_by_professional_id: null,
    },
  ];
  referrals = [];
  nextReferralId = 1;
}

// ─── Minimal Supabase admin-client chain mock ────────────────────────
//
// Each table call returns a chainable builder. We don't model the full
// PostgREST API — just the call shapes used by lib/team-brief-referrals.
// Builders accumulate filter predicates then resolve in the terminal
// method (single / maybeSingle / select / await).

function makeBuilder(table: string, op: "select" | "insert" | "update", payload?: Record<string, unknown>) {
  const filters: Record<string, unknown> = {};
  const inFilters: Record<string, unknown[]> = {};
  const isNullFilters: string[] = [];
  let orderField: string | null = null;
  let limitN: number | null = null;
  const updatePayload: Record<string, unknown> | undefined = payload;

  const builder = {
    select() {
      return builder;
    },
    eq(field: string, value: unknown) {
      filters[field] = value;
      return builder;
    },
    in(field: string, values: unknown[]) {
      inFilters[field] = values;
      return builder;
    },
    is(field: string, value: unknown) {
      if (value === null) {
        isNullFilters.push(field);
      } else {
        filters[field] = value;
      }
      return builder;
    },
    order(field: string) {
      orderField = field;
      return builder;
    },
    limit(n: number) {
      limitN = n;
      return builder;
    },
    async maybeSingle() {
      if (op === "update") {
        const rows = resolveRows(table, "select", filters, inFilters, isNullFilters);
        const target = rows[0];
        if (!target) return { data: null, error: null };
        Object.assign(target, updatePayload ?? {});
        return { data: target, error: null };
      }
      const rows = resolveRows(table, op, filters, inFilters, isNullFilters);
      return { data: rows[0] ?? null, error: null };
    },
    async single() {
      if (op === "insert") {
        const inserted = doInsert(table, payload ?? {});
        return { data: inserted, error: null };
      }
      if (op === "update") {
        const rows = resolveRows(table, "select", filters, inFilters, isNullFilters);
        const target = rows[0];
        if (!target) return { data: null, error: null };
        Object.assign(target, updatePayload ?? {});
        return { data: target, error: null };
      }
      const rows = resolveRows(table, op, filters, inFilters, isNullFilters);
      return { data: rows[0] ?? null, error: null };
    },
    then(cb: (v: { data: unknown; error: null }) => unknown) {
      // Direct await on a SELECT/INSERT/UPDATE chain (no terminal method).
      let rows: unknown[];
      if (op === "insert") {
        const inserted = doInsert(table, payload ?? {});
        rows = inserted ? [inserted] : [];
      } else if (op === "update") {
        rows = resolveRows(table, "select", filters, inFilters, isNullFilters);
        for (const r of rows as Record<string, unknown>[]) {
          Object.assign(r, updatePayload ?? {});
        }
      } else {
        rows = resolveRows(table, op, filters, inFilters, isNullFilters);
        if (orderField || limitN !== null) {
          // No-op — tests don't rely on ordering, just length.
        }
      }
      return Promise.resolve(cb({ data: rows, error: null }));
    },
  };
  return builder;
}

function resolveRows(
  table: string,
  _op: string,
  filters: Record<string, unknown>,
  inFilters: Record<string, unknown[]>,
  isNullFilters: string[],
): Record<string, unknown>[] {
  const source: Record<string, unknown>[] =
    table === "expert_team_members"
      ? (members as unknown as Record<string, unknown>[])
      : table === "expert_teams"
        ? (teams as unknown as Record<string, unknown>[])
        : table === "advisor_auctions"
          ? (briefs as unknown as Record<string, unknown>[])
          : table === "team_brief_referrals"
            ? (referrals as unknown as Record<string, unknown>[])
            : [];
  return source.filter((row) => {
    for (const [k, v] of Object.entries(filters)) {
      if (row[k] !== v) return false;
    }
    for (const [k, vs] of Object.entries(inFilters)) {
      if (!vs.includes(row[k])) return false;
    }
    for (const k of isNullFilters) {
      if (row[k] !== null && row[k] !== undefined) return false;
    }
    return true;
  });
}

function doInsert(table: string, payload: Record<string, unknown>): Record<string, unknown> | null {
  if (table === "team_brief_referrals") {
    // Enforce the UNIQUE (brief_id, to_team_id) constraint in the mock.
    const duplicate = referrals.find(
      (r) =>
        r.brief_id === payload["brief_id"] &&
        r.to_team_id === payload["to_team_id"],
    );
    if (duplicate) {
      throw new Error(
        'duplicate key value violates unique constraint "uq_team_brief_referrals_brief_to_team"',
      );
    }
    const row: ReferralRow = {
      id: nextReferralId++,
      brief_id: payload["brief_id"] as number,
      from_team_id: payload["from_team_id"] as number,
      to_team_id: payload["to_team_id"] as number,
      from_professional_id:
        (payload["from_professional_id"] as number | null) ?? null,
      note: (payload["note"] as string | null) ?? null,
      status: (payload["status"] as ReferralRow["status"]) ?? "pending",
      responded_at: null,
      responded_by_professional_id: null,
      created_at: new Date().toISOString(),
    };
    referrals.push(row);
    return row as unknown as Record<string, unknown>;
  }
  return null;
}

const mockFrom = vi.fn((table: string) => ({
  select: () => makeBuilder(table, "select"),
  insert: (payload: Record<string, unknown>) => makeBuilder(table, "insert", payload),
  update: (payload: Record<string, unknown>) => makeBuilder(table, "update", payload),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ─── Subject under test (imported AFTER mocks register) ──────────────

import {
  createReferral,
  acceptReferral,
  declineReferral,
  ReferralError,
} from "@/lib/team-brief-referrals";

// ─── Tests ───────────────────────────────────────────────────────────

describe("team-brief-referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("creates a referral on the happy path", async () => {
    const ref = await createReferral({
      briefId: 500,
      fromTeamId: 1,
      toTeamId: 2,
      fromProfessionalId: 100,
      note: "Out of our scope.",
    });
    expect(ref.id).toBe(1);
    expect(ref.status).toBe("pending");
    expect(ref.from_team_id).toBe(1);
    expect(ref.to_team_id).toBe(2);
    expect(ref.note).toBe("Out of our scope.");
    expect(referrals).toHaveLength(1);
  });

  it("rejects a self-referral", async () => {
    await expect(
      createReferral({
        briefId: 500,
        fromTeamId: 1,
        toTeamId: 1,
        fromProfessionalId: 100,
      }),
    ).rejects.toMatchObject({
      name: "ReferralError",
      code: "self_referral_not_allowed",
    });
    expect(referrals).toHaveLength(0);
  });

  it("rejects a duplicate referral (same brief + same to-team)", async () => {
    await createReferral({
      briefId: 500,
      fromTeamId: 1,
      toTeamId: 2,
      fromProfessionalId: 100,
    });
    await expect(
      createReferral({
        briefId: 500,
        fromTeamId: 1,
        toTeamId: 2,
        fromProfessionalId: 100,
      }),
    ).rejects.toBeInstanceOf(ReferralError);
    expect(referrals).toHaveLength(1);
  });

  it("rejects when the caller is not an active member of the from-team", async () => {
    await expect(
      createReferral({
        briefId: 500,
        fromTeamId: 1,
        toTeamId: 2,
        fromProfessionalId: 999, // not on any team
      }),
    ).rejects.toMatchObject({ code: "not_team_member" });
  });

  it("rejects when the brief is already accepted", async () => {
    briefs[0]!.accepted_by_team_id = 9;
    await expect(
      createReferral({
        briefId: 500,
        fromTeamId: 1,
        toTeamId: 2,
        fromProfessionalId: 100,
      }),
    ).rejects.toMatchObject({ code: "brief_already_accepted" });
  });

  it("accept transitions the referral to accepted and claims the brief", async () => {
    const created = await createReferral({
      briefId: 500,
      fromTeamId: 1,
      toTeamId: 2,
      fromProfessionalId: 100,
    });

    const accepted = await acceptReferral(created.id, 200);

    expect(accepted.status).toBe("accepted");
    expect(accepted.responded_by_professional_id).toBe(200);
    expect(accepted.responded_at).not.toBeNull();
    // Brief is now claimed for team 2.
    expect(briefs[0]!.accepted_by_team_id).toBe(2);
    expect(briefs[0]!.accepted_at).toBeDefined();
  });

  it("decline transitions the referral to declined and leaves the brief open", async () => {
    const created = await createReferral({
      briefId: 500,
      fromTeamId: 1,
      toTeamId: 2,
      fromProfessionalId: 100,
    });

    const declined = await declineReferral(created.id, 200);
    expect(declined.status).toBe("declined");
    expect(declined.responded_by_professional_id).toBe(200);
    expect(briefs[0]!.accepted_by_team_id).toBeNull();
  });

  it("accept fails when the caller is not on the to-team", async () => {
    const created = await createReferral({
      briefId: 500,
      fromTeamId: 1,
      toTeamId: 2,
      fromProfessionalId: 100,
    });
    await expect(acceptReferral(created.id, 100)).rejects.toMatchObject({
      code: "not_team_member",
    });
  });

  it("accept fails when the referral is not pending", async () => {
    const created = await createReferral({
      briefId: 500,
      fromTeamId: 1,
      toTeamId: 2,
      fromProfessionalId: 100,
    });
    await declineReferral(created.id, 200);
    await expect(acceptReferral(created.id, 200)).rejects.toMatchObject({
      code: "referral_not_pending",
    });
  });
});
