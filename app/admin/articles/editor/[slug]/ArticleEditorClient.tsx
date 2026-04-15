"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface InitialArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  status: string;
}

interface Template {
  slug: string;
  display_name: string;
  description: string;
  min_words: number;
  required_sections: Array<{ heading: string; intent: string; placeholder?: string }>;
  compliance_notes: string | null;
}

interface ScorecardResponse {
  score: number;
  grade: string;
  passed_checks: string[];
  failed_checks: string[];
  remediation: Array<{ code: string; severity: string; message: string }>;
}

interface Props {
  initialSlug: string;
  initialArticle: InitialArticle | null;
  templates: Template[];
}

const GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-700 bg-emerald-100 border-emerald-300",
  B: "text-lime-700 bg-lime-100 border-lime-300",
  C: "text-amber-700 bg-amber-100 border-amber-300",
  D: "text-orange-700 bg-orange-100 border-orange-300",
  F: "text-red-700 bg-red-100 border-red-300",
};

/**
 * Split-pane writer editor with live scorecard.
 *
 * Left pane: the form inputs (slug, title, excerpt, category, tags,
 * body). Debounced scorecard runs as you type.
 *
 * Right pane: grade gauge, score, remediation list, template
 * hints, and action buttons (save, publish, generate preview link).
 *
 * The editor talks to:
 *   - /api/admin/article-scorecard (POST)      — live scoring
 *   - /api/admin/article-preview-tokens (POST) — share link creation
 *   - supabase articles upsert                 — save/publish
 */
