import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for the Household Workspaces state machine (lib/households.ts):
 * invite/accept/revoke/leave, the one-household cap, share-toggle ownership,
 * token misuse, wrong-email claims, double-accept, and partnerLabel.
 *
 * Both Supabase clients are mocked. The mock is TABLE-AWARE: each table gets a
 * small in-memory store and a chainable query builder that records filters and
 * resolves against the store, so the multi-query helpers (which read then
 * write across tables) behave realistically without brittle response ordering.
 */

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { serverClient, adminClient, resetStores, stores } = vi.hoisted(() => {
  // ── in-memory table stores ────────────────────────────────────────────────
  type Row = Record<string, unknown>;
  const stores: Record<string, Row[]> = {
    households: [],
    household_members: [],
    investor_goals: [],
    manual_balances: [],
    user_watchlist_items: [],
  };

  function resetStores() {
    for (const k of Object.keys(stores)) stores[k] = [];
  }

  let idCounter = 1000;

  // Chainable query builder over a single table's store.
  function builder(table: string) {
    const filters: Array<{ op: string; col: string; val: unknown }> = [];
    let pendingInsert: Row | Row[] | null = null;
    let pendingUpdate: Row | null = null;
    let isDelete = false;

    const applyFilters = (rows: Row[]): Row[] =>
      rows.filter((r) =>
        filters.every((f) => {
          if (f.op === "eq") return r[f.col] === f.val;
          if (f.op === "neq") return r[f.col] !== f.val;
          if (f.op === "ilike") return String(r[f.col] ?? "").toLowerCase() === String(f.val).toLowerCase();
          if (f.op === "in") return Array.isArray(f.val) && (f.val as unknown[]).includes(r[f.col]);
          if (f.op === "is") return r[f.col] === f.val;
          return true;
        }),
      );

    const exec = (): { data: unknown; error: unknown } => {
      const tbl = stores[table] ?? (stores[table] = []);
      if (pendingInsert) {
        const list = Array.isArray(pendingInsert) ? pendingInsert : [pendingInsert];
        const inserted = list.map((row) => {
          const withId: Row = { id: row.id ?? `id-${idCounter++}`, ...row };
          tbl.push(withId);
          return withId;
        });
        return { data: inserted, error: null };
      }
      if (pendingUpdate) {
        const matched = applyFilters(tbl);
        for (const r of matched) Object.assign(r, pendingUpdate);
        return { data: matched, error: null };
      }
      if (isDelete) {
        const matched = applyFilters(tbl);
        stores[table] = tbl.filter((r) => !matched.includes(r));
        return { data: matched, error: null };
      }
      return { data: applyFilters(tbl), error: null };
    };

    const chain: Record<string, unknown> = {};
    const passthrough = ["select", "order", "limit"];
    for (const m of passthrough) chain[m] = () => chain;
    for (const op of ["eq", "neq", "ilike", "in", "is"]) {
      chain[op] = (col: string, val: unknown) => {
        filters.push({ op, col, val });
        return chain;
      };
    }
    chain.insert = (row: Row | Row[]) => {
      pendingInsert = row;
      return chain;
    };
    chain.update = (row: Row) => {
      pendingUpdate = row;
      return chain;
    };
    chain.delete = () => {
      isDelete = true;
      return chain;
    };
    chain.single = () => {
      const { data } = exec();
      const arr = data as Row[];
      return Promise.resolve(
        arr.length > 0 ? { data: arr[0], error: null } : { data: null, error: { message: "no rows" } },
      );
    };
    chain.maybeSingle = () => {
      const { data } = exec();
      const arr = data as Row[];
      return Promise.resolve({ data: arr[0] ?? null, error: null });
    };
    chain.then = (
      resolve: (v: { data: unknown; error: unknown }) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(exec()).then(resolve, reject);
    return chain;
  }

  const client = { from: (table: string) => builder(table) };
  return {
    serverClient: client,
    adminClient: client,
    resetStores,
    stores,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => serverClient),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => adminClient),
}));

