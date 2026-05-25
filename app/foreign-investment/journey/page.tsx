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
import { COUNTRY_CONFIGS } from "@/lib/foreign-investment-country-data";
import { getIntentCountry } from "@/lib/intent-context-server";
import { intentCountryMeta } from "@/lib/intent-context";
import ForeignInvestmentNav from "../ForeignInvestmentNav";

export const metadata: Metadata = {
  title: `Cross-Border Investing Journey — Step-by-Step Guide for Foreign Investors (${CURRENT_YEAR})`,
  description:
    "Guided step-by-step investing journey for migrants, expats, and non-residents. Select your country to get a personalised path covering FIRB, tax, FX, and advisor handoff.",
  openGraph: {
    title: `Cross-Border Investing Journey — Foreign Investor Guide ${CURRENT_YEAR}`,
    description:
      "Country-specific step-by-step guide: FIRB eligibility, DTA tax rates, investment options, FX, pension transfer, and specialist advisor referral.",
    url: `${SITE_URL}/foreign-investment/journey`,
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

      <ForeignInvestmentNav current="" />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 py-10 md:py-16">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
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
