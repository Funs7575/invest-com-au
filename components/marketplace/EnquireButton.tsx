"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

/**
 * Inline enquire CTA for marketplace listing cards.
 *
 * POSTs to the existing /api/listings/enquire endpoint (which
 * writes to listing_enquiries and sends the seller an email).
 *
 * Kept self-contained so it can drop into any listing card
 * without plumbing a shared modal at the page level.
 */

interface Props {
  listingId: number;
  listingTitle: string;
  /** Tailwind classes for the trigger button — should match host page accent */
  buttonCls: string;
}

const INVESTOR_TYPES = [
  { value: "domestic", label: "Australian resident" },
  { value: "individual", label: "Individual" },
  { value: "corporate", label: "Corporate" },
  { value: "family_office", label: "Family office" },
  { value: "foreign_individual", label: "Foreign individual" },
  { value: "foreign_corporate", label: "Foreign corporate" },
  { value: "visa_applicant", label: "SIV / visa applicant" },
];

export default function EnquireButton({
  listingId,
  listingTitle,
  buttonCls,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [investorType, setInvestorType] = useState("individual");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/listings/enquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          user_name: name,
          user_email: email,
          user_phone: phone || undefined,
          investor_type: investorType,
          message: message || undefined,
          source_page:
            typeof window !== "undefined" ? window.location.pathname : null,
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

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // Cards are often wrapped in a Next.js <Link> — stop the
          // click from bubbling up and navigating away.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 font-bold text-xs px-3 py-2 rounded-lg transition-colors ${buttonCls}`}
      >
        Enquire
        <Icon name="arrow-right" size={12} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              <div>
                <Icon
                  name="check-circle"
                  size={28}
                  className="text-emerald-600 mb-3"
                />
                <h3 className="text-lg font-extrabold text-slate-900 mb-2">
                  Thanks — enquiry sent
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  The listing contact will get in touch within 2 business days
                  with the full information pack.
                </p>
                <p className="text-[11px] text-slate-500 mb-5">
                  This is an information request, not an offer. Review the
                  relevant PDS / IM and take personal financial advice before
                  committing capital.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className={`w-full font-bold text-sm px-4 py-2.5 rounded-lg ${buttonCls}`}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Enquire
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    About <strong>{listingTitle}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    Full name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={120}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
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
                    maxLength={200}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
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
                    maxLength={40}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    Investor type
                  </label>
                  <select
                    value={investorType}
                    onChange={(e) => setInvestorType(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
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
                    maxLength={2000}
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3"
                  >
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`flex-1 font-bold text-sm px-4 py-2.5 rounded-lg disabled:bg-slate-400 ${buttonCls}`}
                  >
                    {submitting ? "Sending..." : "Send enquiry"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-800 px-3"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Information request only — not an offer of a financial
                  product. Review the relevant PDS / IM before investing.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
