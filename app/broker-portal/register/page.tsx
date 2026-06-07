"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = ["Account", "Company", "Verify"] as const;

const PRICING_TIERS = [
  {
    name: "Starter",
    price: 299,
    highlight: false,
    perks: ["Profile listing", "Basic badge", "Category placement"],
  },
  {
    name: "Growth",
    price: 699,
    highlight: true,
    perks: ["Featured placement", "Comparison table priority", "Performance dashboard"],
  },
  {
    name: "Pro",
    price: 1499,
    highlight: false,
    perks: ["Top-of-category placement", "Custom CTA", "Dedicated account manager"],
  },
] as const;

function PricingPreview() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: collapsible */}
      <div className="sm:hidden bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800"
          aria-expanded={open}
        >
          <span>Pricing preview — from $299/month</span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && <PricingTiers />}
      </div>

      {/* Desktop: always-visible sidebar (rendered by parent layout) */}
    </>
  );
}

function PricingTiers() {
  return (
    <div className="px-5 pb-5 space-y-3">
      {PRICING_TIERS.map((tier) => (
        <div
          key={tier.name}
          className={`rounded-xl border p-4 space-y-2 ${
            tier.highlight
              ? "border-slate-800 bg-slate-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-baseline justify-between">
            <span className={`text-sm font-bold ${tier.highlight ? "text-slate-900" : "text-slate-700"}`}>
              {tier.name}
              {tier.highlight && (
                <span className="ml-2 text-xs font-medium bg-slate-900 text-white px-2 py-0.5 rounded-full">Popular</span>
              )}
            </span>
            <span className="text-sm font-semibold text-slate-900">${tier.price}<span className="text-xs text-slate-400 font-normal">/mo</span></span>
          </div>
          <ul className="space-y-1">
            {tier.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-1.5 text-xs text-slate-600">
                <svg className="w-3.5 h-3.5 text-emerald-500 mt-px shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-xs text-slate-400 pt-1">
        Pricing confirmed after approval.{" "}
        <Link href="/advertise" className="text-slate-600 underline hover:text-slate-800">
          See full details →
        </Link>
      </p>
    </div>
  );
}

export default function BrokerRegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Step 1: Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Company
  const [companyName, setCompanyName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [phone, setPhone] = useState("");
  const [brokerSlug, setBrokerSlug] = useState("");
  const [website, setWebsite] = useState("");

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setStep(1);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/marketplace/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          company_name: companyName,
          phone: phone || undefined,
          broker_slug: brokerSlug || undefined,
          website: website || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4" style={{ animation: "resultCardIn 0.4s ease-out" }}>
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Application Submitted</h2>
        <p className="text-sm text-slate-600">
          Your broker advertising account is pending review. We&apos;ll email you at <strong>{email}</strong> once your account is approved.
        </p>
        <p className="text-xs text-slate-400">This typically takes 1–2 business days. Once approved, you can log in to set up your first campaign.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
          <Link
            href="/broker-portal/login"
            className="inline-block px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors"
          >
            Back to Login
          </Link>
          <Link
            href="/advertise"
            className="inline-block px-6 py-2.5 bg-white text-slate-700 font-bold text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Preview placements →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ animation: "resultCardIn 0.4s ease-out" }}>
      {/* Mobile pricing preview — shown above form on small screens */}
      {step < 2 && <PricingPreview />}

      {/* Desktop two-column layout: form left, pricing sidebar right */}
      <div className="sm:flex sm:gap-6 sm:items-start">
      {/* Left column (form) — takes all space on mobile, constrained on desktop */}
      <div className="flex-1 min-w-0 space-y-5">

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i < step ? "bg-emerald-100 text-emerald-700" :
              i === step ? "bg-slate-900 text-white" :
              "bg-slate-100 text-slate-400"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-medium ${i === step ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {step === 0 && "Create Your Account"}
            {step === 1 && "Company Details"}
            {step === 2 && "Review & Submit"}
          </h2>
          <p className="text-sm text-slate-500">
            {step === 0 && "Start advertising your brokerage on Invest.com.au"}
            {step === 1 && "Tell us about your brokerage"}
            {step === 2 && "Confirm your details to submit your application"}
          </p>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* Step 1: Account Details */}
        {step === 0 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <label htmlFor="bp-reg-name" className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input id="bp-reg-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="John Smith" />
            </div>
            <div>
              <label htmlFor="bp-reg-email" className="block text-sm font-medium text-slate-700 mb-1">Work Email *</label>
              <input id="bp-reg-email" type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="you@broker.com" />
            </div>
            <div>
              <label htmlFor="bp-reg-password" className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <div className="relative">
                <input id="bp-reg-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                  className="w-full px-4 py-2.5 pr-11 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                  placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword
                    ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="bp-reg-confirm" className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
              <div className="relative">
                <input id="bp-reg-confirm" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  className="w-full px-4 py-2.5 pr-11 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
                  {showConfirmPassword
                    ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>
            <button type="submit"
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors">
              Continue →
            </button>
          </form>
        )}

        {/* Step 2: Company Details */}
        {step === 1 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <div>
              <label htmlFor="bp-reg-company" className="block text-sm font-medium text-slate-700 mb-1">Company / Brokerage Name *</label>
              <input id="bp-reg-company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                autoComplete="organization"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="e.g. CommSec, Stake, eToro" />
            </div>
            <div>
              <label htmlFor="bp-reg-slug" className="block text-sm font-medium text-slate-700 mb-1">Broker Slug</label>
              <input id="bp-reg-slug" type="text" value={brokerSlug} onChange={(e) => setBrokerSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="e.g. commsec (leave blank to auto-generate)" />
              <p className="text-xs text-slate-400 mt-1">
                Your unique URL on the platform — e.g.{" "}
                <span className="font-mono text-slate-500">invest.com.au/broker/your-slug</span>. Use lowercase letters, numbers, and hyphens only.{" "}
                <strong className="text-slate-500 font-semibold">Cannot be changed later.</strong>{" "}
                Leave blank to auto-generate from your company name.
              </p>
            </div>
            <div>
              <label htmlFor="bp-reg-website" className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input id="bp-reg-website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="https://www.yourbrokerage.com.au" />
            </div>
            <div>
              <label htmlFor="bp-reg-phone" className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input id="bp-reg-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="+61 4xx xxx xxx" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(0)}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors">
                ← Back
              </button>
              <button type="submit"
                className="flex-1 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors">
                Continue →
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Name</span>
                <span className="text-slate-900 font-medium">{fullName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-900 font-medium">{email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Company</span>
                <span className="text-slate-900 font-medium">{companyName}</span>
              </div>
              {brokerSlug && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Broker Slug</span>
                  <span className="text-slate-900 font-medium">{brokerSlug}</span>
                </div>
              )}
              {website && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Website</span>
                  <span className="text-slate-900 font-medium">{website}</span>
                </div>
              )}
              {phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Phone</span>
                  <span className="text-slate-900 font-medium">{phone}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  required
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I have read and agree to the{" "}
                  <a href="/broker-terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Advertising &amp; Listing Terms</a>,{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Terms of Use</a>, and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Privacy Policy</a>.
                  I confirm we hold the required licences to offer our products in Australia.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors">
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={loading || !termsAccepted} aria-busy={loading}
                className="flex-1 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Already have an account?{" "}
        <Link href="/broker-portal/login" className="text-slate-700 underline">Sign in</Link>
      </p>

      </div>{/* end left column */}

      {/* Desktop pricing sidebar — hidden on mobile (mobile uses collapsible above) */}
      {step < 2 && (
        <aside className="hidden sm:block w-72 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Pricing preview</p>
              <p className="text-sm font-bold text-slate-900">From $299/month</p>
            </div>
            <PricingTiers />
          </div>
        </aside>
      )}

      </div>{/* end desktop flex wrapper */}
    </div>
  );
}
