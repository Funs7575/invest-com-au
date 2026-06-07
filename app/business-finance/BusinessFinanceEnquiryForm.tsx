"use client";

import { useState, useId } from "react";
import Icon from "@/components/Icon";

const FINANCE_TYPES = [
  { value: "business_loan", label: "Business Loan" },
  { value: "equipment_finance", label: "Equipment Finance" },
  { value: "invoice_finance", label: "Invoice Finance" },
  { value: "line_of_credit", label: "Line of Credit" },
  { value: "trade_finance", label: "Trade Finance" },
  { value: "other", label: "Other / Not sure" },
];

export default function BusinessFinanceEnquiryForm() {
  const businessNameId = useId();
  const contactNameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const financeTypeId = useId();
  const loanAmountId = useId();
  const annualRevenueId = useId();
  const timeInBusinessId = useId();
  const purposeId = useId();
  const messageId = useId();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    const loanAmountRaw = fd.get("loan_amount") as string;
    const annualRevenueRaw = fd.get("annual_revenue") as string;
    const timeRaw = fd.get("time_in_business_months") as string;

    const body: Record<string, unknown> = {
      business_name: fd.get("business_name"),
      contact_name: fd.get("contact_name"),
      email: fd.get("email"),
      phone: fd.get("phone") || undefined,
      finance_type: fd.get("finance_type"),
      purpose: fd.get("purpose") || undefined,
      message: fd.get("message") || undefined,
      website: fd.get("website") || undefined,
    };
    if (loanAmountRaw) body.loan_amount = Number(loanAmountRaw);
    if (annualRevenueRaw) body.annual_revenue = Number(annualRevenueRaw);
    if (timeRaw) body.time_in_business_months = Number(timeRaw) * 12;

    try {
      const res = await fetch("/api/business-finance/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMsg(data.error ?? "Failed to submit. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Connection error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
          <Icon name="check-circle" size={24} className="text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-emerald-900">Enquiry received</h3>
        <p className="mt-1 text-sm text-emerald-700">
          We&apos;ve sent a confirmation to your email. A specialist will be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 md:p-8 space-y-4"
    >
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} aria-hidden="true" className="hidden" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={businessNameId} className="block text-xs font-semibold text-slate-700 mb-1">
            Business name <span className="text-red-500">*</span>
          </label>
          <input
            id={businessNameId}
            type="text"
            name="business_name"
            required
            maxLength={200}
            autoComplete="organization"
            placeholder="Acme Pty Ltd"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label htmlFor={contactNameId} className="block text-xs font-semibold text-slate-700 mb-1">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            id={contactNameId}
            type="text"
            name="contact_name"
            required
            maxLength={200}
            autoComplete="name"
            placeholder="Jane Smith"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label htmlFor={emailId} className="block text-xs font-semibold text-slate-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id={emailId}
            type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            name="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="jane@acme.com.au"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label htmlFor={phoneId} className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
          <input
            id={phoneId}
            type="tel"
            name="phone"
            maxLength={30}
            autoComplete="tel"
            placeholder="0400 000 000"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor={financeTypeId} className="block text-xs font-semibold text-slate-700 mb-1">
          Finance type <span className="text-red-500">*</span>
        </label>
        <select
          id={financeTypeId}
          name="finance_type"
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
        >
          <option value="">Select finance type…</option>
          {FINANCE_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor={loanAmountId} className="block text-xs font-semibold text-slate-700 mb-1">
            Amount needed (AUD)
          </label>
          <input
            id={loanAmountId}
            type="number"
            name="loan_amount"
            min={0}
            max={50_000_000}
            step={1000}
            inputMode="decimal"
            placeholder="e.g. 250000"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label htmlFor={annualRevenueId} className="block text-xs font-semibold text-slate-700 mb-1">
            Annual revenue (AUD)
          </label>
          <input
            id={annualRevenueId}
            type="number"
            name="annual_revenue"
            min={0}
            max={500_000_000}
            step={10000}
            inputMode="decimal"
            placeholder="e.g. 1200000"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label htmlFor={timeInBusinessId} className="block text-xs font-semibold text-slate-700 mb-1">
            Time in business (years)
          </label>
          <input
            id={timeInBusinessId}
            type="number"
            name="time_in_business_months"
            min={0}
            max={100}
            step={0.5}
            placeholder="e.g. 3"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor={purposeId} className="block text-xs font-semibold text-slate-700 mb-1">
          Purpose of funds
        </label>
        <input
          id={purposeId}
          type="text"
          name="purpose"
          maxLength={1000}
          placeholder="e.g. Purchase new equipment, expand to second location…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      <div>
        <label htmlFor={messageId} className="block text-xs font-semibold text-slate-700 mb-1">
          Additional notes
        </label>
        <textarea
          id={messageId}
          name="message"
          rows={3}
          maxLength={2000}
          placeholder="Any other details that would help us match you with the right specialist…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
        />
      </div>

      {status === "error" && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? "Submitting…" : "Submit Enquiry"}
      </button>

      <p className="text-center text-[0.65rem] text-slate-400">
        By submitting you agree to our privacy policy. General information only — not financial advice.
      </p>
    </form>
  );
}