export default function ArticleEditorClient({
  initialSlug,
  initialArticle,
  templates,
}: Props) {
  const router = useRouter();

  // Form state — slug is locked once set so preview links stay stable.
  const [slug, setSlug] = useState(initialArticle?.slug || (initialSlug !== "new" ? initialSlug : ""));
  const [title, setTitle] = useState(initialArticle?.title || "");
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt || "");
  const [body, setBody] = useState(initialArticle?.content || "");
  const [category, setCategory] = useState(initialArticle?.category || "");
  const [tagsCsv, setTagsCsv] = useState((initialArticle?.tags || []).join(", "));
  const [templateSlug, setTemplateSlug] = useState<string>("");
  const [status, setStatus] = useState(initialArticle?.status || "draft");

  const tags = useMemo(
    () => tagsCsv.split(",").map((t) => t.trim()).filter(Boolean),
    [tagsCsv],
  );

  // Scorecard state — runs debounced on every input change
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null);
  const [scoring, setScoring] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.slug === templateSlug) || null,
    [templates, templateSlug],
  );

  // Save/publish state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Preview link state
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  /**
   * Apply a template by pre-filling the body with its section
   * scaffold. We only apply to an empty body to avoid stomping
   * in-progress drafts.
   */
  const applyTemplate = useCallback(
    (t: Template) => {
      setTemplateSlug(t.slug);
      if (body.trim().length === 0) {
        const scaffold = t.required_sections
          .map(
            (s) =>
              `## ${s.heading}\n\n*${s.intent}*\n\n${s.placeholder || "…"}\n`,
          )
          .join("\n");
        setBody(scaffold);
      }
    },
    [body],
  );

  /** Debounced scorecard run — never blocks typing */
  const runScorecard = useCallback(async () => {
    if (!slug || !title) return;
    setScoring(true);
    try {
      const res = await fetch("/api/admin/article-scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          body,
          excerpt,
          category,
          tags,
          template_slug: templateSlug || null,
          min_words: activeTemplate?.min_words,
          persist: false,
        }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as ScorecardResponse;
      setScorecard(json);
    } finally {
      setScoring(false);
    }
  }, [slug, title, body, excerpt, category, tags, templateSlug, activeTemplate]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runScorecard();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runScorecard]);

  const save = async (publish: boolean) => {
    setSaving(true);
    setSaveMsg(null);
    setSaveErr(null);
    try {
      const res = await fetch("/api/admin/articles-editor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          excerpt: excerpt || null,
          content: body,
          category: category || null,
          tags,
          status: publish ? "published" : "draft",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveErr(json.error || "Save failed");
        return;
      }
      setSaveMsg(publish ? "Published." : "Draft saved.");
      setStatus(publish ? "published" : "draft");
      // If this was a new article, navigate to the slugged URL so
      // preview links resolve correctly.
      if (initialSlug === "new" && slug) {
        router.replace(`/admin/articles/editor/${slug}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const createPreviewLink = async () => {
    setPreviewErr(null);
    setPreviewLink(null);
    try {
      const res = await fetch("/api/admin/article-preview-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ttl_hours: 72 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.token) {
        setPreviewErr(json.error || "Couldn't create preview token");
        return;
      }
      setPreviewLink(`${window.location.origin}/preview/${json.token}`);
    } catch (err) {
      setPreviewErr(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
      {/* LEFT — form */}
      <div className="space-y-4">
        {!initialArticle && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Start from a template
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    templateSlug === t.slug
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">
                    {t.display_name}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {t.description}
                  </p>
                  {t.compliance_notes && (
                    <p className="text-[11px] text-amber-800 mt-1">
                      ⚠ {t.compliance_notes}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="block mb-3">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Slug (URL)
            </span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="investing-in-australian-shares"
              disabled={!!initialArticle}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono disabled:bg-slate-50 disabled:text-slate-500"
            />
          </label>

          <label className="block mb-3">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Investing in Australian shares: a practical guide"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block mb-3">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Excerpt (meta description, 50-160 chars)
            </span>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </span>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="beginners"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Tags (comma-separated)
              </span>
              <input
                value={tagsCsv}
                onChange={(e) => setTagsCsv(e.target.value)}
                placeholder="shares, beginners"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Body (markdown)</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {body.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={22}
              placeholder="Write the article body in markdown..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono leading-relaxed"
            />
          </label>
        </div>

        {/* Save / publish actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving || !slug || !title}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving || !slug || !title || scorecard?.grade === "F"}
              title={
                scorecard?.grade === "F"
                  ? "Fix the hard failures in the scorecard before publishing"
                  : "Publish immediately"
              }
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg"
            >
              {saving ? "Saving…" : "Save + publish"}
            </button>
            <button
              type="button"
              onClick={createPreviewLink}
              disabled={!slug}
              className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4 py-2 rounded-lg"
            >
              Generate preview link
            </button>
            <span className="text-xs text-slate-500">
              Status: <strong className="uppercase">{status}</strong>
            </span>
          </div>
          {saveMsg && (
            <p role="status" className="mt-3 text-xs text-emerald-700">
              {saveMsg}
            </p>
          )}
          {saveErr && (
            <p role="alert" className="mt-3 text-xs text-red-700">
              {saveErr}
            </p>
          )}
          {previewLink && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-semibold text-amber-900 mb-1">
                Preview link (72h expiry)
              </p>
              <code className="text-[11px] text-slate-900 break-all">
                {previewLink}
              </code>
            </div>
          )}
          {previewErr && (
            <p role="alert" className="mt-3 text-xs text-red-700">
              {previewErr}
            </p>
          )}
        </div>
      </div>

      {/* RIGHT — scorecard panel */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Live scorecard
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {scoring ? "Scoring…" : "Ready"}
              </p>
            </div>
            {scorecard && (
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-xl border-2 text-3xl font-extrabold ${
                  GRADE_COLOR[scorecard.grade] || GRADE_COLOR.F
                }`}
              >
                {scorecard.grade}
              </div>
            )}
          </div>

          {scorecard && (
            <>
              <div className="mb-3">
                <div className="text-[11px] text-slate-500 mb-1">Score</div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-500"
                    style={{ width: `${scorecard.score}%` }}
                    aria-hidden
                  />
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  {scorecard.score} / 100
                </div>
              </div>

              {scorecard.remediation.length > 0 ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                    Fix these ({scorecard.remediation.length})
                  </p>
                  <ul className="space-y-2">
                    {scorecard.remediation.map((r) => (
                      <li
                        key={r.code}
                        className={`rounded-lg border px-3 py-2 text-[11px] ${
                          r.severity === "hard"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        <p className="font-bold mb-0.5">
                          {r.severity === "hard" ? "⛔ " : "⚠ "}
                          {r.code}
                        </p>
                        <p className="leading-snug">{r.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  All checks passing. Ready to ship.
                </p>
              )}

              {scorecard.passed_checks.length > 0 && (
                <details className="mt-3">
                  <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-700">
                    {scorecard.passed_checks.length} passing check
                    {scorecard.passed_checks.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {scorecard.passed_checks.map((code) => (
                      <li
                        key={code}
                        className="text-[11px] text-slate-500 pl-4 before:content-['✓'] before:mr-1.5 before:text-emerald-600"
                      >
                        {code}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>

        {activeTemplate && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
              Template hints
            </p>
            <p className="text-sm font-bold text-slate-900 mb-1">
              {activeTemplate.display_name}
            </p>
            <p className="text-xs text-slate-600 leading-snug mb-3">
              {activeTemplate.description}
            </p>
            {activeTemplate.compliance_notes && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-3">
                <p className="text-[11px] font-bold text-amber-800">
                  Compliance note
                </p>
                <p className="text-[11px] text-amber-900 leading-snug">
                  {activeTemplate.compliance_notes}
                </p>
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              Target minimum: {activeTemplate.min_words} words
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
