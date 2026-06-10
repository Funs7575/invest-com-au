"use client";

import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import type { BriefStrength, StrengthTier } from "@/lib/briefs/brief-strength";

/**
 * Live brief-strength meter. Pure display — the parent computes the
 * {@link BriefStrength} with `scoreBriefStrength` and passes it in, so the
 * bar updates as the user types. Coaches the user toward the single
 * highest-impact improvement.
 */

const BAR: Record<StrengthTier, string> = {
  weak: "bg-rose-400",
  fair: "bg-amber-400",
  good: "bg-emerald-400",
  great: "bg-emerald-500",
};

const LABEL_TEXT: Record<StrengthTier, string> = {
  weak: "text-rose-600",
  fair: "text-amber-600",
  good: "text-emerald-600",
  great: "text-emerald-700",
};

export default function BriefStrengthMeter({
  strength,
  className = "",
}: {
  strength: BriefStrength;
  className?: string;
}) {
  const { score, tier, label, tips } = strength;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Brief strength
        </span>
        <span className={cn("text-xs font-bold tnum", LABEL_TEXT[tier])}>
          {label}
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Brief strength: ${label}, ${score} out of 100`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", BAR[tier])}
          style={{ width: `${Math.max(6, score)}%` }}
        />
      </div>
      {tier === "great" ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-700">
          <Icon name="check-circle" size={13} className="shrink-0" />
          Looking great — this brief gives pros what they need to respond well.
        </p>
      ) : tips.length > 0 ? (
        <ul className="space-y-1">
          {tips.slice(0, 2).map((tip) => (
            <li key={tip.id} className="flex items-start gap-1.5 text-xs text-slate-500">
              <Icon name="lightbulb" size={13} className="mt-0.5 shrink-0 text-amber-500" />
              <span>{tip.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
