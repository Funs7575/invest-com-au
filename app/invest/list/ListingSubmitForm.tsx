"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const VERTICALS = [
  { value: "business", label: "Business for Sale", icon: "💼", desc: "Sell your established business" },
  { value: "commercial_property", label: "Commercial Property", icon: "🏢", desc: "Office, retail, industrial, or hotel" },
  { value: "farmland", label: "Farmland & Agriculture", icon: "🌾", desc: "Cropping, grazing, horticulture" },
  { value: "mining", label: "Mining Opportunity", icon: "⛏️", desc: "Tenements, JVs, exploration projects" },
  { value: "energy", label: "Renewable Energy Project", icon: "⚡", desc: "Solar, wind, battery, hydrogen" },
  { value: "franchise", label: "Franchise Opportunity", icon: "🏪", desc: "Territory or franchise resale" },
  { value: "fund", label: "Investment Fund", icon: "📈", desc: "Managed fund or investment scheme" },
  { value: "startup", label: "Startup / Venture", icon: "🚀", desc: "Equity crowdfunding or angel raise" },
];

const STATES = [
  "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT",
];

const PLANS = [
  {
    id: "standard",
    name: "Standard",
    price: "$99",
    period: "/ 30 days",
    features: [
      "Listed in your vertical directory",
      "Up to 5 photos",
      "Enquiry form enabled",
      "30-day listing duration",
    ],
    highlight: false,
  },
  {
    id: "featured",
    name: "Featured",
    price: "$249",
    period: "/ 60 days",
    features: [
      "Priority placement in search results",
      "Up to 15 photos",
      "Featured badge on listing card",
      "Highlighted in category grid",
      "60-day listing duration",
    ],
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$499",
    period: "/ 90 days",
    features: [
      "Top placement across all relevant pages",
      "Up to 30 photos",
      "Premium badge + social media boost",
      "Dedicated account manager",
      "90-day listing duration",
      "FIRB/SIV badge (if applicable)",
    ],
    highlight: false,
  },
];

type Step = "plan" | "details" | "contact" | "review" | "success";

interface FormData {
  plan: string;
  vertical: string;
  title: string;
  description: string;
  location_state: string;
  location_city: string;
  asking_price_display: string;
  industry: string;
  firb_eligible: boolean;
  siv_complying: boolean;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  agree_terms: boolean;
}

const INITIAL_FORM: FormData = {
  plan: "",
  vertical: "",
  title: "",
  description: "",
  location_state: "",
  location_city: "",
  asking_price_display: "",
  industry: "",
  firb_eligible: false,
  siv_complying: false,
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  agree_terms: false,
};

