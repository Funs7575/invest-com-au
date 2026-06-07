"use client";

import { useState, useCallback } from "react";

interface Props {
  advisorSlug: string;
  feeStructure?: string | null;
  feeDescription?: string | null;
  hourlyRateCents?: number | null;
  flatFeeCents?: number | null;
  aumPercentage?: number | null;
}

function buildFeeContext(props: Props): string {
  const parts: string[] = [];

  if (props.feeStructure) parts.push(`Fee model: ${props.feeStructure}.`);
  if (props.feeDescription) parts.push(`Fee description: ${props.feeDescription}.`);
  if (props.hourlyRateCents) parts.push(`Hourly rate: $${(props.hourlyRateCents / 100).toFixed(0)}/hr.`);
  if (props.flatFeeCents) parts.push(`Flat fee: $${(props.flatFeeCents / 100).toLocaleString("en-AU")}.`);
  if (props.aumPercentage) parts.push(`AUM fee: ${props.aumPercentage}% per annum.`);

  return parts.join(" ");
}

export default function AdvisorFeeOpinionButton(props: Props) {
  const { advisorSlug } = props;
  const [opinion, setOpinion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const feeContext = buildFeeContext(props);

  const handleOpinion = useCallback(async () => {
    if (open) {
      setOpen(false);
      return;
    }

    if (opinion) {
      setOpen(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/advisor/fee-opinion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ advisorSlug, feeContext }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not load fee context. Try again shortly.");
        setOpen(true);
        return;
      }

      const data = (await res.json()) as { opinion?: string };
      setOpinion(data.opinion ?? "");
      setOpen(true);
    } catch {
      setError("Could not load fee context. Try again shortly.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, [open, opinion, advisorSlug, feeContext]);

  if (!feeContext) return null;

  return (
    <div className="mt-3">
      <button
        onClick={handleOpinion}
        disabled={loading}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg aria-hidden="true" className="w-3.5 h-3.5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading market context…
          </>
        ) : open ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Hide fee context
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            How does this fee compare?
          </>
        )}
      </button>

      {open && (
        <div className="mt-2 p-3 md:p-4 bg-blue-50/60 border border-blue-100 rounded-xl text-xs md:text-sm text-slate-700 leading-relaxed motion-safe:animate-[fadeIn_0.25s_ease-out]">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            <p className="whitespace-pre-line">{opinion}</p>
          )}
        </div>
      )}
    </div>
  );
}
