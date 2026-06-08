import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import SubscriptionAuditClient from "./SubscriptionAuditClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Subscription Audit Tool — See What You're Really Spending (${CURRENT_YEAR})`,
  description:
    "Add your streaming, software, news, fitness and other subscriptions to see your true annual spend. Identify your highest-cost services and find savings opportunities — free tool, no sign-up.",
  alternates: { canonical: `${SITE_URL}/tools/subscription-audit` },
  openGraph: {
    title: `Subscription Audit Tool (${CURRENT_YEAR}) — Find Hidden Spending`,
    description:
      "Track all your recurring subscriptions in one place. See monthly and annual totals, spend by category, and the top 3 subscriptions you could cut to save money.",
    url: `${SITE_URL}/tools/subscription-audit`,
    images: [
      {
        url: "/api/og?title=Subscription+Audit&subtitle=Track+Your+Recurring+Spend&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Tools", url: `${SITE_URL}/tools` },
  { name: "Subscription Audit", url: `${SITE_URL}/tools/subscription-audit` },
]);

const calcLd = calculatorJsonLd({
  name: "Subscription Audit Tool",
  description:
    "Calculate your total annual subscription spend across streaming, software, news, fitness, gaming and other recurring services. Includes 18 common Australian service presets, spend-by-category breakdown, and savings opportunity analysis.",
  path: "/tools/subscription-audit",
});

const faqLd = faqJsonLd([
  {
    q: "How much does the average Australian spend on subscriptions?",
    a: "Research by Finder and ACCC consumer surveys suggests Australians spend an average of A$100–$130 per month on digital subscriptions, or roughly A$1,200–$1,560 per year, spanning streaming, music, software, news and fitness services. Households with multiple streaming services and software subscriptions often exceed A$2,000 per year.",
  },
  {
    q: "What is subscription fatigue?",
    a: "Subscription fatigue refers to the growing consumer frustration from managing too many recurring services — many of which go underused. Studies show Australians regularly underestimate their total subscription spend by 30–50%, paying for services they have largely forgotten about.",
  },
  {
    q: "Which subscriptions should I cancel first?",
    a: "Start by cancelling or pausing the services you use least and that cost the most. Common candidates include duplicate streaming services (e.g. two drama platforms), gym memberships used fewer than four times per month, and software subscriptions for tools you have cheaper or free alternatives for. Auditing annually — especially after a price increase — helps you stay on top of creep.",
  },
  {
    q: "Can I negotiate subscription prices?",
    a: "Some services — particularly software providers and gym chains — will offer discounted rates or pauses if you call and express intent to cancel. Annual plans typically cost 15–30% less than month-to-month billing. Students, seniors and concession card holders can also access reduced rates for many streaming and software subscriptions in Australia.",
  },
]);

export default function SubscriptionAuditPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={calcLd} />
      <JsonLd data={faqLd} />
      <Suspense>
        <SubscriptionAuditClient />
      </Suspense>

      {/* Static FAQ section for SEO */}
      <section className="container-custom max-w-3xl pb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {[
            {
              q: "How much does the average Australian spend on subscriptions?",
              a: "Research by Finder and ACCC consumer surveys suggests Australians spend an average of A$100–$130 per month on digital subscriptions, or roughly A$1,200–$1,560 per year. Households with multiple streaming services and software subscriptions often exceed A$2,000 per year.",
            },
            {
              q: "Which subscriptions should I cancel first?",
              a: "Start with the services you use least that cost the most. Common candidates include duplicate streaming services, gym memberships used fewer than four times per month, and software with cheaper free alternatives. Audit annually — especially after a price increase.",
            },
            {
              q: "Can I negotiate subscription prices?",
              a: "Yes — software providers and gym chains often offer discounted rates if you call and express intent to cancel. Annual plans are typically 15–30% cheaper than monthly billing. Students, seniors, and concession card holders can access reduced rates for many Australian streaming and software subscriptions.",
            },
          ].map((item) => (
            <details key={item.q} className="bg-white border border-slate-200 rounded-xl group">
              <summary className="px-5 py-4 text-sm font-semibold text-slate-800 cursor-pointer list-none flex justify-between items-center">
                {item.q}
                <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2" aria-hidden="true">▾</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="container-custom max-w-3xl pb-10">
        <ComplianceFooter />
      </div>
    </>
  );
}
