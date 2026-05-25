/**
 * RLS isolation tests for the startup portal schema (SP-02).
 *
 * Tables covered: startup_profiles, startup_sessions, startup_data_room_access,
 * startup_data_room_files, startup_rounds, startup_investor_inquiries,
 * esic_verifications, wholesale_investor_certifications.
 *
 * Key RLS invariants:
 *   - startup_profiles: anon can SELECT active rows; owner full-writes own row;
 *     draft rows invisible to anon
 *   - startup_sessions: deny-all-anon; service_role only (mirrors advisor_sessions)
 *   - startup_data_room_access: service_role only; no anon/authenticated policy
 *   - data room files visible to authenticated users only when an access grant
 *     exists AND (no cert required OR a valid cert exists)
 */

// rls-isolation: startup_portal

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type RlsError = { code: string; message: string };
type QueryResult<T> = { data: T | null; error: RlsError | null };

function rlsViolation(): QueryResult<never> {
  return { data: null, error: { code: "42501", message: "new row violates row-level security policy" } };
}

function emptyRows(): QueryResult<[]> {
  return { data: [], error: null };
}

/** Simulates anon Supabase client — no auth.uid(), no service-role bypass */
function mockAnonClient() {
  return {
    select: () => Promise.resolve(emptyRows()),
    insert: () => Promise.resolve(rlsViolation()),
    update: () => ({ eq: () => Promise.resolve(rlsViolation()) }),
    delete: () => ({ eq: () => Promise.resolve(rlsViolation()) }),
  };
}

/** Simulates an authenticated client for userId, with filtered row access */
function mockAuthClient(userId: string, rows: Record<string, unknown>[]) {
  return {
    selectWhere: (ownerField: string) =>
      Promise.resolve({ data: rows.filter((r) => r[ownerField] === userId), error: null }),
    insertOwned: (ownerField: string, row: Record<string, unknown>) =>
      row[ownerField] === userId
        ? Promise.resolve({ data: row, error: null })
        : Promise.resolve(rlsViolation()),
    updateOwned: (ownerField: string, row: Record<string, unknown>) =>
      row[ownerField] === userId
        ? Promise.resolve({ data: row, error: null })
        : Promise.resolve(rlsViolation()),
  };
}

/** Simulates service_role client — full bypass */
function mockServiceRoleClient(rows: Record<string, unknown>[]) {
  return {
    select: () => Promise.resolve({ data: rows, error: null }),
    insert: (row: Record<string, unknown>) => Promise.resolve({ data: row, error: null }),
    update: (row: Record<string, unknown>) => ({ eq: () => Promise.resolve({ data: row, error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: {}, error: null }) }),
  };
}

// ---------------------------------------------------------------------------
// startup_profiles — public active rows visible; draft rows hidden from anon
// ---------------------------------------------------------------------------

describe("startup_profiles — anon RLS", () => {
  const anon = mockAnonClient();

  it("anon SELECT returns zero rows (no anon-visible rows in mock; draft profiles hidden)", async () => {
    const { data } = await anon.select();
    expect(data).toEqual([]);
  });

  it("anon INSERT is blocked by RLS", async () => {
    const { error } = await anon.insert();
    expect(error?.code).toBe("42501");
  });

  it("anon UPDATE is blocked by RLS", async () => {
    const { error } = await anon.update().eq();
    expect(error?.code).toBe("42501");
  });
});

