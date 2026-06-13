"use client";

import { useState } from "react";
import type { BriefMessageRow } from "@/lib/brief-messages";

interface Props {
  slug: string;
  onClose: () => void;
  onProposed: (message: BriefMessageRow) => void;
}

interface SlotDraft {
  /** datetime-local value, e.g. "2026-06-13T14:00". */
  when: string;
  durationMinutes: number;
}

const DURATIONS = [15, 30, 45, 60];

/**
 * Adviser-side composer: pick 2–3 specific datetimes to offer the consumer.
 * Posts to /api/briefs/[slug]/propose-times which creates the free
 * appointment slots + a proposal chat message. Client-safe (imports only a type).
 */
export default function ProposeTimesComposer({ slug, onClose, onProposed }: Props) {
  const [slots, setSlots] = useState<SlotDraft[]>([
    { when: "", durationMinutes: 30 },
    { when: "", durationMinutes: 30 },
  ]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<SlotDraft>) => {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addSlot = () => {
    setSlots((prev) =>
      prev.length >= 3 ? prev : [...prev, { when: "", durationMinutes: 30 }],
    );
  };

  const removeSlot = (i: number) => {
    setSlots((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  };

  async function submit() {
    setError(null);
    const filled = slots.filter((s) => s.when.trim() !== "");
    if (filled.length === 0) {
      setError("Add at least one time.");
      return;
    }
    // Convert datetime-local (local wall-clock) to an ISO instant for the API.
    const payloadSlots = filled.map((s) => {
      const d = new Date(s.when);
      return { startsAt: d.toISOString(), durationMinutes: s.durationMinutes };
    });
    if (payloadSlots.some((s) => Number.isNaN(new Date(s.startsAt).getTime()))) {
      setError("One of the times is invalid.");
      return;
    }
    if (payloadSlots.some((s) => new Date(s.startsAt).getTime() <= Date.now())) {
      setError("Times must be in the future.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/briefs/${slug}/propose-times`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: payloadSlots,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: BriefMessageRow;
      };
      if (!res.ok || !json.message) {
        throw new Error(json.error ?? "Could not propose times.");
      }
      onProposed(json.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not propose times.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
      <p className="text-xs font-semibold text-slate-700">Propose meeting times</p>
      <div className="space-y-2">
        {slots.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={s.when}
              onChange={(e) => update(i, { when: e.target.value })}
              aria-label={`Proposed time ${i + 1}`}
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            />
            <select
              value={s.durationMinutes}
              onChange={(e) => update(i, { durationMinutes: Number(e.target.value) })}
              aria-label={`Duration for time ${i + 1}`}
              className="rounded-lg border border-slate-300 px-1.5 py-1.5 text-xs"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}m
                </option>
              ))}
            </select>
            {slots.length > 1 && (
              <button
                type="button"
                onClick={() => removeSlot(i)}
                aria-label={`Remove time ${i + 1}`}
                className="text-slate-400 hover:text-red-600 text-sm px-1"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {slots.length < 3 && (
        <button
          type="button"
          onClick={addSlot}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          + Add another time
        </button>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Optional note (e.g. 'I'll call you on the number you provided')"
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
      />
      {error && (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="rounded-xl bg-slate-900 text-white text-xs font-semibold px-3 py-2 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send proposal"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
