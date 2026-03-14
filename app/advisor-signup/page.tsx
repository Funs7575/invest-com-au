"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

const SPECIALTY_OPTIONS = [
  "SMSF Setup & Administration",
  "Retirement Planning",
  "Tax Planning & Minimisation",
  "Investment Strategy",
  "Estate Planning",
  "Superannuation Advice",
  "Insurance & Risk Management",
  "Property Investment",
  "Debt Management",
  "Aged Care Planning",
  "Business Advisory",
  "Crypto & Digital Assets",
  "ETF & Managed Funds",
  "Centrelink & Government Benefits",
  "Divorce & Separation Finance",
  "Expat & International Tax",
];

const FEE_TYPES = [
  { value: "fee-for-service", label: "Fee-for-Service" },
  { value: "commission", label: "Commission-Based" },
  { value: "percentage", label: "Percentage of FUM" },
  { value: "hybrid", label: "Hybrid" },
];

type FormData = {
  // Step 1
  name: string;
  email: string;
  phone: string;
  firm_name: string;
  type: string;
  // Step 2
  afsl_number: string;
  abn: string;
  registration_number: string;
  specialties: string[];
  location_state: string;
  location_suburb: string;
  bio: string;
  years_experience: string;
  languages: string;
  client_types: string;
  // Step 3
  fee_structure: string;
  fee_description: string;
  pitch_message: string;
  // Legal
  termsAccepted: boolean;
};

