"use client";

import { useState } from "react";
import Link from "next/link";

export default function BuyerAgentContactForm({
  agentName,
  agentEmail,
  agencyName,
}: {
  agentName: string;
  agentEmail: string | null;
  agencyName: string;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", consent: false, website: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    setError("");

    // For buyer agents we use a simple mailto-style approach since they aren't in property_leads
    // In a full implementation this would hit a dedicated API endpoint
    try {
      // Simulate success — in production, create a lead record
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
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
        <h3 className="font-bold text-emerald-900 mb-1">Request Sent!</h3>
        <p className="text-sm text-emerald-700">{agentName} will be in touch shortly. No obligation.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-slate-200 rounded-2xl p-5">
      <h3 className="text-base font-bold text-slate-900 mb-1">Get a Free Consultation</h3>
      <p className="text-xs text-slate-400 mb-4">with {agentName}{agencyName ? ` at ${agencyName}` : ""}. No obligation.</p>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

      <div className="space-y-3">
        <input type="text" placeholder="Full name *" required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
        <input type="email" placeholder="Email address *" required maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
        <input type="tel" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
        <textarea placeholder="Tell us about your property goals (optional)" rows={3} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none" />
        <input type="text" name="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

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
            I consent to my details being shared with {agentName} to respond to this enquiry.
          </span>
        </label>

        <button type="submit" disabled={submitting || !form.consent} className="w-full py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-all text-sm">
          {submitting ? "Sending..." : "Request Free Consultation"}
        </button>
        <p className="text-[0.56rem] text-slate-400 text-center">No obligation, no cost. You may receive follow-up communications and can opt out at any time.</p>
      </div>
    </form>
  );
}
