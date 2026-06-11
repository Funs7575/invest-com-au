import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import Icon from "@/components/Icon";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import {
  ORGANIZATION_JSONLD,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
  UPDATED_LABEL,
} from "@/lib/seo";
import { getVerticalBySlug } from "@/lib/verticals";
import BusinessFinanceEnquiryForm from "./BusinessFinanceEnquiryForm";

export const revalidate = 3600;

const vertical = getVerticalBySlug("business-finance")!;

const PAGE_PATH = "/business-finance";
const PAGE_TITLE = vertical.title;
const PAGE_DESCRIPTION = vertical.metaDescription;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    images: [
      {
        url: `/api/og?title=Business+Finance+Australia&subtitle=Compare+loans%2C+equipment+%26+invoice+finance&type=default`,
        width: 1200,
        height: 630,
        alt: "Australian business finance comparison",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const FINANCE_TYPES = [
  {
    id: "business_loan",
    icon: "banknote" as const,
    title: "Business Loans",
    range: "$10k – $5M",
    rate: "8 – 15% p.a.",
    term: "1 – 5 years",
    body: "Lump-sum working capital or growth finance. Secured loans use property or assets for lower rates; unsecured loans are approved on cash flow alone — faster but costlier.",
  },
  {
    id: "equipment_finance",
    icon: "truck" as const,
    title: "Equipment Finance",
    range: "$5k – $2M",
    rate: "6 – 12% p.a.",
    term: "2 – 7 years",
    body: "Chattel mortgages, finance leases, and hire-purchase spread the cost of machinery, vehicles, and technology across the asset's working life — preserving cash flow.",
  },
  {
    id: "invoice_finance",
    icon: "file-text" as const,
    title: "Invoice Finance",
    range: "70 – 90% advance",
    rate: "1.5 – 3% / 30 days",
    term: "Ongoing",
    body: "Convert unpaid invoices to same-day cash. Ideal for B2B businesses with 30–90 day payment terms. Factoring (lender collects) or confidential invoice discounting (you collect).",
  },
  {
    id: "line_of_credit",
    icon: "repeat" as const,
    title: "Line of Credit",
    range: "$10k – $1M",
    rate: "9 – 18% p.a.",
    term: "Revolving",
    body: "Draw and repay as needed, paying interest only on what you use. Suits seasonal businesses and ongoing working capital needs — more flexible than a term loan.",
  },
  {
    id: "trade_finance",
    icon: "globe" as const,
    title: "Trade Finance",
    range: "From $50k",
    rate: "Lender-quoted",
    term: "Per transaction",
    body: "Import/export facilities, letters of credit, and supply chain finance. Bridges the gap between paying suppliers and receiving payment from customers overseas.",
  },
];

export default function BusinessFinancePage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Business Finance" },
  ]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    publisher: ORGANIZATION_JSONLD,
    inLanguage: "en-AU",
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: vertical.faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbs, faqJsonLd]) }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-500 md:mb-6 md:text-sm">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-700">Business Finance</span>
          </nav>

          {/* Hero */}
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_70%)]" />
            <div className="relative">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 md:mb-4 md:h-16 md:w-16">
                <Icon name="briefcase" size={28} className="text-indigo-600" />
              </div>
              <h1 className="mb-2 text-center text-2xl font-extrabold text-slate-900 md:text-4xl">
                {vertical.heroHeadline}
              </h1>
              <p className="mx-auto max-w-xl text-center text-sm leading-relaxed text-slate-600 md:text-lg">
                {vertical.heroSubtext}
              </p>
              <p className="mt-2 text-center text-xs text-slate-500">{UPDATED_LABEL}</p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {vertical.stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <p className="text-lg font-extrabold text-indigo-700 md:text-xl">{s.value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Finance type cards */}
          <section className="mb-10" id="options">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900 md:text-2xl">
              Compare business finance options
            </h2>
            <div className="space-y-3">
              {FINANCE_TYPES.map((ft) => (
                <div
                  key={ft.id}
                  id={ft.id.replace("_", "-")}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                      <Icon name={ft.icon} size={20} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900">{ft.title}</h3>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span><strong className="text-slate-700">Amount:</strong> {ft.range}</span>
                          <span><strong className="text-slate-700">Rate:</strong> {ft.rate}</span>
                          <span><strong className="text-slate-700">Term:</strong> {ft.term}</span>
                        </div>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{ft.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* What lenders look at */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900 md:text-2xl">
              What lenders look for
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { icon: "calendar", label: "Time in business", body: "Most lenders want 6–24 months of trading history. Banks often require 2 years of financials. Non-bank fintechs may approve with 3 months." },
                { icon: "trending-up", label: "Annual revenue", body: "Non-bank minimum is typically $75k–$150k. Banks prefer $250k+. Revenue stability matters as much as the number itself." },
                { icon: "shield", label: "Credit history", body: "Both personal (director) and business credit are checked. Defaults and court judgements significantly reduce approval odds and increase rates." },
                { icon: "file", label: "Financial documents", body: "BAS statements, business bank statements (3–6 months), and sometimes P&L/tax returns. Having these ready speeds approval." },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-900">{item.label}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Educational sections */}
          {vertical.sections.map((section) => (
            <section key={section.heading} className="mb-8">
              <h2 className="mb-3 text-lg font-extrabold text-slate-900 md:text-xl">
                {section.heading}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">{section.body}</p>
            </section>
          ))}

          {/* Enquiry form */}
          <section className="mb-10" id="enquire">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900 md:text-2xl">
              Get matched with a business finance specialist
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Tell us what you&apos;re looking for and we&apos;ll help connect you with a specialist. No obligation, no credit check at this stage.
            </p>
            <Suspense fallback={<div className="h-80 rounded-2xl bg-slate-100 animate-pulse" />}>
              <BusinessFinanceEnquiryForm />
            </Suspense>
            <p className="mt-3 text-center text-xs text-slate-500">{ADVERTISER_DISCLOSURE_SHORT}</p>
          </section>

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900 md:text-2xl">
              Frequently asked questions
            </h2>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {vertical.faqs.map((item) => (
                <details key={item.question} className="group p-4 open:bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-900 marker:hidden">
                    <span>{item.question}</span>
                    <span className="text-base text-slate-400 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Cross-links */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-extrabold text-slate-900">Related topics</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Link href="/savings" className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50">
                <h3 className="text-sm font-bold text-slate-900">Business savings accounts &rarr;</h3>
                <p className="mt-1 text-xs text-slate-500">High-interest accounts for business cash reserves.</p>
              </Link>
              <Link href="/advisors" className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50">
                <h3 className="text-sm font-bold text-slate-900">Find a financial adviser &rarr;</h3>
                <p className="mt-1 text-xs text-slate-500">Connect with a licensed specialist for complex structures.</p>
              </Link>
              <Link href="/term-deposits" className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50">
                <h3 className="text-sm font-bold text-slate-900">Term deposits &rarr;</h3>
                <p className="mt-1 text-xs text-slate-500">Fixed-rate returns for business cash you won&apos;t need short-term.</p>
              </Link>
            </div>
          </section>

          {/* Compliance */}
          <p className="text-center text-[0.7rem] text-slate-500">{GENERAL_ADVICE_WARNING}</p>
          {vertical.disclaimer && (
            <p className="mt-2 text-center text-[0.65rem] text-slate-500">{vertical.disclaimer}</p>
          )}
        </div>
      </div>
    </>
  );
}
