"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useUser } from "@/lib/hooks/useUser";

/* ── Constants ── */

const TOTAL_STEPS = 3;

const INTEREST_OPTIONS = [
  { value: "shares", label: "Shares", icon: "trending-up" },
  { value: "etfs", label: "ETFs", icon: "pie-chart" },
  { value: "crypto", label: "Crypto", icon: "bitcoin" },
  { value: "super", label: "Super", icon: "piggy-bank" },
  { value: "property", label: "Property", icon: "home" },
  { value: "savings", label: "Savings", icon: "wallet" },
  { value: "insurance", label: "Insurance", icon: "shield" },
  { value: "cfd_forex", label: "CFD & Forex", icon: "arrow-left-right" },
] as const;

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner", description: "I'm new to investing" },
  { value: "intermediate", label: "Intermediate", description: "I've been investing for 1-3 years" },
  { value: "advanced", label: "Advanced", description: "I've invested for 3+ years" },
] as const;

const GOAL_OPTIONS = [
  { value: "growth", label: "Growth", description: "Grow my wealth long-term" },
  { value: "income", label: "Income", description: "Generate regular income" },
  { value: "preservation", label: "Preservation", description: "Protect what I have" },
  { value: "speculation", label: "Speculation", description: "Active trading for returns" },
] as const;

const PORTFOLIO_OPTIONS = [
  { value: "under_10k", label: "Under $10k" },
  { value: "10k_50k", label: "$10k – $50k" },
  { value: "50k_200k", label: "$50k – $200k" },
  { value: "200k_500k", label: "$200k – $500k" },
  { value: "over_500k", label: "Over $500k" },
] as const;

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

