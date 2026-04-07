import Link from "next/link";
import type { Metadata } from "next";
import {
  FIRB_THRESHOLDS,
  WHO_NEEDS_FIRB,
  ELIGIBLE_PROPERTY_TYPES,
  STATE_SURCHARGES,
  FIRB_FEES,
  FIRB_PROCESS_STEPS,
  FIRB_FAQS,
} from "@/lib/firb-data";
import { FIRB_DISCLAIMER, FOREIGN_BUYER_STAMP_DUTY_WARNING } from "@/lib/compliance";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import CostCalculator from "./CostCalculator";
import FaqAccordion from "./FaqAccordion";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Foreign Investment in Australian Property — FIRB Guide 2026 — Invest.com.au",
  description:
    "Complete guide to buying Australian property as a foreign investor. FIRB approval process, state stamp duty surcharges, application fees, eligible property types, and step-by-step checklist.",
  openGraph: {
    title: "Foreign Investment in Australian Property — FIRB Guide 2026",
    description:
      "FIRB approval process, state stamp duty surcharges (7–8%), application fees, eligible property types, and full checklist for foreign buyers.",
    url: "/property/foreign-investment",
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Foreign Investment in Australian Property")}&sub=${encodeURIComponent("FIRB Guide · Stamp Duty Surcharges · Application Fees · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/property/foreign-investment" },
};

export const revalidate = 86400; // revalidate daily

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  return `$${n.toLocaleString("en-AU")}`;
}