export default function ListingSubmitForm() {
  const [step, setStep] = useState<Step>("plan");
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedVertical = VERTICALS.find((v) => v.value === form.vertical);
  const selectedPlan = PLANS.find((p) => p.id === form.plan);

  const canProceedFromPlan = form.plan && form.vertical;
  const canProceedFromDetails =
    form.title.trim().length >= 5 &&
    form.description.trim().length >= 50 &&
    form.location_state;
  const canProceedFromContact =
    form.contact_name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email);

  async function handleSubmit() {
    if (!form.agree_terms) {
      setError("Please agree to the listing terms to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/listings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: form.vertical,
          title: form.title,
          description: form.description,
          location_state: form.location_state,
          location_city: form.location_city,
          asking_price_display: form.asking_price_display,
          industry: form.industry,
          firb_eligible: form.firb_eligible,
          siv_complying: form.siv_complying,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          listing_plan: form.plan,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="check-circle" size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Listing Submitted!</h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          Your {selectedVertical?.label ?? "listing"} has been received. Our team will review and publish it within 1–2 business days.
          We&apos;ll send a confirmation to <strong>{form.contact_email}</strong>.
        </p>
        <Link
          href="/invest/listings"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Browse All Listings
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {(["plan", "details", "contact", "review"] as Step[]).map((s, i) => {
          const labels: Record<string, string> = {
            plan: "Plan & Type",
            details: "Listing Details",
            contact: "Contact Info",
            review: "Review & Submit",
          };
          const steps = ["plan", "details", "contact", "review"] as Step[];
          const current = steps.indexOf(step);
          const thisIndex = steps.indexOf(s);
          const done = current > thisIndex;
          const active = s === step;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${done ? "bg-amber-500" : "bg-slate-200"}`} />}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    done
                      ? "bg-amber-500 text-slate-900"
                      : active
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {done ? <Icon name="check" size={13} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${active ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                  {labels[s]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Plan + Vertical */}
      {step === "plan" && (
        <div className="space-y-8">
          {/* Vertical selector */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">What are you listing?</h2>
            <p className="text-sm text-slate-500 mb-4">Choose the investment category that best describes your opportunity.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VERTICALS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => set("vertical", v.value)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    form.vertical === v.value
                      ? "border-amber-500 bg-amber-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className="text-xl">{v.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{v.label}</p>
                    <p className="text-xs text-slate-500">{v.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Plan selector */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Choose your listing plan</h2>
            <p className="text-sm text-slate-500 mb-4">All plans include a public listing with enquiry form. Upgrade for better placement and more visibility.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set("plan", p.id)}
                  className={`relative flex flex-col p-5 rounded-xl border-2 text-left transition-all ${
                    form.plan === p.id
                      ? "border-amber-500 bg-amber-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  )}
                  <p className="text-base font-bold text-slate-900 mb-0.5">{p.name}</p>
                  <p className="text-2xl font-extrabold text-slate-900 mb-1">
                    {p.price}
                    <span className="text-sm font-normal text-slate-500">{p.period}</span>
                  </p>
                  <ul className="space-y-1.5 mt-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                        <Icon name="check" size={12} className="text-green-600 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canProceedFromPlan}
              onClick={() => setStep("details")}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold px-7 py-3 rounded-xl transition-colors"
            >
              Continue
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Listing Details */}
      {step === "details" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Listing Details</h2>
            <p className="text-sm text-slate-500">Provide information about your {selectedVertical?.label ?? "opportunity"}.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Listing Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={
                form.vertical === "business" ? "e.g. Profitable Sydney Café — $1.2M Revenue" :
                form.vertical === "mining" ? "e.g. WA Lithium Tenement — 380ha, Pilbara" :
                form.vertical === "farmland" ? "e.g. 1,200ha Grazing Property, Dubbo NSW" :
                form.vertical === "energy" ? "e.g. 28 MW Solar Farm Development — QLD, Approved" :
                "Descriptive title for your listing"
              }
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">{form.title.length}/120 characters</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={6}
              placeholder="Describe the opportunity in detail — key highlights, financial performance, reason for sale, growth potential, and any relevant certifications or approvals..."
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-y"
            />
            <p className="text-xs text-slate-400 mt-1">Minimum 50 characters · {form.description.length} written</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                State / Territory <span className="text-red-500">*</span>
              </label>
              <select
                value={form.location_state}
                onChange={(e) => set("location_state", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">City / Region</label>
              <input
                type="text"
                value={form.location_city}
                onChange={(e) => set("location_city", e.target.value)}
                placeholder="e.g. Sydney, Dubbo, Pilbara"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Asking Price / Investment
              </label>
              <input
                type="text"
                value={form.asking_price_display}
                onChange={(e) => set("asking_price_display", e.target.value)}
                placeholder="e.g. $2.5M, $250K–$500K, POA"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Industry / Type</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
                placeholder={
                  form.vertical === "business" ? "e.g. Hospitality, Retail, Services" :
                  form.vertical === "mining" ? "e.g. Lithium, Gold, Copper" :
                  form.vertical === "energy" ? "e.g. Solar, Wind, Battery" :
                  "e.g. category or type"
                }
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* FIRB / SIV flags */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">International Investor Flags</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.firb_eligible}
                onChange={(e) => set("firb_eligible", e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">FIRB Eligible</p>
                <p className="text-xs text-slate-500">Foreign buyers may acquire this with FIRB approval</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.siv_complying}
                onChange={(e) => set("siv_complying", e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">SIV Complying</p>
                <p className="text-xs text-slate-500">Qualifies for Significant Investor Visa complying investment</p>
              </div>
            </label>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("plan")}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              <Icon name="arrow-left" size={14} />
              Back
            </button>
            <button
              type="button"
              disabled={!canProceedFromDetails}
              onClick={() => setStep("contact")}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold px-7 py-3 rounded-xl transition-colors"
            >
              Continue
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Contact Info */}
      {step === "contact" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Contact Information</h2>
            <p className="text-sm text-slate-500">These details are shared with serious enquirers only, not displayed publicly.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
              placeholder="Full name or business name"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)}
                placeholder="+61 4XX XXX XXX"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <Icon name="shield" size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Your contact details are protected. We only share them with verified investors who have submitted a specific enquiry about your listing.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("details")}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              <Icon name="arrow-left" size={14} />
              Back
            </button>
            <button
              type="button"
              disabled={!canProceedFromContact}
              onClick={() => setStep("review")}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold px-7 py-3 rounded-xl transition-colors"
            >
              Review Listing
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === "review" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Review Your Listing</h2>
            <p className="text-sm text-slate-500">Check everything looks correct before submitting for review.</p>
          </div>

          {/* Summary card */}
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</span>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                {selectedVertical?.icon} {selectedVertical?.label}
              </span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</span>
              <span className="text-sm font-bold text-slate-900">{selectedPlan?.name} — {selectedPlan?.price}</span>
            </div>
            <div className="p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Title</span>
              <p className="text-sm font-bold text-slate-900">{form.title}</p>
            </div>
            <div className="p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Description</span>
              <p className="text-sm text-slate-600 line-clamp-4">{form.description}</p>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</span>
              <span className="text-sm font-bold text-slate-900">
                {[form.location_city, form.location_state].filter(Boolean).join(", ")}
              </span>
            </div>
            {form.asking_price_display && (
              <div className="p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</span>
                <span className="text-sm font-bold text-slate-900">{form.asking_price_display}</span>
              </div>
            )}
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</span>
              <span className="text-sm font-bold text-slate-900">{form.contact_name} · {form.contact_email}</span>
            </div>
            {(form.firb_eligible || form.siv_complying) && (
              <div className="p-4 flex items-center gap-2">
                {form.firb_eligible && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">FIRB Eligible</span>
                )}
                {form.siv_complying && (
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-0.5 rounded-full">SIV Complying</span>
                )}
              </div>
            )}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.agree_terms}
              onChange={(e) => set("agree_terms", e.target.checked)}
              className="w-4 h-4 accent-amber-500 mt-0.5 shrink-0"
            />
            <p className="text-xs text-slate-600 leading-relaxed">
              I confirm that this listing is accurate, I have the authority to list this opportunity, and I agree to{" "}
              <a href="/terms" className="text-amber-600 underline hover:text-amber-800">
                Invest.com.au&apos;s listing terms
              </a>
              . Listings are reviewed within 1–2 business days before going live.
            </p>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <Icon name="alert-circle" size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("contact")}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              <Icon name="arrow-left" size={14} />
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-bold px-8 py-3 rounded-xl transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Listing
                  <Icon name="check" size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
