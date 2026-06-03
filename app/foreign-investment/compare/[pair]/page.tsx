/**
 * /foreign-investment/compare/[pair]
 *
 * Country-vs-country comparison pages for the foreign-investment section.
 * Example: /foreign-investment/compare/united-kingdom-vs-united-states
 *
 * SSG via generateStaticParams — 66 unique pairs from 12 hub countries.
 * All content is factual (sourced from COUNTRY_CONFIGS). Compliance:
 * GENERAL_ADVICE_WARNING + FOREIGN_INVESTOR_GENERAL_DISCLAIMER.
 *
 * Structured data: Article + ItemList (comparison rows) + BreadcrumbList.
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  breadcrumbJsonLd,
  absoluteUrl,
  CURRENT_YEAR,
  SITE_NAME,
} from "@/lib/seo";
import {
  GENERAL_ADVICE_WARNING,
  FOREIGN_INVESTOR_GENERAL_DISCLAIMER,
  DTA_DISCLAIMER,
  FIRB_DISCLAIMER,
  WITHHOLDING_TAX_NOTE,
} from "@/lib/compliance";
import {
  allComparePairs,
  parsePairSlug,
  buildCountryComparison,
} from "@/lib/country-compare";
import { COUNTRY_CONFIGS } from "@/lib/foreign-investment-country-data";
import ForeignInvestmentNav from "../../ForeignInvestmentNav";

// ─── Static Params ───────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ pair: string }[]> {
  return allComparePairs().map((p) => ({ pair: p.pair }));
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair } = await params;
  const parsed = parsePairSlug(pair);
  if (!parsed) return {};

  const { cfgA, cfgB } = parsed;
  const title = `${cfgA.countryName} vs ${cfgB.countryName} Investing in Australia — Tax, FIRB & Rules (${CURRENT_YEAR})`;
  const description = `Structured comparison: ${cfgA.countryShort} vs ${cfgB.countryName} withholding tax rates, FIRB rules, FX corridors, pension transfer eligibility, and migration pathways for investors in Australia. Updated March ${CURRENT_YEAR}.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/foreign-investment/compare/${cfgA.slug}-vs-${cfgB.slug}`),
    },
    openGraph: {
      title: `${cfgA.countryShort} vs ${cfgB.countryShort} — Investing in Australia (${CURRENT_YEAR})`,
      description,
      url: absoluteUrl(`/foreign-investment/compare/${cfgA.slug}-vs-${cfgB.slug}`),
    },
    twitter: { card: "summary_large_image" },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export const revalidate = 86400; // 24h — no real-time data

export default async function ComparePairPage({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  const parsed = parsePairSlug(pair);

  if (!parsed) notFound();

  // Redirect reverse-order slugs to canonical
  if (parsed.reversed) {
    redirect(`/foreign-investment/compare/${parsed.canonicalSlug}`);
  }

  const { cfgA, cfgB } = parsed;
  const comparison = buildCountryComparison(cfgA, cfgB);

  // ── JSON-LD ────────────────────────────────────────────────────────────────

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Foreign Investment", url: absoluteUrl("/foreign-investment") },
    {
      name: "Compare Countries",
      url: absoluteUrl("/foreign-investment/compare"),
    },
    {
      name: `${cfgA.countryShort} vs ${cfgB.countryShort}`,
      url: absoluteUrl(`/foreign-investment/compare/${comparison.pairSlug}`),
    },
  ]);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${cfgA.countryName} vs ${cfgB.countryName} — Investing in Australia Comparison`,
    description: `Factual comparison of investment rules for ${cfgA.countryName} and ${cfgB.countryName} residents investing in Australia.`,
    url: absoluteUrl(`/foreign-investment/compare/${comparison.pairSlug}`),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    dateModified: "2026-03-01",
    about: [
      { "@type": "Country", name: cfgA.countryName },
      { "@type": "Country", name: cfgB.countryName },
    ],
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cfgA.countryShort} vs ${cfgB.countryShort} — Key Investment Rule Differences`,
    description: `Comparison of ${comparison.rows.length} key dimensions affecting ${cfgA.countryName} and ${cfgB.countryName} investors in Australia.`,
    numberOfItems: comparison.rows.length,
    itemListElement: comparison.rows.map((row, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: row.dimension,
      description: `${cfgA.countryShort}: ${row.valueA} | ${cfgB.countryShort}: ${row.valueB}`,
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <ForeignInvestmentNav current="" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">
              Foreign Investment
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href="/foreign-investment/compare"
              className="hover:text-slate-900"
            >
              Compare Countries
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">
              {cfgA.countryShort} vs {cfgB.countryShort}
            </span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            Country Comparison · Updated March {CURRENT_YEAR}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
            <span className="mr-2">{cfgA.flag}</span>
            {cfgA.countryName}{" "}
            <span className="text-slate-400 font-semibold text-2xl">vs</span>{" "}
            <span className="mr-2">{cfgB.flag}</span>
            {cfgB.countryName}
            <span className="block text-amber-600 mt-1">
              Investing in Australia
            </span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mb-2">
            Factual comparison of the key structural differences for{" "}
            {cfgA.countryName} and {cfgB.countryName} residents investing in
            Australia — withholding tax rates, FIRB rules, FX corridors,
            pension transfers, and migration pathways.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>

      {/* ── Country header cards ─────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-6">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-4">
            {[comparison.countryA, comparison.countryB].map((c) => (
              <div
                key={c.code}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4"
              >
                <span className="text-4xl shrink-0">{c.flag}</span>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 mb-1">
                    {c.name}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span
                      className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${
                        c.hasDta
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.hasDta ? "DTA with AU" : "No DTA"}
                    </span>
                    <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {c.currency}
                    </span>
                  </div>
                  <Link
                    href={`/foreign-investment/${c.slug}`}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700"
                  >
                    Full {c.short} investor guide →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Critical Warnings ────────────────────────────────────────── */}
      {comparison.warnings.length > 0 && (
        <section className="py-6 bg-red-50 border-b border-red-100">
          <div className="container-custom space-y-3">
            {comparison.warnings.map((w, i) => (
              <div
                key={i}
                className="bg-white border border-red-200 rounded-xl p-4"
              >
                <p className="text-xs font-extrabold text-red-700 mb-1">
                  {w.country}: {w.title}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {w.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Comparison Table ─────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Key structural differences
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Factual comparison across {comparison.rows.length} dimensions.
            Rates sourced from ATO/Treasury as at March {CURRENT_YEAR}.
          </p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide w-1/3">
                    Dimension
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wide w-[30%]">
                    <span className="mr-1">{cfgA.flag}</span> {cfgA.countryShort}
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wide w-[30%]">
                    <span className="mr-1">{cfgB.flag}</span> {cfgB.countryShort}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 last:border-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-slate-900 text-xs">
                        {row.dimension}
                      </p>
                      {row.note && (
                        <p className="text-[0.65rem] text-slate-400 leading-snug mt-1">
                          {row.note}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {row.valueA}
                      </p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {row.valueB}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stack */}
          <div className="md:hidden space-y-4">
            {comparison.rows.map((row, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  {row.dimension}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[0.65rem] font-bold text-slate-400 mb-1">
                      {cfgA.flag} {cfgA.countryShort}
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {row.valueA}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-[0.65rem] font-bold text-slate-400 mb-1">
                      {cfgB.flag} {cfgB.countryShort}
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {row.valueB}
                    </p>
                  </div>
                </div>
                {row.note && (
                  <p className="text-[0.65rem] text-slate-400 leading-snug mt-2">
                    {row.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pension Transfer callout (if relevant) ──────────────────── */}
      {comparison.hasPensionTransfer && (
        <section className="py-8 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-3xl">
            <h3 className="text-base font-extrabold text-amber-900 mb-2">
              Pension / super transfer — high-stakes decision
            </h3>
            <p className="text-sm text-amber-800 leading-relaxed mb-4">
              {cfgA.retirementTransfer || cfgB.retirementTransfer
                ? `One or both of these countries has a specific pathway for transferring pension funds to Australian super. These transfers carry significant tax risk on both sides — do not self-direct.`
                : ""}
            </p>
            <div className="flex flex-wrap gap-3">
              {cfgA.retirementTransfer && (
                <Link
                  href={`/foreign-investment/${cfgA.slug}#retirement`}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                >
                  {cfgA.countryShort} pension transfer guide →
                </Link>
              )}
              {cfgB.retirementTransfer && (
                <Link
                  href={`/foreign-investment/${cfgB.slug}#retirement`}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                >
                  {cfgB.countryShort} pension transfer guide →
                </Link>
              )}
              <Link
                href="/advisors/international-tax-specialists"
                className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2"
              >
                Find a pension transfer specialist →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Links to full individual guides ─────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50 border-t border-slate-100">
        <div className="container-custom">
          <h2 className="text-base font-extrabold text-slate-900 mb-6">
            Full country guides
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[cfgA, cfgB].map((cfg) => (
              <Link
                key={cfg.code}
                href={`/foreign-investment/${cfg.slug}`}
                className="group flex items-start gap-4 p-5 bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md rounded-2xl transition-all"
              >
                <span className="text-3xl shrink-0">{cfg.flag}</span>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm text-slate-900 group-hover:text-amber-700 transition-colors mb-1">
                    {cfg.countryName} — Full Investor Guide
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {cfg.metadata.description.slice(0, 100)}
                    {cfg.metadata.description.length > 100 ? "…" : ""}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:text-amber-700">
                    Full guide →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Other comparisons ───────────────────────────────────────── */}
      <section className="py-8 border-t border-slate-100">
        <div className="container-custom">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
            Also compare
          </p>
          <div className="flex flex-wrap gap-2">
            {[cfgA, cfgB].map((cfg) => {
              // suggest comparisons against this country and the other 2 hub countries
              const otherCodes = (
                Object.keys(COUNTRY_CONFIGS) as (keyof typeof COUNTRY_CONFIGS)[]
              )
                .filter(
                  (c) => c !== cfgA.code && c !== cfgB.code,
                )
                .slice(0, 5);
              return otherCodes.map((otherCode) => {
                const otherCfg = COUNTRY_CONFIGS[otherCode];
                if (!otherCfg) return null;
                const [a, b] =
                  cfg.countryShort.localeCompare(otherCfg.countryShort) <= 0
                    ? [cfg, otherCfg]
                    : [otherCfg, cfg];
                const slug = `${a.slug}-vs-${b.slug}`;
                return (
                  <Link
                    key={`${cfg.code}-${otherCode}`}
                    href={`/foreign-investment/compare/${slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-xs font-semibold text-slate-700 hover:text-amber-700 rounded-lg transition-colors"
                  >
                    <span>{cfg.flag}</span>
                    <span className="text-slate-400">vs</span>
                    <span>{otherCfg.flag}</span>
                    {cfg.countryShort} vs {otherCfg.countryShort}
                  </Link>
                );
              });
            })}
          </div>
        </div>
      </section>

      {/* ── Advisor CTA ──────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-white mb-2">
                Need help with your specific situation?
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Country rules are one layer — your personal tax residency
                status, visa type, and investment structure determine the
                actual treatment. A cross-border specialist can work through
                both sides.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/advisors/international-tax-specialists"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm text-center transition-colors shadow-lg"
              >
                Find an International Tax Specialist
              </Link>
              <Link
                href="/advisors/firb-specialists"
                className="px-5 py-2.5 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-sm text-center transition-colors"
              >
                Find an FIRB Specialist
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tools ────────────────────────────────────────────────────── */}
      <section className="py-8 border-t border-slate-100">
        <div className="container-custom">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
            Relevant calculators
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/tools/withholding-tax-calculator"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              Withholding Tax Calculator →
            </Link>
            <Link
              href="/tools/dasp-calculator"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              DASP Calculator (departing super) →
            </Link>
            <Link
              href="/tools/cgt-calculator"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              CGT Calculator →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Disclaimers ──────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom space-y-2">
          <p className="text-xs text-slate-400 leading-relaxed">
            {FOREIGN_INVESTOR_GENERAL_DISCLAIMER}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {DTA_DISCLAIMER}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {FIRB_DISCLAIMER}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {WITHHOLDING_TAX_NOTE}
          </p>
        </div>
      </section>
    </div>
  );
}

