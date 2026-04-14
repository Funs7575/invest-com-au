import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import OverrideButton from "@/components/admin/automation/OverrideButton";
import { getAdvisorApplicationOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function ApplicationsDrillDown() {
  const supabase = createAdminClient();
  const [overview, recentRes] = await Promise.all([
    getAdvisorApplicationOverview(),
    supabase
      .from("advisor_applications")
      .select("id, name, firm_name, email, type, afsl_number, abn, status, rejection_reason, reviewed_by, admin_notes, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const rows = recentRes.data || [];

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Recent applications</h2>
          <p className="text-xs text-slate-500">Most recent 50 applications. Set <code>AFSL_LOOKUP_URL</code> + <code>ABN_LOOKUP_GUID</code> env vars to activate auto-verification.</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">ID</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Name / firm</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">AFSL / ABN</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Reviewed by</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Classifier notes</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono text-slate-500">#{r.id}</td>
                  <td className="px-4 py-2 text-slate-700">
                    <div className="truncate max-w-[180px]">{r.name}</div>
                    {r.firm_name && <div className="text-[0.65rem] text-slate-400 truncate max-w-[180px]">{r.firm_name}</div>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{r.type}</td>
                  <td className="px-4 py-2 text-slate-500 text-[0.65rem]">
                    {r.afsl_number ? `AFSL ${r.afsl_number}` : "—"}
                    <br />
                    {r.abn ? `ABN ${r.abn}` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[0.65rem] font-semibold ${r.status === "approved" ? "bg-emerald-100 text-emerald-800" : r.status === "rejected" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{r.reviewed_by || "—"}</td>
                  <td className="px-4 py-2 text-[0.65rem] text-slate-500 max-w-[220px]">
                    <div className="line-clamp-2" title={r.admin_notes || ""}>{r.admin_notes || "—"}</div>
                    {r.rejection_reason && <div className="text-red-600 mt-1 line-clamp-1">{r.rejection_reason}</div>}
                  </td>
                  <td className="px-4 py-2">
                    {r.status === "pending" ? (
                      <div className="flex gap-1">
                        <OverrideButton feature="advisor_applications" rowId={r.id} targetVerdict="approved" label="Approve" />
                        <OverrideButton feature="advisor_applications" rowId={r.id} targetVerdict="rejected" label="Reject" />
                      </div>
                    ) : r.status === "approved" ? (
                      <OverrideButton feature="advisor_applications" rowId={r.id} targetVerdict="rejected" label="→ Reject" requireReason />
                    ) : (
                      <OverrideButton feature="advisor_applications" rowId={r.id} targetVerdict="approved" label="→ Approve" requireReason />
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">No applications</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DrillDownShell>
  );
}
