import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import LicScreenerClient from "./LicScreenerClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `LIC Screener — Compare ASX Listed Investment Companies (${CURRENT_YEAR})`,
  description:
    "Screen 15 ASX-listed investment companies (LICs) by dividend yield, franking credits, NTA premium/discount, management cost, and investment focus. Free tool — no sign-up.",
  alternates: { canonical: `${SITE_URL}/lic-screener` },
  openGraph: {
    title: `LIC Screener — ASX Listed Investment Companies (${CURRENT_YEAR})`,
    description:
      "Compare Australian LICs by yield, franking, NTA discount, and management cost. Filter by focus (income, growth, global, small-cap) to find the right LIC for your portfolio.",
    url: `${SITE_URL}/lic-screener`,
    images: [
      {
        url: "/api/og?title=LIC+Screener&subtitle=ASX+Listed+Investment+Companies&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "ETFs", url: `${SITE_URL}/etfs` },
  { name: "LIC Screener", url: `${SITE_URL}/lic-screener` },
]);

const calcLd = calculatorJsonLd({
  name: "ASX LIC Screener",
  description:
    "Compare 15 ASX-listed investment companies by dividend yield, franking credits, NTA premium/discount, and management cost. Filter by investment focus including Australian shares, global shares, small-cap, income, value, and growth.",
  path: "/lic-screener",
});

const faqLd = faqJsonLd([
  {
    q: "What is a Listed Investment Company (LIC)?",
    a: "A Listed Investment Company (LIC) is a closed-end fund listed on the ASX that invests in a portfolio of securities. Unlike ETFs, LICs have a fixed number of shares on issue and can trade at a premium or discount to their underlying Net Tangible Assets (NTA). LICs are typically actively managed and structured as companies — meaning they can retain earnings and smooth out dividend payments across market cycles.",
  },
  {
    q: "What is NTA discount in a LIC?",
    a: "NTA (Net Tangible Assets) per share represents the underlying value of a LIC's portfolio divided by the number of shares on issue. A discount means the share price is below the NTA — historically common in LICs because they are closed-end structures. A 5% discount means you're buying $1.00 of assets for $0.95. A premium means the share price exceeds the portfolio value, which usually occurs in popular income LICs during yield-seeking periods.",
  },
  {
    q: "Are LIC dividends fully franked?",
    a: "Many Australian-shares-focused LICs — including AFI, ARG, BKI, and AUI — pay fully franked (100%) dividends. Franking credits represent the tax already paid at the company level and can be used to offset your personal income tax liability or, in the case of SMSFs in pension phase, may generate a tax refund. LICs investing in global shares (like PMC or TGG) typically pay unfranked or partially franked dividends because the underlying companies pay tax in foreign jurisdictions.",
  },
  {
    q: "LIC vs ETF: what's the difference?",
    a: "ETFs (Exchange Traded Funds) are open-ended — new units are created and redeemed to keep the price close to the underlying value, making discounts and premiums rare. LICs are closed-end companies — they raise a fixed pool of capital and cannot issue or redeem shares to correct price/NTA gaps. LICs can smooth dividends (paying from retained earnings in bad years), whereas ETF distributions reflect actual income received. Both are listed on the ASX and can be bought through any broker.",
  },
]);

export default function LicScreenerPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={calcLd} />
      <JsonLd data={faqLd} />
      <Suspense>
        <LicScreenerClient />
      </Suspense>

      {/* Static FAQ for SEO */}
      <section className="container-custom max-w-5xl pb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {[
            {
              q: "What is a Listed Investment Company (LIC)?",
              a: "A LIC is a closed-end ASX-listed fund that invests in a portfolio of securities. Unlike ETFs, LICs have a fixed share count and can trade at a premium or discount to their underlying Net Tangible Assets (NTA). Most are actively managed and structured as companies, allowing them to smooth dividend payments across market cycles.",
            },
            {
              q: "What is NTA discount and why does it matter?",
              a: "NTA (Net Tangible Assets) per share is the value of the LIC's investment portfolio per share. A discount means the share price is below the portfolio's NTA — essentially buying $1.00 of assets for less. Persistent discounts can represent value if the LIC's underlying portfolio performs well; they can also widen during periods of market stress.",
            },
            {
              q: "Are LIC dividends fully franked?",
              a: "Australian-shares-focused LICs (AFI, ARG, BKI, AUI, and others) typically pay fully franked dividends — attractive for SMSFs in pension phase. Global-shares LICs (PMC, TGG, MFF) usually pay unfranked or lightly franked dividends since the underlying stocks pay foreign taxes.",
            },
            {
              q: "LICs vs ETFs — which is better?",
              a: "ETFs are lower-cost, passive, and trade close to their NTA at all times. LICs are typically actively managed, can trade at discounts or premiums, and can smooth dividends from retained earnings. For income-focused SMSF investors who value franked dividends and smoothed payments, LICs can complement an ETF core. For most investors starting out, a low-cost indexed ETF is the simpler starting point.",
            },
          ].map((item) => (
            <details key={item.q} className="bg-white border border-slate-200 rounded-xl group">
              <summary className="px-5 py-4 text-sm font-semibold text-slate-800 cursor-pointer list-none flex justify-between items-center">
                {item.q}
                <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2">▾</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="container-custom max-w-5xl pb-10">
        <ComplianceFooter />
      </div>
    </>
  );
}
