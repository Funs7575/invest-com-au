"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { IntakeTemplate } from "@/lib/pro-intake/templates";

interface Props {
  templates: IntakeTemplate[];
  /** "professional" or "team" — passed to the create endpoint. */
  ownerKind: "professional" | "team";
  /** professional_id or team_id. */
  ownerId: number;
  /** How many questions the owner already has — used to disable cloning
   * when adding would exceed MAX_QUESTIONS_PER_OWNER (5). */
  existingCount: number;
  /** Hard cap from `lib/pro-intake.ts` (MAX_QUESTIONS_PER_OWNER). */
  maxQuestions: number;
}

/**
 * Quick-start template picker shown above the intake editor.
 *
 * Renders one card per matching template; each card lists the
 * questions + a "Use this template" button. Clicking the button
 * POSTs each question in sequence to /api/intake/questions
 * (the upsert endpoint already used by IntakeQuestionsEditor).
 *
 * If adding all template questions would exceed the per-owner cap,
 * the button is disabled with an explainer.
 */
export default function IntakeTemplatePicker({
  templates,
  ownerKind,
  ownerId,
  existingCount,
  maxQuestions,
}: Props) {
  const router = useRouter();
  const [pickedSlug, setPickedSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function applyTemplate(template: IntakeTemplate) {
    setError(null);
    setPickedSlug(template.slug);
    startTransition(async () => {
      try {
        let order = existingCount;
        for (const q of template.questions) {
          order += 1;
          const res = await fetch("/api/intake/questions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              owner_kind: ownerKind,
              owner_id: ownerId,
              prompt: q.prompt,
              kind: q.kind,
              options: q.options ?? [],
              required: q.required,
              sort_order: order,
              enabled: true,
            }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
        }
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not apply template.",
        );
        setPickedSlug(null);
      }
    });
  }

  if (templates.length === 0) return null;

  return (
    <section
      aria-labelledby="intake-templates-heading"
      className="mb-6 rounded-2xl border border-violet-200 bg-violet-50/50 p-5"
    >
      <h2
        id="intake-templates-heading"
        className="text-sm font-bold text-slate-900 mb-1"
      >
        Quick-start templates
      </h2>
      <p className="text-xs text-slate-600 mb-4">
        Curated 4–5 question packs tuned to your category. Click &ldquo;Use
        this template&rdquo; to add them all in one go — you can edit or
        delete afterwards in the editor below.
      </p>

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.slice(0, 4).map((t) => {
          const wouldExceed =
            existingCount + t.questions.length > maxQuestions;
          const isPicked = pickedSlug === t.slug;
          return (
            <article
              key={t.slug}
              className="bg-white rounded-xl border border-violet-100 p-4 flex flex-col"
            >
              <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
              <p className="text-xs text-slate-600 mt-1 mb-3 leading-snug">
                {t.blurb}
              </p>
              <ol className="text-[11px] text-slate-700 space-y-1 mb-4 list-decimal list-inside">
                {t.questions.map((q, i) => (
                  <li key={i} className="leading-snug">
                    {q.prompt}
                    {q.required && (
                      <span className="text-rose-500 ml-1">*</span>
                    )}
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => applyTemplate(t)}
                disabled={pending || wouldExceed}
                className={`mt-auto rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  wouldExceed
                    ? "bg-slate-100 text-slate-600 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-500 text-white"
                } disabled:opacity-50`}
                title={
                  wouldExceed
                    ? `Adding ${t.questions.length} questions would exceed the ${maxQuestions}-question cap.`
                    : undefined
                }
              >
                {wouldExceed
                  ? `Cap reached (max ${maxQuestions})`
                  : isPicked && pending
                    ? "Adding…"
                    : `Use this template · ${t.questions.length} questions`}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
