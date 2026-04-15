import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import { getMarketplaceCampaignOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function CampaignsDrillDown() {
  const supabase = createAdminClient();
  const [overview, recentRes] = await Promise.all([
    getMarketplaceCampaignOverview(),
    supabase
      .from("campaigns")
      .select("id, broker_slug, inventory_type, status, budget_cents, start_date, end_date, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const rows = recentRes.data || [];

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Recent campaigns</h2>
          <p className="text-xs text-slate-500">Submitted by brokers. Status reflects the classifier verdict for auto-decided rows.</p>
        </header>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">ID</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Broker</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Type</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Budget</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Dates</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono text-slate-500">#{r.id}</td>
                <td className="px-4 py-2 text-slate-700 font-semibold">{r.broker_slug}</td>
                <td className="px-4 py-2 text-slate-600">{r.inventory_type}</td>
                <td className="px-4 py-2 font-semibold text-slate-700">A${((r.budget_cents || 0) / 100).toFixed(0)}</td>
                <td className="px-4 py-2 text-[0.65rem] text-slate-500">
                  {r.start_date} → {r.end_date}
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[0.65rem] font-semibold ${r.status === "active" ? "bg-emerald-100 text-emerald-800" : r.status === "rejected" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No recent campaigns</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </DrillDownShell>
  );
}
