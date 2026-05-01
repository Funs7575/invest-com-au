"use client";

import { useState } from "react";

interface Props {
  professionalId: number;
  firmName: string;
}

/**
 * Enquiry form for the full-service stockbroker detail page.
 *
 * Posts to the existing /api/advisor-enquiry endpoint — the firm rows
 * live in the same `professionals` table as financial advisors, so the
 * lead-routing, wallet/credit-billing and email-notification pipeline
 * is shared. We reuse it rather than duplicate it.
 *
 * Form pattern matches the audited submit guards: AbortController
 * timeout, double-submit guard, surfaced server error messages.
 */
export default function FullServiceBrokerEnquiryForm({
  professionalId,
  firmName,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const fullMessage = portfolio
        ? `Approximate portfolio: ${portfolio}\n\n${message.trim()}`
        : message.trim();

      const res = await fetch("/api/advisor-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professional_id: professionalId,
          user_name: name.trim(),
          user_email: email.trim().toLowerCase(),
          user_phone: phone.trim() || undefined,
          message: fullMessage || `Enquiry about ${firmName}`,
          source_page: typeof window !== "undefined" ? window.location.pathname : "/brokers/full-service",
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Couldn't send your enquiry. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("The request timed out. Please check your connection and try again.");
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
        <div className="text-2xl mb-2">📨</div>
        <h3 className="text-base font-bold text-emerald-900 mb-1">Enquiry sent</h3>
        <p className="text-sm text-emerald-700 leading-relaxed">
          We&apos;ve forwarded your details to {firmName}. They typically
          respond within 1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="fsb-name" className="block text-xs font-semibold text-slate-700 mb-1">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            id="fsb-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            autoComplete="name"
            required
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="fsb-email" className="block text-xs font-semibold text-slate-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="fsb-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            autoComplete="email"
            required
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="fsb-phone" className="block text-xs font-semibold text-slate-700 mb-1">
            Phone <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="fsb-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
            autoComplete="tel"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="fsb-portfolio" className="block text-xs font-semibold text-slate-700 mb-1">
            Portfolio size <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select
            id="fsb-portfolio"
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 disabled:opacity-60"
          >
            <option value="">Select…</option>
            <option value="Under $100k">Under $100k</option>
            <option value="$100k–$250k">$100k–$250k</option>
            <option value="$250k–$500k">$250k–$500k</option>
            <option value="$500k–$1M">$500k–$1M</option>
            <option value="$1M–$5M">$1M–$5M</option>
            <option value="Over $5M">Over $5M</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="fsb-message" className="block text-xs font-semibold text-slate-700 mb-1">
          Message <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="fsb-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={submitting}
          rows={4}
          placeholder="What are you looking for help with?"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 disabled:opacity-60 resize-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending..." : `Enquire about ${firmName}`}
      </button>

      <p className="text-[0.65rem] text-slate-500 text-center leading-relaxed">
        General information only — not personal financial advice. {firmName} is
        responsible for any advice they give you and operates under their own
        AFSL.
      </p>
    </form>
  );
}
