/**
 * Bridge: when an investor Get-Matches to `opportunity_assessment` and the
 * Match Request references a specific listing slug/id, we bump that
 * listing's `match_request_count` so the owner's tracker shows real
 * interest in the opportunity.
 *
 * For now this is a stub used by the API layer when a brief carries a
 * `listing_id` and the listing is `approved`. A follow-up PR will wire it
 * into the Get Matched engine end-to-end (the `opportunity_assessment`
 * intent already accepts a `listing_url_or_name` field — we'll match that
 * back to a listing row when an exact slug match is found).
 */

// eslint-disable-next-line no-restricted-imports -- counter bumps run from Get Matched intent processing where the actor is the investor (not the listing owner). Cross-user update requires service-role; the helper still only mutates `match_request_count` on approved rows.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("listings:link-to-brief");

export interface LinkOutcome {
  ok: boolean;
  noOp: boolean;
  newCount: number | null;
}

/**
 * Increment `match_request_count` for the supplied listing if (and only if)
 * the row exists and is `approved`. Anything else is a no-op so we never
 * mislead an owner whose listing was rejected into seeing inflated demand.
 */
export async function incrementMatchRequestCount(
  listingId: string,
): Promise<LinkOutcome> {
  try {
    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from("listings")
      .select("id, status, match_request_count")
      .eq("id", listingId)
      .maybeSingle();

    if (fetchError) {
      log.warn("incrementMatchRequestCount fetch failed", {
        listingId,
        error: fetchError.message,
      });
      return { ok: false, noOp: false, newCount: null };
    }
    if (!existing) {
      return { ok: false, noOp: true, newCount: null };
    }
    if (existing.status !== "approved") {
      return { ok: true, noOp: true, newCount: null };
    }

    const next = (Number(existing.match_request_count) || 0) + 1;
    const { error: updateError } = await supabase
      .from("listings")
      .update({ match_request_count: next })
      .eq("id", listingId);

    if (updateError) {
      log.warn("incrementMatchRequestCount update failed", {
        listingId,
        error: updateError.message,
      });
      return { ok: false, noOp: false, newCount: null };
    }

    log.info("listing match_request_count incremented", { listingId, next });
    return { ok: true, noOp: false, newCount: next };
  } catch (err) {
    log.warn("incrementMatchRequestCount threw", {
      listingId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, noOp: false, newCount: null };
  }
}
