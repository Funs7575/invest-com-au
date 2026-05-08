import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * <CrossHubLinks> — cross-hub navigation rail.
 *
 * Renders a grid of cards linking to adjacent hubs. The caller passes slugs
 * from `HubConfig.relatedHubs`; this component resolves them via the built-in
 * registry. Unknown slugs are skipped silently. If no resolvable slugs remain,
 * the component returns null so the hub page emits no empty section.
 *
 * W-11 — hub foundation stream (REMEDIATION_QUEUE.md).
 */

export interface CrossHubLinksProps {
  /** Slugs from HubConfig.relatedHubs. Resolved via the built-in registry. */
  hubs: string[];
  /** Section heading. Defaults to "Explore more guides". */
  heading?: string;
}

interface HubMeta {
  label: string;
  tagline: string;
}

export const HUB_REGISTRY: Record<string, HubMeta> = {
  smsf: {
    label: "SMSF",
    tagline: "Setup, audit, and investment strategy for self-managed super funds.",
  },
  grants: {
    label: "Grants & Incentives",
    tagline: "R&D tax incentives, EMDG, and industry growth programs.",
  },
  "lump-sum-investing": {
    label: "Lump Sum Investing",
    tagline: "Put a windfall to work with a structured investment plan.",
  },
  "negative-gearing": {
    label: "Negative Gearing",
    tagline: "Property tax strategy, deductibility rules, and worked examples.",
  },
  "sell-business": {
    label: "Sell Your Business",
    tagline: "Valuation, M&A advisors, and exit strategy for founders.",
  },
  dividends: {
    label: "Dividends",
    tagline: "Franking credits, DRP, and dividend growth strategy.",
  },
  "visa-investment": {
    label: "Visa Investment",
    tagline: "Significant Investor Visa and Business Innovation Visa.",
  },
  "foreign-investment": {
    label: "Foreign Investment",
    tagline: "FIRB rules, investment structures, and Australian property.",
  },
  "global-investing": {
    label: "Global Investing",
    tagline: "US shares, international ETFs, and portfolio diversification.",
  },
  super: {
    label: "Superannuation",
    tagline: "Compare super funds, contribution strategies, and employer SG.",
  },
  "private-markets": {
    label: "Private Markets",
    tagline: "Pre-IPO, secondary, and wholesale investment opportunities.",
  },
  insurance: {
    label: "Insurance",
    tagline: "Life, income protection, and TPD comparison for Australians.",
  },
  retirement: {
    label: "Retirement",
    tagline: "Drawdown strategy, account-based pensions, and age pension.",
  },
  "first-home-buyer": {
    label: "First Home Buyer",
    tagline: "FHSS, home guarantee, stamp duty, and borrowing power guides.",
  },
  redundancy: {
    label: "Redundancy",
    tagline: "ETP tax treatment, payout strategy, and what to do next.",
  },
  inheritance: {
    label: "Inheritance",
    tagline: "Probate by state, estate tax, and executor guides.",
  },
  "find-advisor": {
    label: "Find a Financial Adviser",
    tagline: "Match with an AFSL-authorised adviser for your situation.",
  },
};

export default function CrossHubLinks({
  hubs,
  heading = "Explore more guides",
}: CrossHubLinksProps) {
  const resolved = hubs
    .map((slug) => {
      const meta = HUB_REGISTRY[slug];
      return meta ? { slug, ...meta } : null;
    })
    .filter((h): h is { slug: string } & HubMeta => h !== null);

  if (resolved.length === 0) return null;

  return (
    <section
      className="py-12 bg-slate-50 border-t border-slate-200"
      data-testid="cross-hub-links"
    >
      <div className="container-custom max-w-6xl">
        <h2
          className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6"
          data-testid="cross-hub-links-heading"
        >
          {heading}
        </h2>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="cross-hub-links-grid"
        >
          {resolved.map(({ slug, label, tagline }) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className="group bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl p-5 transition-colors"
              data-testid={`cross-hub-link-${slug}`}
            >
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-700 mb-1.5">
                {label}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                {tagline}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 group-hover:underline">
                Explore guide
                <Icon name="arrow-right" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
