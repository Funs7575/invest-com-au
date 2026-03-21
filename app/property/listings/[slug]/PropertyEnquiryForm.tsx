"use client";

import { useState } from "react";
import Link from "next/link";
import { ENQUIRY_CONSENT_TEXT } from "@/lib/compliance";
import { trackEvent } from "@/lib/tracking";

const BUDGET_OPTIONS = [
  "Under $500k",
  "$500k – $750k",
  "$750k – $1M",
  "$1M – $1.5M",
  "$1.5M – $2M",
  "$2M+",
];

const TIMELINE_OPTIONS = [
  "Ready to buy now",
  "Within 3 months",
  "Within 6 months",
  "Just researching",
];

export default function PropertyEnquiryForm({
  listingId,
  listingTitle,
  developerName,
}: {
  listingId: number;
  listingTitle: string;
  developerName: string;
}) {
  const [form, setForm] = useState({
    user_name: "",
    user_email: "",
    user_phone: "",
    user_country: "Australia",
    investment_budget: "",
    timeline: "",
    user_message: "",
    consent: false,
    // Honeypots
    website: "",
    fax: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/property/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          ...form,
          source_page: window.location.pathname,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
        trackEvent("property_enquiry_submitted", {
          listing_id: listingId,
          listing_title: listingTitle,
          developer_name: developerName,
          budget: form.investment_budget,
          timeline: form.timeline,
        });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="font-bold text-emerald-900 mb-1">Enquiry Sent!</h3>
        <p className="text-sm text-emerald-700">
          {developerName} will be in touch within 24–48 hours. No obligation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-slate-200 rounded-2xl p-5">
      <h3 className="text-base font-bold text-slate-900 mb-1">Enquire About {listingTitle}</h3>
      <p className="text-xs text-slate-400 mb-4">Free, no obligation. {developerName} responds within 24–48 hours.</p>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Full name *"
          required
          maxLength={200}
          value={form.user_name}
          onChange={(e) => setForm({ ...form, user_name: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
        />
        <input
          type="email"
          placeholder="Email address *"
          required
          maxLength={254}
          value={form.user_email}
          onChange={(e) => setForm({ ...form, user_email: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
        />
        <input
          type="tel"
          placeholder="Phone number"
          value={form.user_phone}
          onChange={(e) => setForm({ ...form, user_phone: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
        />
        <input
          type="text"
          placeholder="Country"
          value={form.user_country}
          onChange={(e) => setForm({ ...form, user_country: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
        />
        <select
          value={form.investment_budget}
          onChange={(e) => setForm({ ...form, investment_budget: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-600"
        >
          <option value="">Budget range (optional)</option>
          {BUDGET_OPTIONS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          value={form.timeline}
          onChange={(e) => setForm({ ...form, timeline: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-600"
        >
          <option value="">Timeline (optional)</option>
          {TIMELINE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <textarea
          placeholder="Message (optional)"
          rows={3}
          maxLength={5000}
          value={form.user_message}
          onChange={(e) => setForm({ ...form, user_message: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none"
        />

        {/* Honeypots */}
        <input type="text" name="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <input type="text" name="fax" value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        {/* Consent checkbox */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            required
            checked={form.consent}
            onChange={(e) => setForm({ ...form, consent: e.target.checked })}
            className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500/30"
          />
          <span className="text-[0.6rem] md:text-xs text-slate-500 leading-relaxed">
            I agree to the{" "}
            <Link href="/privacy" className="underline hover:text-slate-700">Privacy Policy</Link>
            {" "}and{" "}
            <Link href="/terms" className="underline hover:text-slate-700">Terms of Use</Link>.
            I consent to my details being shared with {developerName} to respond to this enquiry.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting || !form.consent}
          className="w-full py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-all text-sm"
        >
          {submitting ? "Sending..." : "Send Enquiry — Free"}
        </button>

        <p className="text-[0.56rem] text-slate-400 text-center leading-relaxed">
          No spam, no obligation. You may receive follow-up communications and can opt out at any time.
        </p>
      </div>
    </form>
  );
}
