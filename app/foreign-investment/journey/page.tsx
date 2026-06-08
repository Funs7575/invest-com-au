/**
 * /foreign-investment/journey
 *
 * Landing page for the guided cross-border investing journey. If the user
 * has an intent country cookie set, we redirect them directly to their
 * country-specific journey. Otherwise, we show a country picker.
 *
 * This is a dynamic route (reads cookies) — no `export const revalidate`.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { COUNTRY_CONFIGS } from "@/lib/foreign-investment-country-data";
import { getIntentCountry } from "@/lib/intent-context-server";
import { intentCountryMeta } from "@/lib/intent-context";
import ForeignInvestmentNav from "../ForeignInvestmentNav";

const FI_JOURNEY_FAQS = [
  {
    q: "Can a foreigner invest in Australia without FIRB approval?",
    a: "It depends on the investment type. Foreign persons can generally invest in Australian shares, ETFs, managed funds, and government bonds without FIRB approval (subject to individual company ownership thresholds). FIRB approval is required for purchasing Australian residential real estate (with very limited exceptions), acquiring a substantial interest in an Australian business above the relevant monetary threshold, and certain sensitive sector investments. Rules vary by country of residence and whether a free trade agreement applies.",
  },
  {
    q: "Do I need to pay Australian tax if I invest in Australian shares as a non-resident?",
    a: "Generally yes, on Australian-source income. Dividends paid by Australian companies to non-residents are subject to withholding tax, typically at 30% (or a lower Double Taxation Agreement rate, e.g. 15% for US residents). Capital gains on Australian shares are generally exempt for non-residents under Section 855-10 of the Income Tax Assessment Act 1997, unless the company is 'land-rich'. Your home country may also tax the income — check the relevant DTA.",
  },
  {
    q: "What is the FIRB approval process and how long does it take?",
    a: "The Foreign Investment Review Board (FIRB) reviews foreign investment proposals that require notification or approval under the Foreign Acquisitions and Takeovers Act 1975. Applications are submitted through the ATO's foreign investment portal. The standard review period is 30 days, extendable to 90 days. Residential real estate purchases typically take 30–90 days. Complex business acquisitions may take longer. FIRB charges application fees based on the value of the investment.",
  },
  {
    q: "Which Australian investments are open to all foreign investors without restrictions?",
    a: "Foreign investors can freely purchase: listed Australian shares (subject to company-specific thresholds); units in listed managed investment schemes and ETFs; Australian government bonds; corporate bonds; and term deposits at Australian banks. Bank accounts can generally be opened with standard identification. Superannuation is generally only accessible if you have worked in Australia and hold a valid visa — you cannot open a new super account from offshore.",
  },
];

export const metadata: Metadata = {
  title: `Cross-Border Investing Journey — Step-by-Step Guide for Foreign Investors (${CURRENT_YEAR})`,
  description:
    "Guided step-by-step investing journey for migrants, expats, and non-residents. Select your country to get a personalised path covering FIRB, tax, FX, and advisor handoff.",
  openGraph: {
    title: `Cross-Border Investing Journey — Foreign Investor Guide ${CURRENT_YEAR}`,
    description:
      "Country-specific step-by-step guide: FIRB eligibility, DTA tax rates, investment options, FX, pension transfer, and specialist advisor referral.",
    url: `${SITE_URL}/foreign-investment/journey`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Foreign Investment Journey Australia")}&sub=${encodeURIComponent("Step-by-Step · FIRB · Visas · Tax · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/journey` },
};

export default async function JourneyIndexPage() {
  // If we have an intent country, redirect straight to the journey for it
  const code = await getIntentCountry();
  if (code) {
    const meta = intentCountryMeta(code);
    redirect(`/foreign-investment/journey/${meta.slug}`);
  }

  const faqLd = faqJsonLd(FI_JOURNEY_FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: "Journey", url: `${SITE_URL}/foreign-investment/journey` },
  ]);

  const countries = Object.values(COUNTRY_CONFIGS).filter(Boolean);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      <ForeignInvestmentNav current="" />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 py-10 md:py-16">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">
              Foreign Investment
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Journey</span>
          </nav>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              Cross-Border Investing · Guided Journey · {CURRENT_YEAR}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Your{" "}
              <span className="text-amber-600">cross-border investing</span>{" "}
              journey
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Select your home country to get a personalised, step-by-step
              guide covering FIRB eligibility, investment options, tax
              obligations, FX, and finding a specialist advisor. General
              information only — not financial or legal advice.
            </p>
          </div>
        </div>
      </section>

      {/* ── Country picker ────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <h2 className="text-base font-extrabold text-slate-900 mb-6">
            Select your home country
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {countries.map((c) => (
              <Link
                key={c!.slug}
                href={`/foreign-investment/journey/${c!.slug}`}
                className="group flex items-start gap-4 p-5 bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md rounded-2xl transition-all"
              >
                <span className="text-3xl shrink-0 mt-0.5">{c!.flag}</span>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm text-slate-900 group-hover:text-amber-700 transition-colors mb-1">
                    {c!.countryName}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {c!.hero.paragraph.slice(0, 120)}
                    {c!.hero.paragraph.length > 120 ? "…" : ""}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:text-amber-700">
                    Start journey →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-8 text-xs text-slate-400">
            Your country not listed?{" "}
            <Link
              href="/foreign-investment"
              className="text-amber-600 hover:text-amber-700 font-semibold"
            >
              View the general foreign investment hub
            </Link>{" "}
            for DTA rates and rules for all countries.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-3">
            {FI_JOURNEY_FAQS.map((faq) => (
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

      {/* ── What the journey covers ───────────────────────────────────── */}
      <section className="py-12 bg-slate-50 border-t border-slate-100">
        <div className="container-custom">
          <h2 className="text-sm font-extrabold text-slate-900 mb-6 uppercase tracking-wide">
            What each journey covers
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                n: "01",
                title: "Eligibility",
                body: "Tax residency status, DTA coverage, and whether FIRB applies to you.",
              },
              {
                n: "02",
                title: "FIRB & Property",
                body: "What you can buy, the established-dwelling ban, and how FIRB approval works.",
              },
              {
                n: "03",
                title: "Investment Options",
                body: "What is open and what is restricted — shares, property, super, crypto, savings.",
              },
              {
                n: "04",
                title: "Tax",
                body: "DTA withholding rates, CGT treatment, and your home-country reporting obligations.",
              },
              {
                n: "05",
                title: "FX & Moving Money",
                body: "How to transfer money efficiently — specialist FX vs bank rates.",
              },
              {
                n: "06",
                title: "Advisor Handoff",
                body: "FIRB specialists, international tax accountants, and migration agents — when you need each.",
              },
            ].map((item) => (
              <div
                key={item.n}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <span className="text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-widest">
                  Step {item.n}
                </span>
                <p className="font-extrabold text-sm text-slate-900 mt-1 mb-1.5">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
