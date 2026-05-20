/**
 * Wholesale s708 listings marketplace (Idea #5).
 *
 * Listing reads (public teaser vs gated full detail) + lead submission
 * gated on a sophisticated-investor (s708) certification. The cert check
 * is the compliance boundary: full detail + lead capture are only served
 * after isS708Certified() passes.
 *
 * Builds on the wholesale_operator account kind. Audited via #11.
 */

// eslint-disable-next-line no-restricted-imports -- cross-user / service-role-managed reads with no per-user JWT path (see CLAUDE.md § "Two Supabase clients").
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";

const log = logger("wholesale-listings");

/** Public teaser fields — safe to show anyone on a published listing. */
const TEASER_COLUMNS = "id, slug, title, teaser, asset_class, s708_gated, status, published_at";
/** Full detail — only after a s708 cert check. */
const FULL_COLUMNS = `${TEASER_COLUMNS}, operator_id, min_investment_cents, target_irr_bps`;

export interface WholesaleListingTeaser {
  id: number;
  slug: string;
  title: string;
  teaser: string | null;
  assetClass: string | null;
  s708Gated: boolean;
}

/**
 * List published listings (teaser only). Safe for the public marketplace
 * index — no gated financial detail.
 */
export async function listPublishedTeasers(): Promise<WholesaleListingTeaser[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("wholesale_listings")
      .select(TEASER_COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) {
      log.warn("listPublishedTeasers failed", { error: error.message });
      return [];
    }
    return (data ?? []).map((r) => ({
      id: r.id as number,
      slug: r.slug as string,
      title: r.title as string,
      teaser: (r.teaser as string | null) ?? null,
      assetClass: (r.asset_class as string | null) ?? null,
      s708Gated: r.s708_gated === true,
    }));
  } catch (err) {
    log.warn("listPublishedTeasers threw", { err: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/**
 * Whether an auth user is s708-certified (sophisticated/wholesale).
 * Reads the investor_profiles HNW flag as the v1 signal; a dedicated
 * s708 certificate table can supersede this later. Conservative: returns
 * false on any ambiguity.
 */
export async function isS708Certified(authUserId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("investor_profiles")
      .select("is_hnw, meta")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (!data) return false;
    if (data.is_hnw === true) return true;
    const meta = (data.meta as Record<string, unknown> | null) ?? {};
    return meta.s708_certified === true;
  } catch {
    return false;
  }
}

/**
 * Fetch full listing detail — ONLY if the requester is s708-certified.
 * Returns { gated: true } when the cert check fails, so the caller can
 * render the upgrade/verify prompt instead of the detail.
 */
export async function getListingDetail(opts: {
  slug: string;
  authUserId: string | null;
}): Promise<{ gated: true } | { gated: false; listing: Record<string, unknown> }> {
  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("wholesale_listings")
    .select(FULL_COLUMNS)
    .eq("slug", opts.slug)
    .eq("status", "published")
    .maybeSingle();
  if (!listing) return { gated: true };

  if (listing.s708_gated) {
    if (!opts.authUserId || !(await isS708Certified(opts.authUserId))) {
      return { gated: true };
    }
  }
  return { gated: false, listing: listing as Record<string, unknown> };
}

/**
 * Submit a lead on a listing. Enforces the s708 cert check and stamps
 * s708_verified_at. Returns false if the requester isn't certified.
 */
export async function submitWholesaleLead(opts: {
  listingId: number;
  authUserId: string;
  investorEmail: string;
  investorPrincipalId?: string | null;
  message?: string | null;
}): Promise<boolean> {
  if (!(await isS708Certified(opts.authUserId))) {
    log.warn("submitWholesaleLead: requester not s708-certified", { listingId: opts.listingId });
    return false;
  }
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("wholesale_listing_leads").insert({
      listing_id: opts.listingId,
      investor_principal_id: opts.investorPrincipalId ?? null,
      investor_email: opts.investorEmail,
      s708_verified_at: new Date().toISOString(),
      message: opts.message ?? null,
    });
    if (error) {
      log.warn("submitWholesaleLead insert failed", { listingId: opts.listingId, error: error.message });
      return false;
    }
    void recordAudit({
      actorPrincipalId: opts.investorPrincipalId ?? null,
      actorKind: "human",
      action: "wholesale.lead_submitted",
      resourceType: "wholesale_listing",
      resourceId: opts.listingId,
      summary: "s708-verified wholesale lead",
    });
    return true;
  } catch (err) {
    log.warn("submitWholesaleLead threw", {
      listingId: opts.listingId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
