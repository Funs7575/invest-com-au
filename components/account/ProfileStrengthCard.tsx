"use client";

import { useEffect } from "react";
import Link from "next/link";
import ProgressRing from "@/components/ui/ProgressRing";
import { celebrateMilestone } from "@/lib/celebrate";

export type ProfileField =
  | "display_name"
  | "investing_experience"
  | "investment_goals"
  | "portfolio_size"
  | "interested_in";

/**
 * D5 (RETAIL_UX_NORTHSTAR): each missing field states what it visibly
 * sharpens — completion is framed as the user's information getting more
 * specific, never as advice getting "better" (§9 firewall).
 */
const UNLOCKS: Record<ProfileField, { label: string; unlocks: string }> = {
  display_name: {
    label: "Your name",
    unlocks: "your dashboard greets you, not 'Account'",
  },
  investing_experience: {
    label: "Experience level",
    unlocks: "guides and matches calibrate to where you're at",
  },
  investment_goals: {
    label: "Your goal",
    unlocks: "next-step suggestions follow what you're aiming for",
  },
  portfolio_size: {
    label: "Portfolio size",
    unlocks: "cost estimates become dollar figures sized to you",
  },
  interested_in: {
    label: "Your interests",
    unlocks: "your home page leads with your topics",
  },
};

interface ProfileStrengthCardProps {
  completeness: number;
  missing: ProfileField[];
}

/**
 * Profile-strength ring with visible unlocks (Northstar D5). Replaces the
 * flat blue completeness bar. At 100% it renders nothing but fires the
 * profile_complete milestone exactly once (registry-deduped).
 */
export default function ProfileStrengthCard({ completeness, missing }: ProfileStrengthCardProps) {
  useEffect(() => {
    if (completeness >= 100) celebrateMilestone("profile_complete");
  }, [completeness]);

  if (completeness >= 100) return null;

  return (
    <section aria-labelledby="completeness-heading" className="mb-8">
      <h2
        id="completeness-heading"
        className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3"
      >
        Profile strength
      </h2>
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4">
        <ProgressRing
          value={completeness}
          size={64}
          strokeWidth={6}
          label={`Profile ${completeness}% complete`}
          className="shrink-0"
        >
          <span className="text-sm font-extrabold text-slate-900 tnum">{completeness}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">
            The more you add, the more specific your numbers get
          </p>
          <ul className="mt-2 space-y-1.5">
            {missing.map((key) => (
              <li key={key} className="flex items-start justify-between gap-3">
                <p className="text-xs text-slate-600 leading-snug">
                  <span className="font-semibold text-slate-800">{UNLOCKS[key].label}</span>
                  {" → "}
                  {UNLOCKS[key].unlocks}
                </p>
                <Link
                  href="/account/profile"
                  className="shrink-0 text-xs font-semibold text-amber-700 hover:underline"
                >
                  Add →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
