import type { Metadata } from "next";
import { DecisionFlowShell } from "@/components/DecisionFlowShell";
import { BUY_VS_RENT_FLOW } from "@/lib/decision-flow-configs";
import { breadcrumbJsonLd, absoluteUrl, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Should I Buy or Rent? Interactive Guide | ${SITE_NAME}`,
  description:
    "Answer 4 questions to get a personalised buy vs rent recommendation for your Australian property situation. Covers stamp duty, FHB grants, negative gearing, and market conditions.",
  alternates: { canonical: absoluteUrl("/decision/buy-vs-rent") },
  openGraph: {
    title: "Should I Buy or Rent? | invest.com.au",
    description:
      "Work through Australia's most common property decision in under 2 minutes.",
    url: absoluteUrl("/decision/buy-vs-rent"),
  },
};

export default function BuyVsRentPage() {
  const jsonLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Decision Tools", url: absoluteUrl("/decision") },
    { name: "Buy vs Rent", url: absoluteUrl("/decision/buy-vs-rent") },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <nav className="text-xs text-gray-500 mb-6">
            <a href="/" className="hover:underline">
              Home
            </a>{" "}
            /{" "}
            <a href="/decision" className="hover:underline">
              Decision Tools
            </a>{" "}
            / Buy vs Rent
          </nav>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Should I Buy or Rent?
            </h1>
            <p className="text-gray-600">
              Answer a few questions to get a personalised recommendation for
              your Australian property situation.
            </p>
          </div>
          <DecisionFlowShell flow={BUY_VS_RENT_FLOW} />
          <p className="mt-10 text-xs text-gray-400 leading-relaxed">
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </main>
    </>
  );
}
