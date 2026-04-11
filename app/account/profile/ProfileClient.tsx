"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useUser } from "@/lib/hooks/useUser";
import { useToast } from "@/components/Toast";

/* ── Constants ── */

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

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

/* ── Subcomponents ── */

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
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
        selected
          ? "bg-emerald-600 text-white border-emerald-600"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
      }`}
    >
      <Icon name={icon} size={16} className={selected ? "text-white" : "text-slate-400"} />
      {label}
    </button>
  );
}

/* ── Profile form state ── */

interface ProfileData {
  display_name: string;
  state: string;
  investing_experience: string;
  investment_goals: string;
  portfolio_size: string;
  interested_in: string[];
  preferred_broker: string;
}

const emptyProfile: ProfileData = {
  display_name: "",
  state: "",
  investing_experience: "",
  investment_goals: "",
  portfolio_size: "",
  interested_in: [],
  preferred_broker: "",
};

/* ── Main component ── */

export default function ProfileClient() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState<ProfileData>(emptyProfile);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login?next=/account/profile");
    }
  }, [authLoading, user, router]);

  // Fetch profile on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/user-profile");
        if (!res.ok) return;
        const { profile } = await res.json();
        if (cancelled || !profile) return;
        setForm({
          display_name: profile.display_name ?? "",
          state: profile.state ?? "",
          investing_experience: profile.investing_experience ?? "",
          investment_goals: profile.investment_goals ?? "",
          portfolio_size: profile.portfolio_size ?? "",
          interested_in: Array.isArray(profile.interested_in) ? profile.interested_in : [],
          preferred_broker: profile.preferred_broker ?? "",
        });
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast("Profile saved", "success");
      } else {
        toast("Failed to save profile", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
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

  if (authLoading || !user || fetching) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="h-40 bg-slate-100 rounded-xl" />
            <div className="h-40 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/account"
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Icon name="arrow-left" size={18} className="text-slate-600" />
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Edit Profile</h1>
        </div>

        {/* Section 1: Personal Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-4">Personal Info</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-slate-700 mb-1">
                Display Name
              </label>
              <input
                id="display_name"
                type="text"
                value={form.display_name}
                onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="How should we address you?"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1">
                State
              </label>
              <select
                id="state"
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

        {/* Section 2: Investing Profile */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-4">Investing Profile</h2>

          {/* Experience */}
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-2">Experience Level</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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

          {/* Goals */}
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-2">Investment Goal</p>
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

          {/* Portfolio Size */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Portfolio Size</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
        </div>

        {/* Section 3: Interests */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-4">Interests</h2>
          <div className="flex flex-wrap gap-2">
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

        {/* Section 4: Current Broker */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">Current Broker</h2>
          <input
            type="text"
            value={form.preferred_broker}
            onChange={(e) => setForm((p) => ({ ...p, preferred_broker: e.target.value }))}
            placeholder="e.g. CommSec, Stake..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            maxLength={100}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
