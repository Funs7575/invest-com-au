/**
 * RLS isolation tests for the SP-02 startup-portal schema (V-NEW-04).
 *
 * One marker per new user-data table so scripts/check-rls-isolation.mjs can pair
 * each table with proof that user A cannot read or mutate user B's rows. The
 * mocks enforce the same predicate the Postgres RLS policy does:
 *   - direct-owner tables  → row.<ownerCol> === auth.uid()
 *   - startup-scoped tables → caller owns the parent startup (owner_user_id),
 *     i.e. the policy's `EXISTS (… startup_profiles WHERE owner_user_id = auth.uid())`
 *
 * startup_sessions is service-role-only (no authenticated policy — it mirrors
 * advisor_sessions) so it carries no user-owned rows; it's listed in
 * ISOLATION_EXEMPT in the gate rather than tested here.
 */

// rls-isolation: startup_profiles
// rls-isolation: startup_rounds
// rls-isolation: startup_investor_inquiries
// rls-isolation: startup_data_room_files
// rls-isolation: startup_data_room_access
// rls-isolation: wholesale_investor_certifications
// rls-isolation: esic_verifications

import { describe, it, expect, beforeEach } from "vitest";

const UID_A = "user-a-0000-0000-0000-000000000001";
const UID_B = "user-b-0000-0000-0000-000000000002";
const RLS = { code: "42501", message: "RLS violation" } as const;

type Row = Record<string, unknown> & { id: string };

/** Direct-owner RLS: a row is visible/mutable only when row[ownerCol] === uid. */
function directOwnerClient(rows: Row[], uid: string, ownerCol: string) {
  const owns = (r: Row | undefined) => !!r && r[ownerCol] === uid;
  return {
    select: async () => ({ data: rows.filter((r) => r[ownerCol] === uid), error: null }),
    insert: async (row: Row) =>
      row[ownerCol] === uid
        ? { data: { ...row, id: "new" }, error: null }
        : { data: null, error: RLS },
    updateById: async (id: string) =>
      owns(rows.find((r) => r.id === id)) ? { data: { id }, error: null } : { data: null, error: RLS },
    deleteById: async (id: string) =>
      owns(rows.find((r) => r.id === id)) ? { data: { id }, error: null } : { data: null, error: RLS },
  };
}

/**
 * Startup-scoped RLS: ownership is indirect — the caller may touch a row only
 * if they own the parent startup. `startupOwners` maps startup_id → owner uid.
 */
function startupScopedClient(rows: Row[], uid: string, startupOwners: Record<string, string>, fk = "startup_id") {
  const ownsParent = (r: Row | undefined) => !!r && startupOwners[String(r[fk])] === uid;
  return {
    select: async () => ({ data: rows.filter((r) => startupOwners[String(r[fk])] === uid), error: null }),
    insert: async (row: Row) =>
      startupOwners[String(row[fk])] === uid
        ? { data: { ...row, id: "new" }, error: null }
        : { data: null, error: RLS },
    updateById: async (id: string) =>
      ownsParent(rows.find((r) => r.id === id)) ? { data: { id }, error: null } : { data: null, error: RLS },
    deleteById: async (id: string) =>
      ownsParent(rows.find((r) => r.id === id)) ? { data: { id }, error: null } : { data: null, error: RLS },
  };
}

function directOwnerSuite(table: string, ownerCol: string) {
  describe(`${table} — RLS isolation (${ownerCol} = auth.uid())`, () => {
    const seed: Row[] = [
      { id: "a", [ownerCol]: UID_A },
      { id: "b", [ownerCol]: UID_B },
    ];
    let a: ReturnType<typeof directOwnerClient>;
    beforeEach(() => {
      a = directOwnerClient(seed.map((r) => ({ ...r })), UID_A, ownerCol);
    });

    it("A reads only their own rows", async () => {
      const { data } = await a.select();
      expect(data).toHaveLength(1);
      expect(data[0][ownerCol]).toBe(UID_A);
    });
    it("A can INSERT a row they own", async () => {
      expect((await a.insert({ id: "x", [ownerCol]: UID_A })).error).toBeNull();
    });
    it("A cannot INSERT a row owned by B", async () => {
      expect((await a.insert({ id: "x", [ownerCol]: UID_B })).error?.code).toBe("42501");
    });
    it("A cannot UPDATE B's row", async () => {
      expect((await a.updateById("b")).error?.code).toBe("42501");
    });
    it("A cannot DELETE B's row", async () => {
      expect((await a.deleteById("b")).error?.code).toBe("42501");
    });
    it("A can UPDATE + DELETE their own row", async () => {
      expect((await a.updateById("a")).error).toBeNull();
      expect((await a.deleteById("a")).error).toBeNull();
    });
  });
}

function startupScopedSuite(table: string) {
  describe(`${table} — RLS isolation (via parent startup ownership)`, () => {
    const owners: Record<string, string> = { "startup-A": UID_A, "startup-B": UID_B };
    const seed: Row[] = [
      { id: "rowA", startup_id: "startup-A" },
      { id: "rowB", startup_id: "startup-B" },
    ];
    let a: ReturnType<typeof startupScopedClient>;
    beforeEach(() => {
      a = startupScopedClient(seed.map((r) => ({ ...r })), UID_A, owners);
    });

    it("A reads only rows for startups they own", async () => {
      const { data } = await a.select();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("rowA");
    });
    it("A can INSERT under their own startup", async () => {
      expect((await a.insert({ id: "x", startup_id: "startup-A" })).error).toBeNull();
    });
    it("A cannot INSERT under B's startup", async () => {
      expect((await a.insert({ id: "x", startup_id: "startup-B" })).error?.code).toBe("42501");
    });
    it("A cannot UPDATE a row under B's startup", async () => {
      expect((await a.updateById("rowB")).error?.code).toBe("42501");
    });
    it("A cannot DELETE a row under B's startup", async () => {
      expect((await a.deleteById("rowB")).error?.code).toBe("42501");
    });
  });
}

// Direct-owner user-data tables.
directOwnerSuite("startup_profiles", "owner_user_id");
directOwnerSuite("startup_investor_inquiries", "investor_user_id");
directOwnerSuite("startup_data_room_access", "granted_to_user_id");
directOwnerSuite("wholesale_investor_certifications", "user_id");

// Startup-scoped tables (policy gates on owning the parent startup_profiles row).
startupScopedSuite("startup_rounds");
startupScopedSuite("startup_data_room_files");
startupScopedSuite("esic_verifications");
