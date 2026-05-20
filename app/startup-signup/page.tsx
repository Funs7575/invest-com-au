"use client";

import { useState } from "react";
import Link from "next/link";

const STAGES = [
  { value: "pre_seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "growth", label: "Growth" },
];

const SECTORS = [
  "FinTech", "HealthTech", "EdTech", "PropTech", "AgriTech",
  "CleanTech", "AI/ML", "SaaS", "Marketplace", "BioTech", "Other",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormData = {
  email: string;
  password: string;
  company_name: string;
  abn: string;
  founded_year: string;
  stage: string;
  sector: string[];
  linkedin_url: string;
  team_size: string;
  esic_self_attested: boolean;
  terms_accepted: boolean;
};

const INIT: FormData = {
  email: "",
  password: "",
  company_name: "",
  abn: "",
  founded_year: "",
  stage: "",
  sector: [],
  linkedin_url: "",
  team_size: "",
  esic_self_attested: false,
  terms_accepted: false,
};

export default function StartupSignupPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INIT);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  }

  function toggleSector(s: string) {
    set("sector", form.sector.includes(s)
      ? form.sector.filter((x) => x !== s)
      : [...form.sector, s]);
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!EMAIL_RE.test(form.email)) return "Enter a valid email address.";
      if (form.password.length < 8) return "Password must be at least 8 characters.";
    }
    if (step === 2) {
      if (!form.company_name.trim()) return "Company name is required.";
      if (!form.stage) return "Please select a funding stage.";
      if (form.sector.length === 0) return "Select at least one sector.";
    }
    if (step === 3) {
      if (!form.terms_accepted) return "Please accept the terms to continue.";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => s + 1);
  }

  async function submit() {
    const err = validateStep();
    if (err) { setError(err); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/startups/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          company_name: form.company_name.trim(),
          abn: form.abn.trim() || null,
          founded_year: form.founded_year ? parseInt(form.founded_year) : null,
          stage: form.stage,
          sector: form.sector,
          linkedin_url: form.linkedin_url.trim() || null,
          team_size: form.team_size ? parseInt(form.team_size) : null,
          esic_self_attested: form.esic_self_attested,
        }),
      });
      const json: { error?: string } = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Signup failed. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Application submitted</h1>
          <p className="text-gray-600 text-sm mb-6">
            We&apos;ll review your startup profile and send a confirmation email within 1–2 business days.
            Once approved, you can access the founder portal to manage your round and data room.
          </p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Return to invest.com.au
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-lg w-full">

        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
            ← invest.com.au
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Founder signup</h1>
          <p className="text-gray-500 text-sm mt-1">
            List your startup and connect with wholesale investors
          </p>
          <div className="flex gap-1.5 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${s <= step ? "bg-blue-600" : "bg-gray-200"}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Step {step} of 3</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Account */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="founder@company.com.au"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="8+ characters"
              />
            </div>
            <button
              onClick={next}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Company */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Acme Pty Ltd"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ABN (optional)</label>
                <input
                  type="text"
                  value={form.abn}
                  onChange={(e) => set("abn", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12 345 678 901"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Founded year</label>
                <input
                  type="number"
                  min={2000}
                  max={new Date().getFullYear()}
                  value={form.founded_year}
                  onChange={(e) => set("founded_year", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2023"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Funding stage</label>
              <select
                value={form.stage}
                onChange={(e) => set("stage", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select stage</option>
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sector (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSector(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.sector.includes(s)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={next}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verification + ESIC */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL (optional)</label>
              <input
                type="url"
                value={form.linkedin_url}
                onChange={(e) => set("linkedin_url", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://linkedin.com/in/yourname"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team size</label>
              <input
                type="number"
                min={1}
                value={form.team_size}
                onChange={(e) => set("team_size", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="5"
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900 mb-2">ESIC eligibility self-attestation</p>
              <p className="text-xs text-amber-700 mb-3">
                The Early Stage Innovation Company (ESIC) designation provides tax offsets to investors under
                the ATO&apos;s s708 framework. Self-attestation is provisional — admin verification required within 30 days.
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.esic_self_attested}
                  onChange={(e) => set("esic_self_attested", e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-xs text-amber-800">
                  I believe this company qualifies as an ESIC under the ATO criteria and will provide
                  supporting evidence for review.
                </span>
              </label>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.terms_accepted}
                  onChange={(e) => set("terms_accepted", e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-xs text-gray-700">
                  I agree to the{" "}
                  <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
                  I confirm this is a genuine startup seeking investors and not a financial product issuer.
                  This platform facilitates introductions only — no securities are issued or traded here.
                </span>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Already have an account?{" "}
          <Link href="/account/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
