import { redirect } from "next/navigation";
import Link from "next/link";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "@/components/AdminShell";

export const dynamic = "force-dynamic";

interface ScoreRow {
  professional_id: number | null;
  team_id: number | null;
  briefs_accepted: number;
  outcomes_submitted: number;
  outcomes_completed: number;
  outcomes_in_progress: number;
  outcomes_switched: number;
  outcomes_abandoned: number;
  avg_rating: number | null;
  completion_rate_pct: number | null;
  updated_at: string;
  professional_name?: string;
  team_name?: string;
}

export default async function AdminOutcomesPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/account/login");

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("provider_outcome_scores")
    .select("*")
    .order("completion_rate_pct", { ascending: false, nullsFirst: false })
    .order("outcomes_submitted", { ascending: false })
    .limit(100);

  const proIds = (rows ?? [])
    .filter((r) => r.professional_id)
    .map((r) => r.professional_id as number);
  const teamIds = (rows ?? [])
    .filter((r) => r.team_id)
    .map((r) => r.team_id as number);

  const [proLookup, teamLookup] = await Promise.all([
    proIds.length > 0
      ? admin.from("professionals").select("id, name").in("id", proIds)
      : Promise.resolve({ data: [] as Array<{ id: number; name: string }> }),
    teamIds.length > 0
      ? admin.from("expert_teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [] as Array<{ id: number; name: string }> }),
  ]);

  const proName = new Map(
    (proLookup.data ?? []).map((p) => [p.id as number, p.name as string]),
  );
  const teamName = new Map(
    (teamLookup.data ?? []).map((t) => [t.id as number, t.name as string]),
  );

  const enriched: ScoreRow[] = (rows ?? []).map((r) => ({
    ...(r as ScoreRow),
    professional_name: r.professional_id
      ? proName.get(r.professional_id as number)
      : undefined,
    team_name: r.team_id ? teamName.get(r.team_id as number) : undefined,
  }));

  // Aggregate top-level KPIs
  const totalAccepted = enriched.reduce((sum, r) => sum + r.briefs_accepted, 0);
  const totalSubmitted = enriched.reduce((sum, r) => sum + r.outcomes_submitted, 0);
  const totalCompleted = enriched.reduce((sum, r) => sum + r.outcomes_completed, 0);
  const aggregateCompletion =
    totalSubmitted > 0 ? Math.round((totalCompleted / totalSubmitted) * 100) : null;
  const submissionRate =
    totalAccepted > 0 ? Math.round((totalSubmitted / totalAccepted) * 100) : null;

  return (
    <AdminShell
      title="Outcome scoreboard"
      subtitle="Provider scoreboards from consumer post-engagement reviews. Refreshed daily."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Briefs accepted (12m)" value={totalAccepted.toString()} />
        <Kpi label="Outcomes submitted" value={totalSubmitted.toString()} />
        <Kpi
          label="Submission rate"
          value={submissionRate !== null ? `${submissionRate}%` : "—"}
        />
        <Kpi
          label="Aggregate completion"
          value={aggregateCompletion !== null ? `${aggregateCompletion}%` : "—"}
          tone={
            aggregateCompletion === null
              ? "slate"
              : aggregateCompletion >= 70
                ? "emerald"
                : aggregateCompletion >= 50
                  ? "amber"
                  : "rose"
          }
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="text-left p-3">Provider</th>
              <th className="text-left p-3">Type</th>
              <th className="text-right p-3">Accepted</th>
              <th className="text-right p-3">Submitted</th>
              <th className="text-right p-3">Completed</th>
              <th className="text-right p-3">In-progress</th>
              <th className="text-right p-3">Switched</th>
              <th className="text-right p-3">Abandoned</th>
              <th className="text-right p-3">Rating</th>
              <th className="text-right p-3">Completion %</th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            {enriched.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-500">
                  No outcomes submitted yet. The cron creates review requests
                  ~28 days after brief acceptance.
                </td>
              </tr>
            )}
            {enriched.map((r) => (
              <tr key={`${r.professional_id ?? "t"}-${r.team_id ?? "p"}`} className="border-t border-slate-100">
                <td className="p-3 font-semibold">
                  {r.professional_id ? (
                    <Link href={`/advisors/${r.professional_id}`} className="hover:underline">
                      {r.professional_name ?? `Pro #${r.professional_id}`}
                    </Link>
                  ) : (
                    <Link href={`/teams/${r.team_id}`} className="hover:underline">
                      {r.team_name ?? `Team #${r.team_id}`}
                    </Link>
                  )}
                </td>
                <td className="p-3 text-xs text-slate-500">
                  {r.team_id ? "Pro Squad" : "Individual / Firm"}
                </td>
                <td className="p-3 text-right">{r.briefs_accepted}</td>
                <td className="p-3 text-right">{r.outcomes_submitted}</td>
                <td className="p-3 text-right text-emerald-700">{r.outcomes_completed}</td>
                <td className="p-3 text-right text-amber-700">{r.outcomes_in_progress}</td>
                <td className="p-3 text-right text-slate-500">{r.outcomes_switched}</td>
                <td className="p-3 text-right text-rose-700">{r.outcomes_abandoned}</td>
                <td className="p-3 text-right">
                  {r.avg_rating !== null ? r.avg_rating.toFixed(1) : "—"}
                </td>
                <td className="p-3 text-right font-bold">
                  {r.completion_rate_pct !== null ? `${r.completion_rate_pct}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 mt-3">
        Submissions older than 12 months are excluded from this window. The
        daily cron at 10:30 UTC refreshes this view.
      </p>
    </AdminShell>
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
    slate: "bg-slate-50 border-slate-200 text-slate-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    rose: "bg-rose-50 border-rose-200 text-rose-900",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneClasses}`}>
      <p className="text-[10px] uppercase tracking-widest mb-1 opacity-80">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
}
