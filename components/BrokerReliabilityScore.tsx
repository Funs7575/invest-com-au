"use client";

import { useState, useCallback } from "react";

interface Props {
  brokerId: number;
  brokerName: string;
}

interface ScoreData {
  score: number;
  label: string;
  totalReports: number;
  components: {
    uptime: number;
    feeTransparency: number;
    withdrawal: number;
    support: number;
    sentiment: number;
  };
}

const EVENT_TYPES = [
  { value: "platform_outage", label: "Platform outage / downtime", negative: true },
  { value: "hidden_fees", label: "Unexpected or hidden fees", negative: true },
  { value: "withdrawal_delay", label: "Withdrawal delay", negative: true },
  { value: "poor_support", label: "Poor customer support", negative: true },
  { value: "positive_experience", label: "Positive overall experience", negative: false },
] as const;

function scoreColor(score: number): string {
  if (score >= 70) return "#10b981"; // emerald
  if (score >= 50) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

export default function BrokerReliabilityScore({ brokerId, brokerName }: Props) {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [error, setError] = useState("");

  const loadScore = useCallback(async () => {
    if (data || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/broker-reliability?brokerId=${brokerId}`);
      if (res.ok) setData((await res.json()) as ScoreData);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [brokerId, data, loading]);

  const handleToggle = useCallback(() => {
    if (!open) loadScore();
    setOpen((v) => !v);
  }, [open, loadScore]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedEvent) {
        setError("Please select an event type.");
        return;
      }
      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/broker-reliability", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ brokerId, eventType: selectedEvent, description: description || null }),
        });
        if (res.status === 401) {
          setError("Please sign in to submit a report.");
        } else if (res.status === 409) {
          setError("You've already reported this today.");
        } else if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? "Could not submit. Try again shortly.");
        } else {
          setSubmitDone(true);
          setFormOpen(false);
          setData(null); // invalidate so score reloads
        }
      } catch {
        setError("Could not submit. Try again shortly.");
      } finally {
        setSubmitting(false);
      }
    },
    [brokerId, selectedEvent, description],
  );

  return (
    <div className="mt-3">
      <button
        onClick={handleToggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        {loading ? "Loading…" : data ? (
          <>
            Reliability: <span className="font-semibold" style={{ color: scoreColor(data.score) }}>{Math.round(data.score)}/100</span>
            {" "}· {data.label}
          </>
        ) : (
          "Reliability score"
        )}
      </button>

      {open && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs motion-safe:animate-[fadeIn_0.2s_ease-out]">
          {data && data.totalReports > 0 ? (
            <>
              {/* Score + components */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="text-2xl font-extrabold shrink-0"
                  style={{ color: scoreColor(data.score) }}
                >
                  {Math.round(data.score)}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{data.label}</div>
                  <div className="text-slate-400 text-[10px]">
                    Based on {data.totalReports} community report{data.totalReports !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {[
                  { key: "uptime", label: "Uptime" },
                  { key: "feeTransparency", label: "Fee clarity" },
                  { key: "withdrawal", label: "Withdrawals" },
                  { key: "support", label: "Support" },
                ].map(({ key, label }) => {
                  const v = data.components[key as keyof typeof data.components] ?? 0;
                  return (
                    <div key={key} className="bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                      <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
                      <div className="text-sm font-bold" style={{ color: scoreColor(v) }}>{v}</div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-slate-500 mb-3">
              No verified reports yet for {brokerName}. Be the first to share your experience.
            </p>
          )}

          {/* Report form toggle */}
          {!submitDone && (
            <button
              onClick={() => setFormOpen((v) => !v)}
              className="text-[11px] text-blue-600 hover:underline mb-2"
            >
              {formOpen ? "Cancel" : "Report your experience →"}
            </button>
          )}

          {submitDone && (
            <p className="text-emerald-700 text-[11px]">Thanks! Your report is under review.</p>
          )}

          {formOpen && (
            <form onSubmit={handleSubmit} className="space-y-2 mt-1">
              <div className="grid grid-cols-1 gap-1">
                {EVENT_TYPES.map((et) => (
                  <label key={et.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="eventType"
                      value={et.value}
                      checked={selectedEvent === et.value}
                      onChange={() => setSelectedEvent(et.value)}
                      className="text-blue-600"
                    />
                    <span className={et.negative ? "text-slate-700" : "text-emerald-700 font-medium"}>
                      {et.label}
                    </span>
                  </label>
                ))}
              </div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: brief description"
                maxLength={500}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
              {error && <p className="text-red-600 text-[11px]">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit report"}
              </button>
              <p className="text-slate-400 text-[10px]">
                General information only. Reports are reviewed before appearing publicly.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
