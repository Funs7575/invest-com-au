/**
 * <AnnuityComparisonRail> — factual product comparison entries for annuity
 * providers (Challenger, etc.) on the /retirement hub.
 *
 * LEAN-LANE: factual information + referral only. No personal advice.
 * Entries are presented as informational comparison cards, not advice.
 * The GENERAL_ADVICE_WARNING from lib/compliance.ts is shown below.
 *
 * New file — stays in app/retirement orbit, does not touch shared SSOTs.
 */
import Link from "next/link";
import {
  GENERAL_ADVICE_WARNING,
  ADVERTISER_DISCLOSURE_SHORT,
} from "@/lib/compliance";

interface AnnuityEntry {
  provider: string;
  productName: string;
  productType: string;
  headline: string;
  keyFeatures: string[];
  href: string;
  isSponsored?: boolean;
}

const ANNUITY_ENTRIES: AnnuityEntry[] = [
  {
    provider: "Challenger",
    productName: "Challenger LifeTime™ Annuity",
    productType: "Lifetime annuity",
    headline:
      "Guaranteed income for life — paid monthly regardless of how long you live or how markets perform. Available as a fixed, CPI-indexed, or market-linked income stream.",
    keyFeatures: [
      "Income guaranteed for life (or joint-life with a partner)",
      "Optional CPI indexation to protect against inflation",
      "Centrelink assessment: 60% of purchase price counted as an asset",
      "No negative Centrelink deeming — actual income assessed, not deemed",
      "Minimum investment from $10,000",
    ],
    href: "https://www.challenger.com.au/products/lifetime-annuity",
    isSponsored: false,
  },
  {
    provider: "Challenger",
    productName: "Challenger Term Annuity",
    productType: "Term annuity (1–10 years)",
    headline:
      "Fixed income payments for a set term (1–10 years). Capital is returned at end of term. Useful for bridging income gaps before Age Pension eligibility or while waiting to draw on super.",
    keyFeatures: [
      "Guaranteed income for a fixed term (1–10 years)",
      "Capital returned in full at end of term (no surrender value during term)",
      "Interest rates fixed at commencement — no market risk",
      "Centrelink: assessed as a financial investment asset",
      "Can be held inside or outside superannuation",
    ],
    href: "https://www.challenger.com.au/products/term-annuity",
    isSponsored: false,
  },
  {
    provider: "Generation Life",
    productName: "LifeIncome",
    productType: "Lifetime income stream",
    headline:
      "A modern lifetime income stream that combines market-linked growth with longevity protection. Income can be variable. Designed as an alternative to traditional annuities for retirees wanting some upside exposure.",
    keyFeatures: [
      "Market-linked income with longevity pooling",
      "Income may vary with investment returns",
      "Favourable Centrelink treatment from age 84: only 30% assessed as asset/income",
      "No minimum drawdown requirements (unlike account-based pensions)",
      "Available inside super (pension phase) or outside",
    ],
    href: "https://www.generationlife.com.au/",
    isSponsored: false,
  },
];

export default function AnnuityComparisonRail() {
  return (
    <section className="py-10 border-t border-slate-200">
      <div className="container-custom max-w-6xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Annuity products — factual comparison
          </h2>
          <p className="text-sm text-slate-500">
            The entries below are factual summaries of publicly available product
            information. This is not a recommendation.{" "}
            <Link
              href="/retirement/annuities"
              className="underline hover:text-slate-700 transition-colors"
            >
              Read our full annuities guide.
            </Link>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ANNUITY_ENTRIES.map((entry) => (
            <article
              key={entry.productName}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              aria-label={`${entry.productName} by ${entry.provider}`}
            >
              {/* Header */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {entry.productType}
                  </span>
                  {entry.isSponsored && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      Sponsored
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {entry.productName}
                </h3>
                <p className="text-xs text-slate-500">{entry.provider}</p>
              </div>

              {/* Headline */}
              <p className="text-sm text-slate-700 leading-relaxed">{entry.headline}</p>

              {/* Key features */}
              <ul className="space-y-1.5 flex-1">
                {entry.keyFeatures.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-2 text-xs text-slate-600"
                  >
                    <span
                      className="mt-0.5 h-3.5 w-3.5 text-emerald-500 shrink-0"
                      aria-hidden="true"
                    >
                      &#10003;
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="mt-auto block text-center text-sm font-semibold text-emerald-700 border border-emerald-200 rounded-lg px-4 py-2 hover:bg-emerald-50 transition-colors"
                aria-label={`View ${entry.productName} on ${entry.provider} website (opens in new tab)`}
              >
                View on {entry.provider} &rarr;
              </a>
            </article>
          ))}
        </div>

        {/* Compliance */}
        <div
          className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[0.7rem] text-slate-500 leading-relaxed"
          role="note"
          aria-label="General advice warning"
        >
          <strong className="text-slate-600">General Advice Warning:</strong>{" "}
          {GENERAL_ADVICE_WARNING}{" "}
          <span className="block mt-1 text-slate-400">{ADVERTISER_DISCLOSURE_SHORT}</span>
        </div>
      </div>
    </section>
  );
}
