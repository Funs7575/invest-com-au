"use client";

import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

/**
 * Intent-step sidebar: turns the otherwise-empty right column into useful,
 * compact context — live pro supply, the 3-step "how it works", and the
 * trust guarantees. Mirrors the dense directory-page rail style.
 */

const STEPS = [
  { icon: "edit-3", title: "Tell us what you need", desc: "Pick a category or describe it." },
  { icon: "users", title: "Verified pros respond", desc: "Matching pros see a masked brief." },
  { icon: "thumbs-up", title: "Compare & choose", desc: "Pick the response that fits." },
];

const TRUST = [
  { icon: "shield-check", text: "Verified pros only" },
  { icon: "lock", text: "Details masked until you choose" },
  { icon: "dollar-sign", text: "Free to post · no obligation" },
];

export default function BriefHowItWorksRail({
  proSupply,
  className = "",
}: {
  proSupply: number | null;
  className?: string;
}) {
  const showSupply = proSupply != null && proSupply >= 12;
  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          {showSupply ? `${proSupply} verified pros ready` : "Verified pros across Australia"}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-emerald-800/70">
          Notified the moment you post — most briefs get multiple responses.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          How it works
        </p>
        <ol className="space-y-2.5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-slate-900">{s.title}</span>
                <span className="block text-[11px] leading-snug text-slate-500">{s.desc}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <ul className="space-y-2">
          {TRUST.map((t) => (
            <li key={t.text} className="flex items-center gap-2 text-xs text-slate-600">
              <Icon name={t.icon} size={14} className="shrink-0 text-emerald-600" />
              {t.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
