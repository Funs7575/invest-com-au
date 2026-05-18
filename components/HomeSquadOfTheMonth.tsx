import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";

interface SquadSpotlight {
  slug: string;
  name: string;
  team_category: string;
  description: string;
  location_state: string | null;
  member_count: number;
  completion_rate_pct: number | null;
  outcomes_submitted: number;
  testimonial: string | null;
  testimonial_rating: number | null;
}

/**
 * Server component — Pro Squad of the Month spotlight.
 *
 * Picks the verified Pro Squad with the highest
 * `completion_rate_pct * outcomes_submitted` over the most recent
 * provider_outcome_scores window. Falls back to the most-recently-
 * verified team when no outcome data has accumulated yet.
 *
 * Renders null when there are no verified teams at all (don't show an
 * empty spotlight slot).
 */
export default async function HomeSquadOfTheMonth() {
  try {
    const admin = await createClient();

    // 1. Fetch outcome scores for ranking. Newest window per team.
    const { data: scoresRaw } = await admin
      .from("provider_outcome_scores")
      .select(
        "team_id, completion_rate_pct, outcomes_submitted, window_end",
      )
      .not("team_id", "is", null)
      .order("window_end", { ascending: false })
      .limit(50);
    const scores = (scoresRaw ?? []) as {
      team_id: number;
      completion_rate_pct: number | null;
      outcomes_submitted: number;
      window_end: string;
    }[];

    // Take the most recent window per team.
    const latestByTeam = new Map<number, (typeof scores)[number]>();
    for (const s of scores) {
      if (!latestByTeam.has(s.team_id)) latestByTeam.set(s.team_id, s);
    }

    // 2. Verified, public teams.
    const { data: teamsRaw } = await admin
      .from("expert_teams")
      .select(
        "id, slug, name, team_category, description, location_state, verified_at",
      )
      .eq("public", true)
      .eq("verification_status", "verified")
      .order("verified_at", { ascending: false })
      .limit(25);
    const teams = (teamsRaw ?? []) as {
      id: number;
      slug: string;
      name: string;
      team_category: string;
      description: string;
      location_state: string | null;
      verified_at: string | null;
    }[];

    if (teams.length === 0) return null;

    // 3. Score each verified team. Outcome-weighted teams win;
    // newly-verified teams that haven't accumulated outcomes yet get
    // a small recency bonus so they can still spotlight.
    const ranked = teams
      .map((t) => {
        const s = latestByTeam.get(t.id);
        const outcomeScore = s
          ? (s.completion_rate_pct ?? 0) * (s.outcomes_submitted ?? 0)
          : 0;
        const recencyBonus = t.verified_at
          ? Math.max(0, 30 - daysSince(t.verified_at)) * 0.5
          : 0;
        return {
          team: t,
          score: outcomeScore + recencyBonus,
          outcome: s,
        };
      })
      .sort((a, b) => b.score - a.score);
    const winner = ranked[0];
    if (!winner) return null;

    // 4. Active member count.
    const { count: memberCount } = await admin
      .from("expert_team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", winner.team.id)
      .eq("status", "active")
      .eq("can_appear_publicly", true);

    // 5. One featured testimonial (highest rating, opt-in).
    const { data: testimonialsRaw } = await admin
      .from("brief_outcomes")
      .select("testimonial, rating")
      .eq("team_id", winner.team.id)
      .eq("show_testimonial", true)
      .not("testimonial", "is", null)
      .order("rating", { ascending: false })
      .order("submitted_at", { ascending: false })
      .limit(1);
    const testimonial = (testimonialsRaw ?? [])[0] as
      | { testimonial: string; rating: number | null }
      | undefined;

    const spotlight: SquadSpotlight = {
      slug: winner.team.slug,
      name: winner.team.name,
      team_category: winner.team.team_category,
      description: winner.team.description,
      location_state: winner.team.location_state,
      member_count: memberCount ?? 0,
      completion_rate_pct: winner.outcome?.completion_rate_pct ?? null,
      outcomes_submitted: winner.outcome?.outcomes_submitted ?? 0,
      testimonial: testimonial?.testimonial ?? null,
      testimonial_rating: testimonial?.rating ?? null,
    };

    return <SpotlightCard data={spotlight} />;
  } catch {
    // Fail-soft: a broken homepage section is worse than a missing one.
    return null;
  }
}

function SpotlightCard({ data }: { data: SquadSpotlight }) {
  return (
    <section className="bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <p className="text-amber-300 text-[11px] font-bold uppercase tracking-widest mb-3">
          Pro Squad of the month
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
              {data.name}
            </h2>
            <p className="text-violet-200 text-xs uppercase tracking-wide mb-4">
              {data.team_category.replace(/_/g, " ")}
              {data.location_state ? ` · ${data.location_state}` : ""}
              {data.member_count > 0
                ? ` · ${data.member_count} verified members`
                : ""}
            </p>
            <p className="text-violet-50 leading-relaxed mb-5 max-w-2xl">
              {data.description}
            </p>
            {data.testimonial && (
              <figure className="border-l-4 border-amber-400 pl-4 py-1 mb-5 max-w-xl">
                {data.testimonial_rating && (
                  <div className="text-amber-300 text-xs mb-1" aria-hidden>
                    {"★".repeat(data.testimonial_rating)}
                    {"☆".repeat(5 - data.testimonial_rating)}
                  </div>
                )}
                <blockquote className="text-violet-50 italic text-sm leading-relaxed">
                  &ldquo;{data.testimonial}&rdquo;
                </blockquote>
                <figcaption className="text-violet-300 text-[11px] mt-2">
                  — Verified consumer review
                </figcaption>
              </figure>
            )}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/teams/${data.slug}`}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-3 rounded-xl"
              >
                View this squad →
              </Link>
              <Link
                href={`/briefs/new?team=${data.slug}`}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-5 py-3 rounded-xl"
              >
                Send them a brief
              </Link>
            </div>
          </div>
          <div className="lg:border-l lg:border-white/10 lg:pl-8">
            <ul className="space-y-3 text-sm">
              {data.completion_rate_pct !== null &&
                data.outcomes_submitted > 0 && (
                  <li className="flex items-start gap-2">
                    <Icon
                      name="check-circle"
                      size={16}
                      className="text-emerald-300 mt-0.5 shrink-0"
                    />
                    <span>
                      <span className="font-bold text-white">
                        {data.completion_rate_pct}% completion
                      </span>{" "}
                      from {data.outcomes_submitted} reviewed engagements
                    </span>
                  </li>
                )}
              <li className="flex items-start gap-2">
                <Icon
                  name="shield-check"
                  size={16}
                  className="text-emerald-300 mt-0.5 shrink-0"
                />
                <span>Verified Pro Squad — every member KYC-checked</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  name="users"
                  size={16}
                  className="text-emerald-300 mt-0.5 shrink-0"
                />
                <span>
                  Coordinated handoff between members so nothing falls between
                  the cracks
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  name="lock"
                  size={16}
                  className="text-emerald-300 mt-0.5 shrink-0"
                />
                <span>
                  Your contact details stay private until you accept a quote
                </span>
              </li>
            </ul>
            <p className="text-[11px] text-violet-300 mt-5">
              Spotlight rotates monthly — winners ranked by completion rate ×
              verified engagements over the past 30 days.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
