/**
 * Provider profile display helpers — surfaces N4 outcome-flywheel data
 * (testimonials + completion score) on advisor + expert-team profile
 * pages.
 *
 * Pure-ish: reads from `brief_outcomes` and `provider_outcome_scores`
 * via the service-role admin client (RLS allows public reads but
 * service-role keeps the path simple). Falls back to empty results on
 * any DB failure so the profile page still renders.
 */

// eslint-disable-next-line no-restricted-imports -- public-read provider profile data; service-role keeps the path consistent with the rest of lib/outcomes.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("outcomes:profile");

export interface PublicTestimonial {
  id: number;
  rating: number | null;
  testimonial: string;
  submitted_at: string;
}

export interface ProviderOutcomeBadge {
  completion_rate_pct: number | null;
  outcomes_submitted: number;
  avg_rating: number | null;
}

/**
 * Pull the most recent N opt-in testimonials for a provider. Caller
 * passes either professional_id or team_id; the other is left null.
 * Returns at most `limit` rows ordered by submitted_at desc.
 */
export async function getPublicTestimonials(opts: {
  professionalId?: number | null;
  teamId?: number | null;
  limit?: number;
}): Promise<PublicTestimonial[]> {
  try {
    const admin = createAdminClient();
    let q = admin
      .from("brief_outcomes")
      .select("id, rating, testimonial, submitted_at")
      .eq("show_testimonial", true)
      .not("submitted_at", "is", null)
      .not("testimonial", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(opts.limit ?? 5);

    if (opts.professionalId) {
      q = q.eq("professional_id", opts.professionalId);
    } else if (opts.teamId) {
      q = q.eq("team_id", opts.teamId);
    } else {
      return [];
    }

    const { data, error } = await q;
    if (error) throw error;

    return (data ?? [])
      .filter((r) => typeof r.testimonial === "string" && r.testimonial.length > 0)
      .map((r) => ({
        id: r.id as number,
        rating: r.rating as number | null,
        testimonial: r.testimonial as string,
        submitted_at: r.submitted_at as string,
      }));
  } catch (err) {
    log.warn("getPublicTestimonials failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Load the latest provider scoreboard row for the badge. Returns null
 * when no scoreboard row exists yet (e.g. provider hasn't accepted
 * enough briefs to be scored).
 */
export async function getProviderOutcomeBadge(opts: {
  professionalId?: number | null;
  teamId?: number | null;
}): Promise<ProviderOutcomeBadge | null> {
  try {
    const admin = createAdminClient();
    let q = admin
      .from("provider_outcome_scores")
      .select("completion_rate_pct, outcomes_submitted, avg_rating")
      .order("window_end", { ascending: false })
      .limit(1);
    if (opts.professionalId) {
      q = q.eq("professional_id", opts.professionalId);
    } else if (opts.teamId) {
      q = q.eq("team_id", opts.teamId);
    } else {
      return null;
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    // Don't display until at least 3 outcomes are submitted — single-
    // outcome scores are noisy and easy to game.
    if ((data.outcomes_submitted ?? 0) < 3) return null;
    return {
      completion_rate_pct: data.completion_rate_pct as number | null,
      outcomes_submitted: data.outcomes_submitted as number,
      avg_rating: data.avg_rating as number | null,
    };
  } catch (err) {
    log.warn("getProviderOutcomeBadge failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Pretty label for the badge tone. */
export function badgeToneFor(pct: number | null): "emerald" | "amber" | "slate" {
  if (pct === null || pct === undefined) return "slate";
  if (pct >= 80) return "emerald";
  if (pct >= 60) return "amber";
  return "slate";
}
