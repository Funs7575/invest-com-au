/**
 * <ReverseMortgageReferral> — factual referral slot for reverse mortgage
 * providers on the /aged-care hub.
 *
 * LEAN-LANE: factual information + referral only. No personal advice.
 * This is not a recommendation — it is a factual summary of publicly
 * available product information with a referral link.
 * GENERAL_ADVICE_WARNING from lib/compliance.ts is shown inline.
 *
 * New file — stays in app/aged-care orbit, does not touch shared SSOTs.
 */
import Link from "next/link";
import {
  GENERAL_ADVICE_WARNING,
  ADVERTISER_DISCLOSURE_SHORT,
} from "@/lib/compliance";

interface ReverseMortgageEntry {
  provider: string;
  productName: string;
  headline: string;
  keyFeatures: string[];
  minAge: number;
  href: string;
  isSponsored?: boolean;
}

const REVERSE_MORTGAGE_ENTRIES: ReverseMortgageEntry[] = [
  {
    provider: "Heartland Seniors Finance",
    productName: "Heartland Reverse Mortgage",
    headline:
      "Access your home equity without selling or making repayments. Heartland is Australia's largest specialist reverse mortgage lender. No Negative Equity Guarantee — you can never owe more than your home is worth.",
    keyFeatures: [
      "No regular repayments required during the loan",
      "No Negative Equity Guarantee (NNEG) — industry standard",
      "Drawdown, lump sum, or regular income options",
      "Minimum age 60; maximum loan depends on age (higher % for older borrowers)",
      "Interest compounds — loan balance grows over time",
      "Loan repaid when property is sold, you move to care, or upon death",
      "Centrelink: proceeds held as cash are assessed as a financial asset",
    ],
    minAge: 60,
    href: "https://www.heartland.com.au/reverse-mortgages",
    isSponsored: false,
  },
  {
    provider: "Household Capital",
    productName: "Household Loan",
    headline:
      "Home equity access designed for Australians aged 60+. Structured drawdown and flexible repayment options. Regulated under the National Consumer Credit Protection Act.",
    keyFeatures: [
      "No regular repayments required",
      "No Negative Equity Guarantee (NNEG)",
      "Flexible drawdown: lump sum, line of credit, or scheduled payments",
      "Minimum age 60",
      "Can be used to fund aged care accommodation payments (RAD/DAP)",
      "Interest compounds — seek independent financial advice before proceeding",
      "Subject to ASIC's responsible lending obligations",
    ],
    minAge: 60,
    href: "https://www.householdcapital.com.au/",
    isSponsored: false,
  },
];

export default function ReverseMortgageReferral() {
  return (
    <section className="py-10 border-t border-slate-200 bg-slate-50">
      <div className="container-custom max-w-6xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Reverse mortgage providers — factual overview
          </h2>
          <p className="text-sm text-slate-600">
            Home equity release can fund aged care costs — but compound interest
            risk is significant.{" "}
            <Link
              href="/aged-care/reverse-mortgage"
              className="underline hover:text-slate-800 transition-colors"
            >
              Read our full guide before proceeding.
            </Link>
          </p>
        </div>

        {/* Risk callout */}
        <div
          className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
          role="alert"
          aria-live="polite"
        >
          <span className="text-amber-600 shrink-0 text-lg leading-tight" aria-hidden="true">
            &#9888;
          </span>
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Important:</strong> Reverse mortgage interest compounds —
            a $200,000 loan at 9% p.a. grows to ~$473,000 in 10 years. Always
            get independent financial advice and model multiple scenarios before
            proceeding. ASIC&apos;s MoneySmart reverse mortgage calculator is a
            useful starting point.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {REVERSE_MORTGAGE_ENTRIES.map((entry) => (
            <article
              key={entry.productName}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              aria-label={`${entry.productName} by ${entry.provider}`}
            >
              {/* Header */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    Min. age {entry.minAge}
                  </span>
                  {entry.isSponsored && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      Sponsored
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{entry.productName}</h3>
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
                      className="mt-0.5 h-3.5 w-3.5 text-blue-500 shrink-0"
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
                className="mt-auto block text-center text-sm font-semibold text-blue-700 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-50 transition-colors"
                aria-label={`View ${entry.productName} on ${entry.provider} website (opens in new tab)`}
              >
                Learn more at {entry.provider} &rarr;
              </a>
            </article>
          ))}
        </div>

        {/* Compliance */}
        <div
          className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[0.7rem] text-slate-500 leading-relaxed"
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
