"use client";

import { useState } from "react";
import Link from "next/link";

const STATUS_OPTIONS = [
  {
    value: "engaged",
    label: "Going well",
    desc: "We're working together",
    accent: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  {
    value: "completed",
    label: "It's wrapped up",
    desc: "The work is finished",
    accent: "border-slate-300 bg-white text-slate-800",
  },
  {
    value: "ended",
    label: "We didn't proceed",
    desc: "It didn't work out",
    accent: "border-slate-300 bg-white text-slate-800",
  },
] as const;

const FEE_BANDS = [
  { value: "under_500", label: "Under $500" },
  { value: "500_2k", label: "$500–$2k" },
  { value: "2k_5k", label: "$2k–$5k" },
  { value: "5k_10k", label: "$5k–$10k" },
  { value: "10k_plus", label: "$10k+" },
] as const;

interface Props {
  token: string;
  currentStatus: string;
  /** ?status= from the email's one-click links — pre-selects that option. */
  requestedStatus: string | null;
  showAnnual: boolean;
  annualSubmitted: boolean;
  initialRating: number | null;
  initialFeeBand: string | null;
}

export default function EngagementClient({
  token,
  currentStatus,
  requestedStatus,
  showAnnual,
  annualSubmitted,
  initialRating,
  initialFeeBand,
}: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [selected, setSelected] = useState<string | null>(
    requestedStatus && STATUS_OPTIONS.some((o) => o.value === requestedStatus)
      ? requestedStatus
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusSaved, setStatusSaved] = useState(false);

  // Annual review state
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [feeBand, setFeeBand] = useState<string>(initialFeeBand ?? "");
  const [consideringChange, setConsideringChange] = useState<boolean | null>(null);
  const [reviewDone, setReviewDone] = useState(annualSubmitted);
  const [rebriefUrl, setRebriefUrl] = useState<string | null>(null);

  async function saveStatus(value: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/engagement/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not save");
      setStatus(json.status as string);
      setStatusSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function saveAnnualReview() {
    if (rating < 1 || consideringChange === null) {
      setError("Pick a rating and answer the last question.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/engagement/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "annual_review",
          rating,
          fee_band: feeBand || null,
          considering_change: consideringChange,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not save");
      setReviewDone(true);
      setRebriefUrl((json.rebrief_url as string | null) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Status check-in ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-xs font-semibold text-slate-700 mb-3">
          Where things stand
          {statusSaved && (
            <span className="ml-2 text-emerald-600 font-semibold">Saved ✓</span>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((o) => {
            const isCurrent = status === o.value;
            const isSelected = selected === o.value;
            return (
              <button
                key={o.value}
                type="button"
                disabled={busy}
                onClick={() => {
                  setSelected(o.value);
                  void saveStatus(o.value);
                }}
                aria-pressed={isCurrent}
                className={`rounded-xl border px-3 py-3 text-left transition-colors disabled:opacity-60 ${
                  isCurrent || isSelected
                    ? "border-slate-900 ring-1 ring-slate-900"
                    : "border-slate-200 hover:border-slate-400"
                } ${o.accent}`}
              >
                <span className="block text-sm font-bold">{o.label}</span>
                <span className="block text-[11px] opacity-80">{o.desc}</span>
              </button>
            );
          })}
        </div>
        {status === "ended" && statusSaved && (
          <p className="mt-3 text-xs text-slate-600">
            Thanks for letting us know. If you&apos;d like to compare other
            verified pros, you can{" "}
            <Link
              href="/briefs/new"
              className="font-semibold text-emerald-700 underline underline-offset-2"
            >
              post a fresh request
            </Link>{" "}
            any time — it&apos;s free and your details stay private until you
            choose someone.
          </p>
        )}
      </div>

      {/* ── Annual review ── */}
      {showAnnual && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          {reviewDone ? (
            <div>
              <p className="text-sm font-bold text-slate-900 mb-1">
                Annual review saved ✓
              </p>
              <p className="text-xs text-slate-600">
                Thanks — this stays confidential.
              </p>
              {rebriefUrl && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs text-emerald-900">
                    You said you&apos;re considering a change. If it helps, you
                    can{" "}
                    <Link
                      href={rebriefUrl}
                      className="font-bold underline underline-offset-2"
                    >
                      compare other verified pros
                    </Link>{" "}
                    with a fresh request — pre-filled from your original, fully
                    anonymous until you choose.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  How would you rate the past year?
                </p>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating out of 5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                      onClick={() => setRating(n)}
                      className={`h-10 w-10 rounded-lg border text-lg ${
                        rating >= n
                          ? "border-amber-400 bg-amber-50 text-amber-500"
                          : "border-slate-200 text-slate-300 hover:border-slate-400"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-xs font-semibold text-slate-700">
                Roughly what did the year&apos;s advice cost?{" "}
                <span className="font-normal text-slate-400">(optional)</span>
                <select
                  value={feeBand}
                  onChange={(e) => setFeeBand(e.target.value)}
                  className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal bg-white"
                >
                  <option value="">Prefer not to say</option>
                  {FEE_BANDS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Are you considering a change of pro?
                </p>
                <div className="flex gap-2">
                  {[
                    { v: false, label: "No — staying put" },
                    { v: true, label: "Thinking about it" },
                  ].map((o) => (
                    <button
                      key={String(o.v)}
                      type="button"
                      aria-pressed={consideringChange === o.v}
                      onClick={() => setConsideringChange(o.v)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                        consideringChange === o.v
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 text-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={saveAnnualReview}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save annual review"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
