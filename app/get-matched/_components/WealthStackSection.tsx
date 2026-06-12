"use client";

/**
 * WealthStackSection — Showcase G9 "Your full wealth stack".
 *
 * Renders the server-computed wealth stack (super fund / savings / robo) as
 * compact factual cards beneath the cross-sells, for platform-shaped results.
 * Fires `stack_viewed` once on mount when there is at least one slot.
 *
 * Compliance: "based on your stated answers" — factual criteria matching, no
 * advice, no "you should". The disclaimer line is always present.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";

import Icon from "@/components/Icon";
import { trackEvent as phTrack } from "@/lib/posthog/events";

export interface StackSlotView {
  kind: "super_fund" | "savings_account" | "robo_advisor";
  slug: string;
  name: string;
  logo_url: string | null;
  rating: number | null;
  href: string;
}

const KIND_META: Record<
  StackSlotView["kind"],
  { label: string; icon: string }
> = {
  super_fund: { label: "Super fund", icon: "landmark" },
  savings_account: { label: "Savings account", icon: "piggy-bank" },
  robo_advisor: { label: "Robo / automated", icon: "cpu" },
};

export default function WealthStackSection({
  stack,
}: {
  stack: StackSlotView[];
}) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current && stack.length > 0) {
      tracked.current = true;
      phTrack("stack_viewed", { slot_count: stack.length });
    }
  }, [stack.length]);

  if (stack.length === 0) return null;

  return (
    <section className="mb-6" aria-labelledby="gm-stack-heading">
      <p
        id="gm-stack-heading"
        className="text-xs uppercase tracking-widest text-slate-500 mb-1"
      >
        Your full wealth stack
      </p>
      <p className="text-[11px] text-slate-500 mb-3">
        Products that match your stated answers across other parts of your
        money. Factual matches — general information only, not personal advice.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stack.map((slot) => {
          const meta = KIND_META[slot.kind];
          return (
            <Link
              key={`${slot.kind}:${slot.slug}`}
              href={slot.href}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <Icon name={meta.icon} size={12} />
                {meta.label}
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                {slot.name}
              </span>
              {slot.rating !== null && (
                <span className="text-xs text-slate-500">
                  Rated {slot.rating.toFixed(1)} / 5
                </span>
              )}
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                View details
                <Icon name="arrow-right" size={12} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
