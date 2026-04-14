import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import SignalsPopover from "@/components/admin/automation/SignalsPopover";
import OverrideButton from "@/components/admin/automation/OverrideButton";
import { getListingScamOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function ListingsDrillDown() {
  const supabase = createAdminClient();
  const [overview, recentRes] = await Promise.all([
    getListingScamOverview(),
    supabase
      .from("investment_listings")
      .select("id, title, vertical, status, contact_email, auto_classified_verdict, auto_classified_risk_score, auto_classified_reasons, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const rows = recentRes.data || [];

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Recent listings</h2>
          <p className="text-xs text-slate-500">Sorted by risk score descending. High risk rows at the top need human review.</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">ID</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Title</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Vertical</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Contact</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Verdict</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Risk</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Signals</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.sort((a, b) => (b.auto_classified_risk_score || 0) - (a.auto_classified_risk_score || 0)).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-mono text-slate-500">#{r.id}</td>
                  <td className="px-4 py-2 text-slate-700 max-w-[200px] truncate" title={r.title}>{r.title}</td>
                  <td className="px-4 py-2 text-slate-600">{r.vertical}</td>
                  <td className="px-4 py-2 text-[0.65rem] text-slate-500 max-w-[180px] truncate" title={r.contact_email}>{r.contact_email}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[0.65rem] font-semibold ${r.status === "active" ? "bg-emerald-100 text-emerald-800" : r.status === "rejected" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-600 text-[0.7rem]">{r.auto_classified_verdict || "—"}</td>
                  <td className="px-4 py-2">
                    {r.auto_classified_risk_score !== null ? (
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-slate-100 rounded overflow-hidden">
                          <div
                            className={`h-full ${(r.auto_classified_risk_score || 0) > 70 ? "bg-red-500" : (r.auto_classified_risk_score || 0) > 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${r.auto_classified_risk_score}%` }}
                          />
                        </div>
                        <span className="text-[0.65rem] font-mono text-slate-600">{r.auto_classified_risk_score}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <SignalsPopover reasons={(r.auto_classified_reasons as string[] | null) || null} />
                  </td>
                  <td className="px-4 py-2">
                    {r.status === "pending" ? (
                      <div className="flex gap-1">
                        <OverrideButton feature="listing_scam" rowId={r.id} targetVerdict="active" label="Approve" />
                        <OverrideButton feature="listing_scam" rowId={r.id} targetVerdict="rejected" label="Reject" />
                      </div>
                    ) : r.status === "active" ? (
                      <OverrideButton feature="listing_scam" rowId={r.id} targetVerdict="rejected" label="→ Unpublish" requireReason />
                    ) : (
                      <OverrideButton feature="listing_scam" rowId={r.id} targetVerdict="active" label="→ Publish" requireReason />
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">No listings</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DrillDownShell>
  );
}
