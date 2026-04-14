import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import SignalsPopover from "@/components/admin/automation/SignalsPopover";
import OverrideButton from "@/components/admin/automation/OverrideButton";
import { getLeadDisputeOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function DisputesDrillDown() {
  const supabase = createAdminClient();
  const [overview, recentRes] = await Promise.all([
    getLeadDisputeOverview(),
    supabase
      .from("lead_disputes")
      .select("id, lead_id, professional_id, reason, reason_code, status, auto_resolved_verdict, auto_resolved_confidence, auto_resolved_reasons, refunded_cents, created_at, admin_overridden_at, professionals(name), professional_leads(user_name, user_email)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rows = (recentRes.data as unknown as Array<{
    id: number;
    lead_id: number;
    professional_id: number;
    reason: string;
    reason_code: string | null;
    status: string;
    auto_resolved_verdict: string | null;
    auto_resolved_confidence: string | null;
    auto_resolved_reasons: string[] | null;
    refunded_cents: number | null;
    created_at: string;
    admin_overridden_at: string | null;
    professionals: { name: string } | null;
    professional_leads: { user_name: string; user_email: string } | null;
  }>) || [];

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Recent disputes</h2>
          <p className="text-xs text-slate-500">Last 50 disputes, newest first. Override reverses the auto-verdict + moves any credit both ways.</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">ID</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Advisor</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Lead</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Reason</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Verdict</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Signals</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Refunded</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono text-slate-500">#{r.id}</td>
                  <td className="px-4 py-2 text-slate-700 truncate max-w-[140px]">{r.professionals?.name || "—"}</td>
                  <td className="px-4 py-2 text-slate-500 truncate max-w-[160px]">{r.professional_leads?.user_email || "—"}</td>
                  <td className="px-4 py-2 text-slate-700">{r.reason_code || r.reason?.slice(0, 30)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2">
                    {r.auto_resolved_verdict ? (
                      <span className="text-slate-700">
                        {r.auto_resolved_verdict}{r.auto_resolved_confidence ? ` (${r.auto_resolved_confidence})` : ""}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <SignalsPopover reasons={r.auto_resolved_reasons} />
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {r.refunded_cents ? `A$${((r.refunded_cents) / 100).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {r.admin_overridden_at ? (
                      <span className="text-[0.65rem] text-amber-700">overridden</span>
                    ) : r.status === "approved" ? (
                      <OverrideButton feature="lead_disputes" rowId={r.id} targetVerdict="rejected" label="→ Reject" requireReason />
                    ) : r.status === "rejected" ? (
                      <OverrideButton feature="lead_disputes" rowId={r.id} targetVerdict="approved" label="→ Refund" requireReason />
                    ) : (
                      <span className="text-[0.65rem] text-slate-400">pending</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">No recent disputes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DrillDownShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved" ? "bg-emerald-100 text-emerald-800" :
    status === "rejected" ? "bg-red-100 text-red-800" :
    "bg-slate-100 text-slate-600";
  return <span className={`inline-block px-2 py-0.5 rounded text-[0.65rem] font-semibold ${cls}`}>{status}</span>;
}
