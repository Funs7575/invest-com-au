/**
 * Kind-cards block at the top of /account home (Track A.2).
 *
 * Server component. Renders one card per kind the user holds, with a
 * deep link to that kind's portal. No active-kind switcher logic here —
 * that's the WorkspaceSwitcher in the header. This is the pull-together
 * "what hats do I wear?" surface for users who want a single overview.
 *
 * For single-kind users this renders just one card — still useful as a
 * "where do I go" anchor. Hidden when the user has zero kinds (page
 * caller guards on memberships.length > 0).
 */

import Link from "next/link";
import type { KindMembership } from "@/lib/account-kinds";
import { portalForKind } from "@/lib/account-kinds";

const KIND_META: Record<
  KindMembership["kind"],
  { label: string; description: string; icon: string; tone: string }
> = {
  investor: {
    label: "Investor",
    description: "Holdings, watchlist, saved searches, scoring.",
    icon: "📈",
    tone: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
  },
  advisor: {
    label: "Advisor",
    description: "Lead inbox, KPIs, billing, advisor profile.",
    icon: "🧑‍💼",
    tone: "bg-sky-50 border-sky-200 hover:border-sky-400",
  },
  broker_partner: {
    label: "Broker partner",
    description: "Campaigns, attribution, marketplace billing.",
    icon: "🏦",
    tone: "bg-amber-50 border-amber-200 hover:border-amber-400",
  },
  business_owner: {
    label: "Business owner",
    description: "Grants tracker, R&D claims, sell-business prep.",
    icon: "🏢",
    tone: "bg-violet-50 border-violet-200 hover:border-violet-400",
  },
  listing_owner: {
    label: "Listing owner",
    description: "Listings, leads, renewal alerts.",
    icon: "🏷️",
    tone: "bg-rose-50 border-rose-200 hover:border-rose-400",
  },
};

interface Props {
  memberships: KindMembership[];
  /**
   * Count of the user's saved searches. When >0 we render an extra tile
   * linking to /account/saved-searches. Caller should pass 0 (or omit)
   * when the user has none — we don't render an empty-state tile.
   */
  savedSearchCount?: number;
}

export default function AccountKindCards({ memberships, savedSearchCount = 0 }: Props) {
  const hasSavedSearches = savedSearchCount > 0;
  const tileCount = memberships.length + (hasSavedSearches ? 1 : 0);
  return (
    <section aria-label="Your roles" className="mb-6">
      <h2 className="text-base font-semibold text-slate-900 mb-3">Your roles</h2>
      <div className={tileCount === 1 ? "" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
        {memberships.map((m) => {
          const meta = KIND_META[m.kind];
          if (!meta) return null;
          const href = portalForKind(m.kind);
          return (
            <Link
              key={`${m.kind}-${m.kindId}`}
              href={href}
              className={`block border ${meta.tone} rounded-xl p-4 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0" aria-hidden>
                  {meta.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {meta.label}
                    </h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-white/70 text-slate-600 rounded">
                      {m.status}
                    </span>
                  </div>
                  {m.displayLabel && m.displayLabel !== meta.label && (
                    <p className="text-xs text-slate-700 font-medium mt-0.5 truncate">
                      {m.displayLabel}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">{meta.description}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-2">
                    Open →
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
        {hasSavedSearches && (
          <Link
            href="/account/saved-searches"
            className="block border bg-indigo-50 border-indigo-200 hover:border-indigo-400 rounded-xl p-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0" aria-hidden>
                🔔
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Saved searches
                  </h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-white/70 text-slate-600 rounded">
                    {savedSearchCount}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Manage advisor and team alerts you&rsquo;re subscribed to.
                </p>
                <p className="text-xs font-semibold text-slate-700 mt-2">
                  Open →
                </p>
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
