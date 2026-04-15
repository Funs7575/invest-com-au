import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import { getAfslExpiryOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function AfslExpiryDrillDown() {
  const supabase = createAdminClient();
  const [overview, flaggedRes] = await Promise.all([
    getAfslExpiryOverview(),
    supabase
      .from("professionals")
      .select("id, name, email, afsl_number, auto_pause_reason, auto_paused_at")
      .in("auto_pause_reason", ["afsl_ceased", "afsl_suspended"])
      .order("auto_paused_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-red-50">
          <h2 className="text-sm font-bold text-slate-900">AFSL-flagged advisors</h2>
          <p className="text-xs text-slate-500">
            Set <code className="bg-white px-1 rounded text-[0.65rem]">AFSL_LOOKUP_URL</code> env var to activate the weekly register check.
            Without it the cron is a safe no-op.
          </p>
        </header>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">ID</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Advisor</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">AFSL</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Reason</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Flagged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(flaggedRes.data || []).map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono text-slate-500">#{r.id}</td>
                <td className="px-4 py-2 text-slate-700">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-[0.65rem] text-slate-400">{r.email}</div>
                </td>
                <td className="px-4 py-2 font-mono text-slate-600">{r.afsl_number}</td>
                <td className="px-4 py-2">
                  <span className="inline-block px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-red-100 text-red-800">{r.auto_pause_reason}</span>
                </td>
                <td className="px-4 py-2 text-[0.65rem] text-slate-500">
                  {r.auto_paused_at ? new Date(r.auto_paused_at).toLocaleString("en-AU") : "—"}
                </td>
              </tr>
            ))}
            {(flaggedRes.data?.length || 0) === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No advisors flagged by the AFSL monitor</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </DrillDownShell>
  );
}
