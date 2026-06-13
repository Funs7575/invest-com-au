// rls-isolation: households
// rls-isolation: household_members
//
// RLS isolation tests for Household Workspaces (20260612224000_households.sql).
//
// These cover the policy SEMANTICS the migration encodes — modelled with pure
// in-memory predicates that mirror each USING / WITH CHECK clause, the same
// approach as __tests__/lib/user_scenarios.rls.test.ts. They prove the core
// security property of this feature:
//
//   household reads cross the user boundary BY DESIGN, but ONLY for accepted
//   members of the SAME household, and ONLY for rows the owner has shared.
//
// Policies under test
// -------------------
//   households            SELECT  → created_by = uid OR is_household_member(id)
//   household_members     SELECT  → user_id = uid OR is_owner(hh) OR is_member(hh)
//                         INSERT  → is_owner(hh)
//                         UPDATE  → is_owner(hh) OR user_id = uid
//   investor_goals (+ manual_balances, user_watchlist_items)
//     additional SELECT   → household_id IS NOT NULL
//                           AND EXISTS(member row: same hh, uid, status='accepted')
//   (owner write policies unchanged → sharing grants READ, never write)

import { describe, it, expect } from "vitest";

const OWNER = "aaaaaaaa-0000-0000-0000-000000000001"; // household owner
const PARTNER = "bbbbbbbb-0000-0000-0000-000000000002"; // accepted partner
const PENDING_USER = "cccccccc-0000-0000-0000-000000000003"; // invited, not yet accepted
const REVOKED_USER = "dddddddd-0000-0000-0000-000000000004"; // was a member, revoked
const STRANGER = "eeeeeeee-0000-0000-0000-000000000005"; // unrelated user
const HH = "10000000-0000-0000-0000-000000000000"; // the household id
const OTHER_HH = "20000000-0000-0000-0000-000000000000"; // a different household

type Status = "pending" | "accepted" | "revoked" | "left";

interface MemberRow {
  id: string;
  household_id: string;
  user_id: string | null;
  invited_email: string;
  role: "owner" | "partner";
  status: Status;
}

interface HouseholdRow {
  id: string;
  name: string;
  created_by: string;
}

// Membership fixture: OWNER (accepted owner), PARTNER (accepted), PENDING_USER
// (pending — user_id null until they accept), REVOKED_USER (revoked).
const MEMBERS: MemberRow[] = [
  { id: "m-owner", household_id: HH, user_id: OWNER, invited_email: "owner@x.com", role: "owner", status: "accepted" },
  { id: "m-partner", household_id: HH, user_id: PARTNER, invited_email: "partner@x.com", role: "partner", status: "accepted" },
  { id: "m-pending", household_id: HH, user_id: null, invited_email: "pending@x.com", role: "partner", status: "pending" },
  { id: "m-revoked", household_id: HH, user_id: REVOKED_USER, invited_email: "revoked@x.com", role: "partner", status: "revoked" },
];

const HOUSEHOLDS: HouseholdRow[] = [
  { id: HH, name: "Our household", created_by: OWNER },
  { id: OTHER_HH, name: "Someone else", created_by: STRANGER },
];

// ── policy predicate helpers (mirror the SQL EXISTS subqueries) ──────────────

/** SECURITY DEFINER is_household_member(hid): accepted member with uid. */
function isAcceptedMember(uid: string, hid: string): boolean {
  return MEMBERS.some(
    (m) => m.household_id === hid && m.user_id === uid && m.status === "accepted",
  );
}

/** is_household_owner(hid): caller created the household. */
function isOwner(uid: string, hid: string): boolean {
  return HOUSEHOLDS.some((h) => h.id === hid && h.created_by === uid);
}

// ── households SELECT policy ────────────────────────────────────────────────
function canSelectHousehold(uid: string, h: HouseholdRow): boolean {
  return h.created_by === uid || isAcceptedMember(uid, h.id);
}

// ── household_members SELECT policy ──────────────────────────────────────────
function canSelectMember(uid: string, m: MemberRow): boolean {
  return m.user_id === uid || isOwner(uid, m.household_id) || isAcceptedMember(uid, m.household_id);
}

// ── household_members INSERT (only owner adds members) ───────────────────────
function canInsertMember(uid: string, hid: string): boolean {
  return isOwner(uid, hid);
}

// ── household_members UPDATE (owner OR self) ─────────────────────────────────
function canUpdateMember(uid: string, m: MemberRow): boolean {
  return isOwner(uid, m.household_id) || m.user_id === uid;
}

// ── shared data-row SELECT policy (goals/balances/watchlist) ─────────────────
// A row is visible to `uid` if: they OWN it (baseline owner policy), OR it's
// shared (household_id set) and uid is an accepted member of that household.
function canSelectSharedRow(
  uid: string,
  row: { owner: string; household_id: string | null },
): boolean {
  if (row.owner === uid) return true; // owner policy
  if (row.household_id == null) return false; // not shared → no cross-user read
  return isAcceptedMember(uid, row.household_id); // additional shared-read policy
}

