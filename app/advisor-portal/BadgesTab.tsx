"use client";

import { useEffect, useState } from "react";
import type { Advisor } from "./types";

type Badge = {
  id: number;
  professional_id: number;
  badge_type: string;
  earned_at: string;
  metadata: Record<string, unknown> | null;
};

const BADGE_CONFIG: Record<
  string,
  { label: string; description: string; icon: string; color: string }
> = {
  profile_complete: {
    label: "Profile Pro",
    description: "Profile is 90%+ complete",
    icon: "⭐",
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
  },
  first_review: {
    label: "First Review",
    description: "Received your first client review",
    icon: "💬",
    color: "bg-blue-50 border-blue-200 text-blue-800",
  },
  top_rated: {
    label: "Top Rated",
    description: "Avg rating 4.8+ with 5+ reviews",
    icon: "🏆",
    color: "bg-amber-50 border-amber-200 text-amber-800",
  },
  fast_responder: {
    label: "Fast Responder",
    description: "Average response under 2 hours",
    icon: "⚡",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  cpd_compliant: {
    label: "CPD Compliant",
    description: "Completed 40+ CPD hours this year",
    icon: "🎓",
    color: "bg-teal-50 border-teal-200 text-teal-800",
  },
  first_course: {
    label: "Course Creator",
    description: "Published your first course",
    icon: "📚",
    color: "bg-purple-50 border-purple-200 text-purple-800",
  },
  course_creator: {
    label: "Prolific Educator",
    description: "Published 3+ courses",
    icon: "🎯",
    color: "bg-violet-50 border-violet-200 text-violet-800",
  },
  popular_educator: {
    label: "Popular Educator",
    description: "10+ course enrollments",
    icon: "👥",
    color: "bg-indigo-50 border-indigo-200 text-indigo-800",
  },
  community_active: {
    label: "Community Active",
    description: "5+ posts in the past 30 days",
    icon: "🌐",
    color: "bg-sky-50 border-sky-200 text-sky-800",
  },
  early_adopter: {
    label: "Early Adopter",
    description: "Joined during the platform launch",
    icon: "🚀",
    color: "bg-orange-50 border-orange-200 text-orange-800",
  },
  verified: {
    label: "AFSL Verified",
    description: "AFSL-verified financial advisor",
    icon: "✅",
    color: "bg-green-50 border-green-200 text-green-800",
  },
  trust_starter: {
    label: "Trust Starter",
    description: "Trust Score 40+ — good foundation",
    icon: "🌱",
    color: "bg-slate-50 border-slate-200 text-slate-700",
  },
  trust_growth: {
    label: "Trust Growth",
    description: "Trust Score 55+ — strong profile",
    icon: "📈",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  trust_pro: {
    label: "Trust Pro",
    description: "Trust Score 70+ — highly trusted",
    icon: "💎",
    color: "bg-blue-50 border-blue-200 text-blue-800",
  },
  trust_elite: {
    label: "Trust Elite",
    description: "Trust Score 85+ — elite standing",
    icon: "👑",
    color: "bg-violet-50 border-violet-200 text-violet-800",
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BadgesTab({ advisor }: { advisor: Advisor | null }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/advisor-auth/badges");
        if (res.ok) {
          const data = (await res.json()) as { badges: Badge[] };
          setBadges(data.badges);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [advisor]);

  const earnedTypes = new Set(badges.map((b) => b.badge_type));
  const unearnedTypes = Object.keys(BADGE_CONFIG).filter(
    (t) => !earnedTypes.has(t),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Your Badges</h2>
        <p className="text-sm text-slate-500 mt-1">
          Badges improve your profile visibility and ranking.
        </p>
      </div>

      {/* Earned badges */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Earned ({badges.length})
        </h3>
        {badges.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="text-sm text-slate-500">
              No badges earned yet — complete your profile to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map((badge) => {
              const cfg = BADGE_CONFIG[badge.badge_type];
              if (!cfg) return null;
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-4 flex flex-col gap-2 ${cfg.color}`}
                >
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {cfg.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      {cfg.label}
                    </p>
                    <p className="text-xs mt-0.5 opacity-80">
                      {cfg.description}
                    </p>
                  </div>
                  <p className="text-[0.65rem] opacity-60 mt-auto">
                    Earned {formatDate(badge.earned_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Badges to earn */}
      {unearnedTypes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Badges to Earn ({unearnedTypes.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {unearnedTypes.map((type) => {
              const cfg = BADGE_CONFIG[type];
              if (!cfg) return null;
              return (
                <div
                  key={type}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-2 opacity-60"
                >
                  <span className="text-2xl leading-none grayscale" aria-hidden="true">
                    🔒
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 leading-tight">
                      {cfg.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cfg.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Motivational note */}
      <div className="rounded-xl border border-violet-100 bg-violet-50 px-5 py-4 text-sm text-violet-800">
        <strong>Tip:</strong> Badges improve your profile visibility and ranking on Invest.com.au. Complete your profile, gather reviews, and stay CPD-compliant to unlock more badges.
      </div>
    </div>
  );
}
