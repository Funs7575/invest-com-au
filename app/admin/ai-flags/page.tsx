import Link from "next/link";
import type { Metadata } from "next";

import AdminShell from "@/components/AdminShell";
import { loadFlag } from "@/lib/feature-flags";

/**
 * /admin/ai-flags
 *
 * Light-touch landing page for the two AI feature flags shipped in
 * MM-14. The full toggle UI already lives at /admin/feature-flags, so
 * this page deliberately does NOT duplicate the toggle controls — it
 * surfaces a prominent cost-warning banner and deep-links into the
 * existing UI.
 *
 * Access control: the parent `app/admin/layout.tsx` wraps every
 * route under /admin/* in `AdminAuthGuard`, so unauthenticated
 * visitors never reach this server component. Robots metadata
 * inherits `noindex, nofollow` from the admin layout — duplicated
 * here as belt-and-braces.
 */

// Inherits noindex, nofollow from app/admin/layout.tsx — re-asserted
// here so direct opens of the page still report the header even if
// the admin layout metadata is changed in future.
export const metadata: Metadata = {
  title: "AI Feature Flags — Admin",
  robots: "noindex, nofollow",
};

// Status snapshot is read directly from the feature_flags table at
// render time so an admin knows whether the flag is currently ON or
// OFF without first navigating to the main panel.
export const dynamic = "force-dynamic";

interface FlagSummaryProps {
  flagKey: string;
  enabled: boolean;
  rolloutPct: number;
}

function FlagSummary({ flagKey, enabled, rolloutPct }: FlagSummaryProps) {
  const status = enabled
    ? rolloutPct >= 100
      ? "ON (100%)"
      : `ON (${rolloutPct}%)`
    : "OFF";
  const pill = enabled
    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
    : "bg-slate-100 text-slate-700 border-slate-300";
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <code className="font-mono text-sm text-slate-800">{flagKey}</code>
      <span
        className={`text-xs px-2 py-0.5 rounded-full border ${pill}`}
        aria-label={`status ${status}`}
      >
        {status}
      </span>
    </li>
  );
}

export default async function AdminAiFlagsPage() {
  const [aiGetMatched, aiCopilot] = await Promise.all([
    loadFlag("ai_get_matched_v3"),
    loadFlag("ai_match_request_copilot"),
  ]);

  return (
    <AdminShell
      title="AI Feature Flags"
      subtitle="Gated cost surface — read before enabling"
    >
      <div className="p-4 md:p-6 max-w-3xl space-y-6">
        {/* ── Prominent cost warning banner ── */}
        <div
          role="alert"
          className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-amber-900"
        >
          <p className="font-bold uppercase tracking-wide text-sm mb-2">
            Warning: enabling these flags spends real money
          </p>
          <p className="text-sm mb-2">
            Enabling either flag will call the Anthropic API for every
            matching request that lands on the AI path. ANTHROPIC_API_KEY
            billing applies per token.
          </p>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>
              Estimated cost: <strong>~$0.0003</strong> per next-question
              call, <strong>~$0.001</strong> per plan resolve.
            </li>
            <li>
              At 1k Get Matched starts/day × ~6 questions, expect
              ~$1.80/day (~$54/month).
            </li>
            <li>
              Do <strong>not</strong> enable on prod traffic without a
              budget alert in place. Ramp via <code>rollout_pct</code>
              (10% → 25% → 100%) — flipping <code>enabled=true</code>
              with rollout 100 lights up <em>every</em> Get Matched
              session simultaneously.
            </li>
          </ul>
        </div>

        {/* ── Current status snapshot ── */}
        <section
          aria-labelledby="status-heading"
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2
            id="status-heading"
            className="font-semibold text-slate-800 mb-2"
          >
            Current status
          </h2>
          <ul className="divide-y divide-slate-100">
            <FlagSummary
              flagKey="ai_get_matched_v3"
              enabled={aiGetMatched?.enabled ?? false}
              rolloutPct={aiGetMatched?.rollout_pct ?? 0}
            />
            <FlagSummary
              flagKey="ai_match_request_copilot"
              enabled={aiCopilot?.enabled ?? false}
              rolloutPct={aiCopilot?.rollout_pct ?? 0}
            />
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Both flags ship seeded as{" "}
            <code className="font-mono">enabled=false, rollout_pct=0</code>
            {" "}so production traffic incurs zero token cost until you
            flip them on.
          </p>
        </section>

        {/* ── Deep-link to the full toggle UI ── */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-800 mb-2">
            Toggle, allowlist, rollout %
          </h2>
          <p className="text-sm text-slate-600 mb-3">
            The full toggle UI (with allowlist, denylist, segment
            targeting, and percentage rollout) lives on the shared
            feature flags panel. Use it to flip these flags and to add
            yourself to the allowlist for staging trials.
          </p>
          <Link
            href="/admin/feature-flags"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Open Feature Flags panel →
          </Link>
        </section>

        {/* ── Reference info ── */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 space-y-2">
          <h2 className="font-semibold text-slate-800">Reference</h2>
          <p>
            Engine source:{" "}
            <code className="font-mono text-xs">
              lib/getmatched/ai-engine.ts
            </code>
          </p>
          <p>
            Wrapper:{" "}
            <code className="font-mono text-xs">
              nextQuestionWithAI()
            </code>{" "}
            in{" "}
            <code className="font-mono text-xs">
              lib/getmatched/questions.ts
            </code>
            . Pure pass-through to the rule-based walker when the flag
            is off.
          </p>
          <p>
            Model:{" "}
            <code className="font-mono text-xs">
              process.env.ANTHROPIC_MODEL
            </code>{" "}
            (default{" "}
            <code className="font-mono text-xs">
              claude-haiku-4-5-20251001
            </code>
            ).
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
