import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import { getProfileGateOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function ProfileGateDrillDown() {
  const supabase = createAdminClient();
  const [overview, stuckRes] = await Promise.all([
    getProfileGateOverview(),
    supabase
      .from("professionals")
      .select("id, name, email, profile_missing_fields, profile_gate_step, profile_gate_checked_at, created_at")
      .eq("profile_quality_gate", "pending")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const rows = stuckRes.data || [];
  const byStep: Record<number, typeof rows> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  for (const r of rows) byStep[r.profile_gate_step || 0].push(r);

  const stepLabels = ["Not started", "Day 1 warning", "Day 3 warning", "Day 7 warning", "Day 14 final"];

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Advisors at quality gate</h2>
          <p className="text-xs text-slate-500">Grouped by drip step. Advisors auto-unlock when all fields are filled.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-5 divide-x divide-slate-100">
          {[0, 1, 2, 3, 4].map((step) => (
            <div key={step} className="p-3">
              <h3 className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-2">
                {stepLabels[step]} ({byStep[step].length})
              </h3>
              <ul className="space-y-1">
                {byStep[step].slice(0, 20).map((a) => (
                  <li key={a.id} className="text-[0.7rem]">
                    <div className="font-semibold text-slate-800 truncate">{a.name}</div>
                    <div className="text-slate-400 text-[0.6rem]">
                      {(a.profile_missing_fields || []).slice(0, 3).join(", ")}
                    </div>
                  </li>
                ))}
                {byStep[step].length === 0 && <li className="text-[0.65rem] text-slate-400">—</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </DrillDownShell>
  );
}
