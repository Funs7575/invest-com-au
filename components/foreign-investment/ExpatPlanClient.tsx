"use client";

/**
 * ExpatPlanClient — interactive checklist for the cross-border planner.
 *
 * Persistence strategy (mirrors the calculator-state pattern):
 *   • Anonymous:  localStorage only — key `expat_plan_progress_{code}`.
 *   • Signed-in:  localStorage for instant paint, then sync to DB via
 *                 /api/expat-plan. DB is the source of truth on reload.
 *
 * The component is deliberately thin:
 *   • It receives the pre-built ExpatPlan from the server component.
 *   • It owns only the interactive state (which items are checked, saving
 *     status, hydration flag).
 *   • All plan structure / completion math is delegated back to the pure
 *     helpers in lib/expat-plan.ts.
 *
 * No personal recommendations are made — items map 1:1 to the neutral
 * journey steps that already exist. The planner only adds checkboxes.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { ExpatPlan, PlanItem, PlanCompletion } from "@/lib/expat-plan";
import {
  computeCompletion,
  planProgressKey,
  parseProgress,
  toggleItemDone,
  type ExpatPlanProgress,
} from "@/lib/expat-plan";

// ─── Bold-markdown renderer ──────────────────────────────────────────────────

function renderBold(text: string) {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

// ─── Category badge ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  setup: "Setup",
  compliance: "Compliance",
  financial: "Financial",
  action: "Action",
};

const CATEGORY_STYLES: Record<string, string> = {
  setup: "bg-blue-100 text-blue-700",
  compliance: "bg-red-100 text-red-700",
  financial: "bg-amber-100 text-amber-700",
  action: "bg-emerald-100 text-emerald-700",
};

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-wide ${CATEGORY_STYLES[category] ?? "bg-slate-100 text-slate-600"}`}
    >
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

// ─── Completion bar ──────────────────────────────────────────────────────────

function CompletionBar({
  completion,
  countryName,
}: {
  completion: PlanCompletion;
  countryName: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-extrabold text-slate-900">
            {countryName} plan progress
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {completion.doneCount} of {completion.totalCount} steps completed
          </p>
        </div>
        <div className="text-right">
          <span
            className={`text-2xl font-extrabold tabular-nums ${completion.complete ? "text-emerald-600" : "text-amber-600"}`}
          >
            {completion.percent}%
          </span>
        </div>
      </div>
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${completion.complete ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${completion.percent}%` }}
          aria-valuenow={completion.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label={`${completion.percent}% of ${countryName} plan completed`}
        />
      </div>
      {completion.complete && (
        <p className="text-xs font-semibold text-emerald-700 mt-2">
          All steps reviewed — consider booking a specialist to act on your
          plan.
        </p>
      )}
    </div>
  );
}

// ─── Plan item card ──────────────────────────────────────────────────────────

function PlanItemCard({
  item,
  done,
  onToggle,
}: {
  item: PlanItem;
  done: boolean;
  onToggle: (id: string, done: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const calloutStyles =
    item.calloutVariant === "critical"
      ? "bg-red-50 border-red-200 text-red-900"
      : "bg-amber-50 border-amber-200 text-amber-900";
  const calloutLabel =
    item.calloutVariant === "critical" ? "text-red-700" : "text-amber-700";

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
        done ? "border-emerald-300 opacity-80" : "border-slate-200"
      }`}
    >
      {/* Header row */}
      <div className="px-5 py-4 flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggle(item.id, !done)}
          aria-label={done ? `Mark "${item.railLabel}" as not done` : `Mark "${item.railLabel}" as done`}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 hover:border-amber-400 bg-white"
          }`}
        >
          {done && (
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>

        {/* Step number + content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[0.6rem] font-extrabold shrink-0">
              {item.stepNumber}
            </span>
            <CategoryBadge category={item.category} />
            {done && (
              <span className="text-[0.6rem] font-bold uppercase tracking-wide text-emerald-600">
                Done
              </span>
            )}
          </div>
          <h3
            className={`font-extrabold text-sm leading-tight ${
              done ? "line-through text-slate-400" : "text-slate-900"
            }`}
          >
            {item.heading}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {item.summary}
          </p>
        </div>
      </div>

      {/* Expand/collapse toggle */}
      <div className="px-5 pb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-semibold text-slate-500 hover:text-amber-700 flex items-center gap-1 transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? "Hide detail" : "See detail"}
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100 space-y-3 pt-3">
          {/* Callout */}
          {item.calloutTitle && (
            <div className={`rounded-xl border p-3 ${calloutStyles}`}>
              <p className={`text-[0.6rem] font-bold uppercase tracking-wide mb-1 ${calloutLabel}`}>
                {item.calloutVariant === "critical" ? "Important" : "Note"}
              </p>
              <p className="text-xs font-semibold mb-1">{item.calloutTitle}</p>
              {item.calloutBody && (
                <p className="text-xs leading-relaxed">
                  {renderBold(item.calloutBody)}
                </p>
              )}
            </div>
          )}

          {/* Detail bullets */}
          {item.detail.length > 0 && (
            <ul className="space-y-2">
              {item.detail.map((bullet, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-xs text-slate-700 leading-relaxed"
                >
                  <span className="text-amber-500 font-bold mt-0.5 shrink-0">
                    —
                  </span>
                  <span>{renderBold(bullet)}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Links */}
          {item.links.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {item.links.map((link) =>
                link.primary ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-1 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Save status indicator ────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const styles: Record<SaveStatus, string> = {
    idle: "",
    saving: "text-slate-400",
    saved: "text-emerald-600",
    error: "text-red-500",
  };
  const labels: Record<SaveStatus, string> = {
    idle: "",
    saving: "Saving…",
    saved: "Saved",
    error: "Save failed — will retry",
  };
  return (
    <span className={`text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface ExpatPlanClientProps {
  plan: ExpatPlan;
  /** True when user is signed in — enables DB sync. */
  isSignedIn: boolean;
}

