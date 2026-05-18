import Link from "next/link";
import Icon from "@/components/Icon";

interface Props {
  /** Optional counts to badge the tiles. All optional — server fetches
   *  may not be available for every visit; tiles render without them. */
  holdingsCount?: number;
  goalsCount?: number;
  rateAlertsCount?: number;
  isPro?: boolean;
}

// FIN_NOTEBOOK item 20 — "My investing OS" dashboard tiles.
//
// Surfaces every account-bound investing surface in one grid so users
// don't have to discover them from the global nav. Each tile is a Link
// to a server-rendered page; counts are badges, not the source of truth.
export default function AccountInvestingOSTiles({
  holdingsCount,
  goalsCount,
  rateAlertsCount,
  isPro,
}: Props) {
  return (
    <section aria-label="My investing OS" className="mb-6">
      <h2 className="text-base font-semibold text-slate-900 mb-3">
        My investing OS
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Tile
          href="/account/net-worth"
          icon="trending-up"
          title="Net worth"
          accent="indigo"
          badge={holdingsCount != null ? `${holdingsCount} holding${holdingsCount === 1 ? "" : "s"}` : undefined}
          description="See holdings + goals on one balance sheet."
        />
        <Tile
          href="/wealth-stack"
          icon="layers"
          title="Wealth stack"
          accent="emerald"
          description="Build the brokerage + super + savings combo that matches your goal."
        />
        <Tile
          href="/fire-calculator"
          icon="target"
          title="FIRE goal"
          accent="amber"
          badge={goalsCount != null && goalsCount > 0 ? `${goalsCount} saved` : undefined}
          description="Project your financial-independence date with current contributions."
        />
        <Tile
          href="/account/holdings"
          icon="briefcase"
          title="Holdings"
          accent="slate"
          description="Track tickers, brokers, and balances across every platform."
        />
        <Tile
          href="/savings"
          icon="bell"
          title="Rate alerts"
          accent="rose"
          badge={rateAlertsCount != null && rateAlertsCount > 0 ? `${rateAlertsCount} active` : undefined}
          description="Watch savings + term-deposit moves before headline rates change."
        />
        <Tile
          href={isPro ? "/pro/research" : "/pricing"}
          icon="file-text"
          title={isPro ? "Premium research" : "Upgrade to Pro"}
          accent="violet"
          description={isPro
            ? "In-depth reports on platforms, sectors, and AU policy moves."
            : "Unlock research reports, no-ad reading, and the Pro newsletter."}
        />
      </div>
    </section>
  );
}

type AccentKey = "indigo" | "emerald" | "amber" | "slate" | "rose" | "violet";

const ACCENT_CLASSES: Record<AccentKey, { wrap: string; icon: string; cta: string }> = {
  indigo: {
    wrap: "bg-indigo-50 border-indigo-200 hover:border-indigo-400",
    icon: "text-indigo-700",
    cta: "text-indigo-700",
  },
  emerald: {
    wrap: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
    icon: "text-emerald-700",
    cta: "text-emerald-700",
  },
  amber: {
    wrap: "bg-amber-50 border-amber-200 hover:border-amber-400",
    icon: "text-amber-700",
    cta: "text-amber-700",
  },
  slate: {
    wrap: "bg-slate-50 border-slate-200 hover:border-slate-400",
    icon: "text-slate-700",
    cta: "text-slate-700",
  },
  rose: {
    wrap: "bg-rose-50 border-rose-200 hover:border-rose-400",
    icon: "text-rose-700",
    cta: "text-rose-700",
  },
  violet: {
    wrap: "bg-violet-50 border-violet-200 hover:border-violet-400",
    icon: "text-violet-700",
    cta: "text-violet-700",
  },
};

function Tile({
  href,
  icon,
  title,
  description,
  badge,
  accent,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  badge?: string;
  accent: AccentKey;
}) {
  const c = ACCENT_CLASSES[accent];
  return (
    <Link
      href={href}
      className={`${c.wrap} rounded-xl p-4 block transition-colors border`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon name={icon} size={16} className={c.icon} />
        <p className="text-sm font-bold text-slate-900">{title}</p>
        {badge && (
          <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold bg-white/70 text-slate-600 px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-600">{description}</p>
      <p className={`text-xs ${c.cta} mt-2 font-semibold`}>Open →</p>
    </Link>
  );
}
