import type { Metadata } from "next";
import DecisionTree from "@/components/DecisionTree";
import {
  SALARY_SACRIFICE_TREE,
  SALARY_SACRIFICE_START_ID,
} from "@/lib/decision-trees/salary-sacrifice";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_NAME,
} from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalculatorLeadCapture from "@/components/CalculatorLeadCapture";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Should I Salary Sacrifice Into Super? Decision Tool (${CURRENT_YEAR}) — ${SITE_NAME}`,
  description:
    "Answer 3 questions about your income, employment type, and contributions cap to find out whether salary sacrificing into super makes financial sense for you.",
  alternates: { canonical: "/tools/salary-sacrifice" },
  openGraph: {
    title: "Should I Salary Sacrifice Into Super? — Decision Tool",
    description:
      "Free Australian salary sacrifice decision tool. Covers employment type, income band, concessional cap room, and Division 293 for high earners.",
    url: absoluteUrl("/tools/salary-sacrifice"),
    images: [
      {
        url: "/api/og?title=Salary+Sacrifice&subtitle=Super+Decision+Tool&type=default",
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
  {
    name: "Should I Salary Sacrifice?",
    url: absoluteUrl("/tools/salary-sacrifice"),
  },
]);

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does salary sacrifice into super work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You ask your employer to redirect part of your pre-tax salary into your super fund instead of paying it to you as income. The contribution is taxed at 15% inside super rather than at your marginal income tax rate, which is usually higher — saving you the difference.",
      },
    },
    {
      "@type": "Question",
      name: "What is the concessional contributions cap?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The concessional (before-tax) contributions cap is $30,000 per financial year in 2025–26. This includes your employer's Superannuation Guarantee (SG) contributions and any salary sacrifice amounts. Contributions over the cap are included in your taxable income and taxed at your marginal rate plus an interest charge.",
      },
    },
    {
      "@type": "Question",
      name: "Can self-employed people salary sacrifice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not in the traditional sense. However, self-employed individuals and company directors can make personal concessional contributions and claim them as a tax deduction — achieving the same tax outcome. You need to lodge a Notice of Intent to Claim a Deduction with your fund before lodging your tax return.",
      },
    },
    {
      "@type": "Question",
      name: "What is Division 293 tax?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Division 293 is an additional 15% tax on concessional super contributions for people with income above $250,000. It brings the effective tax rate on those contributions to 30%. Salary sacrifice is still beneficial for high earners — the top marginal rate is 47% including Medicare — but the saving per dollar is smaller than for middle-income earners.",
      },
    },
  ],
};

const FAQS = faqLd.mainEntity;

export default function SalarySacrificePage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd, faqLd]} testId="salary-sacrifice-jsonld" />
      <div className="py-8 md:py-12">
        <div className="container-custom max-w-2xl">
          <p className="text-xs uppercase tracking-wider font-extrabold text-amber-600 mb-3">
            Decision Tool
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Should I Salary Sacrifice Into Super?
          </h1>
          <p className="text-base text-slate-600 mb-8">
            Answer a few questions about your income and employment situation to
            find out whether salary sacrificing into super is likely to benefit
            you — and how much.
          </p>

          <DecisionTree
            nodes={SALARY_SACRIFICE_TREE}
            startId={SALARY_SACRIFICE_START_ID}
            heading="Salary Sacrifice"
          />

          <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">General advice only.</strong>{" "}
            This tool provides general information and does not consider your
            personal financial situation, objectives, or needs. Tax rules change
            each financial year. Always seek professional financial or tax
            advice before making superannuation decisions.
          </div>

          <CalculatorLeadCapture
            calcSlug="salary-sacrifice"
            calcTitle="Salary Sacrifice Decision"
            need="planning"
            contextKeys={["salary_sacrifice", "super_contributions"]}
          />

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
