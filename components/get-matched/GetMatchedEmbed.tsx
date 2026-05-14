"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { HOMEPAGE_GOAL_CHIPS, getEmbedConfig } from "@/lib/getmatched/embeds";
import type { EmbedContext } from "@/lib/getmatched/types";

interface Props {
  context: EmbedContext;
  /** Optional listing id stamped onto the action plan for the `opportunity` context. */
  listingId?: number;
}

/**
 * Contextual entry point into Get Matched 2.0. Same engine, different skin
 * per page context (homepage / SMSF guide / opportunity / advisor directory
 * / platform compare).
 *
 * Homepage shows the 9-chip goal picker → deep-links into the full flow.
 * Other contexts show a single CTA card that pre-fills the intent.
 */
export default function GetMatchedEmbed({ context, listingId }: Props) {
  const cfg = getEmbedConfig(context);
  const baseQuery = new URLSearchParams();
  baseQuery.set("context", context);
  if (cfg.intent_prefill) baseQuery.set("intent", cfg.intent_prefill);
  if (cfg.start_step) baseQuery.set("start_step", String(cfg.start_step));
  if (listingId) baseQuery.set("listing_id", String(listingId));

  if (context === "homepage") {
    return (
      <section className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-amber-600 text-[11px] font-bold uppercase tracking-widest mb-2">
            Start with your goal
          </p>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-2">
            {cfg.headline}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-6 sm:mb-8">
            {cfg.subtitle}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-4xl mx-auto">
          {HOMEPAGE_GOAL_CHIPS.map((chip) => {
            const q = new URLSearchParams();
            q.set("goal", chip.value);
            q.set("context", "homepage");
            return (
              <Link
                key={chip.value}
                href={`/get-matched?${q.toString()}`}
                className="group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3.5 hover:border-amber-400 hover:bg-amber-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <Icon
                  name={chip.icon}
                  size={18}
                  className="text-slate-500 group-hover:text-amber-600 shrink-0"
                />
                <span className="text-sm font-semibold text-slate-900 text-left">
                  {chip.label}
                </span>
                <Icon
                  name="arrow-right"
                  size={14}
                  className="ml-auto text-slate-300 group-hover:text-amber-500"
                />
              </Link>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 text-center mt-6">
          Takes 60 seconds · No account needed to see your result · Create a brief only if you want professionals to respond
        </p>
      </section>
    );
  }

  // Compact embed for all other contexts.
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-amber-600 text-[10px] font-bold uppercase tracking-widest mb-1">
            Get Matched
          </p>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1">
            {cfg.headline}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">{cfg.subtitle}</p>
        </div>
        <Link
          href={`/get-matched?${baseQuery.toString()}`}
          className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-3 rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Build my action plan
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </section>
  );
}
