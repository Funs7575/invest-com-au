/**
 * /careers — public demand-probe shell for "find roles at AU advisory firms".
 *
 * Purpose: measure whether there is real audience demand for a jobs board
 * before building the full feature. Captures email interest, fires PostHog
 * events on key signals (page view, notify submit, browse existing board).
 *
 * ISR 3600s (1h). GEO-ready: no dynamic data fetched server-side.
 * JSON-LD: BreadcrumbList + WebPage.
 * Internal links: /advisor-jobs (existing board), /find-advisor.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, absoluteUrl, SITE_URL, SITE_NAME } from "@/lib/seo";
import CareersNotifyForm from "./CareersNotifyForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Finance Careers at Australian Advisory Firms — Invest.com.au",
  description:
    "Find roles at Australian financial advisory firms — financial planners, mortgage brokers, SMSF specialists, and wealth managers. Get notified when new positions go live.",
  alternates: { canonical: `${SITE_URL}/careers` },
  openGraph: {
    title: "Finance Careers at Australian Advisory Firms",
    description:
      "Find roles at Australian financial advisory firms — financial planners, mortgage brokers, SMSF specialists, and wealth managers.",
    url: absoluteUrl("/careers"),
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Finance Careers — Australian Advisory Firms")}&sub=${encodeURIComponent("Financial Planning · SMSF · Mortgage Broking · Wealth Management")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Careers", url: absoluteUrl("/careers") },
]);

const webPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_URL}/careers`,
  url: absoluteUrl("/careers"),
  name: "Finance Careers at Australian Advisory Firms",
  description:
    "Find roles at Australian financial advisory firms — financial planners, mortgage brokers, SMSF specialists, and wealth managers.",
  isPartOf: { "@id": `${SITE_URL}/#website` },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Careers", item: absoluteUrl("/careers") },
    ],
  },
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
  },
};

const ROLE_PREVIEWS = [
  {
    title: "Senior Financial Planner",
    type: "Full-time",
    location: "Sydney / Remote",
    firm: "Coming soon",
  },
  {
    title: "SMSF Specialist",
    type: "Full-time",
    location: "Melbourne",
    firm: "Coming soon",
  },
  {
    title: "Client Services Manager",
    type: "Part-time",
    location: "Brisbane",
    firm: "Coming soon",
  },
  {
    title: "Mortgage Broker",
    type: "Contract",
    location: "Perth / Remote",
    firm: "Coming soon",
  },
];

export default function CareersPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <div className="bg-slate-900 text-white py-10 md:py-16 px-4">
          <div className="container-custom max-w-3xl">
            <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-3">
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="mx-1.5" aria-hidden="true">
                /
              </span>
              <span className="text-slate-200">Careers</span>
            </nav>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-3">
              Careers at Australian Advisory Firms
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-xl">
              Find your next role at a verified Australian financial advisory firm
              — financial planners, mortgage brokers, SMSF specialists, and wealth
              managers. We&apos;re building this board now.
            </p>
          </div>
        </div>

        <div className="container-custom max-w-3xl py-8 md:py-12 px-4">
          {/* Notify-me capture card — primary demand signal */}
          <section
            id="notify"
            className="bg-blue-50 border border-blue-200 rounded-2xl p-6 md:p-8 mb-10"
          >
            <h2 className="text-lg font-extrabold text-slate-900 mb-1">
              Get notified when roles go live
            </h2>
            <p className="text-sm text-slate-600 mb-5">
              We&apos;re onboarding firms now. Drop your email and we&apos;ll
              ping you the moment the first batch of roles is posted.
            </p>
            <CareersNotifyForm />
          </section>

          {/* Preview of role types — sets context, not real listings */}
          <section className="mb-10">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Role types coming to the board
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_PREVIEWS.map((role) => (
                <li
                  key={role.title}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50 opacity-70"
                  aria-label={`Preview: ${role.title}`}
                >
                  <p className="text-sm font-semibold text-slate-700 mb-0.5">
                    {role.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {role.type} &middot; {role.location}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 italic">
                    {role.firm}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Browse existing board CTA */}
          <section className="mb-10 bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Already roles available
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              A handful of firms have already posted on the advisor jobs board —
              browse active positions now.
            </p>
            <Link
              href="/advisor-jobs"
              className="inline-block text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
              data-demand-signal="browse_existing_board"
            >
              Browse advisor jobs →
            </Link>
          </section>

          {/* For firms */}
          <section className="mb-10 border-t border-slate-100 pt-8">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Hiring advisors?
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              List your open roles in front of qualified Australian financial
              professionals. Log in to your firm portal to post.
            </p>
            <Link
              href="/firm-portal/jobs"
              className="inline-block text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
            >
              Post a job →
            </Link>
          </section>

          {/* Back to find-advisor */}
          <div className="pt-4 border-t border-slate-100">
            <Link
              href="/find-advisor"
              className="text-xs text-blue-700 hover:underline"
            >
              ← Find a financial advisor for your own needs
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
