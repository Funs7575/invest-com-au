import Link from "next/link";
import Icon from "@/components/Icon";
import type { HeroCard } from "@/lib/account/dashboard-state";

const TONE_BY_KIND: Record<HeroCard["kind"], string> = {
  quote_awaiting_review: "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300",
  brief_accepted: "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300",
  brief_open: "bg-gradient-to-br from-slate-50 to-white border-slate-200",
  plan_saved_no_brief: "bg-gradient-to-br from-amber-50 to-white border-amber-200",
  plan_in_progress: "bg-gradient-to-br from-amber-50 to-white border-amber-200",
  empty: "bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-800",
};

/**
 * Hero card on /account — the highest-priority "what's next" action
 * for the user, derived from their plans + briefs + quotes state.
 */
export default function AccountHero({ hero }: { hero: HeroCard }) {
  const tone = TONE_BY_KIND[hero.kind];
  const isDarkHero = hero.kind === "empty";
  const titleClass = isDarkHero ? "text-white" : "text-slate-900";
  const bodyClass = isDarkHero ? "text-slate-300" : "text-slate-600";

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${tone}`}>
      <p
        className={`text-[11px] uppercase tracking-widest font-bold mb-2 ${
          isDarkHero ? "text-amber-400" : "text-amber-700"
        }`}
      >
        Your next step
      </p>
      <h2 className={`text-xl sm:text-2xl font-extrabold mb-1.5 ${titleClass}`}>
        {hero.title}
      </h2>
      <p className={`text-sm leading-relaxed mb-4 ${bodyClass}`}>{hero.body}</p>
      <Link
        href={hero.cta_href}
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl"
      >
        {hero.cta_label}
        <Icon name="arrow-right" size={14} />
      </Link>
    </section>
  );
}
