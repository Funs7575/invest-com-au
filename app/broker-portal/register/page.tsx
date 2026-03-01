"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["Account", "Company", "Verify"] as const;

export default function BrokerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Step 1: Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Step 2: Company
  const [companyName, setCompanyName] = useState("");
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
        <p className="text-xs text-slate-400">This typically takes 1–2 business days.</p>
        <Link
          href="/broker-portal/login"
          className="inline-block mt-2 px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ animation: "resultCardIn 0.4s ease-out" }}>
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
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* Step 1: Account Details */}
        {step === 0 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="John Smith" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Work Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="you@broker.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="Min. 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="••••••••" />
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Company / Brokerage Name *</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="e.g. CommSec, Stake, eToro" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Broker Slug</label>
              <input type="text" value={brokerSlug} onChange={(e) => setBrokerSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="e.g. commsec (leave blank to auto-generate)" />
              <p className="text-xs text-slate-400 mt-1">Must match your broker listing on Invest.com.au, if you have one.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="https://www.yourbrokerage.com.au" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
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

            <p className="text-xs text-slate-500">
              By submitting, you agree to our{" "}
              <a href="/terms" className="underline">Terms of Service</a>{" "}
              and <a href="/privacy" className="underline">Privacy Policy</a>.
              Your account will be reviewed before activation.
            </p>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors">
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
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
    </div>
  );
}