export default function AdvisorSignupPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    firm_name: "",
    type: "financial_planner",
    afsl_number: "",
    abn: "",
    registration_number: "",
    specialties: [],
    location_state: "",
    location_suburb: "",
    bio: "",
    years_experience: "",
    languages: "",
    client_types: "",
    fee_structure: "fee-for-service",
    fee_description: "",
    pitch_message: "",
    termsAccepted: false,
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const trackedStartRef = useRef(false);

  // Track signup started (once per page load)
  useEffect(() => {
    if (trackedStartRef.current) return;
    trackedStartRef.current = true;
    trackEvent('advisor_signup_started', {}, '/advisor-signup');
  }, []);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSpecialty = (s: string) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  };

  const validateStep1 = () => {
    if (!form.name.trim()) return "Full name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email address.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!form.type) return "Advisor type is required.";
    return null;
  };

  const validateStep2 = () => {
    if (!form.location_state) return "Please select your state.";
    if (!form.location_suburb.trim()) return "Please enter your suburb.";
    return null;
  };

  const nextStep = () => {
    setErrorMsg("");
    if (step === 1) {
      const err = validateStep1();
      if (err) { setErrorMsg(err); return; }
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) { setErrorMsg(err); return; }
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => {
    setErrorMsg("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const submit = async () => {
    setErrorMsg("");
    // Final validation
    const err1 = validateStep1();
    if (err1) { setErrorMsg(err1); setStep(1); return; }
    const err2 = validateStep2();
    if (err2) { setErrorMsg(err2); setStep(2); return; }

    setStatus("submitting");
    try {
      const res = await fetch("/api/advisor-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        trackEvent('advisor_signup_completed', {
          type: form.type,
          state: form.location_state,
          specialties_count: form.specialties.length,
          has_afsl: !!form.afsl_number,
          fee_structure: form.fee_structure,
        }, '/advisor-signup');
        setStatus("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="py-12 md:py-20">
        <div className="container-custom max-w-lg text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="check" size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">You&apos;re All Set!</h1>
          <p className="text-slate-500 mb-2">Your advisor account has been created and your profile is under review.</p>
          <p className="text-sm text-slate-600 font-medium mb-6">
            We&apos;ll review your profile within 24 hours and notify you by email once it&apos;s live.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisor-portal" className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl text-sm hover:bg-violet-700 transition-colors">
              Go to Advisor Portal
            </Link>
            <Link href="/advisors" className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors">
              Browse Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all";
  const labelClass = "block text-xs font-semibold text-slate-600 mb-1";

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-2xl">
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/advisors" className="hover:text-slate-900">Advisors</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Sign Up</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-5 md:p-8 mb-6 md:mb-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative">
            <h1 className="text-xl md:text-3xl font-extrabold mb-2">Create Your Advisor Profile</h1>
            <p className="text-sm md:text-base text-violet-200 leading-relaxed max-w-lg">
              Sign up in minutes, get verified within 24 hours, and start receiving qualified leads from Australian investors.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { n: 1, label: "Basic Info" },
            { n: 2, label: "Professional Details" },
            { n: 3, label: "Fee Structure" },
          ].map((s) => (
            <div key={s.n} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${step >= s.n ? "bg-violet-500" : "bg-slate-200"}`} />
              <p className={`text-[0.62rem] mt-1 font-medium ${step >= s.n ? "text-violet-600" : "text-slate-400"}`}>
                Step {s.n}: {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Basic Information</h2>
              <p className="text-xs text-slate-500 mb-3">Tell us about yourself and your practice.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className={inputClass}
                    placeholder="Sarah Chen"
                  />
                </div>
                <div>
                  <label className={labelClass}>Firm Name</label>
                  <input
                    value={form.firm_name}
                    onChange={(e) => updateField("firm_name", e.target.value)}
                    className={inputClass}
                    placeholder="Chen Advisory"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={inputClass}
                    placeholder="sarah@example.com"
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone *</label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className={inputClass}
                    placeholder="04XX XXX XXX"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Advisor Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => updateField("type", e.target.value)}
                  className={inputClass}
                >
                  {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Professional Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Professional Details</h2>
              <p className="text-xs text-slate-500 mb-3">Help us verify your credentials and set up your profile.</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>AFSL Number</label>
                  <input
                    value={form.afsl_number}
                    onChange={(e) => updateField("afsl_number", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 234567"
                  />
                </div>
                <div>
                  <label className={labelClass}>ABN</label>
                  <input
                    value={form.abn}
                    onChange={(e) => updateField("abn", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 12345678901"
                  />
                </div>
                <div>
                  <label className={labelClass}>Registration / TAN</label>
                  <input
                    value={form.registration_number}
                    onChange={(e) => updateField("registration_number", e.target.value)}
                    className={inputClass}
                    placeholder="For tax agents"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Specialties</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                  {SPECIALTY_OPTIONS.map((s) => (
                    <label
                      key={s}
                      className={`flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg border text-sm cursor-pointer transition-colors ${
                        form.specialties.includes(s)
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.specialties.includes(s)}
                        onChange={() => toggleSpecialty(s)}
                        className="sr-only"
                      />
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-[0.62rem] shrink-0 ${
                        form.specialties.includes(s)
                          ? "bg-violet-500 border-violet-500 text-white"
                          : "border-slate-300"
                      }`}>
                        {form.specialties.includes(s) && "✓"}
                      </span>
                      <span className="text-xs">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>State *</label>
                  <select
                    value={form.location_state}
                    onChange={(e) => updateField("location_state", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select...</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Suburb *</label>
                  <input
                    value={form.location_suburb}
                    onChange={(e) => updateField("location_suburb", e.target.value)}
                    className={inputClass}
                    placeholder="Sydney CBD"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Short Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  rows={4}
                  className={inputClass}
                  placeholder="Tell investors about your experience, qualifications, and approach to financial advice..."
                />
                <p className="text-[0.65rem] text-slate-400 mt-0.5">{form.bio.length}/500 characters</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={form.years_experience}
                    onChange={(e) => updateField("years_experience", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 12"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Languages Spoken</label>
                  <input
                    value={form.languages}
                    onChange={(e) => updateField("languages", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. English, Mandarin, Hindi"
                  />
                  <p className="text-[0.65rem] text-slate-400 mt-0.5">Comma-separated</p>
                </div>
              </div>

              <div>
                <label className={labelClass}>Ideal Client Types</label>
                <input
                  value={form.client_types}
                  onChange={(e) => updateField("client_types", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. SMSF trustees, retirees, high-net-worth individuals, first-home buyers"
                />
                <p className="text-[0.65rem] text-slate-400 mt-0.5">Who do you work best with? Comma-separated.</p>
              </div>
            </div>
          )}

          {/* Step 3: Fee Structure */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Fee Structure</h2>
              <p className="text-xs text-slate-500 mb-3">
                Being transparent about fees builds trust with potential clients.
              </p>

              <div>
                <label className={labelClass}>Fee Type *</label>
                <select
                  value={form.fee_structure}
                  onChange={(e) => updateField("fee_structure", e.target.value)}
                  className={inputClass}
                >
                  {FEE_TYPES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Fee Description</label>
                <textarea
                  value={form.fee_description}
                  onChange={(e) => updateField("fee_description", e.target.value)}
                  rows={4}
                  className={inputClass}
                  placeholder="Describe your fee structure, e.g. 'Initial consultation free. SOA from $3,300. Ongoing advice from $220/month.'"
                />
              </div>

              <div>
                <label className={labelClass}>Pitch Message</label>
                <textarea
                  value={form.pitch_message}
                  onChange={(e) => updateField("pitch_message", e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Why should investors choose you? What makes your practice stand out?"
                  maxLength={2000}
                />
                <p className="text-[0.65rem] text-slate-400 mt-0.5">{form.pitch_message.length}/2,000 characters — visible to our team during review</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
                <h3 className="text-xs font-bold text-slate-700 mb-2">What happens next?</h3>
                <ul className="space-y-1.5">
                  {[
                    "We create your Invest.com.au account and advisor profile",
                    "Our team verifies your AFSL/registration credentials",
                    "Your profile goes live within 24 hours",
                    "You start receiving qualified investor enquiries",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="text-violet-500 mt-0.5 shrink-0">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Error message */}
          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{errorMsg}</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3 mt-6">
            {step > 1 ? (
              <button
                onClick={prevStep}
                className="px-4 py-3 min-h-[44px] text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex-1 sm:flex-none px-6 py-3 min-h-[44px] bg-violet-600 text-white font-bold rounded-lg text-sm hover:bg-violet-700 transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={status === "submitting" || !form.termsAccepted}
                className="flex-1 sm:flex-none px-8 py-3 min-h-[44px] bg-slate-900 text-white font-bold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {status === "submitting" ? "Creating Account..." : "Create My Account"}
              </button>
            )}
          </div>
        </div>

        {/* Terms acceptance */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-4">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.termsAccepted || false}
              onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              required
            />
            <span className="text-[0.65rem] md:text-xs text-slate-600 leading-relaxed">
              I have read and agree to the{" "}
              <Link href="/advisor-terms" target="_blank" className="text-violet-600 underline hover:text-violet-800">Advisor Services Agreement</Link>,{" "}
              <Link href="/terms" target="_blank" className="text-violet-600 underline hover:text-violet-800">Terms of Use</Link>, and{" "}
              <Link href="/privacy" target="_blank" className="text-violet-600 underline hover:text-violet-800">Privacy Policy</Link>.
              I confirm my registration details are accurate and I hold the required licences to provide financial services in Australia.
            </span>
          </label>
        </div>

        <p className="text-[0.58rem] text-slate-400 mt-2 text-center">
          We&apos;ll verify your AFSL/registration with ASIC before activating your listing.
        </p>

        <p className="text-center text-xs text-slate-400 mt-4">
          Already have an account?{" "}
          <Link href="/advisor-portal" className="text-slate-600 hover:text-slate-900 font-medium">
            Log in to your portal
          </Link>
        </p>
      </div>
    </div>
  );
}
