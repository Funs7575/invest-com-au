import type { Metadata } from "next";

import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import WealthStackClient from "./WealthStackClient";

// FIN_NOTEBOOK Revenue #1 (concierge wealth-stack) — the user-facing
// surface. Reads the user's prior quiz answers from sessionStorage if
// available, otherwise prompts the minimal question set inline. Calls
// /api/wealth-stack to get a goal-prioritised multi-product
// recommendation (broker + super + savings + crypto + robo), then
// renders an affiliate-clickable stack with per-component CTAs.
//
// Attribution: each component CTA carries `stackId` + `kind` query
// params so the lead/affiliate pipeline can attribute every click back
// to the same recommendation event. The downstream attribution wiring
// in the leads table is a separate PR.

export const revalidate = 0;

export const metadata: Metadata = {
  title: `Your Wealth Stack — ${SITE_NAME}`,
  description:
    "Get a personalised stack of investing products — broker, super fund, savings account, crypto exchange — matched to your goals in 60 seconds.",
  alternates: { canonical: "/wealth-stack" },
  openGraph: {
    title: `Your Wealth Stack — ${SITE_NAME}`,
    description:
      "Multi-product investing recommendation matched to your goals: broker, super, savings, crypto, robo.",
    url: absoluteUrl("/wealth-stack"),
    images: [
      {
        url: "/api/og?title=Your+Wealth+Stack&subtitle=Broker+%2B+Super+%2B+Savings+%2B+Crypto&type=quiz",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const WEALTH_STACK_FAQS = faqJsonLd([
  {
    q: "What is the Wealth Stack tool?",
    a: "The Wealth Stack tool is a personalised investing product recommender on Invest.com.au. It asks a short set of questions about your goals, risk tolerance, and situation, then suggests a curated combination of products — broker, super fund, savings account, crypto exchange, and robo-advisor — that best match your needs.",
  },
  {
    q: "What products does the Wealth Stack recommend?",
    a: "The Wealth Stack can recommend up to five product categories: a share trading broker, a superannuation fund, a high-interest savings account, a cryptocurrency exchange, and a robo-advisor or managed investment service. Not every category will be included — the tool only surfaces products relevant to your stated goals.",
  },
  {
    q: "Is the Wealth Stack personalised to my situation?",
    a: "Yes. The tool uses your quiz answers — including investment goals, time horizon, tax situation, and experience level — to filter and rank products from Invest.com.au's database. The resulting stack is specific to your inputs rather than a generic list.",
  },
  {
    q: "Is the Wealth Stack recommendation considered financial advice?",
    a: "No. The Wealth Stack provides general information and comparisons only. It does not take into account all aspects of your personal financial situation and is not a substitute for advice from a licensed financial adviser. Invest.com.au holds an Australian Financial Services Licence (AFSL) for general advice only.",
  },
  {
    q: "How do I use the Wealth Stack tool?",
    a: "Click 'Get my stack', answer the short series of questions about your goals and situation, and your personalised product stack will be generated instantly. You can review each recommendation, compare features, and click through to apply or open an account. Your answers are saved in session so you can return to the stack without re-entering information.",
  },
]);

export default function WealthStackPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Your Wealth Stack" },
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEALTH_STACK_FAQS) }}
      />
      <WealthStackClient />
    </div>
  );
}
