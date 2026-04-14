import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import { getDunningOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function DunningDrillDown() {
  const supabase = createAdminClient();
  const [overview, failedRes] = await Promise.all([
    getDunningOverview(),
    supabase
      .from("advisor_credit_topups")
      .select("id, professional_id, amount_cents, status, dunning_step, dunning_last_attempt_at, created_at, professionals(name, email)")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rows = (failedRes.data as unknown as Array<{
    id: number;
    professional_id: number;
    amount_cents: number;
    status: string;
    dunning_step: number | null;
    dunning_last_attempt_at: string | null;
    created_at: string;
    professionals: { name: string; email: string } | null;
  }>) || [];

  const stepLabels = ["Pending", "Day 1 retry", "Day 3 retry", "Day 7 final"];

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-red-50">
          <h2 className="text-sm font-bold text-slate-900">Failed top-ups</h2>
          <p className="text-xs text-slate-500">Each row represents a failed Stripe charge currently in the dunning sequence.</p>
        </header>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">ID</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Advisor</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Amount</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Dunning step</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Last attempt</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono text-slate-500">#{r.id}</td>
                <td className="px-4 py-2 text-slate-700">
                  {r.professionals?.name}
                  <div className="text-[0.65rem] text-slate-400">{r.professionals?.email}</div>
                </td>
                <td className="px-4 py-2 font-semibold text-slate-700">A${(r.amount_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[0.65rem] font-semibold ${(r.dunning_step || 0) >= 3 ? "bg-red-100 text-red-800" : (r.dunning_step || 0) >= 1 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                    {stepLabels[r.dunning_step || 0]}
                  </span>
                </td>
                <td className="px-4 py-2 text-[0.65rem] text-slate-500">
                  {r.dunning_last_attempt_at ? new Date(r.dunning_last_attempt_at).toLocaleString("en-AU") : "—"}
                </td>
                <td className="px-4 py-2 text-[0.65rem] text-slate-500">
                  {new Date(r.created_at).toLocaleString("en-AU")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No failed top-ups currently</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </DrillDownShell>
  );
}
