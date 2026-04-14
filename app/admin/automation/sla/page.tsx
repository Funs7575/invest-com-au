import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import { getLeadSlaOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function SlaDrillDown() {
  const supabase = createAdminClient();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [overview, pausedRes, warnedRes] = await Promise.all([
    getLeadSlaOverview(),
    supabase
      .from("professionals")
      .select("id, name, email, auto_paused_at, auto_pause_reason")
      .eq("status", "paused")
      .eq("auto_pause_reason", "sla_miss")
      .order("auto_paused_at", { ascending: false })
      .limit(50),
    supabase
      .from("professionals")
      .select("id, name, email, pause_warning_sent_at")
      .eq("status", "active")
      .not("pause_warning_sent_at", "is", null)
      .gte("pause_warning_sent_at", fourteenDaysAgo)
      .order("pause_warning_sent_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <DrillDownShell overview={overview}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <header className="px-4 py-3 border-b border-slate-100 bg-red-50">
            <h2 className="text-sm font-bold text-slate-900">Paused for SLA miss</h2>
            <p className="text-xs text-slate-500">{pausedRes.data?.length || 0} advisors currently auto-paused. Auto-unpause on next cron run when unresponded drops below 3.</p>
          </header>
          <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {(pausedRes.data || []).map((a) => (
              <li key={a.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                <p className="text-xs text-slate-500">{a.email}</p>
                <p className="text-[0.65rem] text-slate-400 mt-0.5">
                  Paused {a.auto_paused_at ? new Date(a.auto_paused_at).toLocaleString("en-AU") : "—"}
                </p>
              </li>
            ))}
            {(pausedRes.data?.length || 0) === 0 && (
              <li className="px-4 py-6 text-center text-xs text-slate-500">No advisors currently paused for SLA</li>
            )}
          </ul>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <header className="px-4 py-3 border-b border-slate-100 bg-amber-50">
            <h2 className="text-sm font-bold text-slate-900">Warning in progress</h2>
            <p className="text-xs text-slate-500">Advisors who have received an SLA warning in the last 14 days.</p>
          </header>
          <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {(warnedRes.data || []).map((a) => (
              <li key={a.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                <p className="text-xs text-slate-500">{a.email}</p>
                <p className="text-[0.65rem] text-slate-400 mt-0.5">
                  Warned {a.pause_warning_sent_at ? new Date(a.pause_warning_sent_at).toLocaleString("en-AU") : "—"}
                </p>
              </li>
            ))}
            {(warnedRes.data?.length || 0) === 0 && (
              <li className="px-4 py-6 text-center text-xs text-slate-500">No active warnings</li>
            )}
          </ul>
        </section>
      </div>
    </DrillDownShell>
  );
}