import {
  createHouseholdWithInvite,
  claimInvite,
  revokeMember,
  leaveHousehold,
  setItemShared,
  getHouseholdContextForUser,
  getPartnerSharedRows,
  partnerLabel,
  generateInviteToken,
} from "@/lib/households";

const OWNER = "owner-uid";
const OWNER_EMAIL = "owner@example.com";
const PARTNER = "partner-uid";
const PARTNER_EMAIL = "partner@example.com";

beforeEach(() => {
  resetStores();
  vi.clearAllMocks();
});

// Helper: stand up a household with an accepted owner + pending partner invite.
async function seedHouseholdWithPendingInvite() {
  const res = await createHouseholdWithInvite({
    userId: OWNER,
    ownerEmail: OWNER_EMAIL,
    partnerEmail: PARTNER_EMAIL,
  });
  if (!res.ok) throw new Error(`seed failed: ${res.error}`);
  return res;
}

describe("createHouseholdWithInvite", () => {
  it("creates a household + accepted owner + pending partner invite", async () => {
    const res = await seedHouseholdWithPendingInvite();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.household.created_by).toBe(OWNER);
    expect(res.invite.invited_email).toBe(PARTNER_EMAIL);
    expect(res.invite.status).toBe("pending");
    expect(res.invite.invite_token).toBeTruthy();

    expect(stores.households).toHaveLength(1);
    const owner = stores.household_members.find((m) => m.role === "owner");
    const partner = stores.household_members.find((m) => m.role === "partner");
    expect(owner?.status).toBe("accepted");
    expect(owner?.user_id).toBe(OWNER);
    expect(partner?.status).toBe("pending");
    expect(partner?.user_id).toBeNull();
  });

  it("rejects inviting your own email (self_invite)", async () => {
    const res = await createHouseholdWithInvite({
      userId: OWNER,
      ownerEmail: OWNER_EMAIL,
      partnerEmail: OWNER_EMAIL,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("self_invite");
  });

  it("rejects an obviously invalid email (invalid_email)", async () => {
    const res = await createHouseholdWithInvite({
      userId: OWNER,
      ownerEmail: OWNER_EMAIL,
      partnerEmail: "",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("invalid_email");
  });

  it("enforces the one-household-per-user cap (already_in_household)", async () => {
    await seedHouseholdWithPendingInvite();
    // Second attempt by the same owner must be rejected.
    const second = await createHouseholdWithInvite({
      userId: OWNER,
      ownerEmail: OWNER_EMAIL,
      partnerEmail: "another@example.com",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("already_in_household");
    expect(stores.households).toHaveLength(1);
  });
});

describe("claimInvite — accept flow + misuse", () => {
  it("the addressed invitee accepts: user_id + status flip to accepted", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    const result = await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    expect(result.ok).toBe(true);
    const partner = stores.household_members.find((m) => m.role === "partner");
    expect(partner?.status).toBe("accepted");
    expect(partner?.user_id).toBe(PARTNER);
  });

  it("rejects an unknown token (not_found)", async () => {
    await seedHouseholdWithPendingInvite();
    const result = await claimInvite({
      token: "totally-bogus-token",
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_found");
  });

  it("rejects a claim from the WRONG email (wrong_email) — can't steal an invite", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    const result = await claimInvite({
      token: seed.invite.invite_token,
      userId: "intruder-uid",
      acceptorEmail: "intruder@example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("wrong_email");
    // The invite stays pending — untouched.
    const partner = stores.household_members.find((m) => m.role === "partner");
    expect(partner?.status).toBe("pending");
    expect(partner?.user_id).toBeNull();
  });

  it("email match is case-insensitive", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    const result = await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL.toUpperCase(),
    });
    expect(result.ok).toBe(true);
  });

  it("double-accept by the SAME user is idempotent (returns ok)", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    const first = await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    expect(first.ok).toBe(true);
    const second = await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    expect(second.ok).toBe(true); // friendly idempotency
  });

  it("a DIFFERENT user accepting an already-accepted invite is rejected (wrong_email)", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    // Someone else with a different email can't claim the consumed invite.
    const other = await claimInvite({
      token: seed.invite.invite_token,
      userId: "other-uid",
      acceptorEmail: "other@example.com",
    });
    expect(other.ok).toBe(false);
    if (!other.ok) expect(other.error).toBe("wrong_email");
  });

  it("rejects accepting when the acceptor is already in ANOTHER household (cap)", async () => {
    // Owner's household with a pending invite for PARTNER.
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    // PARTNER already belongs (accepted) to a different household.
    stores.household_members.push({
      id: "pre-existing",
      household_id: "other-hh",
      user_id: PARTNER,
      invited_email: PARTNER_EMAIL,
      role: "owner",
      status: "accepted",
    });
    const result = await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("already_in_household");
  });
});

describe("revokeMember", () => {
  it("owner revokes the partner (status → revoked)", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    const partnerRow = stores.household_members.find((m) => m.role === "partner")!;
    const result = await revokeMember({ ownerUserId: OWNER, memberId: partnerRow.id as string });
    expect(result.ok).toBe(true);
    expect(stores.household_members.find((m) => m.role === "partner")?.status).toBe("revoked");
  });

  it("a non-owner cannot revoke (forbidden)", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    const partnerRow = stores.household_members.find((m) => m.role === "partner")!;
    // PARTNER is not the owner → forbidden.
    const result = await revokeMember({ ownerUserId: PARTNER, memberId: partnerRow.id as string });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("forbidden");
  });

  it("the owner cannot revoke themselves (forbidden)", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    const ownerRow = stores.household_members.find((m) => m.role === "owner")!;
    const result = await revokeMember({ ownerUserId: OWNER, memberId: ownerRow.id as string });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("forbidden");
  });
});

