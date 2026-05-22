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
import { faqJsonLd, speakableWebPageJsonLd, calculatorJsonLd } from "@/lib/schema-markup";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";

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

const FAQ_ITEMS = [
  {
    q: "What is salary sacrifice into super?",
    a: "Salary sacrifice means redirecting part of your pre-tax salary directly into superannuation as concessional contributions. The redirected amount is taxed at 15% inside super rather than at your marginal rate (up to 47%). This reduces your taxable income and builds super faster.",
  },
  {
    q: "How much can I salary sacrifice into super?",
    a: "The concessional contribution cap for 2024-25 is $30,000 (includes employer SG contributions). If your employer pays 11.5% SG, you can salary sacrifice approximately $30,000 − (salary × 11.5%) before hitting the cap. Exceeding the cap triggers excess concessional contributions tax — the excess is included in your assessable income and taxed at marginal rate plus interest.",
  },
  {
    q: "Is salary sacrifice worth it for low income earners?",
    a: "Not always. The tax benefit of salary sacrificing reduces as your marginal rate approaches 15%. Earners below $37,000 already have their super taxed at an effective rate close to 15% (the low-income super tax offset refunds tax on contributions up to $500). For earners above $45,000 the benefit is clear; for lower earners, other savings strategies may be more tax-effective.",
  },
  {
    q: "What is salary sacrifice for non-super benefits?",
    a: "You can also salary sacrifice for a novated car lease (employer leases the car, salary package running costs), laptops, and other fringe benefits. The FBT implications vary by benefit type and employer FBT status — e.g. public hospitals and charities have FBT-exempt thresholds that greatly increase the value of this strategy.",
  },
  {
    q: "Does salary sacrifice reduce my employer's super guarantee?",
    a: "From 1 January 2020, employers must calculate the Superannuation Guarantee (SG) on ordinary time earnings (OTE) inclusive of salary-sacrifice amounts. This means salary sacrificing no longer reduces the employer SG base — employers must pay SG on your pre-sacrifice salary. Check your award/enterprise agreement if uncertain.",
  },
] as const;

const toolLd = calculatorJsonLd({
  name: "Salary Sacrifice Decision Tool",
  description:
    "Free interactive tool that weighs your income, employment type, concessional cap room, and Division 293 status to show whether salary sacrificing into super is likely to benefit you. No sign-up required.",
  path: "/tools/salary-sacrifice",
});

const faqLd = faqJsonLd([...FAQ_ITEMS]);

const speakableLd = speakableWebPageJsonLd({
  name: "Should I Salary Sacrifice Into Super? Decision Tool",
  path: "/tools/salary-sacrifice",
  selectors: ["h1"],
});

export default function SalarySacrificePage() {
  return (
    <>
      <JsonLd
        data={[breadcrumbLd, toolLd, faqLd]}
        testId="salary-sacrifice-jsonld"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
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

          <div className="mt-10">
            <h2 className="text-xl font-extrabold text-slate-900 mb-5">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {FAQ_ITEMS.map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {faq.q}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {faq.a}
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
