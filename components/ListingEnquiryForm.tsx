"use client";

import { useState } from "react";

interface ListingEnquiryFormProps {
  listingId: number;
  listingTitle: string;
  vertical: string;
}

const INVESTOR_TYPES = [
  { value: "individual", label: "Individual investor" },
  { value: "corporate", label: "Corporate / Business" },
  { value: "visa_applicant", label: "Visa applicant" },
  { value: "family_office", label: "Family office" },
];

const BASED_IN_OPTIONS = [
  { value: "australia", label: "Australia" },
  { value: "overseas", label: "Overseas" },
];

export default function ListingEnquiryForm({
  listingId,
  listingTitle,
  vertical,
}: ListingEnquiryFormProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    based_in: "australia",
    investor_type: "individual",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/listings/enquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          user_name: form.name,
          user_email: form.email,
          user_phone: form.phone || undefined,
          investor_country: form.based_in,
          investor_type: form.investor_type,
          message: form.message || undefined,
          source_page: `/invest/${vertical}/listings`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Enquiry Sent</h3>
        <p className="text-sm text-slate-600">
          Thank you for your interest in <strong>{listingTitle}</strong>. The listing representative
          will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label htmlFor="enq-name" className="block text-sm font-medium text-slate-700 mb-1">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          id="enq-name"
          name="name"
          type="text"
          required
          value={form.name}
          onChange={handleChange}
          placeholder="Your full name"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="enq-email" className="block text-sm font-medium text-slate-700 mb-1">
          Email address <span className="text-red-500">*</span>
        </label>
        <input
          id="enq-email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="enq-phone" className="block text-sm font-medium text-slate-700 mb-1">
          Phone number
        </label>
        <input
          id="enq-phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="+61 4xx xxx xxx"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
      </div>

      {/* Based in */}
      <div>
        <label htmlFor="enq-based-in" className="block text-sm font-medium text-slate-700 mb-1">
          I am based in
        </label>
        <select
          id="enq-based-in"
          name="based_in"
          value={form.based_in}
          onChange={handleChange}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
        >
          {BASED_IN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Investor type */}
      <div>
        <label htmlFor="enq-investor-type" className="block text-sm font-medium text-slate-700 mb-1">
          Investor type
        </label>
        <select
          id="enq-investor-type"
          name="investor_type"
          value={form.investor_type}
          onChange={handleChange}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
        >
          {INVESTOR_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="enq-message" className="block text-sm font-medium text-slate-700 mb-1">
          Message
        </label>
        <textarea
          id="enq-message"
          name="message"
          rows={4}
          value={form.message}
          onChange={handleChange}
          placeholder={`I am interested in this ${vertical.replace(/_/g, " ")} opportunity…`}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-bold text-sm px-4 py-3 rounded-lg transition-colors"
      >
        {loading ? "Sending…" : "Send Enquiry"}
      </button>

      <p className="text-xs text-slate-500 text-center leading-relaxed">
        By submitting you agree to our{" "}
        <a href="/privacy" className="underline hover:text-slate-700">
          privacy policy
        </a>
        . Your contact details will be shared with the listing representative.
      </p>
    </form>
  );
}
