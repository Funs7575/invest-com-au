/**
 * Household Workspaces — core data access + invite/accept/revoke/leave state
 * machine (idea #6, docs/strategy/RETENTION_MARKETPLACE_MEGA_SESSIONS.md).
 *
 * What this is
 * ------------
 * A household groups two people (an owner + one invited partner) so they can
 * see each other's SHARED goals, manual balances and watchlist items. A row is
 * shared by stamping its `household_id`; sharing grants READ only — the owner
 * still owns the write. See the migration header (20260612224000_households.sql)
 * for the RLS design that enforces all of this at the database layer.
 *
 * Flag gating
 * -----------
 * Everything user-facing is behind the `households` feature flag and fails
 * closed (flag off / DB error → no UI, API 404/403). Callers gate with
 * `isFlagEnabled(HOUSEHOLDS_FLAG, ...)` before invoking anything here; the
 * helpers themselves are also fail-soft (return null / empty rather than throw)
 * so a partially-migrated environment never 500s.
 *
 * Admin-client scope
 * ------------------
 * Almost everything runs through the user-cookie client (lib/supabase/server)
 * so RLS enforces isolation. The ONE exception is `claimInvite()` — the invitee
 * accepting their invitation must flip `household_members.user_id` from NULL to
 * their auth id, a cross-user write the inviter's RLS can't authorise and the
 * invitee can't yet (their user_id isn't on the row). That single step uses the
 * service-role admin client, re-verifying the signed-in acceptor's email matches
 * the invited_email before writing. This mirrors the documented `claimAnonymous`
 * exception in CLAUDE.md § "Two Supabase clients".
 *
 * Row types are LOCAL here (not added to lib/database.types.ts, per task rules).
 *
 * SERVER-ONLY: this module value-imports the admin client. Never import it from
 * a `"use client"` component. Client components talk to the API routes instead.
 */

import { randomBytes } from "crypto";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- cross-user invite claim only: claimInvite() flips household_members.user_id from NULL→acceptor for a row the acceptor's own JWT can't yet match and the inviter's RLS can't authorise. Re-verifies email match before writing. Documented exception in CLAUDE.md § "Two Supabase clients" (cross-user claim, cf. claimAnonymousSaves).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("households");

/** Feature-flag key gating the entire Household Workspaces feature. */
export const HOUSEHOLDS_FLAG = "households";

/** Max household name length — mirrors the DB CHECK (char_length <= 60). */
export const HOUSEHOLD_NAME_MAX = 60;

export type MemberRole = "owner" | "partner";
export type MemberStatus = "pending" | "accepted" | "revoked" | "left";

// ─── Local row types (do NOT add to lib/database.types.ts) ────────────────────

export interface HouseholdRow {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string | null;
  invited_email: string;
  role: MemberRole;
  status: MemberStatus;
  invite_token: string;
  invited_at: string;
  accepted_at: string | null;
}

/**
 * The caller's household context — what the account UI needs to render the
 * household surfaces. `myRole` is the caller's role; `members` is the full
 * roster (owner + partner rows the caller is allowed to see).
 */
export interface HouseholdContext {
  household: HouseholdRow;
  myRole: MemberRole;
  members: HouseholdMemberRow[];
  /** The OTHER accepted member, if any (the partner from the caller's view). */
  partner: HouseholdMemberRow | null;
}

/** A pending invitation addressed to the current user (by email). */
export interface PendingInvite {
  member: HouseholdMemberRow;
  household: HouseholdRow;
}

// ─── token ────────────────────────────────────────────────────────────────

/** Unguessable invite token (URL-safe). The accept link's auth factor. */
export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

// ─── reads ──────────────────────────────────────────────────────────────────

/**
 * Load the household the user belongs to (as accepted owner or partner), with
 * its roster. Returns null when the user is in no household. Fail-soft.
 *
 * A user is in at most one household at a time (app-level cap). We resolve via
 * the user's accepted membership row, then read the household + full roster.
 */
