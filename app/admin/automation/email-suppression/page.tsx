import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import { getEmailBouncesOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function EmailSuppressionDrillDown() {
  const supabase = createAdminClient();
  const [overview, suppressedRes] = await Promise.all([
    getEmailBouncesOverview(),
    supabase
      .from("email_suppression_list")
      .select("email, reason, source, bounce_count, first_seen_at, last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Suppression list</h2>
          <p className="text-xs text-slate-500">Emails on this list are skipped by every transactional send helper. Top 200 by recency.</p>
        </header>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Email</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Reason</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Source</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Bounces</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-600">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(suppressedRes.data || []).map((r) => (
              <tr key={r.email}>
                <td className="px-4 py-2 font-mono text-slate-700">{r.email}</td>
                <td className="px-4 py-2">
                  <span className="inline-block px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-red-100 text-red-800">{r.reason}</span>
                </td>
                <td className="px-4 py-2 text-[0.65rem] text-slate-500">{r.source || "—"}</td>
                <td className="px-4 py-2 text-slate-600">{r.bounce_count || 1}</td>
                <td className="px-4 py-2 text-[0.65rem] text-slate-500">
                  {r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("en-AU") : "—"}
                </td>
              </tr>
            ))}
            {(suppressedRes.data?.length || 0) === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No suppressed emails</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </DrillDownShell>
  );
}