const SAVE_DEBOUNCE_MS = 1200;

export default function ExpatPlanClient({
  plan,
  isSignedIn,
}: ExpatPlanClientProps) {
  const storageKey = planProgressKey(plan.code);

  // Lazy initializer reads localStorage on first render — avoids synchronous
  // setState in effect (which triggers cascading renders). The initializer
  // runs once at mount on the client, so it is safe to read localStorage here.
  const [progress, setProgress] = useState<ExpatPlanProgress>(() => {
    if (typeof window === "undefined") {
      return { doneIds: [], updatedAt: new Date(0).toISOString() };
    }
    return parseProgress(localStorage.getItem(planProgressKey(plan.code)));
  });
  // hydrated is always true since the lazy useState initializer already ran synchronously.
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── DB sync for signed-in users ─────────────────────────────────────────
  // Only fetches from the DB; state is already seeded from localStorage above.

  useEffect(() => {
    if (!isSignedIn) return;

    void fetch(`/api/expat-plan?country=${plan.code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { progress?: ExpatPlanProgress | null } | null) => {
        const dbProgress = data?.progress;
        if (!dbProgress) return;

        // Last-write-wins by updatedAt — reconcile DB with local state
        setProgress((local) => {
          const localTs = new Date(local.updatedAt).getTime();
          const dbTs = new Date(dbProgress.updatedAt).getTime();
          return dbTs > localTs ? dbProgress : local;
        });
      })
      .catch(() => {
        // DB fetch failed — localStorage state is fine
      });
  }, [plan.code, isSignedIn]);

  // ─── Persist progress ──────────────────────────────────────────────────────

  const persistProgress = useCallback(
    (updated: ExpatPlanProgress) => {
      // Always write to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // Quota / private-mode — silent
      }

      // For signed-in users, debounce DB write
      if (!isSignedIn) {
        setSaveStatus("idle");
        return;
      }

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("saving");

      saveTimerRef.current = setTimeout(() => {
        void fetch("/api/expat-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: plan.code,
            doneIds: updated.doneIds,
          }),
        })
          .then((r) => {
            setSaveStatus(r.ok ? "saved" : "error");
            if (r.ok) {
              setTimeout(() => setSaveStatus("idle"), 2000);
            }
          })
          .catch(() => {
            setSaveStatus("error");
          });
      }, SAVE_DEBOUNCE_MS);
    },
    [plan.code, isSignedIn, storageKey],
  );

  // ─── Toggle handler ────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    (itemId: string, done: boolean) => {
      setProgress((prev) => {
        const updated = toggleItemDone(prev, itemId, done);
        persistProgress(updated);
        return updated;
      });
    },
    [persistProgress],
  );

  // ─── Computed completion ───────────────────────────────────────────────────

  const completion = computeCompletion(plan, progress.doneIds);

  // ─── Reset handler ─────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    const reset: ExpatPlanProgress = {
      doneIds: [],
      updatedAt: new Date().toISOString(),
    };
    setProgress(reset);
    persistProgress(reset);
  }, [persistProgress]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Completion bar */}
      <CompletionBar completion={completion} countryName={plan.countryName} />

      {/* Save status + reset */}
      <div className="flex items-center justify-between mb-4">
        <SaveStatusBadge status={saveStatus} />
        {completion.doneCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-red-500 font-semibold transition-colors"
          >
            Reset progress
          </button>
        )}
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {plan.items.map((item) => (
          <PlanItemCard
            key={item.id}
            item={item}
            done={progress.doneIds.includes(item.id)}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* FX summary callout (when present) */}
      {plan.fxSummary && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-700 mb-1">
            {plan.fxSummary.eyebrow}
          </p>
          <p className="text-sm font-extrabold text-slate-900 mb-1">
            {plan.fxSummary.title}
          </p>
          <p className="text-xs text-slate-600 mb-3">{plan.fxSummary.sub}</p>
          <p className="text-xs text-slate-700 mb-3">
            <strong>Best option:</strong> {plan.fxSummary.bestOptionLabel} —{" "}
            {plan.fxSummary.bestOptionCost}
          </p>
          <Link
            href={plan.fxSummary.ctaHref}
            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs px-4 py-2 rounded-lg transition-colors"
          >
            {plan.fxSummary.ctaLabel}
          </Link>
        </div>
      )}

      {/* Pension summary callout (when present) */}
      {plan.pensionSummary && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-red-700 mb-1">
            Pension / Super Transfer
          </p>
          <p className="text-sm font-extrabold text-slate-900 mb-1">
            {plan.pensionSummary.title}
          </p>
          <p className="text-xs text-slate-600 mb-3">
            {plan.pensionSummary.sub}
          </p>
          {plan.pensionSummary.callout && (
            <p className="text-xs font-semibold text-red-800 mb-3">
              {renderBold(plan.pensionSummary.callout)}
            </p>
          )}
          {plan.pensionSummary.keyRules.length > 0 && (
            <ul className="space-y-1.5">
              {plan.pensionSummary.keyRules.map((rule, i) => (
                <li key={i} className="flex gap-2 text-xs text-red-900">
                  <span className="font-bold shrink-0">—</span>
                  <span>{renderBold(rule)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Anonymous sign-in nudge */}
      {!isSignedIn && completion.doneCount > 0 && (
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            Your progress is saved locally in this browser only.
          </p>
          <p className="text-xs text-slate-500">
            Sign in to save your plan across devices and pick up where you left
            off.
          </p>
        </div>
      )}
    </div>
  );
}
