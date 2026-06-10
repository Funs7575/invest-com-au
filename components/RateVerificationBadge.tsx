"use client";

import { useState, useCallback } from "react";

interface Props {
  brokerId: number;
  brokerName: string;
  productKind: "savings" | "term_deposit";
  /** Current best-listed rate in bps — used to pre-fill the form. */
  listedRateBps?: number | null;
}

interface Stats {
  count: number;
  avgRateBps: number | null;
  recent: { rateBps: number; termMonths: number | null; verifiedAt: string }[];
}

type FormState = "idle" | "open" | "submitting" | "done" | "error";

export default function RateVerificationBadge({ brokerId, brokerName, productKind, listedRateBps }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [ratePct, setRatePct] = useState(
    listedRateBps ? (listedRateBps / 100).toFixed(2) : "",
  );
  const [comment, setComment] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadStats = useCallback(async () => {
    if (stats || statsLoading) return;
    setStatsLoading(true);
    try {
      const res = await fetch(
        `/api/rate-verifications?brokerId=${brokerId}&productKind=${productKind}`,
      );
      if (res.ok) setStats((await res.json()) as Stats);
    } catch {
      // silently ignore
    } finally {
      setStatsLoading(false);
    }
  }, [brokerId, productKind, stats, statsLoading]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const bps = Math.round(parseFloat(ratePct) * 100);
      if (!bps || bps <= 0 || bps >= 5000) {
        setErrorMsg("Please enter a valid rate between 0.01% and 49.99%.");
        return;
      }
      setFormState("submitting");
      setErrorMsg("");
      try {
        const res = await fetch("/api/rate-verifications", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            brokerId,
            productKind,
            verifiedRateBps: bps,
            comment: comment || null,
          }),
        });
        if (res.status === 401) {
          setErrorMsg("Please sign in to submit a rate verification.");
          setFormState("error");
          return;
        }
        if (res.status === 409) {
          setErrorMsg("You've already submitted for this product in the last 24 hours.");
          setFormState("error");
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setErrorMsg(body.error ?? "Could not submit. Try again shortly.");
          setFormState("error");
          return;
        }
        setFormState("done");
        setStats(null); // invalidate so it refetches if reopened
      } catch {
        setErrorMsg("Could not submit. Try again shortly.");
        setFormState("error");
      }
    },
    [brokerId, productKind, ratePct, comment],
  );

  const productLabel = productKind === "savings" ? "savings account" : "term deposit";

  return (
    <div className="mt-2">
      {/* Badge trigger */}
      <button
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        onClick={() => {
          if (formState === "open") {
            setFormState("idle");
          } else {
            setFormState("open");
            loadStats();
          }
        }}
        aria-expanded={formState === "open"}
      >
        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {statsLoading ? (
          "Loading…"
        ) : stats ? (
          stats.count > 0 ? (
            <>
              <span className="font-semibold text-emerald-600">{stats.count}</span> user{stats.count !== 1 ? "s" : ""} verified
              {stats.avgRateBps ? <> · avg <span className="font-semibold">{(stats.avgRateBps / 100).toFixed(2)}%</span></> : null}
            </>
          ) : (
            "Be the first to verify your rate"
          )
        ) : (
          "Verify your rate"
        )}
      </button>

      {/* Expandable panel */}
      {formState === "open" && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs motion-safe:animate-[fadeIn_0.2s_ease-out]">
          {/* Recent verifications */}
          {stats && stats.count > 0 && (
            <div className="mb-3">
              <p className="font-semibold text-slate-600 mb-1">Recent verified rates</p>
              <div className="space-y-0.5">
                {stats.recent.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-500">
                    <span className="text-emerald-600 font-semibold">{(r.rateBps / 100).toFixed(2)}%</span>
                    {r.termMonths ? <span>{r.termMonths}mo term</span> : null}
                    <span className="text-slate-500">· {new Date(r.verifiedAt).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <p className="font-semibold text-slate-700 mb-1">
              Got a {productLabel} with {brokerName}? Share your rate.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={ratePct}
                  onChange={(e) => setRatePct(e.target.value)}
                  step="0.01"
                  min="0.01"
                  max="49.99"
                  placeholder="e.g. 4.75"
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  aria-label="Your verified rate (%)"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">%</span>
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Submit
              </button>
            </div>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional: any notes about your experience"
              maxLength={500}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />
            {errorMsg && <p className="text-red-600 text-xs">{errorMsg}</p>}
            <p className="text-slate-500 text-[10px]">
              General information only. Your submission is reviewed before appearing publicly.
            </p>
          </form>
        </div>
      )}

      {formState === "done" && (
        <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          Thanks! A comparison email is on its way. Your rate will appear after review.
        </div>
      )}
    </div>
  );
}
