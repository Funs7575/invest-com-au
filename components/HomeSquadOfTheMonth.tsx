import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";

interface SquadMember {
  name: string;
  photo_url: string | null;
}

interface SquadSpotlight {
  slug: string;
  name: string;
  team_category: string;
  location_state: string | null;
  member_count: number;
  members: SquadMember[];
  completion_rate_pct: number | null;
  outcomes_submitted: number;
}

/**
 * Server component — Pro Squad of the Month spotlight strip.
 *
 * Picks the verified Pro Squad with the highest
 * `completion_rate_pct * outcomes_submitted` over the most recent
 * provider_outcome_scores window. Falls back to the most-recently-
 * verified team when no outcome data has accumulated yet.
 *
 * Renders as a single compact row docked under the experts grid —
 * the full pitch (testimonial, KYC bullets, brief CTA) lives on
 * /teams/[slug]. Renders null when there are no verified teams.
 */
export default async function HomeSquadOfTheMonth() {
  try {
    const supabase = await createClient();

    // 1. Fetch outcome scores for ranking. Newest window per team.
    const { data: scoresRaw } = await supabase
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
    const { data: teamsRaw } = await supabase
      .from("expert_teams")
      .select("id, slug, name, team_category, location_state, verified_at")
      .eq("public", true)
      .eq("verification_status", "verified")
      .order("verified_at", { ascending: false })
      .limit(25);
    const teams = (teamsRaw ?? []) as {
      id: number;
      slug: string;
      name: string;
      team_category: string;
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

    // 4. Public active members — avatars for the stack + total count.
    const { data: memberRows, count: memberCount } = await supabase
      .from("expert_team_members")
      .select("professional_id", { count: "exact" })
      .eq("team_id", winner.team.id)
      .eq("status", "active")
      .eq("can_appear_publicly", true)
      .limit(3);
    const memberIds = (memberRows ?? [])
      .map((r) => (r as { professional_id: number }).professional_id)
      .filter((id) => id != null);

    let members: SquadMember[] = [];
    if (memberIds.length > 0) {
      const { data: pros } = await supabase
        .from("professionals")
        .select("id, name, photo_url")
        .in("id", memberIds);
      members = ((pros ?? []) as { name: string; photo_url: string | null }[]).map(
        (p) => ({ name: p.name, photo_url: p.photo_url }),
      );
    }

    const spotlight: SquadSpotlight = {
      slug: winner.team.slug,
      name: winner.team.name,
      team_category: winner.team.team_category,
      location_state: winner.team.location_state,
      member_count: memberCount ?? members.length,
      members,
      completion_rate_pct: winner.outcome?.completion_rate_pct ?? null,
      outcomes_submitted: winner.outcome?.outcomes_submitted ?? 0,
    };

    return <SpotlightStrip data={spotlight} />;
  } catch {
    // Fail-soft: a broken homepage section is worse than a missing one.
    return null;
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SpotlightStrip({ data }: { data: SquadSpotlight }) {
  const meta = [
    data.team_category.replace(/_/g, " "),
    data.location_state,
    data.member_count > 0 ? `${data.member_count} verified members · KYC-checked` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section style={{ padding: "0 36px 12px" }}>
      <div
        className="home-squad-strip border border-violet-200"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          padding: "12px 16px",
          borderRadius: 14,
          borderLeft: "3px solid #7c3aed",
          background: "linear-gradient(90deg, #f5f3ff 0%, white 45%)",
        }}
      >
        {data.members.length > 0 && (
          <div style={{ display: "flex", flexShrink: 0 }} aria-hidden>
            {data.members.map((m, i) => (
              <span
                key={`${m.name}-${i}`}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 99,
                  overflow: "hidden",
                  border: "2px solid white",
                  marginLeft: i === 0 ? 0 : -8,
                  background: "var(--color-ink-700)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 11,
                  position: "relative",
                }}
              >
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 34px avatar; next/image fill needs a sized parent and adds no value at this size
                  <img
                    src={m.photo_url}
                    alt=""
                    width={34}
                    height={34}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  />
                ) : (
                  initials(m.name)
                )}
              </span>
            ))}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 220 }}>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              color: "#7c3aed",
            }}
          >
            Pro Squad of the month
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--color-ink-900)" }}>
              {data.name}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--color-ink-500)", textTransform: "capitalize" }}>
              {meta}
            </span>
          </div>
        </div>

        {data.completion_rate_pct !== null && data.outcomes_submitted > 0 && (
          <span
            className="bg-emerald-50 border border-emerald-100"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              fontWeight: 700,
              color: "#047857",
              padding: "5px 10px",
              borderRadius: 99,
              flexShrink: 0,
            }}
          >
            <Icon name="check-circle" size={12} />
            {data.completion_rate_pct}% completion · {data.outcomes_submitted} engagements
          </span>
        )}

        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          <Link
            href={`/briefs/new?team=${data.slug}`}
            className="iv2-cta-ghost"
            style={{ fontSize: 11.5, padding: "7px 12px" }}
          >
            Send a brief
          </Link>
          <Link
            href={`/teams/${data.slug}`}
            className="iv2-cta"
            style={{ fontSize: 11.5, padding: "7px 14px" }}
          >
            View squad →
          </Link>
        </div>

        <p
          style={{
            flexBasis: "100%",
            fontSize: 10,
            color: "var(--color-ink-400)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Spotlight rotates monthly — ranked by completion rate × verified engagements over the
          past 30 days. Introductions only.
        </p>
      </div>
    </section>
  );
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
