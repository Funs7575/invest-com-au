"use client";

import { useState } from "react";
import type { Professional } from "@/lib/types";

interface DraftResult {
  bio: string;
  specialties: string[];
  service_lines: string[];
  tagline: string;
  flags: string[];
}

interface Props {
  /** Called with a partial Professional pre-filled from the AI draft.
   *  The caller pushes it into the editor so the admin can review +
   *  edit + save through the existing flow. */
  onApply: (draft: Partial<Professional> & { _ai_flags?: string[]; _ai_service_lines?: string[] }) => void;
  onClose: () => void;
}

// FIN_NOTEBOOK item 19 — admin UI for /api/admin/advisors/draft-profile.
// Modal-based so the existing single-advisor-edit form keeps its scope.
// The draft lands as a Partial<Professional> in the editor; the admin
// reviews everything (especially the `flags`) before clicking Save.
export default function AdvisorAIDraftModal({ onApply, onClose }: Props) {
  const [name, setName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [type, setType] = useState("financial_planner");
  const [background, setBackground] = useState("");
  const [references, setReferences] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const refs = references
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/advisors/draft-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          firm_name: firmName.trim() || undefined,
          type: type.trim(),
          background: background.trim(),
          references: refs.length > 0 ? refs : undefined,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Draft failed: HTTP ${res.status}`);
      }

      const body = (await res.json()) as { draft: DraftResult };
      setResult(body.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply({
      name: name.trim(),
      firm_name: firmName.trim() || undefined,
      type: type as Professional["type"],
      bio: result.bio,
      specialties: result.specialties,
      _ai_service_lines: result.service_lines,
      _ai_flags: result.flags,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="ai-draft-title">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 id="ai-draft-title" className="text-lg font-bold">
            Draft advisor profile with AI
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Paste only facts the advisor (or their public profile) gave you. The AI is
          instructed not to invent qualifications, dollar figures, or firm history —
          anything it can&apos;t directly substantiate lands in the <strong>flags</strong> list
          for you to verify before saving.
        </p>

        {!result && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Advisor name *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Sarah Chen"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Firm name</label>
              <input
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Chen Advisory"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Advisor type *</label>
              <input
                required
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="financial_planner"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Background notes * (min 20 chars)
              </label>
              <textarea
                required
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="20 years CFP, partner at Macquarie 2014–2024, niche in UK pension transfer, $50M AUM..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Public references (one URL per line, max 5)
              </label>
              <textarea
                value={references}
                onChange={(e) => setReferences(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-xs"
                placeholder="https://linkedin.com/in/...&#10;https://fofa.gov.au/..."
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? "Drafting..." : "Draft with Claude"}
              </button>
              <button type="button" onClick={onClose} className="px-6 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        )}

        {result && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">Tagline</h3>
              <p className="text-sm text-slate-900">{result.tagline}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">Bio</h3>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{result.bio}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">Specialties</h3>
              <div className="flex flex-wrap gap-1.5">
                {result.specialties.map((s, i) => (
                  <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">Service lines</h3>
              <div className="flex flex-wrap gap-1.5">
                {result.service_lines.map((s, i) => (
                  <span key={i} className="text-xs bg-emerald-50 text-emerald-800 px-2 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            {result.flags.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-1">
                  Flags — verify before saving
                </h3>
                <ul className="text-xs text-amber-900 space-y-1 list-disc pl-4">
                  {result.flags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleApply}
                className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg text-sm hover:bg-emerald-700"
              >
                Push into editor
              </button>
              <button
                onClick={() => setResult(null)}
                className="px-6 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