export default function ForeignInvestmentPage() {
  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Property", url: `${SITE_URL}/property` },
              { name: "Foreign Investment Guide" },
            ])
          ),
        }}
      />

      {/* ── ESTABLISHED DWELLING BAN ALERT — prominent ──────────────────── */}
      <div className="bg-red-600 text-white">
        <div className="container-custom py-3">
          <div className="flex items-start sm:items-center gap-3 flex-wrap justify-between">
            <div className="flex items-start gap-2.5">
              <svg className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm font-semibold leading-snug">
                <strong>Established Dwelling Ban — Active:</strong> Foreign persons cannot purchase existing homes in Australia from 1 April 2025 to 31 March 2027.
                New dwellings and off-the-plan properties are still available.
              </p>
            </div>
            <Link href="/foreign-investment/guides/property-ban-2025" className="shrink-0 text-xs font-bold text-white underline whitespace-nowrap hover:no-underline bg-red-700 hover:bg-red-800 px-3 py-1.5 rounded-lg transition-colors">
              Full ban details &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── Hub cross-link banner ──────────────────── */}
      <div className="bg-amber-50 border-b border-amber-200 py-3">
        <div className="container-custom flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
          <p className="text-xs text-amber-800 leading-snug">
            <span className="font-bold">This page covers property only.</span> Foreign investment rules also apply to shares, crypto, savings, and super.
          </p>
          <Link href="/foreign-investment" className="shrink-0 text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 whitespace-nowrap">
            View complete Foreign Investment Hub &rarr;
          </Link>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <Link href="/property" className="hover:text-slate-900">Property</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">FIRB Guide</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                Updated March 2026
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
                Foreign Investment in{" "}
                <span className="text-amber-500">Australian Property</span>
              </h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
                Your complete guide to FIRB approval, eligible property types, state stamp duty
                surcharges, and application fees — everything a foreign investor needs to know
                before buying Australian property.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/property/listings?firb=true"
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm text-center transition-colors shadow-lg shadow-amber-500/20"
                >
                  Browse FIRB-Eligible Listings &rarr;
                </Link>
                <Link
                  href="/property/buyer-agents"
                  className="px-6 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm text-center transition-colors"
                >
                  Find a Buyer&apos;s Agent
                </Link>
              </div>
            </div>

            {/* Quick-stats panel */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "FIRB threshold (most buyers)", value: "$1.195M", sub: "residential new dwellings" },
                { label: "NSW / VIC surcharge", value: "8%", sub: "on top of standard stamp duty" },
                { label: "Standard processing time", value: "30 days", sub: "for straightforward applications" },
                { label: "FIRB fee (up to $1M)", value: "$14,100", sub: "non-refundable application fee" },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-xl font-extrabold text-amber-600 mb-0.5">{stat.value}</p>
                  <p className="text-[0.7rem] font-semibold text-slate-900 leading-snug">{stat.label}</p>
                  <p className="text-[0.65rem] text-slate-500 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Who Needs FIRB Approval ──────────────── */}
        <section>
          <SectionHeading
            eyebrow="Eligibility"
            title="Do you need FIRB approval?"
            sub="Your approval requirements depend on your residency status and visa type."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-2xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Buyer type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">FIRB needed?</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {WHO_NEEDS_FIRB.map((row) => (
                  <tr key={row.group} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.group}</td>
                    <td className="px-4 py-3">
                      {row.needsFirb ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          Yes — required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Eligible Property Types ──────────────── */}
        <section>
          <SectionHeading
            eyebrow="Property Types"
            title="What can foreign buyers purchase?"
            sub="Foreign non-residents are restricted to new residential property. Temporary residents have slightly more flexibility."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {ELIGIBLE_PROPERTY_TYPES.map((item) => (
              <div
                key={item.type}
                className={`rounded-2xl border p-5 ${
                  item.eligible
                    ? "bg-emerald-50/50 border-emerald-200"
                    : "bg-red-50/50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {item.eligible ? (
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <h3 className={`text-sm font-bold ${item.eligible ? "text-emerald-900" : "text-red-900"}`}>
                    {item.type}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-2">{item.description}</p>
                {item.examples.length > 0 && (
                  <ul className="space-y-0.5">
                    {item.examples.map((ex) => (
                      <li key={ex} className="text-[0.7rem] text-slate-500 flex items-start gap-1.5">
                        <span className="text-slate-300 mt-0.5">→</span>
                        {ex}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Stamp Duty Surcharges ────────────────── */}
        <section>
          <SectionHeading
            eyebrow="Costs"
            title="State stamp duty surcharges for foreign buyers"
            sub="Most Australian states add an extra surcharge on top of standard stamp duty. These are among the largest upfront costs for foreign investors."
          />
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-sm border border-slate-200 rounded-2xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">State / Territory</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs text-center">Stamp duty surcharge</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs text-center hidden sm:table-cell">Annual land tax surcharge</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {STATE_SURCHARGES.map((row) => (
                  <tr key={row.stateCode} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{row.stateCode}</span>
                      <span className="text-xs text-slate-400 ml-2 hidden sm:inline">{row.state}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.surchargePercent === 0 ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">None</span>
                      ) : (
                        <span className="text-sm font-extrabold text-amber-700">{row.surchargePercent}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {row.landTaxSurchargePercent ? (
                        <span className="text-sm font-bold text-slate-700">
                          {row.landTaxSurchargePercent}%
                          <span className="text-xs font-normal text-slate-400">/yr</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell max-w-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.65rem] text-slate-400 leading-relaxed mb-6">{FOREIGN_BUYER_STAMP_DUTY_WARNING}</p>

          {/* Interactive cost calculator — client component */}
          <CostCalculator surcharges={STATE_SURCHARGES} />
        </section>

        {/* ── FIRB Application Process ─────────────── */}
        <section>
          <SectionHeading
            eyebrow="Process"
            title="How to apply for FIRB approval"
            sub="A straightforward new dwelling purchase typically takes 30 days. Here's the step-by-step process."
          />
          <div className="space-y-4">
            {FIRB_PROCESS_STEPS.map((step) => (
              <div
                key={step.step}
                className="flex gap-4 bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-shadow"
              >
                <div className="shrink-0">
                  <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-extrabold text-sm">
                    {step.step}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                    <span className="shrink-0 text-[0.65rem] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {step.timeframe}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FIRB Application Fees ────────────────── */}
        <section>
          <SectionHeading
            eyebrow="Fees"
            title="FIRB application fee schedule"
            sub="Fees are paid at time of application and are non-refundable, regardless of the outcome."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-2xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Property value</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs text-right">FIRB fee (residential)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FIRB_FEES.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">{row.label}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(row.feeAud)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.65rem] text-slate-400 mt-3 leading-relaxed">
            FIRB application fees are indexed annually. Fees shown reflect the 2026 schedule. Source: firb.gov.au.
          </p>
        </section>

        {/* ── Thresholds by buyer type ─────────────── */}
        <section>
          <SectionHeading
            eyebrow="Thresholds"
            title="FIRB thresholds by buyer type"
            sub="Thresholds are the maximum property value below which a foreign person may proceed without FIRB approval. Above the threshold, approval is mandatory."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {FIRB_THRESHOLDS.map((row) => (
              <div
                key={row.category}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">{row.category}</h3>
                  {row.residentialThreshold ? (
                    <span className="shrink-0 text-sm font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                      {row.residentialThreshold}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                      All values
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-2">{row.description}</p>
                <p className="text-[0.7rem] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">{row.notes}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ — client component ───────────────── */}
        <section>
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <FaqAccordion faqs={FIRB_FAQS} />
        </section>

        {/* ── CTAs ─────────────────────────────────── */}
        <section>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Ready to invest?</p>
                <h3 className="text-lg md:text-xl font-extrabold text-white mb-2">
                  Browse FIRB-eligible developments
                </h3>
                <p className="text-sm text-slate-400 mb-5">
                  All listings are new or off-the-plan developments. Use the FIRB filter to see
                  projects where the developer has already obtained project-level FIRB approval.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/property/listings?firb=true"
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm rounded-xl transition-colors text-center shadow-lg shadow-amber-500/20"
                >
                  FIRB-Approved Listings &rarr;
                </Link>
                <Link
                  href="/property/listings"
                  className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-colors text-center"
                >
                  All New Developments
                </Link>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Find a Buyer&apos;s Agent</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  A buyer&apos;s agent experienced with foreign investors can help you navigate FIRB,
                  identify eligible properties, and negotiate the best price.
                </p>
              </div>
              <Link
                href="/property/buyer-agents"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors text-center"
              >
                Browse Agents &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ── Disclaimer ───────────────────────────── */}
        <section>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">Important Information</p>
                <p className="text-[0.65rem] text-slate-500 leading-relaxed">{FIRB_DISCLAIMER}</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
