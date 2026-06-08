/**
 * /foreign-investment/compare
 *
 * Index page listing all available country-vs-country comparison pairs.
 * Serves as an SEO hub and internal-link source for the 66 pair pages.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, absoluteUrl, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER } from "@/lib/compliance";
import { COUNTRY_CONFIGS } from "@/lib/foreign-investment-country-data";
import { allComparePairs } from "@/lib/country-compare";
import { intentCountryMeta } from "@/lib/intent-context";
import type { IntentCountryCode } from "@/lib/intent-context";
import ForeignInvestmentNav from "../ForeignInvestmentNav";

const FI_COMPARE_FAQS = [
  {
    q: "Which countries have a Double Taxation Agreement (DTA) with Australia?",
    a: "Australia has Double Taxation Agreements with over 45 countries, including the United States, United Kingdom, China, India, Singapore, Japan, South Korea, Germany, France, Canada, New Zealand, and most major OECD nations. A DTA typically reduces the withholding tax rate on dividends, interest, and royalties below the default 30% rate. For example, US residents face a 15% withholding rate on Australian dividends under the Australia–US DTA. Select your country above to see the specific DTA rates.",
  },
  {
    q: "What is the withholding tax rate on Australian dividends for non-residents?",
    a: "The default withholding tax rate on Australian dividends paid to non-residents is 30%. If a DTA applies, the rate is reduced — commonly to 15% for portfolio dividends (ownership below 10%) and 5% for direct investment dividends (ownership 10%+). Fully franked dividends have special DTA treatment and may attract reduced or zero withholding in some agreements. The effective rate depends on your tax residency and the applicable treaty.",
  },
  {
    q: "Do different countries face different FIRB rules for investing in Australia?",
    a: "Yes. FIRB rules vary significantly by country and deal structure. Investors from countries with free trade agreements (FTA) with Australia — including the US, UK, Japan, South Korea, Singapore, Chile, and Thailand — generally benefit from higher monetary thresholds before FIRB approval is required. Investors from countries designated as 'sensitive' (including certain state-owned enterprises) face lower thresholds and more scrutiny. Residential real estate rules are stricter and apply to all non-residents regardless of DTA or FTA status.",
  },
  {
    q: "How do FX costs affect returns when investing in Australia from overseas?",
    a: "FX costs (the spread between buy and sell rates) can significantly erode returns for foreign investors. Banks typically charge 2–3% on international transfers. Specialist FX providers (OFX, Wise, Airwallex) typically charge 0.3–1.5%, saving 1–2.5% per transfer. For an investor converting $100,000 to Australian dollars, the saving between a bank and a specialist provider is $1,000–$2,000. For regular investment (e.g. monthly contributions), the cumulative FX cost difference over a decade can exceed 5–10% of total invested capital.",
  },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Compare Countries for Investing in Australia (${CURRENT_YEAR}) — Side-by-Side Tax & FIRB Rules`,
  description:
    "Compare any two countries side-by-side: withholding tax rates, FIRB rules, FX corridors, pension-transfer eligibility, and migration pathways. All 66 pairs from 12 hub countries.",
  alternates: { canonical: absoluteUrl("/foreign-investment/compare") },
  openGraph: {
    title: `Compare Countries — Investing in Australia (${CURRENT_YEAR})`,
    description:
      "Side-by-side: DTA status, withholding tax, FIRB rules, FX, pension transfer, and migration pathways for UK, US, China, India, Singapore, and more.",
    url: absoluteUrl("/foreign-investment/compare"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Compare Foreign Investment Countries")}&sub=${encodeURIComponent("FIRB Rules · Tax · DTA · Returns · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function CompareIndexPage() {
  const faqLd = faqJsonLd(FI_COMPARE_FAQS);
  const pairs = allComparePairs();
  const codes = Object.keys(COUNTRY_CONFIGS) as IntentCountryCode[];

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Foreign Investment", url: absoluteUrl("/foreign-investment") },
    { name: "Compare Countries", url: absoluteUrl("/foreign-investment/compare") },
  ]);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      <ForeignInvestmentNav current="" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Compare Countries</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            {pairs.length} pairs · {codes.length} hub countries · Updated March {CURRENT_YEAR}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
            Compare countries for{" "}
            <span className="text-amber-600">investing in Australia</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
            Side-by-side comparison of DTA status, withholding tax rates, FIRB
            rules, FX corridor availability, pension-transfer eligibility, and
            migration pathways. General information only — not financial advice.
          </p>
        </div>
      </section>

      {/* ── Country grid for quick-jump ──────────────────────────────── */}
      <section className="py-10">
        <div className="container-custom">
          <h2 className="text-base font-extrabold text-slate-900 mb-2">
            Select two countries to compare
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Pick any two of the {codes.length} hub countries below to see
            their comparison page.
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {codes.map((code) => {
              const cfg = COUNTRY_CONFIGS[code];
              if (!cfg) return null;
              const meta = intentCountryMeta(code);
              return (
                <div
                  key={code}
                  className="bg-white border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{cfg.flag}</span>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{cfg.countryName}</p>
                      <span
                        className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full ${
                          meta.hasDta
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {meta.hasDta ? "DTA" : "No DTA"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {codes
                      .filter((c) => c !== code)
                      .slice(0, 5)
                      .map((otherCode) => {
                        const otherCfg = COUNTRY_CONFIGS[otherCode];
                        if (!otherCfg) return null;
                        const [a, b] =
                          cfg.countryShort.localeCompare(otherCfg.countryShort) <= 0
                            ? [cfg, otherCfg]
                            : [otherCfg, cfg];
                        return (
                          <Link
                            key={otherCode}
                            href={`/foreign-investment/compare/${a.slug}-vs-${b.slug}`}
                            className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-slate-600 hover:text-amber-700 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-md px-2 py-1 transition-colors"
                          >
                            <span>vs {otherCfg.flag}</span>
                            <span>{otherCfg.countryShort}</span>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── All pairs A-Z ────────────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-t border-slate-100">
        <div className="container-custom">
          <h2 className="text-base font-extrabold text-slate-900 mb-2">
            All {pairs.length} comparison pairs
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Every unique country pair from our {codes.length} hub countries.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pairs.map(({ pair, codeA, codeB }) => {
              const cfgA = COUNTRY_CONFIGS[codeA];
              const cfgB = COUNTRY_CONFIGS[codeB];
              if (!cfgA || !cfgB) return null;
              return (
                <Link
                  key={pair}
                  href={`/foreign-investment/compare/${pair}`}
                  className="group flex items-center gap-3 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl px-4 py-3 transition-all"
                >
                  <span className="text-lg">{cfgA.flag}</span>
                  <span className="text-[0.65rem] font-bold text-slate-400">vs</span>
                  <span className="text-lg">{cfgB.flag}</span>
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-amber-700 transition-colors">
                    {cfgA.countryShort} vs {cfgB.countryShort}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-3">
            {FI_COMPARE_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Disclaimer ──────────────────────────────────────────────── */}
      <section className="py-6 bg-white border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">
            {FOREIGN_INVESTOR_GENERAL_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}
