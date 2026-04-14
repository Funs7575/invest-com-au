import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HealthFactor } from "@/lib/advisor-health";

export const dynamic = "force-dynamic";

/**
 * Advisor self-service health scorecard.
 *
 * Transparent breakdown of the ranker score with per-factor
 * recommendations. Advisors can see exactly what's dragging their
 * lead flow down and what to fix.
 *
 * Auth: reads the advisor session cookie the advisor portal already
 * uses. If unauthenticated or the advisor has no cached health
 * score yet, surfaces a message explaining the nightly recompute.
 */
async function getAdvisorFromSession() {
  const sessionToken = (await cookies()).get("advisor_session")?.value;
  if (!sessionToken) return null;
  const supabase = createAdminClient();
  const { data: session } = await supabase
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("token", sessionToken)
    .maybeSingle();
  if (!session || !session.professional_id) return null;
  if (
    session.expires_at &&
    new Date(session.expires_at as string).getTime() < Date.now()
  ) {
    return null;
  }
  const { data: advisor } = await supabase
    .from("professionals")
    .select(
      "id, name, firm_name, health_score, health_scored_at, health_factors",
    )
    .eq("id", session.professional_id)
    .maybeSingle();
  return advisor;
}

export default async function AdvisorHealthPage() {
  const advisor = await getAdvisorFromSession();

  if (!advisor) {
    redirect("/advisor-portal/login?redirect=/advisor-portal/health");
  }

  const factors = (advisor.health_factors as unknown as HealthFactor[] | null) || [];
  const overall = advisor.health_score as number | null;
  const scoredAt = advisor.health_scored_at as string | null;

  const bucket =
    overall == null
      ? "pending"
      : overall >= 80
        ? "green"
        : overall >= 60
          ? "amber"
          : "red";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <nav className="text-xs text-slate-500 mb-3">
        <Link href="/advisor-portal" className="hover:text-slate-900">
          ← Advisor portal
        </Link>
      </nav>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
        Your health score
      </h1>
      <p className="text-sm text-slate-600 mb-6 max-w-xl">
        We blend these factors when ranking you in the directory.
        Improving any of them lifts your visibility in the advisor
        finder and the quiz match flow.
      </p>

      <section
        className={`rounded-xl border p-6 mb-6 ${
          bucket === "green"
            ? "bg-emerald-50 border-emerald-200"
            : bucket === "amber"
              ? "bg-amber-50 border-amber-200"
              : bucket === "red"
                ? "bg-red-50 border-red-200"
                : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-sm">
            <span className="text-3xl font-extrabold text-slate-900">
              {overall ?? "—"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-slate-900">
              {bucket === "green"
                ? "Excellent"
                : bucket === "amber"
                  ? "Room to improve"
                  : bucket === "red"
                    ? "Needs attention"
                    : "Waiting on first score"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {scoredAt
                ? `Last updated ${new Date(scoredAt).toLocaleString("en-AU")}`
                : "Scores refresh nightly. Your first score will appear within 24 hours."}
            </p>
          </div>
        </div>
      </section>

      {factors.length > 0 && (
        <section className="space-y-3">
          {factors.map((f) => (
            <div
              key={f.key}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2 gap-3">
                <h3 className="text-sm font-bold text-slate-900">{f.label}</h3>
                <span
                  className={`text-sm font-mono font-bold ${
                    f.score >= 80
                      ? "text-emerald-700"
                      : f.score >= 60
                        ? "text-amber-700"
                        : "text-red-700"
                  }`}
                >
                  {f.score} / 100
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded overflow-hidden mb-3">
                <div
                  className={`h-full ${
                    f.score >= 80
                      ? "bg-emerald-500"
                      : f.score >= 60
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${f.score}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {f.recommendation}
              </p>
            </div>
          ))}
        </section>
      )}

      {factors.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          Your health score hasn&apos;t been computed yet. Try again in 24
          hours — the overnight job recomputes every active advisor.
        </div>
      )}
    </div>
  );
}
