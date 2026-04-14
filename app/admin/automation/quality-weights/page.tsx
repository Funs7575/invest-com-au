import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import { getQualityWeightsOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function QualityWeightsDrillDown() {
  const supabase = createAdminClient();
  const overview = await getQualityWeightsOverview();

  // Pull the latest model_version's weights for display
  const { data: latestVersion } = await supabase
    .from("lead_quality_weights")
    .select("model_version")
    .order("model_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: weights } = latestVersion
    ? await supabase
        .from("lead_quality_weights")
        .select("signal_name, weight, sample_size, hit_rate, computed_at")
        .eq("model_version", latestVersion.model_version)
        .order("weight", { ascending: false })
    : { data: [] };

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">
            Latest computed weights{latestVersion ? ` (v${latestVersion.model_version})` : ""}
          </h2>
          <p className="text-xs text-slate-500">
            Recomputed nightly from 90-day conversion outcomes. The live scorer in <code className="bg-slate-100 px-1 rounded">/api/advisor-enquiry</code> currently uses hardcoded weights — flip it to read from this table when you're confident in the values.
          </p>
        </header>
        {weights && weights.length > 0 ? (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Signal</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Weight</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Sample size</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Hit rate</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Computed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weights.map((w) => (
                <tr key={w.signal_name}>
                  <td className="px-4 py-2 font-mono text-slate-700">{w.signal_name}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900">{w.weight}</td>
                  <td className="px-4 py-2 text-slate-600">{w.sample_size}</td>
                  <td className="px-4 py-2 text-slate-600">{(Number(w.hit_rate) * 100).toFixed(2)}%</td>
                  <td className="px-4 py-2 text-[0.65rem] text-slate-500">
                    {new Date(w.computed_at).toLocaleDateString("en-AU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500">
            No computed weights yet. The nightly cron writes rows when at least 100 leads are available in the 90-day window.
          </div>
        )}
      </section>
    </DrillDownShell>
  );
}
