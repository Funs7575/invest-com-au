"use client";

import { useMemo, useState } from "react";

import type {
  IntakeOwnerKind,
  IntakeQuestion,
  IntakeQuestionKind,
} from "@/lib/pro-intake";

const KIND_LABELS: Record<IntakeQuestionKind, string> = {
  text: "Short text",
  number: "Number",
  select: "Choose one (dropdown)",
  phone: "Phone number",
  email: "Email address",
};

interface DraftQuestion {
  id?: number;
  prompt: string;
  kind: IntakeQuestionKind;
  options: string[];
  required: boolean;
  sort_order: number;
  enabled: boolean;
}

interface EditorProps {
  ownerKind: IntakeOwnerKind;
  ownerId: number;
  initial: IntakeQuestion[];
  /** Max 5 — surfaced from lib/pro-intake. */
  maxQuestions: number;
}

function toDraft(q: IntakeQuestion): DraftQuestion {
  return {
    id: q.id,
    prompt: q.prompt,
    kind: q.kind,
    options: [...q.options],
    required: q.required,
    sort_order: q.sort_order,
    enabled: q.enabled,
  };
}

function emptyDraft(sortOrder: number): DraftQuestion {
  return {
    prompt: "",
    kind: "text",
    options: [],
    required: true,
    sort_order: sortOrder,
    enabled: true,
  };
}

export default function IntakeQuestionsEditor({
  ownerKind,
  ownerId,
  initial,
  maxQuestions,
}: EditorProps) {
  const [drafts, setDrafts] = useState<DraftQuestion[]>(initial.map(toDraft));
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canAdd = drafts.length < maxQuestions;

  const ordered = useMemo(
    () =>
      [...drafts].sort(
        (a, b) => a.sort_order - b.sort_order || (a.id ?? 0) - (b.id ?? 0),
      ),
    [drafts],
  );

  function updateDraft(index: number, patch: Partial<DraftQuestion>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function removeDraftLocal(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  async function persist(index: number) {
    const draft = drafts[index];
    if (!draft) return;
    setSubmitting(index);
    setError(null);
    setSuccess(null);
    try {
      if (draft.id == null) {
        const res = await fetch("/api/intake/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_kind: ownerKind,
            owner_id: ownerId,
            prompt: draft.prompt,
            kind: draft.kind,
            options: draft.options,
            required: draft.required,
            sort_order: draft.sort_order,
            enabled: draft.enabled,
          }),
        });
        const json = (await res.json()) as { question?: IntakeQuestion; error?: string };
        if (!res.ok || !json.question) {
          throw new Error(json.error ?? "Failed to save.");
        }
        setDrafts((prev) =>
          prev.map((d, i) => (i === index ? toDraft(json.question as IntakeQuestion) : d)),
        );
        setSuccess("Question added.");
      } else {
        const res = await fetch(`/api/intake/questions/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: draft.prompt,
            kind: draft.kind,
            options: draft.options,
            required: draft.required,
            sort_order: draft.sort_order,
            enabled: draft.enabled,
          }),
        });
        const json = (await res.json()) as { question?: IntakeQuestion; error?: string };
        if (!res.ok || !json.question) {
          throw new Error(json.error ?? "Failed to save.");
        }
        setDrafts((prev) =>
          prev.map((d, i) => (i === index ? toDraft(json.question as IntakeQuestion) : d)),
        );
        setSuccess("Saved.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitting(null);
    }
  }

  async function deleteRemote(index: number) {
    const draft = drafts[index];
    if (!draft) return;
    if (draft.id == null) {
      removeDraftLocal(index);
      return;
    }
    if (!confirm("Delete this intake question?")) return;
    setSubmitting(index);
    setError(null);
    try {
      const res = await fetch(`/api/intake/questions/${draft.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Failed to delete.");
      }
      removeDraftLocal(index);
      setSuccess("Deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <p className="text-sm text-slate-600">
        Add up to {maxQuestions} short questions a consumer must answer after
        you accept their brief. Use them to qualify the lead and surface
        first-conversation context.
      </p>

      <ul className="space-y-4">
        {ordered.map((draft) => {
          const index = drafts.indexOf(draft);
          const isSelect = draft.kind === "select";
          return (
            <li
              key={draft.id ?? `new-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <label className="block text-sm">
                  <span className="font-semibold text-slate-700">Prompt</span>
                  <input
                    type="text"
                    value={draft.prompt}
                    onChange={(e) => updateDraft(index, { prompt: e.target.value })}
                    maxLength={240}
                    placeholder="e.g. What outcome are you hoping for in the next 12 months?"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold text-slate-700">Type</span>
                  <select
                    value={draft.kind}
                    onChange={(e) =>
                      updateDraft(index, { kind: e.target.value as IntakeQuestionKind })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {(Object.keys(KIND_LABELS) as IntakeQuestionKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {isSelect && (
                <label className="mt-3 block text-sm">
                  <span className="font-semibold text-slate-700">
                    Options (one per line, at least 2)
                  </span>
                  <textarea
                    value={draft.options.join("\n")}
                    onChange={(e) =>
                      updateDraft(index, {
                        options: e.target.value
                          .split(/\n/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </label>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.required}
                    onChange={(e) => updateDraft(index, { required: e.target.checked })}
                  />
                  Required
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(e) => updateDraft(index, { enabled: e.target.checked })}
                  />
                  Enabled
                </label>
                <label className="inline-flex items-center gap-2">
                  Sort
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={draft.sort_order}
                    onChange={(e) =>
                      updateDraft(index, {
                        sort_order: Number.parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => persist(index)}
                  disabled={submitting === index || draft.prompt.trim().length < 3}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {submitting === index ? "Saving…" : draft.id == null ? "Add" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteRemote(index)}
                  disabled={submitting === index}
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                >
                  {draft.id == null ? "Discard" : "Delete"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        disabled={!canAdd}
        onClick={() => setDrafts((prev) => [...prev, emptyDraft(prev.length)])}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
      >
        {canAdd ? "Add question" : `Max ${maxQuestions} questions reached`}
      </button>
    </div>
  );
}
