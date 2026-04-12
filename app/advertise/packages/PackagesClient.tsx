"use client";

import { useState, useMemo } from "react";

type Tier = "featured_partner" | "category_sponsor" | "deal_of_month";

interface TierConfig {
  id: Tier;
  name: string;
  basePrice: number;
}

const TIERS: TierConfig[] = [
  { id: "featured_partner", name: "Featured Partner", basePrice: 2000 },
  { id: "category_sponsor", name: "Category Sponsor", basePrice: 500 },
  { id: "deal_of_month", name: "Deal of the Month", basePrice: 300 },
];

const DURATIONS = [
  { months: 1, label: "1 month", discount: 0 },
  { months: 3, label: "3 months", discount: 0.1 },
  { months: 6, label: "6 months", discount: 0.2 },
  { months: 12, label: "12 months", discount: 0.3 },
];

const CATEGORIES = [
  { slug: "beginners", label: "Best for Beginners" },
  { slug: "us-shares", label: "Best for US Shares" },
  { slug: "low-fees", label: "Best Low-Fee Brokers" },
  { slug: "chess-sponsored", label: "CHESS-Sponsored Brokers" },
  { slug: "smsf", label: "Best for SMSF" },
  { slug: "crypto", label: "Best Crypto Exchanges" },
  { slug: "low-fx-fees", label: "Best Low FX Fees" },
  { slug: "free-brokerage", label: "Free Brokerage" },
  { slug: "etf-investing", label: "Best for ETFs" },
  { slug: "day-trading", label: "Best for Day Trading" },
  { slug: "dividend-investing", label: "Best for Dividends" },
  { slug: "robo-advisors", label: "Best Robo-Advisors" },
  { slug: "super-funds", label: "Best Super Funds" },
  { slug: "property-investing", label: "Property Investing" },
  { slug: "cfd-forex", label: "CFD & Forex" },
  { slug: "savings-accounts", label: "Best Savings Accounts" },
  { slug: "term-deposits", label: "Best Term Deposits" },
];

export default function PackagesClient() {
  const [selectedTier, setSelectedTier] = useState<Tier>("featured_partner");
  const [categorySlug, setCategorySlug] = useState("");
  const [durationMonths, setDurationMonths] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Contact form fallback state
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  const tier = TIERS.find((t) => t.id === selectedTier)!;
  const duration = DURATIONS.find((d) => d.months === durationMonths)!;

  const calculation = useMemo(() => {
    const monthlyBase = tier.basePrice;
    const discountRate = duration.discount;
    const discountedMonthly = monthlyBase * (1 - discountRate);
    const total = Math.round(discountedMonthly * duration.months);
    const savings = Math.round(monthlyBase * duration.months - total);
    return { monthlyBase, discountedMonthly, total, savings, discountRate };
  }, [tier, duration]);

  async function handleCheckout() {
    setError("");

    if (!companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (selectedTier === "category_sponsor" && !categorySlug) {
      setError("Please select a category for your sponsorship.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/advertise/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
          category_slug: selectedTier === "category_sponsor" ? categorySlug : undefined,
          duration_months: durationMonths,
          company_name: companyName.trim(),
          contact_email: contactEmail.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tier Selection */}
      <div className="mb-8">
        <label className="block text-sm font-bold text-slate-900 mb-3">
          1. Choose your tier
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTier(t.id)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                selectedTier === t.id
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="font-bold text-slate-900 text-sm">{t.name}</p>
              <p className="text-slate-500 text-xs mt-1">
                From ${t.basePrice.toLocaleString()}/mo
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Category Picker (only for Category Sponsor) */}
      {selectedTier === "category_sponsor" && (
        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-900 mb-3">
            2. Select a category
          </label>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Choose a best-broker category...</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Duration Picker */}
      <div className="mb-8">
        <label className="block text-sm font-bold text-slate-900 mb-3">
          {selectedTier === "category_sponsor" ? "3" : "2"}. Choose duration
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d.months}
              type="button"
              onClick={() => setDurationMonths(d.months)}
              className={`rounded-xl border-2 p-3 text-center transition-all ${
                durationMonths === d.months
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="font-bold text-slate-900 text-sm">{d.label}</p>
              {d.discount > 0 && (
                <p className="text-emerald-600 text-xs font-semibold mt-1">
                  {Math.round(d.discount * 100)}% off
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price Calculator */}
      <div className="mb-8 bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900 mb-3">Price Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">{tier.name} base rate</span>
            <span className="text-slate-900 font-medium">
              ${calculation.monthlyBase.toLocaleString()}/mo
            </span>
          </div>
          {calculation.discountRate > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>
                {duration.label} discount ({Math.round(calculation.discountRate * 100)}% off)
              </span>
              <span className="font-medium">
                -${calculation.savings.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-600">Duration</span>
            <span className="text-slate-900 font-medium">
              {duration.label}
            </span>
          </div>
          <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
            <span className="font-bold text-slate-900">Total</span>
            <span className="font-extrabold text-slate-900 text-lg">
              ${calculation.total.toLocaleString()} AUD
            </span>
          </div>
          {calculation.discountRate > 0 && (
            <p className="text-xs text-slate-500 text-right">
              Effective rate: ${Math.round(calculation.discountedMonthly).toLocaleString()}/mo
            </p>
          )}
        </div>
      </div>

      {/* Company Details */}
      <div className="mb-8 space-y-4">
        <div>
          <label
            htmlFor="company-name"
            className="block text-sm font-bold text-slate-900 mb-1"
          >
            Company name
          </label>
          <input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. CommSec, Stake, SelfWealth"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="block text-sm font-bold text-slate-900 mb-1"
          >
            Contact email
          </label>
          <input
            id="contact-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="partnerships@yourcompany.com.au"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Checkout Button */}
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="w-full px-6 py-4 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Redirecting to checkout..." : `Proceed to Checkout — $${calculation.total.toLocaleString()} AUD`}
      </button>

      <p className="text-xs text-slate-500 text-center mt-3">
        Secure payment via Stripe. You will not be charged until you complete checkout.
      </p>

      {/* Contact Form Fallback */}
      <div className="mt-10 border-t border-slate-200 pt-8">
        <button
          type="button"
          onClick={() => setShowContactForm(!showContactForm)}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 underline transition-colors"
        >
          {showContactForm
            ? "Hide custom package form"
            : "Need a custom package? Contact us"}
        </button>

        {showContactForm && !contactSent && (
          <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
            <p className="text-sm text-slate-600">
              Describe your requirements and we will get back to you within 1
              business day.
            </p>
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-bold text-slate-900 mb-1"
              >
                Company name
              </label>
              <input
                id="contact-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="contact-email-2"
                className="block text-sm font-bold text-slate-900 mb-1"
              >
                Email
              </label>
              <input
                id="contact-email-2"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@company.com.au"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="contact-message"
                className="block text-sm font-bold text-slate-900 mb-1"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={4}
                placeholder="Tell us about your sponsorship goals, budget, and any specific requirements..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                // In production this would POST to an API; for now use mailto
                window.location.href = `mailto:partners@invest.com.au?subject=Custom Sponsorship - ${encodeURIComponent(companyName)}&body=${encodeURIComponent(contactMessage)}`;
                setContactSent(true);
              }}
              className="px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors"
            >
              Send Enquiry
            </button>
          </div>
        )}

        {contactSent && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
            Your email client should have opened with a pre-filled message. If
            not, please email{" "}
            <a
              href="mailto:partners@invest.com.au"
              className="font-bold underline"
            >
              partners@invest.com.au
            </a>{" "}
            directly.
          </div>
        )}
      </div>
    </div>
  );
}
