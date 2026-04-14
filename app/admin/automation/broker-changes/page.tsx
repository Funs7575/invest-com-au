import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import { getBrokerChangesOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function BrokerChangesDrillDown() {
  const supabase = createAdminClient();
  const [overview, recentRes] = await Promise.all([
    getBrokerChangesOverview(),
    supabase
      .from("broker_data_changes")
      .select("id, broker_slug, change_type, field, old_value, new_value, auto_applied_at, auto_applied_tier, applied_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const rows = recentRes.data || [];

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Recent broker data changes</h2>
          <p className="text-xs text-slate-500">Classified by risk tier — cosmetic edits auto-apply, money/compliance fields require admin approval.</p>
        </header>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">ID</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Broker</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Field</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Old → New</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Tier</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono text-slate-500">#{r.id}</td>
                <td className="px-4 py-2 text-slate-700 font-semibold">{r.broker_slug}</td>
                <td className="px-4 py-2 text-slate-600">{r.field}</td>
                <td className="px-4 py-2 text-[0.65rem] text-slate-500 max-w-[200px]">
                  <div className="truncate" title={String(r.old_value)}>
                    <span className="text-slate-400">from:</span> {String(r.old_value)?.slice(0, 40)}
                  </div>
                  <div className="truncate" title={String(r.new_value)}>
                    <span className="text-emerald-600">to:</span> {String(r.new_value)?.slice(0, 40)}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {r.auto_applied_tier ? (
                    <span className={`inline-block px-2 py-0.5 rounded text-[0.65rem] font-semibold ${r.auto_applied_tier === "auto_apply" ? "bg-emerald-100 text-emerald-800" : r.auto_applied_tier === "auto_apply_reviewable" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                      {r.auto_applied_tier}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2 text-[0.65rem] text-slate-500">
                  {r.auto_applied_at ? "Auto-applied" : r.applied_at ? "Applied by admin" : "Pending"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No recent changes</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </DrillDownShell>
  );
}
