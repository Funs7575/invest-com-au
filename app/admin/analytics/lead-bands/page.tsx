import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface LeadRow {
  id: number;
  quality_band: string | null;
  quality_score: number | null;
  status: string;
  lead_value: number | null;
  billed: boolean;
  created_at: string;
  professional_id: number | null;
}

/**
 * /admin/analytics/lead-bands — quality band distribution.
 *
 * Wave 17 added cold/warm/hot bands via the lead scorer. This
 * page rolls up the last 30 days of leads by band + status so
 * you can see:
 *
 *   - Volume per band
 *   - Conversion % per band (billed / total)
 *   - Avg lead_value per band
 *   - Drop-off points in the funnel
 *
 * Together with /admin/analytics/search this closes the "what
 * are people searching for" / "what leads are converting" loop.
 */
export default async function AdminLeadBandsPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin");

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data } = await supabase
    .from("professional_leads")
    .select(
      "id, quality_band, quality_score, status, lead_value, billed, created_at, professional_id",
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  const leads = (data as LeadRow[] | null) || [];

  interface BandSummary {
    band: string;
    total: number;
    billed: number;
    avgScore: number;
    totalValue: number;
    byStatus: Record<string, number>;
  }

  const summaryMap = new Map<string, BandSummary>();
  for (const band of ["hot", "warm", "cold", "unscored"]) {
    summaryMap.set(band, {
      band,
      total: 0,
      billed: 0,
      avgScore: 0,
      totalValue: 0,
      byStatus: {},
    });
  }

  for (const lead of leads) {
    const bandKey = lead.quality_band || "unscored";
    const s = summaryMap.get(bandKey) || summaryMap.get("unscored")!;
    s.total += 1;
    if (lead.billed) s.billed += 1;
    s.avgScore += lead.quality_score || 0;
    s.totalValue += lead.lead_value || 0;
    s.byStatus[lead.status] = (s.byStatus[lead.status] || 0) + 1;
  }

  const summary = Array.from(summaryMap.values()).map((s) => ({
    ...s,
    avgScore: s.total > 0 ? s.avgScore / s.total : 0,
    conversionPct: s.total > 0 ? (s.billed / s.total) * 100 : 0,
    avgValue: s.total > 0 ? s.totalValue / s.total : 0,
  }));

  const bandColors: Record<string, string> = {
    hot: "bg-rose-50 border-rose-300",
    warm: "bg-amber-50 border-amber-300",
    cold: "bg-sky-50 border-sky-300",
    unscored: "bg-slate-50 border-slate-300",
  };

  const totalLeads = leads.length;

  return (
    <AdminShell title="Lead quality bands">
      <div className="max-w-5xl space-y-8">
        <section>
          <p className="text-sm text-slate-600">
            Wave 17 lead scoring output for the last 30 days. Band is
            assigned at intake time by{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">
              lib/advisor-lead-scoring.ts
            </code>
            . <strong>{totalLeads.toLocaleString()}</strong> leads total.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {summary.map((s) => (
            <div
              key={s.band}
              className={`rounded-xl border-2 p-4 ${bandColors[s.band] || "bg-slate-50 border-slate-300"}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {s.band}
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">
                {s.total.toLocaleString()}
              </p>
              <dl className="mt-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Conversion</dt>
                  <dd className="font-semibold text-slate-900">
                    {s.conversionPct.toFixed(1)}%
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Avg score</dt>
                  <dd className="font-semibold text-slate-900">
                    {s.avgScore.toFixed(0)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Avg value</dt>
                  <dd className="font-semibold text-slate-900">
                    ${(s.avgValue / 100).toFixed(2)}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">
            Status breakdown by band
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Band</th>
                  <th className="text-right px-3 py-2">New</th>
                  <th className="text-right px-3 py-2">Contacted</th>
                  <th className="text-right px-3 py-2">Qualified</th>
                  <th className="text-right px-3 py-2">Converted</th>
                  <th className="text-right px-3 py-2">Rejected</th>
                  <th className="text-right px-3 py-2">Other</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => {
                  const knownStatuses = new Set([
                    "new",
                    "contacted",
                    "qualified",
                    "converted",
                    "rejected",
                  ]);
                  const other = Object.entries(s.byStatus)
                    .filter(([k]) => !knownStatuses.has(k))
                    .reduce((sum, [, v]) => sum + v, 0);
                  return (
                    <tr
                      key={s.band}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-2 font-bold capitalize">
                        {s.band}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.byStatus.new || 0}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.byStatus.contacted || 0}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.byStatus.qualified || 0}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.byStatus.converted || 0}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.byStatus.rejected || 0}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                        {other}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
