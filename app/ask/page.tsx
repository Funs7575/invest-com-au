import type { Metadata } from "next";
import Link from "next/link";

import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { AFSL_STATUS_DISCLOSURE } from "@/lib/compliance";
import AskClient from "./AskClient";

export const revalidate = 86400;

// FIN_NOTEBOOK Revenue #7 — AI Q&A capture layer (public surface).
//
// Today the chatbot at /api/chatbot is callable, but no public
// landing page indexes it for SEO. This page is the start of the
// QQ stream (audit-remediation brief at
// docs/audits/qq-ai-qa-capture-brief.md): a public, crawlable,
// AFSL-disclosure-aware Q&A entry point that:
//
//   - lets a visitor ask a free-form question (uses /api/chatbot,
//     rate-limited 20/min via lib/rate-limit-db)
//   - surfaces a curated set of "popular questions" so SEO has
//     anchor links pointing in here from the homepage / vertical
//     pages
//   - records the conversation for future editorial → static-page
//     conversion (per-question slug pages land in a follow-up)
//
// What this page DOESN'T do yet:
//   - Per-question static slug pages (/ask/can-i-buy-us-stocks etc).
//     Editorial wants to vet themes before promoting to indexed
//     pages; the chatbot conversation log will surface candidate
//     questions automatically.
//   - Email capture on submission. The chatbot session is
//     anonymous; if/when we want to follow up with a written
//     answer the existing NewsletterSignup component drops in.

const POPULAR_QUESTIONS: Array<{ q: string; topic: string }> = [
  { q: "How do I buy US shares from Australia and what's the cheapest broker?", topic: "Cross-border investing" },
  { q: "What's the difference between CHESS-sponsored and custodial brokers?", topic: "Share trading" },
  { q: "How does franking credits work for ASX dividends?", topic: "Tax" },
  { q: "Should I consolidate my super, and what should I check first?", topic: "Super" },
  { q: "What's the cheapest way to buy crypto in Australia in 2026?", topic: "Crypto" },
  { q: "How do I transfer my UK pension to an Australian super fund (QROPS)?", topic: "UK pension transfer" },
  { q: "What FX fees should I look for when comparing brokers?", topic: "FX" },
  { q: "When does FIRB approval matter for a non-resident buying AU property?", topic: "FIRB" },
  { q: "How do I start a SMSF and what does it actually cost in year one?", topic: "SMSF" },
  { q: "What's a fair financial planner fee in Australia, and what should it include?", topic: "Advisor pricing" },
];

export const metadata: Metadata = {
  title: `Ask anything about investing in Australia (${CURRENT_YEAR}) — ${SITE_NAME}`,
  description:
    "Ask any question about Australian investing — brokers, super, ETFs, crypto, FIRB, tax, FX — and get an instant answer grounded in our independent reviews.",
  alternates: { canonical: `/ask` },
  openGraph: {
    title: "Ask anything about investing in Australia",
    description:
      "Free Q&A for Australian investors. Independent answers, no product pitches.",
    url: absoluteUrl("/ask"),
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Ask anything about Australian investing")}&subtitle=${encodeURIComponent("Independent answers grounded in our reviews · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function AskPage() {
  const breadcrumbsLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Ask", url: absoluteUrl("/ask") },
  ]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: POPULAR_QUESTIONS.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ask this question on this page and you'll get an instant answer grounded in our independent platform reviews. The page also surfaces relevant comparison tables for follow-up.",
      },
    })),
  };

  return (
    <main className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12">
        <div className="container-custom">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
            Independent · No product pitches
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Ask anything about investing in Australia
          </h1>
          <p className="text-slate-300 max-w-2xl">
            Brokers, super, ETFs, crypto, FIRB, FX, tax, advisor pricing — get a straight answer
            grounded in our independent platform reviews. Free, no signup. Answers stay general —
            we link out to the relevant comparisons.
          </p>
        </div>
      </section>

      <section className="container-custom py-8">
        <AskClient suggestedQuestions={POPULAR_QUESTIONS.map((p) => p.q)} />
      </section>

      <section className="container-custom py-10 border-t border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Popular questions</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {POPULAR_QUESTIONS.map((p) => (
            <li
              key={p.q}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                {p.topic}
              </p>
              <p className="text-sm text-slate-900 font-semibold">{p.q}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-custom pb-12">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Important:</strong> Answers here are general information only — never personal
          financial advice. We don&apos;t know your circumstances, goals, or risk tolerance. For
          advice tailored to you, talk to a licensed AU financial professional.{" "}
          <Link href="/find-advisor" className="font-semibold underline">
            Find an advisor →
          </Link>
        </div>
        <p className="mt-3 text-xs text-slate-500">{AFSL_STATUS_DISCLOSURE}</p>
      </section>
    </main>
  );
}
