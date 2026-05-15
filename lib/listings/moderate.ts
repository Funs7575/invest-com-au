/**
 * Admin moderation helpers for the owner-driven `listings` table.
 *
 *   - `approveListing(id, adminId)`  → status='approved' + approved_at
 *   - `rejectListing(id, adminId, notes)` → status='rejected' + rejected_at
 *
 * Both are idempotent at the "already in target state" level so the
 * moderation UI can be optimistic without producing duplicate audit
 * timestamps when the admin double-clicks.
 *
 * Service-role only: these run from `/api/admin/listings/owner-flow/*`
 * routes already behind `requireAdmin`.
 */

// eslint-disable-next-line no-restricted-imports -- admin-only moderation: callers are app/api/admin/* routes already behind requireAdmin(). Bypassing RLS lets us stamp lifecycle audit fields without a per-admin JWT round-trip.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { rowToListing, type Listing, type ListingRow } from "./types";

const log = logger("listings:moderate");

export interface ModerationResult {
  ok: true;
  listing: Listing;
  noOp: boolean;
}

export interface ModerationFailure {
  ok: false;
  error: string;
}

export async function approveListing(
  id: string,
  adminId: string,
): Promise<ModerationResult | ModerationFailure> {
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    log.error("approveListing fetch failed", { id, error: fetchError.message });
    return { ok: false, error: fetchError.message };
  }
  if (!existing) {
    return { ok: false, error: "not_found" };
  }

  // Idempotent: already approved → return current row without restamping.
  if (existing.status === "approved") {
    return { ok: true, listing: rowToListing(existing as ListingRow), noOp: true };
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({
      status: "approved",
      approved_at: nowIso,
      rejected_at: null,
      moderation_notes: null,
      updated_at: nowIso,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    log.error("approveListing update failed", {
      id,
      error: updateError?.message,
    });
    return { ok: false, error: updateError?.message || "update_failed" };
  }

  log.info("listing approved", { id, adminId });
  return { ok: true, listing: rowToListing(updated as ListingRow), noOp: false };
}

export async function rejectListing(
  id: string,
  adminId: string,
  notes: string,
): Promise<ModerationResult | ModerationFailure> {
  const trimmedNotes = notes.trim();
  if (!trimmedNotes) {
    return { ok: false, error: "notes_required" };
  }

  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    log.error("rejectListing fetch failed", { id, error: fetchError.message });
    return { ok: false, error: fetchError.message };
  }
  if (!existing) {
    return { ok: false, error: "not_found" };
  }

  // Idempotent: already rejected with the same notes → no-op.
  if (existing.status === "rejected" && existing.moderation_notes === trimmedNotes) {
    return { ok: true, listing: rowToListing(existing as ListingRow), noOp: true };
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({
      status: "rejected",
      rejected_at: nowIso,
      approved_at: null,
      moderation_notes: trimmedNotes,
      updated_at: nowIso,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    log.error("rejectListing update failed", {
      id,
      error: updateError?.message,
    });
    return { ok: false, error: updateError?.message || "update_failed" };
  }

  log.info("listing rejected", { id, adminId });
  return { ok: true, listing: rowToListing(updated as ListingRow), noOp: false };
}

/**
 * Owner-initiated submission flips a draft to `pending_review` so the
 * admin queue picks it up. Lives here (rather than create.ts) because the
 * lifecycle gate is moderation-adjacent.
 */
export async function submitListingForReview(
  id: string,
  ownerUserId: string,
): Promise<ModerationResult | ModerationFailure> {
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    log.error("submitListingForReview fetch failed", {
      id,
      error: fetchError.message,
    });
    return { ok: false, error: fetchError.message };
  }
  if (!existing) {
    return { ok: false, error: "not_found" };
  }
  if (existing.owner_user_id !== ownerUserId) {
    return { ok: false, error: "forbidden" };
  }
  if (existing.status === "pending_review") {
    return { ok: true, listing: rowToListing(existing as ListingRow), noOp: true };
  }
  if (existing.status !== "draft") {
    return { ok: false, error: `cannot_submit_from_${existing.status}` };
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({
      status: "pending_review",
      updated_at: nowIso,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    log.error("submitListingForReview update failed", {
      id,
      error: updateError?.message,
    });
    return { ok: false, error: updateError?.message || "update_failed" };
  }

  log.info("listing submitted for review", { id, ownerUserId });
  return { ok: true, listing: rowToListing(updated as ListingRow), noOp: false };
}
