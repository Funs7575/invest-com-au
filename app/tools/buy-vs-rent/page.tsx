import type { Metadata } from "next";
import DecisionTree from "@/components/DecisionTree";
import {
  BUY_VS_RENT_TREE,
  BUY_VS_RENT_START_ID,
} from "@/lib/decision-trees/buy-vs-rent";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_NAME,
} from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Should I Buy or Rent? Interactive Decision Tool (${CURRENT_YEAR}) — ${SITE_NAME}`,
  description:
    "Answer 3–5 questions about your time horizon, deposit, and situation to get a personalised buy-vs-rent recommendation. Free, no sign-up required.",
  alternates: { canonical: "/tools/buy-vs-rent" },
  openGraph: {
    title: "Should I Buy or Rent? — Interactive Decision Tool",
    description:
      "Free decision tool for Australians weighing up buying a home versus renting. Covers time horizon, deposit size, LMI, and owner-sell scenarios.",
    url: absoluteUrl("/tools/buy-vs-rent"),
    images: [
      {
        url: "/api/og?title=Buy+vs+Rent&subtitle=Interactive+Decision+Tool&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  { name: "Buy vs Rent", url: absoluteUrl("/tools/buy-vs-rent") },
]);

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is it better to buy or rent in Australia in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends on your time horizon, deposit size, and personal situation. Buying is generally better if you have a 20% deposit, plan to stay 5+ years, and have stable income. Renting makes more sense for short stays or while saving toward a larger deposit.",
      },
    },
    {
      "@type": "Question",
      name: "How long do I need to hold a property for buying to beat renting?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most financial planners suggest a minimum 5–7 year hold to recover transaction costs such as stamp duty, agent fees, and conveyancing. In high-growth markets this break-even can be shorter; in flat markets, longer.",
      },
    },
    {
      "@type": "Question",
      name: "Can I buy with less than a 20% deposit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, but you'll usually pay Lenders Mortgage Insurance (LMI), which adds 1–3% to your loan. The First Home Guarantee scheme lets eligible first-home buyers purchase with as little as 5% deposit without LMI.",
      },
    },
    {
      "@type": "Question",
      name: "What is LMI and when do I have to pay it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lenders Mortgage Insurance (LMI) is a one-off premium charged when your deposit is less than 20% of the purchase price. It protects the lender — not you — if you default. It is typically capitalised into your loan and can range from around 0.5% to 3% of the loan amount depending on the deposit size.",
      },
    },
  ],
};

const FAQS = faqLd.mainEntity;

export default function BuyVsRentPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd, faqLd]} testId="buy-vs-rent-jsonld" />
      <div className="py-8 md:py-12">
        <div className="container-custom max-w-2xl">
          <p className="text-xs uppercase tracking-wider font-extrabold text-amber-600 mb-3">
            Decision Tool
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Should I Buy or Rent?
          </h1>
          <p className="text-base text-slate-600 mb-8">
            Answer a few questions about your situation and get a personalised
            recommendation — there&apos;s no one-size-fits-all answer when it
            comes to property.
          </p>

          <DecisionTree
            nodes={BUY_VS_RENT_TREE}
            startId={BUY_VS_RENT_START_ID}
            heading="Buy vs Rent"
          />

          <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">General advice only.</strong>{" "}
            This tool provides general information and does not consider your
            personal financial situation, objectives, or needs. Always seek
            professional financial advice before making property decisions.
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-extrabold text-slate-900 mb-5">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.name}>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {faq.name}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {faq.acceptedAnswer.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
