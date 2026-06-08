import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import ConciergeClient from "./ConciergeClient";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Investment Concierge — Ask Invest.com.au (${CURRENT_YEAR})`,
  description:
    "Ask anything about Australian investing platforms, SMSF structures, foreign investor rules, funds, advisors or ETFs. Free AI concierge — no personal financial advice, always points to a licensed adviser for personal questions.",
  alternates: { canonical: "/concierge" },
  robots: {
    index: true,
    follow: true,
  },
};

const CONCIERGE_FAQS = [
  {
    q: "What can I ask the Investment Concierge?",
    a: "The Investment Concierge is an AI-powered tool that answers questions about Australian investing platforms, financial products, and investing structures. You can ask about: broker fees and feature comparisons (e.g. 'Which broker is cheapest for US shares under $5,000?'); SMSF rules and eligibility; foreign investor rules including FIRB thresholds and state land tax surcharges; ETF and fund comparisons; how to find a financial adviser; and general investing concepts. The Concierge draws on Invest.com.au's fee data, regulatory summaries, and product database to give specific, sourced answers.",
  },
  {
    q: "Does the Concierge give personal financial advice?",
    a: "No. The Concierge provides general information and does not take into account your individual financial situation, objectives, tax position, or risk tolerance. It is not a licensed financial adviser and its responses are not financial advice. For questions about what you should personally do with your money — which super fund to choose, whether to buy a specific property, how to structure your investments for tax — the Concierge will explain the general considerations and point you to a licensed adviser. Use our adviser finder (/advisors) to get matched to a professional.",
  },
  {
    q: "How accurate is the information the Concierge provides?",
    a: "The Concierge is trained on Invest.com.au's product database, fee tables (updated daily), and regulatory references (ASIC, ATO, FIRB). It is designed to give accurate, current answers for fee comparisons and general regulatory questions. For specific regulatory details — SMSF investment rules, FIRB thresholds, CDR rules, CMC licensing — verify with the relevant government source or a licensed professional before acting. The Concierge displays sources where available so you can check the original.",
  },
  {
    q: "Is the Concierge free?",
    a: "Yes. The Investment Concierge is free to use and requires no account registration. It is available to all visitors to Invest.com.au. The Concierge is powered by an AI language model. Conversations are not stored permanently after your session ends. For sensitive questions involving your personal financial details, we recommend speaking directly with a licensed adviser rather than an AI tool.",
  },
];

const conciergeFaqLd = faqJsonLd(CONCIERGE_FAQS);

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Concierge", url: absoluteUrl("/concierge") },
]);

const applicationLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Invest.com.au Concierge — ${SITE_NAME}`,
  description:
    "AI-powered concierge for Australian investment platforms, advisors, and opportunities.",
  url: absoluteUrl("/concierge"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

export default function ConciergePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(applicationLd) }}
      />
      {conciergeFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(conciergeFaqLd) }}
        />
      )}
      <Suspense fallback={null}>
        <ConciergeClient />
      </Suspense>
      <div className="container-custom pb-8 pt-2">
        <ComplianceFooter variant="default" />
      </div>

      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-3xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {CONCIERGE_FAQS.map((faq) => (
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
      </div>
    </>
  );
}