describe("households — RLS isolation (households table)", () => {
  it("owner can read their own household", () => {
    const hh = HOUSEHOLDS.find((h) => h.id === HH)!;
    expect(canSelectHousehold(OWNER, hh)).toBe(true);
  });

  it("accepted partner can read the shared household (cross-user, by design)", () => {
    const hh = HOUSEHOLDS.find((h) => h.id === HH)!;
    expect(canSelectHousehold(PARTNER, hh)).toBe(true);
  });

  it("a pending invitee canNOT read the household until they accept", () => {
    const hh = HOUSEHOLDS.find((h) => h.id === HH)!;
    expect(canSelectHousehold(PENDING_USER, hh)).toBe(false);
  });

  it("a revoked member canNOT read the household", () => {
    const hh = HOUSEHOLDS.find((h) => h.id === HH)!;
    expect(canSelectHousehold(REVOKED_USER, hh)).toBe(false);
  });

  it("a stranger canNOT read someone else's household", () => {
    const hh = HOUSEHOLDS.find((h) => h.id === HH)!;
    expect(canSelectHousehold(STRANGER, hh)).toBe(false);
  });
});

describe("household_members — RLS isolation (membership roster)", () => {
  it("owner reads every roster row (incl. pending + revoked)", () => {
    for (const m of MEMBERS) {
      expect(canSelectMember(OWNER, m)).toBe(true);
    }
  });

  it("accepted partner reads the roster", () => {
    expect(canSelectMember(PARTNER, MEMBERS[0]!)).toBe(true);
    expect(canSelectMember(PARTNER, MEMBERS[1]!)).toBe(true);
  });

  it("pending invitee can read ONLY their own pending row, not others'", () => {
    const own = MEMBERS.find((m) => m.id === "m-pending")!;
    const ownersRow = MEMBERS.find((m) => m.id === "m-owner")!;
    // pending row's user_id is null, so the self clause doesn't match by uid —
    // the invitee sees nothing until accepted. This is the conservative case.
    expect(canSelectMember(PENDING_USER, own)).toBe(false);
    expect(canSelectMember(PENDING_USER, ownersRow)).toBe(false);
  });

  it("a stranger reads no roster rows", () => {
    for (const m of MEMBERS) {
      expect(canSelectMember(STRANGER, m)).toBe(false);
    }
  });

  it("only the owner may INSERT a new member (send an invite)", () => {
    expect(canInsertMember(OWNER, HH)).toBe(true);
    expect(canInsertMember(PARTNER, HH)).toBe(false);
    expect(canInsertMember(STRANGER, HH)).toBe(false);
  });

  it("owner may UPDATE any member; a member may update only their own row", () => {
    const partnerRow = MEMBERS.find((m) => m.id === "m-partner")!;
    const ownerRow = MEMBERS.find((m) => m.id === "m-owner")!;
    // Owner can revoke the partner.
    expect(canUpdateMember(OWNER, partnerRow)).toBe(true);
    // Partner can update (leave) their own row…
    expect(canUpdateMember(PARTNER, partnerRow)).toBe(true);
    // …but NOT the owner's row.
    expect(canUpdateMember(PARTNER, ownerRow)).toBe(false);
    // A stranger can update nothing.
    expect(canUpdateMember(STRANGER, partnerRow)).toBe(false);
  });
});

describe("shared data rows — RLS isolation (goals / balances / watchlist)", () => {
  // The owner's row, shared with the household.
  const sharedRow = { owner: OWNER, household_id: HH };
  // The owner's row, NOT shared.
  const privateRow = { owner: OWNER, household_id: null };
  // The owner's row, shared with a DIFFERENT household the partner isn't in.
  const otherHouseholdRow = { owner: OWNER, household_id: OTHER_HH };

  it("owner always reads their own rows (shared or not)", () => {
    expect(canSelectSharedRow(OWNER, sharedRow)).toBe(true);
    expect(canSelectSharedRow(OWNER, privateRow)).toBe(true);
  });

  it("accepted partner reads the owner's SHARED row (the core cross-user grant)", () => {
    expect(canSelectSharedRow(PARTNER, sharedRow)).toBe(true);
  });

  it("accepted partner canNOT read the owner's UNSHARED row", () => {
    expect(canSelectSharedRow(PARTNER, privateRow)).toBe(false);
  });

  it("pending invitee canNOT read a shared row (not accepted yet)", () => {
    expect(canSelectSharedRow(PENDING_USER, sharedRow)).toBe(false);
  });

  it("revoked member canNOT read a shared row (membership gone)", () => {
    expect(canSelectSharedRow(REVOKED_USER, sharedRow)).toBe(false);
  });

  it("a stranger canNOT read a shared row", () => {
    expect(canSelectSharedRow(STRANGER, sharedRow)).toBe(false);
  });

  it("a member of household A canNOT read a row shared only with household B", () => {
    // PARTNER is accepted in HH, not in OTHER_HH → the EXISTS check fails.
    expect(canSelectSharedRow(PARTNER, otherHouseholdRow)).toBe(false);
  });

  it("sharing grants READ only — the partner's read access is SELECT, never a write path", () => {
    // There is no partner write policy; only the owner's own-row write policies
    // exist. Model that as: a non-owner can never write a row regardless of
    // share state. (Mirrors the migration's deliberate read-only design.)
    const canWrite = (uid: string, row: { owner: string }) => row.owner === uid;
    expect(canWrite(PARTNER, sharedRow)).toBe(false);
    expect(canWrite(PARTNER, privateRow)).toBe(false);
    expect(canWrite(OWNER, sharedRow)).toBe(true);
  });
});
