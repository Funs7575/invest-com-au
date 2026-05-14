"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { ScopeItem } from "@/lib/expert-teams/fixed-quotes";

interface Props {
  token: string;
  status: string;
  amountCents: number;
  scopeItems: ScopeItem[];
  paymentTerms: string | null;
  deliveryDaysEstimate: number | null;
  expiresAt: string;
}

function fmtAud(cents: number): string {
  return `A$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function QuoteReviewForm(props: Props) {
  const [status, setStatus] = useState<string>(props.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const expired = status === "expired" || (status === "sent" && new Date(props.expiresAt).getTime() < Date.now());

  async function accept() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${props.token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not accept");
      }
      setStatus("accepted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept");
    } finally {
      setSubmitting(false);
    }
  }

  async function decline() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${props.token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason.trim() || null }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not decline");
      }
      setStatus("declined");
      setShowDeclineForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decline");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "accepted") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-3">
          <Icon name="check" size={24} className="text-emerald-700" />
        </div>
        <h2 className="text-lg font-bold text-emerald-900 mb-1">Quote accepted</h2>
        <p className="text-sm text-emerald-800">
          The squad has been notified and will be in touch with payment details + kickoff steps.
        </p>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
        <p className="text-sm font-bold text-slate-900">Quote declined</p>
        <p className="text-xs text-slate-500 mt-1">
          The squad has been notified. You can ask for a revised quote via your Quote Status page.
        </p>
      </div>
    );
  }

  if (status === "withdrawn") {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
        <p className="text-sm font-bold text-slate-900">Quote withdrawn</p>
        <p className="text-xs text-slate-500 mt-1">
          The squad withdrew this quote before you acted on it.
        </p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <p className="text-sm font-bold text-amber-900">This quote has expired</p>
        <p className="text-xs text-amber-800 mt-1">
          Ask the squad to issue a fresh quote.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Amount */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-1">
          Total
        </p>
        <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          {fmtAud(props.amountCents)}
        </p>
        {props.deliveryDaysEstimate && (
          <p className="text-xs text-slate-500 mt-1">
            Estimated delivery: {props.deliveryDaysEstimate} days
          </p>
        )}
        <p className="text-[10px] text-slate-400 mt-2">
          Valid until {new Date(props.expiresAt).toLocaleDateString("en-AU", { dateStyle: "long" })}
        </p>
      </section>

      {/* Scope */}
      {props.scopeItems.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            What&apos;s included
          </h2>
          <ul className="space-y-2">
            {props.scopeItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                <Icon name="check" size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <span className="flex-1">
                  {item.label}
                  {item.estimated_hours && (
                    <span className="text-slate-400 ml-1.5">
                      (~{item.estimated_hours}h)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Payment terms */}
      {props.paymentTerms && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-2">
            Payment terms
          </h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {props.paymentTerms}
          </p>
        </section>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">{error}</p>
      )}

      {/* Actions */}
      {!showDeclineForm ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => void accept()}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 text-slate-900 font-bold text-base px-5 py-3 rounded-xl"
          >
            {submitting ? "Submitting…" : "Accept quote"}
            <Icon name="check" size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowDeclineForm(true)}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-sm px-5 py-3 rounded-xl"
          >
            Decline
          </button>
        </div>
      ) : (
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <label className="block text-sm font-semibold text-slate-900">
            Reason (optional)
          </label>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="What didn't work for you? (Helps the squad send a better quote next time.)"
            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void decline()}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-200 text-white font-bold text-sm px-4 py-2 rounded-lg"
            >
              Confirm decline
            </button>
            <button
              type="button"
              onClick={() => setShowDeclineForm(false)}
              className="inline-flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <p className="text-[10px] text-slate-400 text-center">
        General information only — not personal advice. The Pro Squad delivers the service under their own licence.
      </p>
    </div>
  );
}