export async function getHouseholdContextForUser(
  userId: string,
): Promise<HouseholdContext | null> {
  try {
    const supabase = await createClient();
    const { data: myMemberships, error: memErr } = await supabase
      .from("household_members")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: true })
      .limit(1);
    if (memErr) {
      log.warn("getHouseholdContextForUser membership read failed", {
        userId,
        error: memErr.message,
      });
      return null;
    }
    const mine = (myMemberships ?? [])[0] as HouseholdMemberRow | undefined;
    if (!mine) return null;

    const { data: household, error: hhErr } = await supabase
      .from("households")
      .select("*")
      .eq("id", mine.household_id)
      .maybeSingle();
    if (hhErr || !household) {
      if (hhErr) {
        log.warn("getHouseholdContextForUser household read failed", {
          userId,
          error: hhErr.message,
        });
      }
      return null;
    }

    const { data: roster } = await supabase
      .from("household_members")
      .select("*")
      .eq("household_id", mine.household_id)
      .order("invited_at", { ascending: true });

    const members = (roster ?? []) as HouseholdMemberRow[];
    const partner =
      members.find(
        (m) => m.id !== mine.id && m.status === "accepted",
      ) ?? null;

    return {
      household: household as HouseholdRow,
      myRole: mine.role,
      members,
      partner,
    };
  } catch (err) {
    log.warn("getHouseholdContextForUser threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Pending invitations addressed to the given email that the user could accept.
 * Used to surface "you've been invited" prompts. Service-role: the invitee's
 * own JWT can't see a pending row (user_id is still NULL), so we read by email
 * via admin and return only PENDING rows whose household still exists.
 */
export async function getPendingInvitesForEmail(
  email: string,
): Promise<PendingInvite[]> {
  const normalised = email.trim().toLowerCase();
  if (!normalised) return [];
  try {
    const admin = createAdminClient();
    const { data: members, error } = await admin
      .from("household_members")
      .select("*")
      .ilike("invited_email", normalised)
      .eq("status", "pending");
    if (error) {
      log.warn("getPendingInvitesForEmail failed", { error: error.message });
      return [];
    }
    const rows = (members ?? []) as HouseholdMemberRow[];
    if (rows.length === 0) return [];

    const householdIds = [...new Set(rows.map((r) => r.household_id))];
    const { data: households } = await admin
      .from("households")
      .select("*")
      .in("id", householdIds);
    const byId = new Map(
      ((households ?? []) as HouseholdRow[]).map((h) => [h.id, h]),
    );

    return rows
      .map((member) => {
        const household = byId.get(member.household_id);
        return household ? { member, household } : null;
      })
      .filter((x): x is PendingInvite => x !== null);
  } catch (err) {
    log.warn("getPendingInvitesForEmail threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ─── invite / create state machine ───────────────────────────────────────────

export type CreateHouseholdResult =
  | { ok: true; household: HouseholdRow; invite: HouseholdMemberRow }
  | { ok: false; error: CreateHouseholdError };

export type CreateHouseholdError =
  | "already_in_household"
  | "self_invite"
  | "invalid_email"
  | "db_error";

/**
 * Create a household for `userId` and invite `partnerEmail`. Enforces the
 * one-household-per-user cap at the application layer: if the user already owns
 * or belongs to a household, returns `already_in_household`.
 *
 * The creator is recorded as an ACCEPTED owner member immediately; the partner
 * gets a PENDING row with a fresh invite token. Returns the household + the
 * partner invite row (whose token the caller emails).
 */
export async function createHouseholdWithInvite(opts: {
  userId: string;
  ownerEmail: string;
  partnerEmail: string;
  name?: string | null;
}): Promise<CreateHouseholdResult> {
  const ownerEmail = opts.ownerEmail.trim().toLowerCase();
  const partnerEmail = opts.partnerEmail.trim().toLowerCase();

  if (!partnerEmail || partnerEmail.length > 254) {
    return { ok: false, error: "invalid_email" };
  }
  if (partnerEmail === ownerEmail) {
    return { ok: false, error: "self_invite" };
  }

  try {
    const supabase = await createClient();

    // Cap: one household per user. Already an accepted member of any household?
    const existing = await getHouseholdContextForUser(opts.userId);
    if (existing) {
      return { ok: false, error: "already_in_household" };
    }

    const name = (opts.name ?? "").trim().slice(0, HOUSEHOLD_NAME_MAX) || "Our household";

    const { data: household, error: hhErr } = await supabase
      .from("households")
      .insert({ name, created_by: opts.userId })
      .select("*")
      .single();
    if (hhErr || !household) {
      log.warn("createHouseholdWithInvite household insert failed", {
        userId: opts.userId,
        error: hhErr?.message,
      });
      return { ok: false, error: "db_error" };
    }

    const householdRow = household as HouseholdRow;

    // Owner membership row (accepted immediately) + partner invite (pending).
    const ownerToken = generateInviteToken();
    const { error: ownerErr } = await supabase.from("household_members").insert({
      household_id: householdRow.id,
      user_id: opts.userId,
      invited_email: ownerEmail,
      role: "owner",
      status: "accepted",
      invite_token: ownerToken,
      accepted_at: new Date().toISOString(),
    });
    if (ownerErr) {
      log.warn("createHouseholdWithInvite owner member insert failed", {
        userId: opts.userId,
        error: ownerErr.message,
      });
      // Best-effort cleanup so a half-created household doesn't linger.
      await supabase.from("households").delete().eq("id", householdRow.id);
      return { ok: false, error: "db_error" };
    }

    const inviteToken = generateInviteToken();
    const { data: invite, error: inviteErr } = await supabase
      .from("household_members")
      .insert({
        household_id: householdRow.id,
        user_id: null,
        invited_email: partnerEmail,
        role: "partner",
        status: "pending",
        invite_token: inviteToken,
      })
      .select("*")
      .single();
    if (inviteErr || !invite) {
      log.warn("createHouseholdWithInvite partner invite insert failed", {
        userId: opts.userId,
        error: inviteErr?.message,
      });
      await supabase.from("households").delete().eq("id", householdRow.id);
      return { ok: false, error: "db_error" };
    }

    return {
      ok: true,
      household: householdRow,
      invite: invite as HouseholdMemberRow,
    };
  } catch (err) {
    log.warn("createHouseholdWithInvite threw", {
      userId: opts.userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "db_error" };
  }
}

export type ClaimInviteResult =
  | { ok: true; household: HouseholdRow; member: HouseholdMemberRow }
  | { ok: false; error: ClaimInviteError };

export type ClaimInviteError =
  | "not_found" // bad / consumed token
  | "wrong_email" // signed-in acceptor's email != invited_email
  | "not_pending" // already accepted / revoked / left
  | "already_in_household" // acceptor already belongs to a (different) household
  | "db_error";

/**
 * Claim a pending invitation. The signed-in acceptor (userId + acceptorEmail)
 * presents an invite token; we verify the token resolves to a PENDING partner
 * row whose invited_email matches the acceptor's email, then flip user_id +
 * status=accepted. THIS is the justified admin-client cross-user step.
 *
 * Misuse handling:
 *   - bad/unknown token            → not_found
 *   - token email ≠ acceptor email → wrong_email (stops claiming someone else's invite)
 *   - row already accepted/etc     → not_pending (double-accept is a no-op error)
 *   - acceptor already in a house  → already_in_household (one-household cap)
 */
export async function claimInvite(opts: {
  token: string;
  userId: string;
  acceptorEmail: string;
}): Promise<ClaimInviteResult> {
  const token = opts.token.trim();
  const acceptorEmail = opts.acceptorEmail.trim().toLowerCase();
  if (!token) return { ok: false, error: "not_found" };

  try {
    const admin = createAdminClient();

    const { data: member, error: memErr } = await admin
      .from("household_members")
      .select("*")
      .eq("invite_token", token)
      .maybeSingle();
    if (memErr) {
      log.warn("claimInvite token read failed", { error: memErr.message });
      return { ok: false, error: "db_error" };
    }
    if (!member) return { ok: false, error: "not_found" };

    const row = member as HouseholdMemberRow;

    // Email gate — the acceptor must be the addressed invitee. Compared
    // case-insensitively against the stored (already-lowercased) email.
    if (row.invited_email.trim().toLowerCase() !== acceptorEmail) {
      log.warn("claimInvite email mismatch", { memberId: row.id });
      return { ok: false, error: "wrong_email" };
    }

    if (row.status !== "pending") {
      // Idempotent friendliness: if THIS user already accepted THIS row, treat
      // as success so a double-click on the accept link doesn't error.
      if (row.status === "accepted" && row.user_id === opts.userId) {
        const { data: household } = await admin
          .from("households")
          .select("*")
          .eq("id", row.household_id)
          .maybeSingle();
        if (household) {
          return { ok: true, household: household as HouseholdRow, member: row };
        }
      }
      return { ok: false, error: "not_pending" };
    }

    // One-household cap for the acceptor: they must not already be an accepted
    // member of some OTHER household.
    const { data: priorMemberships } = await admin
      .from("household_members")
      .select("id, household_id, status")
      .eq("user_id", opts.userId)
      .eq("status", "accepted");
    const alreadyElsewhere = (priorMemberships ?? []).some(
      (m) => (m as { household_id: string }).household_id !== row.household_id,
    );
    if (alreadyElsewhere) {
      return { ok: false, error: "already_in_household" };
    }

    const { data: updated, error: updErr } = await admin
      .from("household_members")
      .update({
        user_id: opts.userId,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "pending") // optimistic guard against a concurrent claim
      .select("*")
      .single();
    if (updErr || !updated) {
      log.warn("claimInvite update failed", {
        memberId: row.id,
        error: updErr?.message,
      });
      return { ok: false, error: "db_error" };
    }

    const { data: household } = await admin
      .from("households")
      .select("*")
      .eq("id", row.household_id)
      .maybeSingle();
    if (!household) return { ok: false, error: "db_error" };

    return {
      ok: true,
      household: household as HouseholdRow,
      member: updated as HouseholdMemberRow,
    };
  } catch (err) {
    log.warn("claimInvite threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "db_error" };
  }
}

export type MembershipMutationResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "forbidden" | "db_error" };

/**
 * Owner revokes a member/invite (status → revoked). Only the household owner
 * may call. The revoked member loses read access to shared rows immediately
 * (the RLS subquery requires status='accepted'). RLS also enforces owner-only
 * here — we re-check in the route for a clean 403.
 */
export async function revokeMember(opts: {
  ownerUserId: string;
  memberId: string;
}): Promise<MembershipMutationResult> {
  try {
    const supabase = await createClient();
    const ctx = await getHouseholdContextForUser(opts.ownerUserId);
    if (!ctx || ctx.myRole !== "owner") {
      return { ok: false, error: "forbidden" };
    }
    const target = ctx.members.find((m) => m.id === opts.memberId);
    if (!target) return { ok: false, error: "not_found" };
    if (target.role === "owner") {
      // Owner can't revoke themselves; they leave by deleting the household.
      return { ok: false, error: "forbidden" };
    }

    const { error } = await supabase
      .from("household_members")
      .update({ status: "revoked" })
      .eq("id", opts.memberId)
      .eq("household_id", ctx.household.id);
    if (error) {
      log.warn("revokeMember failed", {
        ownerUserId: opts.ownerUserId,
        error: error.message,
      });
      return { ok: false, error: "db_error" };
    }
    return { ok: true };
  } catch (err) {
    log.warn("revokeMember threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "db_error" };
  }
}

/**
 * A partner leaves the household (status → left). The owner leaves by deleting
 * the household instead (handled in deleteHousehold). On leave we also un-share
 * the leaver's own rows (clear household_id) so nothing they shared stays
 * visible to the owner after they've gone.
 */
export async function leaveHousehold(opts: {
  userId: string;
}): Promise<MembershipMutationResult> {
  try {
    const supabase = await createClient();
    const ctx = await getHouseholdContextForUser(opts.userId);
    if (!ctx) return { ok: false, error: "not_found" };
    if (ctx.myRole === "owner") {
      // Owners don't "leave" — they delete the household.
      return { ok: false, error: "forbidden" };
    }
    const mine = ctx.members.find(
      (m) => m.user_id === opts.userId && m.status === "accepted",
    );
    if (!mine) return { ok: false, error: "not_found" };

    const { error } = await supabase
      .from("household_members")
      .update({ status: "left" })
      .eq("id", mine.id)
      .eq("user_id", opts.userId);
    if (error) {
      log.warn("leaveHousehold failed", {
        userId: opts.userId,
        error: error.message,
      });
      return { ok: false, error: "db_error" };
    }

    // Un-share the leaver's own rows across all three tables (best-effort).
    await unshareAllForUser(opts.userId, ctx.household.id);
    return { ok: true };
  } catch (err) {
    log.warn("leaveHousehold threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "db_error" };
  }
}

/**
 * Owner deletes the entire household. ON DELETE CASCADE removes member rows.
 * We first un-share every shared row (both members') so deleting the household
 * doesn't leave dangling household_id pointers. Owner-only.
 */
export async function deleteHousehold(opts: {
  ownerUserId: string;
}): Promise<MembershipMutationResult> {
  try {
    const supabase = await createClient();
    const ctx = await getHouseholdContextForUser(opts.ownerUserId);
    if (!ctx || ctx.myRole !== "owner") {
      return { ok: false, error: "forbidden" };
    }

    // Each member un-shares their OWN rows (owner-only write per table RLS), so
    // we can only clear the owner's rows here via the user client. The partner's
    // shared rows are cleared via admin to avoid orphan household_id values.
    await unshareAllForUser(opts.ownerUserId, ctx.household.id);
    await adminUnshareHousehold(ctx.household.id);

    const { error } = await supabase
      .from("households")
      .delete()
      .eq("id", ctx.household.id)
      .eq("created_by", opts.ownerUserId);
    if (error) {
      log.warn("deleteHousehold failed", {
        ownerUserId: opts.ownerUserId,
        error: error.message,
      });
      return { ok: false, error: "db_error" };
    }
    return { ok: true };
  } catch (err) {
    log.warn("deleteHousehold threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "db_error" };
  }
}

// ─── per-item sharing ─────────────────────────────────────────────────────────

/** Shareable item kinds — maps to the three data tables. */
export type ShareableKind = "goal" | "balance" | "watchlist";

interface TableSpec {
  table: string;
  /** Owner column on this table (investor_goals uses auth_user_id). */
  ownerCol: "auth_user_id" | "user_id";
  /** PK column type for id coercion (goals/watchlist=bigint, balances=uuid). */
  idIsNumeric: boolean;
}

const TABLE_SPECS: Record<ShareableKind, TableSpec> = {
  goal: { table: "investor_goals", ownerCol: "auth_user_id", idIsNumeric: true },
  balance: { table: "manual_balances", ownerCol: "user_id", idIsNumeric: false },
  watchlist: { table: "user_watchlist_items", ownerCol: "user_id", idIsNumeric: true },
};

export type ShareToggleResult =
  | { ok: true }
  | { ok: false; error: "not_in_household" | "not_found" | "db_error" };

/**
 * Set or clear a single row's household_id (share / un-share). OWNER-ONLY write:
 * the user client + the row's owner-column filter guarantee the caller can only
 * touch their OWN row. Sharing requires the caller to be an accepted member of a
 * household (we stamp THAT household's id). Un-sharing always allowed.
 */
export async function setItemShared(opts: {
  userId: string;
  kind: ShareableKind;
  itemId: string | number;
  shared: boolean;
}): Promise<ShareToggleResult> {
  const spec = TABLE_SPECS[opts.kind];
  try {
    const supabase = await createClient();

    let householdId: string | null = null;
    if (opts.shared) {
      const ctx = await getHouseholdContextForUser(opts.userId);
      if (!ctx) return { ok: false, error: "not_in_household" };
      householdId = ctx.household.id;
    }

    const idValue = spec.idIsNumeric ? Number(opts.itemId) : String(opts.itemId);

    const { data, error } = await supabase
      .from(spec.table)
      .update({ household_id: householdId })
      .eq("id", idValue)
      .eq(spec.ownerCol, opts.userId) // owner-only: scope to the caller's row
      .select("id");
    if (error) {
      log.warn("setItemShared failed", {
        userId: opts.userId,
        kind: opts.kind,
        error: error.message,
      });
      return { ok: false, error: "db_error" };
    }
    if (!data || data.length === 0) {
      return { ok: false, error: "not_found" };
    }
    return { ok: true };
  } catch (err) {
    log.warn("setItemShared threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "db_error" };
  }
}

/**
 * Clear household_id on every row the user OWNS in this household (all three
 * tables). Owner-column scoped → user-client safe. Used on leave/delete.
 */
async function unshareAllForUser(userId: string, householdId: string): Promise<void> {
  try {
    const supabase = await createClient();
    for (const spec of Object.values(TABLE_SPECS)) {
      await supabase
        .from(spec.table)
        .update({ household_id: null })
        .eq(spec.ownerCol, userId)
        .eq("household_id", householdId);
    }
  } catch (err) {
    log.warn("unshareAllForUser threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Admin-clear EVERY row pointing at a household across all three tables (both
 * members'). Used right before deleting a household so no row keeps a dangling
 * household_id. Service-role because it spans both members' rows.
 */
async function adminUnshareHousehold(householdId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    for (const spec of Object.values(TABLE_SPECS)) {
      await admin
        .from(spec.table)
        .update({ household_id: null })
        .eq("household_id", householdId);
    }
  } catch (err) {
    log.warn("adminUnshareHousehold threw", {
      householdId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── combined views ───────────────────────────────────────────────────────────

/**
 * Generic shape returned by combined-view fetches — a row plus who owns it.
 * `ownerUserId` lets the page tag each row "yours" vs the partner's.
 */
export interface AttributedRow<T> {
  row: T;
  ownerUserId: string;
  mine: boolean;
}

/**
 * Fetch the PARTNER's shared rows of a given kind for combined views. The
 * caller passes their own userId + the select columns; we read rows in the
 * caller's household whose owner is NOT the caller (so only the partner's
 * shared rows — the caller's own rows are fetched by the page already).
 *
 * Relies on the additional SELECT policy: an accepted member can read shared
 * rows (household_id set) of their household. We additionally filter to the
 * partner's ownership so we never double-count the caller's own shared rows.
 * Returns [] when the user is in no household or on any error (fail-soft).
 */
export async function getPartnerSharedRows<T extends Record<string, unknown>>(opts: {
  userId: string;
  kind: ShareableKind;
  columns: string;
}): Promise<AttributedRow<T>[]> {
  const spec = TABLE_SPECS[opts.kind];
  try {
    const ctx = await getHouseholdContextForUser(opts.userId);
    if (!ctx) return [];

    const supabase = await createClient();
    // Always pull the owner column too so we can attribute + de-dupe.
    const selectCols = spec.ownerCol === "auth_user_id"
      ? ensureColumn(opts.columns, "auth_user_id")
      : ensureColumn(opts.columns, "user_id");

    const { data, error } = await supabase
      .from(spec.table)
      .select(selectCols)
      .eq("household_id", ctx.household.id)
      .neq(spec.ownerCol, opts.userId); // partner's rows only
    if (error) {
      log.warn("getPartnerSharedRows failed", {
        userId: opts.userId,
        kind: opts.kind,
        error: error.message,
      });
      return [];
    }
    return ((data ?? []) as unknown as T[]).map((row) => ({
      row,
      ownerUserId: String(row[spec.ownerCol] ?? ""),
      mine: false,
    }));
  } catch (err) {
    log.warn("getPartnerSharedRows threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/** Append a column to a comma-separated select list if it's not already present. */
function ensureColumn(columns: string, col: string): string {
  const parts = columns.split(",").map((c) => c.trim());
  return parts.includes(col) ? columns : `${columns}, ${col}`;
}

// ─── attribution ──────────────────────────────────────────────────────────────

/**
 * A friendly label for the partner in combined views — their display name if we
 * can resolve it, else the email local-part, else the full email. Pure.
 */
export function partnerLabel(opts: {
  displayName?: string | null;
  email?: string | null;
}): string {
  const name = opts.displayName?.trim();
  if (name) return name;
  const email = opts.email?.trim();
  if (!email) return "your partner";
  const local = email.split("@")[0];
  return local || email;
}
