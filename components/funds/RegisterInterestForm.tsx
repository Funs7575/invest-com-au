"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

interface Props {
  fundId?: number;
  fundTitle?: string;
  listingId?: number;
  /** Default investor type — SIV forms pre-set "foreign". */
  defaultInvestorType?: "retail" | "wholesale" | "smsf" | "foreign";
  /** Override CTA copy, e.g. "Get the SIV investor guide". */
  submitLabel?: string;
  /** Override heading copy. */
  heading?: string;
  /** Hide the investment amount range dropdown (e.g. for report gate). */
  hideAmountRange?: boolean;
}

const AMOUNT_RANGES = [
  { value: "", label: "Select range" },
  { value: "<50k", label: "Under $50,000" },
  { value: "50k-250k", label: "$50,000 – $250,000" },
  { value: "250k-1m", label: "$250,000 – $1,000,000" },
  { value: "1m+", label: "$1,000,000+" },
];

const INVESTOR_TYPES = [
  { value: "retail", label: "Retail investor" },
  { value: "wholesale", label: "Wholesale / sophisticated" },
  { value: "smsf", label: "SMSF trustee" },
  { value: "foreign", label: "Foreign / non-resident" },
];

/**
 * Register-interest form — posts to /api/developer-leads.
 *
 * Deliberately framed as "register interest" and not "apply" or
 * "invest". The form is an information request — the actual
 * investment must happen via the fund manager's PDS / IM.
 */
export default function RegisterInterestForm({
  fundId,
  fundTitle,
  listingId,
  defaultInvestorType = "retail",
  submitLabel = "Register interest",
  heading = "Register interest",
  hideAmountRange = false,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [amountRange, setAmountRange] = useState("");
  const [investorType, setInvestorType] = useState(defaultInvestorType);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/developer-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fund_id: fundId,
          listing_id: listingId,
          full_name: fullName,
          email,
          phone: phone || undefined,
          investment_amount_range: amountRange || undefined,
          investor_type: investorType,
          message: message || undefined,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!data.success) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
        <Icon name="check-circle" size={28} className="text-emerald-600 mb-2" />
        <h3 className="text-lg font-extrabold text-emerald-900 mb-2">
          Thanks — we&rsquo;ll be in touch
        </h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Your registration has been recorded. A member of our team (or the
          fund manager) will contact you within 2 business days with the fund
          documents and next steps.
        </p>
        <p className="text-[11px] text-emerald-800 mt-4 leading-relaxed">
          This is an information request, not an offer or application for a
          financial product. Review the PDS or IM before making any investment
          decision.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 space-y-4 shadow-sm"
    >
      <div>
        <h3 className="text-lg font-extrabold text-slate-900">{heading}</h3>
        {fundTitle && (
          <p className="text-xs text-slate-500 mt-0.5">
            for <strong className="text-slate-700">{fundTitle}</strong>
          </p>
        )}
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
          Full name *
        </label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          maxLength={120}
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
          Email *
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
          Phone
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          maxLength={40}
        />
      </div>

      {!hideAmountRange && (
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
            Investment amount
          </label>
          <select
            value={amountRange}
            onChange={(e) => setAmountRange(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
          >
            {AMOUNT_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
          Investor type *
        </label>
        <select
          required
          value={investorType}
          onChange={(e) =>
            setInvestorType(
              e.target.value as "retail" | "wholesale" | "smsf" | "foreign",
            )
          }
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
        >
          {INVESTOR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
          Message (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          rows={3}
          maxLength={2000}
        />
      </div>

      {error && (
        <div
          className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3"
          role="alert"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm px-4 py-3 rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting..." : submitLabel}
        {!submitting && <Icon name="arrow-right" size={14} />}
      </button>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Submitting this form is not an application for a financial product.
        The information you provide is used to connect you with the fund
        manager or their licensed representative. Review the relevant PDS or
        IM before making any investment decision.
      </p>
    </form>
  );
}