describe("leaveHousehold", () => {
  it("an accepted partner can leave (status → left) and their rows un-share", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    // Partner has a shared goal pointing at the household.
    stores.investor_goals.push({
      id: 1,
      auth_user_id: PARTNER,
      household_id: seed.household.id,
      label: "Shared goal",
    });
    const result = await leaveHousehold({ userId: PARTNER });
    expect(result.ok).toBe(true);
    expect(stores.household_members.find((m) => m.role === "partner")?.status).toBe("left");
    // The leaver's shared goal was un-shared.
    expect(stores.investor_goals[0]?.household_id).toBeNull();
  });

  it("the owner cannot leave (must delete instead) (forbidden)", async () => {
    await seedHouseholdWithPendingInvite();
    const result = await leaveHousehold({ userId: OWNER });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("forbidden");
  });
});

describe("setItemShared — per-item share ownership", () => {
  it("owner can share their own goal (sets household_id) when in a household", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    stores.investor_goals.push({ id: 5, auth_user_id: OWNER, household_id: null, label: "G" });
    const result = await setItemShared({
      userId: OWNER,
      kind: "goal",
      itemId: 5,
      shared: true,
    });
    expect(result.ok).toBe(true);
    expect(stores.investor_goals.find((g) => g.id === 5)?.household_id).toBe(seed.household.id);
  });

  it("un-sharing clears household_id (always allowed)", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    stores.investor_goals.push({ id: 6, auth_user_id: OWNER, household_id: seed.household.id, label: "G" });
    const result = await setItemShared({ userId: OWNER, kind: "goal", itemId: 6, shared: false });
    expect(result.ok).toBe(true);
    expect(stores.investor_goals.find((g) => g.id === 6)?.household_id).toBeNull();
  });

  it("cannot share a row the user does NOT own (owner-column filter → not_found)", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    // A goal owned by someone else.
    stores.investor_goals.push({ id: 7, auth_user_id: "someone-else", household_id: null, label: "G" });
    const result = await setItemShared({ userId: OWNER, kind: "goal", itemId: 7, shared: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_found");
    expect(stores.investor_goals.find((g) => g.id === 7)?.household_id).toBeNull();
  });

  it("cannot share when the user is in NO household (not_in_household)", async () => {
    // No household seeded for this user.
    stores.investor_goals.push({ id: 8, auth_user_id: OWNER, household_id: null, label: "G" });
    const result = await setItemShared({ userId: OWNER, kind: "goal", itemId: 8, shared: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_in_household");
  });

  it("routes balances to manual_balances with the user_id owner column", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    stores.manual_balances.push({ id: "bal-1", user_id: OWNER, household_id: null, label: "B" });
    const result = await setItemShared({ userId: OWNER, kind: "balance", itemId: "bal-1", shared: true });
    expect(result.ok).toBe(true);
    expect(stores.manual_balances.find((b) => b.id === "bal-1")?.household_id).toBe(seed.household.id);
  });
});

