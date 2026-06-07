import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import HubPage from "@/components/HubPage";
import HubNewsletterCapture from "@/components/HubNewsletterCapture";
import HubExitIntent from "@/components/HubExitIntent";
import { insuranceHubConfig } from "@/lib/hub-configs/insurance";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Insurance Australia (${CURRENT_YEAR}) — Life, Income Protection, Health & Home Compared`,
  description: insuranceHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/insurance` },
  openGraph: {
    title: `Insurance Hub (${CURRENT_YEAR})`,
    description:
      "Independent insurance comparison and guides for Australians. Life, income protection, health, and home.",
    url: `${SITE_URL}/insurance`,
  },
  twitter: { card: "summary_large_image" },
};

const KEY_CONCEPTS = [
  {
    term: "Sum Insured",
    definition:
      "The maximum amount the insurer will pay out under the policy. For life insurance this is the lump sum your beneficiaries receive; for income protection it is the monthly benefit amount.",
  },
  {
    term: "Waiting Period",
    definition:
      "For income protection, the waiting period (typically 30, 60, or 90 days) is how long you must be unable to work before benefits start. Longer waiting periods mean lower premiums but greater upfront financial exposure.",
  },
  {
    term: "Benefit Period",
    definition:
      "For income protection, this is how long the insurer pays your monthly benefit — typically 2 years, 5 years, or to age 65. Longer benefit periods cost more but provide much better protection.",
  },
  {
    term: "Stepped vs Level Premiums",
    definition:
      "Stepped premiums start cheaper but increase each year with age. Level premiums are higher initially but remain relatively stable. Level premiums save money for long-term holders aged 35+.",
  },
  {
    term: "Inside Super vs Outside Super",
    definition:
      "Life, TPD, and income protection can be held inside super (paid from pre-tax super contributions, cheaper cash flow) or outside super (direct ownership, more flexibility, no lapse risk if super runs dry).",
  },
  {
    term: "Underwriting",
    definition:
      "The insurer's process of assessing your health history and risk. Guaranteed renewable policies cannot be re-assessed after issue as long as you keep paying premiums — important for people with pre-existing conditions.",
  },
];

const SITUATION_GUIDE = [
  {
    situation: "Single, no dependants, no mortgage",
    recommended: "Income protection (high priority), Life insurance (low priority)",
    priority: "medium",
  },
  {
    situation: "Couple with a mortgage, no kids",
    recommended:
      "Life insurance + income protection for both partners — cover the mortgage balance as a minimum",
    priority: "high",
  },
  {
    situation: "Family with young children",
    recommended:
      "Life insurance (10x+ income), income protection (to age 65), TPD, and consider trauma cover",
    priority: "very-high",
  },
  {
    situation: "Self-employed business owner",
    recommended:
      "Income protection is critical — no employer sick leave. Business expense insurance also recommended",
    priority: "very-high",
  },
  {
    situation: "Near retirement (60+)",
    recommended:
      "Review cover amounts — declining need for life as mortgage reduces. Consider maintaining income protection if still working",
    priority: "medium",
  },
];

const PRIORITY_COLOUR: Record<string, string> = {
  "very-high": "text-red-700 bg-red-50",
  high: "text-amber-700 bg-amber-50",
  medium: "text-slate-700 bg-slate-100",
};

export default function InsuranceHubPage() {
  return (
    <>
      <HubPage
        config={insuranceHubConfig}
        newsletterCapture={
          <HubNewsletterCapture
            segmentSlug="insurance-hub"
            hubTitle="Insurance"
          />
        }
      >
        {/* Key concepts glossary */}
        <section className="py-12 border-t border-slate-200 bg-slate-50">
          <div className="container-custom max-w-6xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Insurance terms explained
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              The jargon insurers use — and what it means for your cover.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {KEY_CONCEPTS.map(({ term, definition }) => (
                <div
                  key={term}
                  className="bg-white border border-slate-200 rounded-xl p-5"
                >
                  <h3 className="font-semibold text-slate-900 mb-1">{term}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{definition}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Situation guide */}
        <section className="py-12 border-t border-slate-200">
          <div className="container-custom max-w-6xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              What insurance do I need?
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              A quick guide by life stage. An insurance broker can tailor this to your
              specific situation.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden" aria-label="Insurance comparison">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700 w-1/3">
                      Your situation
                    </th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700">
                      Recommended cover
                    </th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700 w-28">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SITUATION_GUIDE.map(({ situation, recommended, priority }) => (
                    <tr
                      key={situation}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-3 text-slate-800 font-medium align-top">
                        {situation}
                      </td>
                      <td className="px-4 py-3 text-slate-600 align-top">
                        {recommended}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded capitalize ${
                            PRIORITY_COLOUR[priority] ?? "text-slate-600 bg-slate-100"
                          }`}
                        >
                          {priority.replace("-", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              General guidance only. Personal circumstances vary — speak to a licensed insurance
              broker for tailored advice.
            </p>
          </div>
        </section>

        {/* Inside vs outside super quick guide */}
        <section className="py-12 border-t border-slate-200 bg-white">
          <div className="container-custom max-w-6xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Insurance inside vs outside super
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Most Australians have default insurance inside their super fund. Here is when
              that is fine — and when you need to act.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <h3 className="font-semibold text-emerald-800 mb-3">
                  ✓ Inside super works well for
                </h3>
                <ul className="space-y-2 text-sm text-emerald-900">
                  <li>Life insurance and TPD — the most common structure</li>
                  <li>
                    Tax efficiency: premiums paid from concessionally-taxed super
                    contributions
                  </li>
                  <li>
                    People who want &apos;set and forget&apos; without thinking about
                    out-of-pocket premiums
                  </li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-semibold text-amber-800 mb-3">
                  ⚠ Outside super is better for
                </h3>
                <ul className="space-y-2 text-sm text-amber-900">
                  <li>
                    Income protection — inside super uses &lsquo;any occupation&rsquo;
                    definition for the first 2 years, which is far more restrictive
                  </li>
                  <li>
                    Ownership and beneficiary flexibility — structure trust ownership and
                    nominate any beneficiary
                  </li>
                  <li>
                    Long-term holders: avoids lapse risk if super balance runs low from
                    premium deductions
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Link
                href="/advisors/insurance-brokers"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Talk to an insurance broker
              </Link>
            </div>
          </div>
        </section>
      </HubPage>

      <HubExitIntent segmentSlug="insurance-hub" hubName="Insurance" />
    </>
  );
}
