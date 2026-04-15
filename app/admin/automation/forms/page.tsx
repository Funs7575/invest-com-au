import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeFunnel, biggestDropStep, type FormEventRow } from "@/lib/form-funnel";

export const dynamic = "force-dynamic";

/**
 * Form funnel dashboard.
 *
 * Shows a retention curve per form:
 *   quiz, advisor_enquiry, advisor_signup, advisor_apply,
 *   broker_apply, lead_form.
 *
 * Reads the last 30 days of form_events and computes the drop-off
 * per step in process (pure function + Supabase read only).
 */
const FORMS = [
  "quiz",
  "advisor_enquiry",
  "advisor_signup",
  "advisor_apply",
  "broker_apply",
  "lead_form",
] as const;

export default async function FormsFunnelPage() {
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data } = await admin
    .from("form_events")
    .select("session_id, form_name, step, step_index, event, created_at")
    .gte("created_at", thirtyDaysAgo)
    .limit(100_000);
  const rows = (data || []) as FormEventRow[];

  const funnels = FORMS.map((f) => computeFunnel(rows, f));

  return (
    <AdminShell title="Form funnels" subtitle="30-day drop-off per multi-step form">
      <div className="p-4 md:p-6 max-w-6xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>

        <div className="space-y-6">
          {funnels.map((f) => {
            const worst = biggestDropStep(f);
            return (
              <section
                key={f.form}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <header className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 capitalize">
                      {f.form.replace(/_/g, " ")}
                    </h2>
                    <p className="text-[0.65rem] text-slate-500">
                      {f.totalSessions.toLocaleString("en-AU")} sessions ·
                      {" "}
                      {f.steps.length} tracked steps
                    </p>
                  </div>
                  {worst && worst.dropFromPrevious > 0.2 && (
                    <div className="text-[0.65rem] px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
                      Biggest drop: <strong>{worst.step}</strong> (
                      {(worst.dropFromPrevious * 100).toFixed(0)}% lost)
                    </div>
                  )}
                </header>

                {f.steps.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    No events recorded in the last 30 days. Instrument the form
                    with recordFormEvent() to start seeing drop-off data here.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[0.6rem] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                        <th className="px-4 py-2 text-left font-semibold">Step</th>
                        <th className="px-4 py-2 text-right font-semibold">Reached</th>
                        <th className="px-4 py-2 text-right font-semibold">From start</th>
                        <th className="px-4 py-2 text-right font-semibold">Drop vs previous</th>
                        <th className="px-4 py-2">&nbsp;</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.steps.map((s) => (
                        <tr key={s.step} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2 font-mono text-xs text-slate-700">
                            {s.step}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-slate-700">
                            {s.sessionsReached.toLocaleString("en-AU")}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-slate-700">
                            {(s.conversionFromStart * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs">
                            <span
                              className={
                                s.dropFromPrevious > 0.3
                                  ? "text-red-700"
                                  : s.dropFromPrevious > 0.15
                                    ? "text-amber-700"
                                    : "text-slate-500"
                              }
                            >
                              {(s.dropFromPrevious * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-2 w-40">
                            <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${s.conversionFromStart * 100}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