describe("getHouseholdContextForUser", () => {
  it("returns null when the user is in no household", async () => {
    const ctx = await getHouseholdContextForUser("nobody");
    expect(ctx).toBeNull();
  });

  it("returns the household + partner once both are accepted", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    const ctx = await getHouseholdContextForUser(OWNER);
    expect(ctx).not.toBeNull();
    expect(ctx?.myRole).toBe("owner");
    expect(ctx?.partner?.user_id).toBe(PARTNER);
  });
});

describe("getPartnerSharedRows — combined view merge + empty state", () => {
  it("returns the PARTNER's shared rows only (not the caller's own)", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    // Owner's own shared goal + partner's shared goal, both in the household.
    stores.investor_goals.push(
      { id: 1, auth_user_id: OWNER, household_id: seed.household.id, label: "Owner goal" },
      { id: 2, auth_user_id: PARTNER, household_id: seed.household.id, label: "Partner goal" },
    );
    const rows = await getPartnerSharedRows<{ id: number; label: string }>({
      userId: OWNER,
      kind: "goal",
      columns: "id, label",
    });
    // Only the partner's row comes back, attributed as not-mine.
    expect(rows).toHaveLength(1);
    expect(rows[0]?.row.label).toBe("Partner goal");
    expect(rows[0]?.mine).toBe(false);
    expect(rows[0]?.ownerUserId).toBe(PARTNER);
  });

  it("returns [] (honest empty) when the partner has shared nothing", async () => {
    const seed = await seedHouseholdWithPendingInvite();
    if (!seed.ok) return;
    await claimInvite({
      token: seed.invite.invite_token,
      userId: PARTNER,
      acceptorEmail: PARTNER_EMAIL,
    });
    // Only the owner's own shared goal exists — partner shared nothing.
    stores.investor_goals.push({ id: 1, auth_user_id: OWNER, household_id: seed.household.id, label: "Mine" });
    const rows = await getPartnerSharedRows<{ id: number }>({
      userId: OWNER,
      kind: "goal",
      columns: "id",
    });
    expect(rows).toEqual([]);
  });

  it("returns [] when the user is in no household", async () => {
    const rows = await getPartnerSharedRows<{ id: number }>({
      userId: "nobody",
      kind: "goal",
      columns: "id",
    });
    expect(rows).toEqual([]);
  });
});

describe("partnerLabel", () => {
  it("prefers the display name", () => {
    expect(partnerLabel({ displayName: "Alex Tan", email: "a@b.com" })).toBe("Alex Tan");
  });
  it("falls back to the email local-part", () => {
    expect(partnerLabel({ displayName: null, email: "jordan@example.com" })).toBe("jordan");
  });
  it("falls back to a generic label when nothing is known", () => {
    expect(partnerLabel({})).toBe("your partner");
  });
});

describe("generateInviteToken", () => {
  it("produces unguessable, unique, URL-safe tokens", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(24);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
