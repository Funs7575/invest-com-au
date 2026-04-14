import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import SignalsPopover from "@/components/admin/automation/SignalsPopover";
import OverrideButton from "@/components/admin/automation/OverrideButton";
import { getTextModerationOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function ModerationDrillDown() {
  const supabase = createAdminClient();
  const [overview, brokerRes, advisorRes] = await Promise.all([
    getTextModerationOverview(),
    supabase
      .from("user_reviews")
      .select("id, broker_slug, display_name, title, body, status, auto_moderated_verdict, auto_moderated_reasons, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("professional_reviews")
      .select("id, professional_id, reviewer_name, title, body, status, auto_moderated_verdict, auto_moderated_reasons, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <DrillDownShell overview={overview}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ReviewTable
          title="Broker reviews"
          subtitle="user_reviews table"
          subSurface="broker_review"
          rows={(brokerRes.data || []).map((r) => ({
            id: r.id,
            target: r.broker_slug,
            author: r.display_name || "Anonymous",
            title: r.title,
            body: r.body,
            status: r.status || "pending",
            verdict: r.auto_moderated_verdict,
            reasons: r.auto_moderated_reasons as string[] | null,
          }))}
        />
        <ReviewTable
          title="Advisor reviews"
          subtitle="professional_reviews table"
          subSurface="advisor_review"
          rows={(advisorRes.data || []).map((r) => ({
            id: r.id,
            target: `advisor #${r.professional_id}`,
            author: r.reviewer_name || "Anonymous",
            title: r.title,
            body: r.body,
            status: r.status || "pending",
            verdict: r.auto_moderated_verdict,
            reasons: r.auto_moderated_reasons as string[] | null,
          }))}
        />
      </div>
    </DrillDownShell>
  );
}

interface ReviewRow {
  id: number;
  target: string;
  author: string;
  title: string | null;
  body: string | null;
  status: string;
  verdict: string | null;
  reasons: string[] | null;
}

function ReviewTable({
  title,
  subtitle,
  subSurface,
  rows,
}: {
  title: string;
  subtitle: string;
  subSurface: string;
  rows: ReviewRow[];
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </header>
      <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[0.65rem] text-slate-500 mb-0.5">
                  <span className="font-mono">#{r.id}</span>
                  <span>·</span>
                  <span>{r.target}</span>
                  <span>·</span>
                  <span>{r.author}</span>
                </div>
                {r.title && <p className="text-xs font-semibold text-slate-900">{r.title}</p>}
                <p className="text-[0.7rem] text-slate-600 line-clamp-2">{r.body || "—"}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className={`inline-block px-2 py-0.5 rounded text-[0.6rem] font-semibold ${r.status === "published" ? "bg-emerald-100 text-emerald-800" : r.status === "rejected" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                <SignalsPopover reasons={r.reasons} label="Why" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[0.6rem] text-slate-400">{r.verdict || "no classifier verdict"}</span>
              <span className="ml-auto flex gap-1">
                {r.status === "pending" && (
                  <>
                    <OverrideButton feature="text_moderation" rowId={r.id} targetVerdict="published" label="Publish" />
                    <OverrideButton feature="text_moderation" rowId={r.id} targetVerdict="rejected" label="Reject" />
                  </>
                )}
              </span>
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">No recent reviews</li>}
      </ul>
    </section>
  );
}