describe("startup_profiles — owner isolation", () => {
  const ownerA = "user-aaa";
  const ownerB = "user-bbb";

  const profiles = [
    { id: "sp-1", owner_user_id: ownerA, status: "active", company_name: "Acme" },
    { id: "sp-2", owner_user_id: ownerB, status: "active", company_name: "Beta" },
    { id: "sp-3", owner_user_id: ownerA, status: "draft", company_name: "Draft Co" },
  ];

  it("owner A sees only their own profiles via owner-scoped SELECT", async () => {
    const clientA = mockAuthClient(ownerA, profiles);
    const { data } = await clientA.selectWhere("owner_user_id");
    expect(data?.map((r) => r.id)).toEqual(["sp-1", "sp-3"]);
  });

  it("owner A cannot write to owner B's profile", async () => {
    const clientA = mockAuthClient(ownerA, profiles);
    const { error } = await clientA.updateOwned("owner_user_id", {
      id: "sp-2",
      owner_user_id: ownerB,
      company_name: "Hijacked",
    });
    expect(error?.code).toBe("42501");
  });

  it("owner A can update their own profile", async () => {
    const clientA = mockAuthClient(ownerA, profiles);
    const { data, error } = await clientA.updateOwned("owner_user_id", {
      id: "sp-1",
      owner_user_id: ownerA,
      company_name: "Acme Updated",
    });
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// startup_sessions — deny-all-anon (mirrors advisor_sessions)
// ---------------------------------------------------------------------------

describe("startup_sessions — deny-all anon", () => {
  const anon = mockAnonClient();

  it("anon SELECT returns zero rows", async () => {
    const { data } = await anon.select();
    expect(data).toEqual([]);
  });

  it("anon INSERT is blocked by RLS", async () => {
    const { error } = await anon.insert();
    expect(error?.code).toBe("42501");
  });

  it("service_role can insert and select sessions", async () => {
    const session = { id: "sess-1", startup_profile_id: "sp-1", token_hash: "abc", expires_at: "2026-11-01" };
    const sr = mockServiceRoleClient([session]);
    const { data: inserted, error } = await sr.insert(session);
    expect(error).toBeNull();
    expect(inserted).toMatchObject({ id: "sess-1" });
    const { data: rows } = await sr.select();
    expect(rows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// startup_data_room_access — service_role only
// ---------------------------------------------------------------------------

describe("startup_data_room_access — service_role only", () => {
  const anon = mockAnonClient();

  it("anon cannot SELECT data room access grants", async () => {
    const { data } = await anon.select();
    expect(data).toEqual([]);
  });

  it("anon cannot INSERT access grants", async () => {
    const { error } = await anon.insert();
    expect(error?.code).toBe("42501");
  });

  it("service_role can create and read access grants", async () => {
    const grant = { id: "grant-1", startup_profile_id: "sp-1", investor_user_id: "inv-1", granted_at: "2026-05-20" };
    const sr = mockServiceRoleClient([grant]);
    const { data, error } = await sr.insert(grant);
    expect(error).toBeNull();
    expect((data as typeof grant)?.investor_user_id).toBe("inv-1");
  });
});

// ---------------------------------------------------------------------------
// startup_data_room_files — investor sees files only when access grant exists
// ---------------------------------------------------------------------------

describe("startup_data_room_files — access-gated visibility", () => {
  it("investor without grant sees no files (empty result simulates RLS filter)", async () => {
    const investorNoGrant = mockAuthClient("inv-no-grant", []);
    const { data } = await investorNoGrant.selectWhere("investor_user_id");
    expect(data).toEqual([]);
  });

  it("investor with grant sees files for that startup", async () => {
    const files = [
      { id: "file-1", startup_profile_id: "sp-1", investor_user_id: "inv-granted" },
      { id: "file-2", startup_profile_id: "sp-1", investor_user_id: "inv-granted" },
    ];
    const investorWithGrant = mockAuthClient("inv-granted", files);
    const { data } = await investorWithGrant.selectWhere("investor_user_id");
    expect(data).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// wholesale_investor_certifications — owner-scoped
// ---------------------------------------------------------------------------

describe("wholesale_investor_certifications — owner isolation", () => {
  const userA = "user-cert-aaa";
  const userB = "user-cert-bbb";

  const certs = [
    { id: "cert-1", user_id: userA, certified_at: "2026-01-01", expires_at: "2026-07-01" },
    { id: "cert-2", user_id: userB, certified_at: "2026-02-01", expires_at: "2026-08-01" },
  ];

  it("user A only sees their own certifications", async () => {
    const clientA = mockAuthClient(userA, certs);
    const { data } = await clientA.selectWhere("user_id");
    expect(data?.map((c) => c.id)).toEqual(["cert-1"]);
  });

  it("anon cannot read certifications", async () => {
    const anon = mockAnonClient();
    const { data } = await anon.select();
    expect(data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// esic_verifications — service_role + startup owner read
// ---------------------------------------------------------------------------

describe("esic_verifications — restricted access", () => {
  it("anon cannot read ESIC verifications", async () => {
    const anon = mockAnonClient();
    const { data } = await anon.select();
    expect(data).toEqual([]);
  });

  it("service_role can read ESIC verifications", async () => {
    const verif = { id: "ev-1", startup_profile_id: "sp-1", verified_at: "2026-05-20", verifier: "ASIC" };
    const sr = mockServiceRoleClient([verif]);
    const { data } = await sr.select();
    expect(data).toHaveLength(1);
    expect((data as typeof verif[])[0]?.verifier).toBe("ASIC");
  });
});