/* ── Subcomponents ── */

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < current;
        const isActive = step === current;

        return (
          <div key={step} className="flex items-center">
            {/* Connector line before (except first) */}
            {i > 0 && (
              <div
                className={`w-12 sm:w-16 h-0.5 transition-colors duration-300 ${
                  isCompleted || isActive ? "bg-emerald-600" : "bg-slate-200"
                }`}
              />
            )}
            {/* Circle */}
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300 ${
                isCompleted
                  ? "border-emerald-600 bg-emerald-600"
                  : isActive
                    ? "border-emerald-600 bg-white"
                    : "border-slate-200 bg-white"
              }`}
            >
              {isCompleted ? (
                <Icon name="check" size={16} className="text-white" />
              ) : (
                <span
                  className={`text-xs font-bold ${
                    isActive ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RadioCard({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left w-full rounded-xl border p-4 transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {selected && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600">
          <Icon name="check" size={12} className="text-white" />
        </span>
      )}
      <span className="block text-sm font-semibold text-slate-900">{label}</span>
      {description && (
        <span className="block text-xs text-slate-500 mt-0.5">{description}</span>
      )}
    </button>
  );
}

function InterestPill({
  selected,
  onClick,
  label,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
        selected
          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <Icon name={icon} size={16} className={selected ? "text-white" : "text-slate-400"} />
      {label}
    </button>
  );
}

/* ── Form state ── */

interface OnboardingData {
  interested_in: string[];
  investing_experience: string;
  investment_goals: string;
  display_name: string;
  portfolio_size: string;
  state: string;
}

const emptyData: OnboardingData = {
  interested_in: [],
  investing_experience: "",
  investment_goals: "",
  display_name: "",
  portfolio_size: "",
  state: "",
};

/* ── Main component ── */

export default function OnboardingClient() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OnboardingData>(emptyData);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login?next=/onboarding");
    }
  }, [authLoading, user, router]);

  // Check if onboarding already completed
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/user-profile");
        if (!res.ok) return;
        const { profile } = await res.json();
        if (cancelled) return;
        if (profile?.onboarding_completed) {
          router.push("/account");
          return;
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, router]);

  // Step transition animation
  const goTo = (target: number) => {
    setDirection(target > step ? "forward" : "back");
    setAnimating(true);

    // Wait for exit animation
    setTimeout(() => {
      setStep(target);
      // Trigger enter animation on next frame
      requestAnimationFrame(() => {
        setAnimating(false);
      });
    }, 200);
  };

  // Navigation
  const canProceed = () => {
    if (step === 1) return form.interested_in.length >= 1;
    if (step === 2) return form.investing_experience !== "" && form.investment_goals !== "";
    return true; // Step 3 is all optional
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) goTo(step + 1);
  };

  const handleBack = () => {
    if (step > 1) goTo(step - 1);
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/user-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, onboarding_completed: true }),
      });
      if (res.ok) {
        router.push("/account?welcome=1");
      }
    } catch {
      // Allow retry
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle interest
  const toggleInterest = (value: string) => {
    setForm((prev) => ({
      ...prev,
      interested_in: prev.interested_in.includes(value)
        ? prev.interested_in.filter((v) => v !== value)
        : [...prev.interested_in, value],
    }));
  };

  // Loading states
  if (authLoading || !user || checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-lg px-6">
          <div className="h-8 bg-slate-200 rounded w-48 mx-auto" />
          <div className="h-40 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  // Animation classes
  const getTransitionStyle = (): React.CSSProperties => {
    if (animating) {
      return {
        opacity: 0,
        transform: direction === "forward" ? "translateX(40px)" : "translateX(-40px)",
        transition: "opacity 200ms ease, transform 200ms ease",
      };
    }
    return {
      opacity: 1,
      transform: "translateX(0)",
      transition: "opacity 300ms ease, transform 300ms ease",
    };
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <ProgressBar current={step} />

        {/* Step content */}
        <div style={getTransitionStyle()}>
          {/* ── Step 1: Interests ── */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2">
                What are you interested in?
              </h2>
              <p className="text-sm text-slate-500 text-center mb-8">
                Select at least one topic to personalise your experience.
              </p>

              <div className="flex flex-wrap justify-center gap-2.5">
                {INTEREST_OPTIONS.map((opt) => (
                  <InterestPill
                    key={opt.value}
                    selected={form.interested_in.includes(opt.value)}
                    onClick={() => toggleInterest(opt.value)}
                    label={opt.label}
                    icon={opt.icon}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Experience & Goals ── */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2">
                Tell us about your experience
              </h2>
              <p className="text-sm text-slate-500 text-center mb-8">
                This helps us tailor recommendations for you.
              </p>

              <div className="mb-8">
                <p className="text-sm font-medium text-slate-700 mb-3">Experience Level</p>
                <div className="grid grid-cols-1 gap-2">
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <RadioCard
                      key={opt.value}
                      selected={form.investing_experience === opt.value}
                      onClick={() => setForm((p) => ({ ...p, investing_experience: opt.value }))}
                      label={opt.label}
                      description={opt.description}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">Primary Goal</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <RadioCard
                      key={opt.value}
                      selected={form.investment_goals === opt.value}
                      onClick={() => setForm((p) => ({ ...p, investment_goals: opt.value }))}
                      label={opt.label}
                      description={opt.description}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Details ── */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2">
                Almost done — a few details
              </h2>
              <p className="text-sm text-slate-500 text-center mb-8">
                All fields are optional. You can update these later.
              </p>

              <div className="space-y-6">
                {/* Display Name */}
                <div>
                  <label htmlFor="onboard_name" className="block text-sm font-medium text-slate-700 mb-1">
                    Display Name
                  </label>
                  <input
                    id="onboard_name"
                    type="text"
                    value={form.display_name}
                    onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                    placeholder="How should we address you?"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    maxLength={100}
                  />
                </div>

                {/* Portfolio Size */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Portfolio Size</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PORTFOLIO_OPTIONS.map((opt) => (
                      <RadioCard
                        key={opt.value}
                        selected={form.portfolio_size === opt.value}
                        onClick={() => setForm((p) => ({ ...p, portfolio_size: opt.value }))}
                        label={opt.label}
                      />
                    ))}
                  </div>
                </div>

                {/* State */}
                <div>
                  <label htmlFor="onboard_state" className="block text-sm font-medium text-slate-700 mb-1">
                    State
                  </label>
                  <select
                    id="onboard_state"
                    value={form.state}
                    onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                  >
                    <option value="">Select your state</option>
                    {AU_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-10 gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-8 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="px-8 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Finish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
