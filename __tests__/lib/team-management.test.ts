import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

import { professionalIdForUser, isSquadAdmin } from "@/lib/team-management";

/**
 * Chainable query-builder mock: every chain method returns `this`, and
 * maybeSingle() resolves to the provided result. One builder per table
 * lets isSquadAdmin's two sequential lookups return different rows.
 */
function builder(maybeSingleResult: { data: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "ilike", "limit", "order"]) {
    chain[m] = () => chain;
  }
  chain.maybeSingle = () => Promise.resolve(maybeSingleResult);
  return chain;
}

describe("professionalIdForUser", () => {
  beforeEach(() => mockFrom.mockReset());

  it("returns the professional id for the auth user", async () => {
    mockFrom.mockReturnValue(builder({ data: { id: 7 } }));
    expect(await professionalIdForUser("u-1")).toBe(7);
  });

  it("returns null when no professional row", async () => {
    mockFrom.mockReturnValue(builder({ data: null }));
    expect(await professionalIdForUser("u-1")).toBeNull();
  });
});

describe("isSquadAdmin", () => {
  beforeEach(() => mockFrom.mockReset());

  it("true when caller is the team owner (short-circuits before member lookup)", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "expert_teams") {
        return builder({ data: { owner_professional_id: 5, lead_professional_id: null } });
      }
      throw new Error(`should not query ${table} when owner matches`);
    });
    expect(await isSquadAdmin(1, 5)).toBe(true);
  });

  it("true when caller is the lead_professional_id", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "expert_teams") {
        return builder({ data: { owner_professional_id: 9, lead_professional_id: 5 } });
      }
      throw new Error(`should not query ${table} when lead matches`);
    });
    expect(await isSquadAdmin(1, 5)).toBe(true);
  });

  it("true when caller is an active lead member", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "expert_teams") {
        return builder({ data: { owner_professional_id: 9, lead_professional_id: 9 } });
      }
      if (table === "expert_team_members") {
        return builder({ data: { member_role: "lead", status: "active" } });
      }
      throw new Error(`unexpected ${table}`);
    });
    expect(await isSquadAdmin(1, 5)).toBe(true);
  });

  it("false for a plain active member", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "expert_teams") {
        return builder({ data: { owner_professional_id: 9, lead_professional_id: 9 } });
      }
      if (table === "expert_team_members") {
        return builder({ data: { member_role: "member", status: "active" } });
      }
      throw new Error(`unexpected ${table}`);
    });
    expect(await isSquadAdmin(1, 5)).toBe(false);
  });

  it("false when caller has no membership at all", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "expert_teams") {
        return builder({ data: { owner_professional_id: 9, lead_professional_id: 9 } });
      }
      if (table === "expert_team_members") {
        return builder({ data: null });
      }
      throw new Error(`unexpected ${table}`);
    });
    expect(await isSquadAdmin(1, 5)).toBe(false);
  });
});
