"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { logger } from "@/lib/logger";
import {
  MAX_STEPS_PER_SEQUENCE,
  MAX_SUBJECT_LEN,
  MAX_BODY_LEN,
  MAX_SEQUENCE_NAME_LEN,
  MAX_DAY_OFFSET,
} from "@/lib/advisor-portal/crm-constants";
import {
  renderSubject,
  renderBodyText,
  SEED_SEQUENCE_TEMPLATES,
  MERGE_FIELDS,
  type MergeContext,
} from "@/lib/advisor-portal/sequences";
import type { Sequence } from "./types";

const log = logger("advisor-portal-seq-editor");

type DraftStep = { day_offset: number; subject: string; body: string };

type Props = {
  /** Existing sequence to edit, or null to create a new one. */
  sequence: Sequence | null;
  /** Preview context — the signed-in adviser's name/firm + a sample lead name. */
  previewCtx: MergeContext;
  onClose: () => void;
  onSaved: (sequence: Sequence) => void;
  onDeleted: (sequenceId: number) => void;
};

const BLANK_STEP: DraftStep = { day_offset: 0, subject: "", body: "" };

export default function SequenceEditor({ sequence, previewCtx, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(sequence?.name ?? "");
  const [steps, setSteps] = useState<DraftStep[]>(
    sequence?.steps.length
      ? sequence.steps.map((s) => ({ day_offset: s.day_offset, subject: s.subject, body: s.body }))
      : [{ ...BLANK_STEP }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  const updateStep = (i: number, patch: Partial<DraftStep>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const addStep = () =>
    setSteps((prev) => (prev.length >= MAX_STEPS_PER_SEQUENCE ? prev : [...prev, { ...BLANK_STEP }]));

  const removeStep = (i: number) =>
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const applyTemplate = (tplIndex: number) => {
    const tpl = SEED_SEQUENCE_TEMPLATES[tplIndex];
    if (!tpl) return;
    setName((n) => n || tpl.name);
    setSteps(tpl.steps.map((s) => ({ day_offset: s.day_offset, subject: s.subject, body: s.body })));
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Give the sequence a name.";
    if (steps.length === 0) return "Add at least one step.";
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]!;
      if (!s.subject.trim()) return `Step ${i + 1}: add a subject.`;
      if (s.subject.length > MAX_SUBJECT_LEN) return `Step ${i + 1}: subject too long.`;
      if (!s.body.trim()) return `Step ${i + 1}: add a message.`;
      if (s.body.length > MAX_BODY_LEN) return `Step ${i + 1}: message too long.`;
      if (s.day_offset < 0 || s.day_offset > MAX_DAY_OFFSET) return `Step ${i + 1}: day must be 0–${MAX_DAY_OFFSET}.`;
    }
    return null;
  };

  const save = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError(null);
    try {
      const isEdit = !!sequence;
      const res = await fetch("/api/advisor-portal/sequences", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { sequence_id: sequence!.id, name: name.trim(), steps }
            : { name: name.trim(), steps },
        ),
      });
      if (!res.ok) {
        setError("Couldn't save sequence.");
        return;
      }
      if (isEdit) {
        onSaved({
          ...sequence!,
          name: name.trim(),
          steps: steps.map((s, i) => ({ ...s, position: i })),
        });
      } else {
        const { sequence: created } = (await res.json()) as { sequence: Sequence };
        onSaved(created);
      }
      onClose();
    } catch (err) {
      log.warn("save sequence failed", { err: String(err) });
      setError("Couldn't save sequence.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!sequence) return;
    setSaving(true);
    try {
      const res = await fetch("/api/advisor-portal/sequences", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence_id: sequence.id }),
      });
      if (res.ok) { onDeleted(sequence.id); onClose(); }
      else setError("Couldn't delete sequence.");
    } catch (err) {
      log.warn("delete sequence failed", { err: String(err) });
      setError("Couldn't delete sequence.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Sequence editor">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900">{sequence ? "Edit sequence" : "New follow-up sequence"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <Icon name="x-circle" size={20} />
          </button>
        </div>

        {!sequence && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <span className="text-[0.65rem] text-slate-500 self-center">Start from a template:</span>
            {SEED_SEQUENCE_TEMPLATES.map((tpl, i) => (
              <button
                key={tpl.name}
                type="button"
                onClick={() => applyTemplate(i)}
                className="text-[0.65rem] font-semibold px-2 py-1 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                {tpl.name}
              </button>
            ))}
          </div>
        )}

        <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="seq-name">Name</label>
        <input
          id="seq-name"
          type="text"
          value={name}
          maxLength={MAX_SEQUENCE_NAME_LEN}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. New enquiry follow-up"
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />

        <p className="text-[0.65rem] text-slate-500 mb-3">
          Merge fields you can use:{" "}
          {MERGE_FIELDS.map((f) => (
            <code key={f} className="bg-slate-100 rounded px-1 mx-0.5 text-slate-600">{`{{${f}}}`}</code>
          ))}
          . Plain text only — no HTML. Replies go to your email.
        </p>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Step {i + 1}</span>
                <div className="flex items-center gap-2">
                  <label className="text-[0.65rem] text-slate-500" htmlFor={`day-${i}`}>Send on day</label>
                  <input
                    id={`day-${i}`}
                    type="number"
                    min={0}
                    max={MAX_DAY_OFFSET}
                    value={step.day_offset}
                    onChange={(e) => updateStep(i, { day_offset: Math.max(0, Math.min(MAX_DAY_OFFSET, Number(e.target.value) || 0)) })}
                    className="w-14 text-xs px-1.5 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`} className="text-slate-300 hover:text-red-500">
                      <Icon name="trash-2" size={14} />
                    </button>
                  )}
                </div>
              </div>
              <label className="sr-only" htmlFor={`subject-${i}`}>Step {i + 1} subject</label>
              <input
                id={`subject-${i}`}
                type="text"
                value={step.subject}
                maxLength={MAX_SUBJECT_LEN}
                onChange={(e) => updateStep(i, { subject: e.target.value })}
                placeholder="Subject"
                className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <label className="sr-only" htmlFor={`body-${i}`}>Step {i + 1} message</label>
              <textarea
                id={`body-${i}`}
                value={step.body}
                maxLength={MAX_BODY_LEN}
                onChange={(e) => updateStep(i, { body: e.target.value })}
                placeholder="Message (plain text)…"
                rows={4}
                className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[0.6rem] text-slate-400">{step.body.length}/{MAX_BODY_LEN}</span>
                <button
                  type="button"
                  onClick={() => setPreviewIdx(previewIdx === i ? null : i)}
                  className="text-[0.65rem] font-semibold text-violet-600 hover:text-violet-800"
                  aria-expanded={previewIdx === i}
                >
                  {previewIdx === i ? "Hide preview" : "Preview"}
                </button>
              </div>
              {previewIdx === i && (
                <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <p className="text-[0.65rem] font-bold text-slate-700">
                    {renderSubject(step.subject, previewCtx) || <span className="text-slate-400">No subject</span>}
                  </p>
                  <pre className="text-[0.65rem] text-slate-600 whitespace-pre-wrap font-sans mt-1">
                    {renderBodyText(step.body, previewCtx) || <span className="text-slate-400">No message</span>}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {steps.length < MAX_STEPS_PER_SEQUENCE && (
          <button
            type="button"
            onClick={addStep}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
          >
            <Icon name="plus-circle" size={14} /> Add step ({steps.length}/{MAX_STEPS_PER_SEQUENCE})
          </button>
        )}

        {error && <p role="alert" className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          {sequence ? (
            <button type="button" onClick={remove} disabled={saving} className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50">
              Delete
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="text-xs font-semibold text-slate-600 px-3 py-2 hover:text-slate-800">Cancel</button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save sequence"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
