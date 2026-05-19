import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import Icon from "@/components/Icon";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";
import {
  CURRENT_YEAR,
  ORGANIZATION_JSONLD,
  SITE_NAME,
  SITE_URL,
  UPDATED_LABEL,
  absoluteUrl,
  breadcrumbJsonLd,
} from "@/lib/seo";

import RateAlertSignupForm from "./RateAlertSignupForm";

// FIN_NOTEBOOK Revenue #4 — public landing page for the rate-alerts
// opt-in list. The /api/rate-alerts POST endpoint, double-opt-in
// verification flow, suppression list, and notification cron all already
// exist; this page is the missing public driver into them.
//
// Server component with ISR — the copy is stable, the form below is the
// only interactive surface and lives in a separate client component
// (RateAlertSignupForm) wrapped in Suspense so the verify/unsubscribe
// useSearchParams() call doesn't force the whole page client-side.

export const revalidate = 3600;

const PAGE_PATH = "/rate-alerts";
const PAGE_TITLE = `Australian Savings & Term-Deposit Rate Alerts (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "Free email alerts the moment an Australian savings account or term deposit beats your target rate. Double opt-in, unsubscribe in one click.";

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
        url: "/api/og?title=Australian+Rate+Alerts&subtitle=Email+me+when+savings+rates+beat+my+target&type=default",
        width: 1200,
        height: 630,
        alt: "Australian savings and term-deposit rate alerts",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const HOW_IT_WORKS = [
  {
    icon: "target" as const,
    title: "Pick your target rate",
    body: "Tell us the savings or term-deposit rate you want to beat — e.g. 5.25% p.a. — and how often you'd like to hear from us.",
  },
  {
    icon: "bell" as const,
    title: "We watch the market",
    body: "We monitor headline rates across the major Australian banks and challenger brands every day. No tracker apps, no logins, no spreadsheets.",
  },
  {
    icon: "mail" as const,
    title: "Email when it lands",
    body: "The moment the headline rate crosses your threshold, we email you with the product, the rate, and a link to compare. One match per day, max.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Which products do you track?",
    answer:
      "Australian high-interest savings accounts and term deposits. We compare the headline (advertised) rate per product — bonus and intro rates may apply, always check the provider's fine print before switching.",
  },
  {
    question: "How often will I get emailed?",
    answer:
      "It depends on the frequency you pick. \"Instant\" sends within 24 hours of a match, capped at one email per day. \"Daily\" and \"weekly\" digests batch matches into a single send. We will never spam you and we will never share your email.",
  },
  {
    question: "Is this financial advice?",
    answer:
      "No. Rate alerts are factual information — the rate has crossed the threshold you set. We do not assess suitability, recommend a product as right for you, or provide personal financial advice. Always read the provider's PDS and TMD before opening an account.",
  },
  {
    question: "How do I unsubscribe?",
    answer:
      "Every alert email contains a one-click unsubscribe link. You can also paste the link from any past email — the token-based unsubscribe works without a login. We honour the request immediately and delete the subscription row.",
  },
  {
    question: "How is my email used?",
    answer:
      "Only to send you the alerts you've asked for. We do not on-sell email addresses, we do not run third-party ad pixels on the confirmation flow, and verified subscribers never receive marketing emails by default. See our privacy policy for the full data-processor list.",
  },
];

export default function RateAlertsPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Rate Alerts" },
  ]);

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    publisher: ORGANIZATION_JSONLD,
    inLanguage: "en-AU",
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${SITE_URL}/api/og?title=Australian+Rate+Alerts&subtitle=Email+me+when+savings+rates+beat+my+target&type=default`,
    },
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbs, webPageJsonLd]),
        }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-3xl">
          {/* Breadcrumb */}
          <nav className="mb-3 text-xs text-slate-500 md:mb-6 md:text-sm">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Rate Alerts</span>
          </nav>

          {/* Hero */}
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-center md:mb-10 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.1),transparent_70%)]" />
            <div className="relative">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 md:mb-4 md:h-16 md:w-16">
                <Icon name="bell" size={24} className="text-amber-500 md:hidden" />
                <Icon
                  name="bell"
                  size={32}
                  className="hidden text-amber-500 md:block"
                />
              </div>
              <h1 className="mb-2 text-xl font-extrabold text-slate-900 md:mb-3 md:text-4xl">
                Get alerted when Aussie savings rates beat your target
              </h1>
              <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-600 md:text-lg">
                Set a target rate for a high-interest savings account or term
                deposit. We&apos;ll email you the moment an Australian bank
                pushes its headline rate above it. {UPDATED_LABEL}.
              </p>
            </div>
          </div>

          {/* Sign-up form (client component, Suspense-wrapped for
              useSearchParams()). */}
          <div className="mb-8 md:mb-12">
            <Suspense
              fallback={
                <div
                  aria-hidden="true"
                  className="h-[420px] rounded-2xl bg-slate-100"
                />
              }
            >
              <RateAlertSignupForm />
            </Suspense>
            <p className="mt-3 text-center text-xs text-slate-400">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>

          {/* How it works */}
          <section className="mb-8 md:mb-12">
            <h2 className="mb-3 text-lg font-extrabold text-slate-900 md:mb-5 md:text-2xl">
              How it works
            </h2>
            <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[0.65rem] font-bold text-white">
                      {i + 1}
                    </span>
                    <Icon
                      name={step.icon}
                      size={18}
                      className="text-amber-500"
                    />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Why bother */}
          <section className="mb-8 md:mb-12">
            <h2 className="mb-3 text-lg font-extrabold text-slate-900 md:mb-5 md:text-2xl">
              Why bother?
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <Icon
                  name="zap"
                  size={20}
                  className="mb-2 text-slate-600"
                />
                <h3 className="text-sm font-bold text-slate-900">
                  Be first when rates move
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Headline savings and term-deposit rates change in lockstep
                  with the RBA cash rate — and during competitive pushes by
                  challenger banks. Our alert lands the day the rate goes live,
                  not weeks later.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <Icon
                  name="shield"
                  size={20}
                  className="mb-2 text-slate-600"
                />
                <h3 className="text-sm font-bold text-slate-900">
                  Independent, free, no broker logins
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  We&apos;re an editorial comparison site, not a deposit
                  aggregator. Setting up an alert never asks for your bank
                  password or any personal financial information beyond your
                  email.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-8 md:mb-12">
            <h2 className="mb-3 text-lg font-extrabold text-slate-900 md:mb-5 md:text-2xl">
              Frequently asked questions
            </h2>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.question}
                  className="group p-4 open:bg-slate-50"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-900 marker:hidden">
                    <span>{item.question}</span>
                    <span
                      aria-hidden="true"
                      className="text-base text-slate-400 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Cross-links to the verticals that drive the same intent */}
          <section className="mb-8 md:mb-12">
            <h2 className="mb-3 text-lg font-extrabold text-slate-900 md:mb-5 md:text-2xl">
              Compare while you wait
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Link
                href="/savings"
                className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-amber-300 hover:bg-amber-50"
              >
                <h3 className="text-sm font-bold text-slate-900">
                  Best savings accounts &rarr;
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Side-by-side rates, bonus conditions, and accessibility for
                  the major and challenger banks.
                </p>
              </Link>
              <Link
                href="/term-deposits"
                className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-amber-300 hover:bg-amber-50"
              >
                <h3 className="text-sm font-bold text-slate-900">
                  Best term deposits &rarr;
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Compare 3-, 6-, 12-month and longer terms by headline rate
                  and minimum deposit.
                </p>
              </Link>
            </div>
          </section>

          {/* Compliance footer */}
          <p className="text-center text-[0.7rem] text-slate-400">
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </div>
    </>
  );
}
