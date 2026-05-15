/**
 * Read-side helpers for the owner-driven `listings` table.
 *
 * All helpers run through service-role so anonymous detail pages and
 * authenticated owner trackers share the same lookup primitives. RLS
 * gates which rows the *frontend* shows — the read helpers just return
 * what they find. Callers apply visibility (e.g. don't render `draft`
 * to anon users).
 */

// eslint-disable-next-line no-restricted-imports -- public detail pages serve anonymous traffic (no JWT) and admin moderation queue needs cross-user reads. Anon SELECT on listings is gated to status='approved' by RLS; callers apply visibility filters explicitly for owner/admin paths.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  rowToListing,
  type Listing,
  type ListingKind,
  type ListingRow,
} from "./types";

const log = logger("listings:lookup");

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    log.warn("getListingBySlug failed", { slug, error: error.message });
    return null;
  }
  return data ? rowToListing(data as ListingRow) : null;
}

export async function getListingById(id: string): Promise<Listing | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    log.warn("getListingById failed", { id, error: error.message });
    return null;
  }
  return data ? rowToListing(data as ListingRow) : null;
}

export interface ListApprovedFilters {
  kind?: ListingKind;
  state?: string;
  limit?: number;
}

export async function listApprovedListings(
  filters: ListApprovedFilters = {},
): Promise<Listing[]> {
  const supabase = createAdminClient();
  const limit = Math.min(Math.max(1, filters.limit ?? 50), 200);

  let query = supabase
    .from("listings")
    .select("*")
    .eq("status", "approved")
    .order("approved_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.state) query = query.eq("location_state", filters.state);

  const { data, error } = await query;
  if (error) {
    log.warn("listApprovedListings failed", { error: error.message });
    return [];
  }
  return (data ?? []).map((row) => rowToListing(row as ListingRow));
}

export async function listListingsForOwner(
  ownerUserId: string,
): Promise<Listing[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });
  if (error) {
    log.warn("listListingsForOwner failed", {
      ownerUserId,
      error: error.message,
    });
    return [];
  }
  return (data ?? []).map((row) => rowToListing(row as ListingRow));
}

export async function listPendingReviewListings(): Promise<Listing[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });
  if (error) {
    log.warn("listPendingReviewListings failed", { error: error.message });
    return [];
  }
  return (data ?? []).map((row) => rowToListing(row as ListingRow));
}

/**
 * Best-effort fire-and-forget view counter. Failures swallowed because a
 * missed +1 never warrants a 5xx to the public detail page.
 */
export async function incrementListingViewCount(id: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: current } = await supabase
      .from("listings")
      .select("view_count")
      .eq("id", id)
      .maybeSingle();
    if (!current) return;
    const next = (Number(current.view_count) || 0) + 1;
    await supabase.from("listings").update({ view_count: next }).eq("id", id);
  } catch (err) {
    log.warn("incrementListingViewCount threw", {
      id,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
