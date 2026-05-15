import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- Members-only dashboard: we need cross-row joins (team + members + briefs + outcome scores) that anon-RLS can't perform in a single query. Page redirects unauthenticated visitors first; admin client only reads data scoped to the calling member's team.
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import Icon from "@/components/Icon";
import {
  getCohortComparison,
  getResponseLatencyMinutes,
  ratesFromFunnel,
} from "@/lib/squad-analytics";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Squad dashboard — Invest.com.au`,
    description: "Members-only performance + activity for your Pro Squad.",
    alternates: { canonical: `${SITE_URL}/teams/${slug}/dashboard` },
    robots: { index: false, follow: false },
  };
}

interface ScoreboardRow {
  briefs_accepted: number;
  outcomes_submitted: number;
  outcomes_completed: number;
  outcomes_in_progress: number;
  outcomes_switched: number;
  outcomes_abandoned: number;
  avg_rating: number | null;
  completion_rate_pct: number | null;
  updated_at: string;
}

interface MemberContribution {
  professional_id: number;
  name: string;
  briefs_accepted: number;
  outcomes_completed: number;
}

export default async function TeamDashboardPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/account/login?redirect=/teams/${slug}/dashboard`);
  }

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("id, slug, name, team_category, verification_status")
    .eq("slug", slug)
    .maybeSingle();
  if (!team) notFound();

  // Verify the calling user is an active member of this squad.
  const { data: pro } = await admin
    .from("professionals")
    .select("id, name")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();
  if (!pro) {
    redirect("/pros/join");
  }
  const { data: membership } = await admin
    .from("expert_team_members")
    .select("id")
    .eq("team_id", team.id)
    .eq("professional_id", pro.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) notFound();

  // Load: latest scoreboard, all squad members + their contribution
  // counts, briefs in-flight, recent activity.
  const [scoreRes, membersRes, briefsRes] = await Promise.all([
    admin
      .from("provider_outcome_scores")
      .select(
        "briefs_accepted, outcomes_submitted, outcomes_completed, outcomes_in_progress, outcomes_switched, outcomes_abandoned, avg_rating, completion_rate_pct, updated_at",
      )
      .eq("team_id", team.id)
      .order("window_end", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("expert_team_members")
      .select("professional_id, member_role, status")
      .eq("team_id", team.id)
      .eq("status", "active"),
    admin
      .from("advisor_auctions")
      .select(
        "id, slug, job_title, brief_template, tracker_status, accepted_at, status, created_at",
      )
      .eq("accepted_by_team_id", team.id)
      .order("accepted_at", { ascending: false, nullsFirst: false })
      .limit(20),
  ]);

  const scoreboard = (scoreRes.data ?? null) as ScoreboardRow | null;
  const memberRows = (membersRes.data ?? []) as Array<{
    professional_id: number;
    member_role: string;
  }>;
  const briefs = (briefsRes.data ?? []) as Array<{
    id: number;
    slug: string;
    job_title: string;
    brief_template: string | null;
    tracker_status: string | null;
    accepted_at: string | null;
    status: string;
    created_at: string;
  }>;

  // Hydrate member names + per-member contribution counts. We compute
  // contribution from the brief tracker events (which list who claimed
  // what) so the dashboard can show "Sarah handled 4, Tom handled 2".
  const memberIds = memberRows.map((m) => m.professional_id);
  const memberLookup: Record<number, string> = {};
  if (memberIds.length > 0) {
    const { data: pros } = await admin
      .from("professionals")
      .select("id, name")
      .in("id", memberIds);
    for (const p of pros ?? []) {
      memberLookup[p.id as number] = p.name as string;
    }
  }

  // Best-effort per-member contribution: pulls from team_brief_assignments
  // if the new table exists (added by B1). Falls back to zero counts.
  const contributions: MemberContribution[] = await (async () => {
    try {
      const { data, error } = await admin
        .from("team_brief_assignments")
        .select("professional_id, status")
        .eq("team_id", team.id);
      if (error) throw error;
      const tally = new Map<number, { accepted: number; completed: number }>();
      for (const row of data ?? []) {
        const id = row.professional_id as number;
        let t = tally.get(id);
        if (!t) {
          t = { accepted: 0, completed: 0 };
          tally.set(id, t);
        }
        t.accepted++;
        if (row.status === "completed") t.completed++;
      }
      return memberIds.map((id) => ({
        professional_id: id,
        name: memberLookup[id] ?? `Pro #${id}`,
        briefs_accepted: tally.get(id)?.accepted ?? 0,
        outcomes_completed: tally.get(id)?.completed ?? 0,
      }));
    } catch {
      // Table doesn't exist yet (B1 PR hasn't merged) — return zero.
      return memberIds.map((id) => ({
        professional_id: id,
        name: memberLookup[id] ?? `Pro #${id}`,
        briefs_accepted: 0,
        outcomes_completed: 0,
      }));
    }
  })();

  const activeBriefs = briefs.filter((b) => b.status === "open" && b.tracker_status !== "completed");
  const completedBriefs = briefs.filter((b) => b.tracker_status === "completed");

  // Funnel + cohort analytics for the last 30 days vs the prior 30.
  const teamId = team.id as number;
  const [cohort, latencyMinutes] = await Promise.all([
    getCohortComparison(teamId, 30),
    getResponseLatencyMinutes(
      teamId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(),
    ),
  ]);
  const currentRates = ratesFromFunnel(cohort.current);
  const previousRates = ratesFromFunnel(cohort.previous);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Pro Squads", url: absoluteUrl("/advisors#expert-teams") },
    { name: team.name as string, url: absoluteUrl(`/teams/${slug}`) },
    { name: "Dashboard" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <nav className="text-xs text-slate-500">
            <Link href={`/teams/${slug}`} className="hover:text-slate-900">
              ← {team.name}
            </Link>
          </nav>
          <header>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Squad dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Members-only performance + activity. Refreshed daily.
            </p>
          </header>

          {/* KPI strip */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Active briefs" value={String(activeBriefs.length)} />
            <Kpi label="Completed" value={String(completedBriefs.length)} />
            <Kpi
              label="Completion rate"
              value={
                scoreboard?.completion_rate_pct !== null && scoreboard?.completion_rate_pct !== undefined
                  ? `${scoreboard.completion_rate_pct}%`
                  : "—"
              }
              tone={
                scoreboard?.completion_rate_pct === null || scoreboard?.completion_rate_pct === undefined
                  ? "slate"
                  : scoreboard.completion_rate_pct >= 80
                    ? "emerald"
                    : scoreboard.completion_rate_pct >= 60
                      ? "amber"
                      : "rose"
              }
            />
            <Kpi
              label="Avg rating"
              value={scoreboard?.avg_rating !== null && scoreboard?.avg_rating !== undefined ? scoreboard.avg_rating.toFixed(1) : "—"}
            />
          </section>

          {/* Funnel + cohort (last 30 days vs prior 30) */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <header className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">
                30-day funnel
              </h2>
              {latencyMinutes !== null && (
                <p className="text-xs text-slate-500">
                  Avg. response latency:{" "}
                  <strong className="text-slate-900">{latencyMinutes}m</strong>
                </p>
              )}
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <FunnelBar
                label="Briefs visible"
                value={cohort.current.briefs_visible}
                prev={cohort.previous.briefs_visible}
                max={cohort.current.briefs_visible || 1}
              />
              <FunnelBar
                label="Accepted"
                value={cohort.current.briefs_accepted}
                prev={cohort.previous.briefs_accepted}
                max={cohort.current.briefs_visible || 1}
                rate={`${currentRates.accept_rate}%`}
                prevRate={`${previousRates.accept_rate}%`}
              />
              <FunnelBar
                label="Consultations"
                value={cohort.current.consultations_booked}
                prev={cohort.previous.consultations_booked}
                max={cohort.current.briefs_accepted || 1}
                rate={`${currentRates.book_rate}%`}
                prevRate={`${previousRates.book_rate}%`}
              />
              <FunnelBar
                label="Outcomes"
                value={cohort.current.outcomes_completed}
                prev={cohort.previous.outcomes_completed}
                max={cohort.current.consultations_booked || 1}
                rate={`${currentRates.complete_rate}%`}
                prevRate={`${previousRates.complete_rate}%`}
              />
            </div>
          </section>

          {/* Member contributions */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-base font-bold text-slate-900 mb-3">
              Member contributions
            </h2>
            {contributions.length === 0 ? (
              <p className="text-sm text-slate-500">No active members yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {contributions.map((c) => (
                  <li
                    key={c.professional_id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <Link
                        href={`/advisor/${c.professional_id}`}
                        className="text-sm font-semibold text-slate-900 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        <strong className="text-slate-900">
                          {c.briefs_accepted}
                        </strong>{" "}
                        claimed
                      </span>
                      <span>
                        <strong className="text-emerald-700">
                          {c.outcomes_completed}
                        </strong>{" "}
                        completed
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent briefs */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">
                Recent Match Requests
              </h2>
              <Link
                href={`/teams/${slug}/inbox`}
                className="text-xs font-semibold text-amber-700 hover:underline inline-flex items-center gap-1"
              >
                Open inbox <Icon name="arrow-right" size={12} />
              </Link>
            </div>
            {briefs.length === 0 ? (
              <p className="text-sm text-slate-500">
                Your squad hasn&apos;t accepted any Match Requests yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {briefs.slice(0, 10).map((b) => (
                  <li key={b.id} className="py-2.5">
                    <Link
                      href={`/briefs/${b.slug}`}
                      className="block hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {b.job_title}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${
                            b.tracker_status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : b.tracker_status === "in_progress"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {b.tracker_status ?? "new"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {b.brief_template ?? "general"} ·{" "}
                        {b.accepted_at
                          ? new Date(b.accepted_at).toLocaleDateString("en-AU", { dateStyle: "medium" })
                          : "not accepted"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-[10px] text-slate-400 text-center">
            General information only. Outcome scoreboard refreshed daily at 10:30 UTC.
          </p>
        </div>
      </div>
    </>
  );
}

function FunnelBar({
  label,
  value,
  prev,
  max,
  rate,
  prevRate,
}: {
  label: string;
  value: number;
  prev: number;
  max: number;
  rate?: string;
  prevRate?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const delta = value - prev;
  const deltaCls =
    delta > 0
      ? "text-emerald-700"
      : delta < 0
        ? "text-rose-700"
        : "text-slate-500";
  return (
    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
        {label}
      </p>
      <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{value}</p>
      {rate && (
        <p className="text-xs text-slate-500 mt-1">
          {rate}{" "}
          {prevRate && (
            <span className="text-[10px] opacity-70">(prev {prevRate})</span>
          )}
        </p>
      )}
      <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
        <div
          className="h-full bg-amber-500"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <p className={`text-[11px] font-semibold mt-1 ${deltaCls}`}>
        {delta > 0 ? "+" : ""}
        {delta} vs previous
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber" | "rose";
}) {
  const toneClasses = {
    slate: "bg-white border-slate-200 text-slate-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    rose: "bg-rose-50 border-rose-200 text-rose-900",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneClasses}`}>
      <p className="text-[10px] uppercase tracking-widest mb-1 opacity-80">
        {label}
      </p>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
}
