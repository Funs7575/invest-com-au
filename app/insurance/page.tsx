import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Insurance Australia (${CURRENT_YEAR}) — Life, Income Protection, Health & Home Compared`,
  description: `Compare all types of personal insurance in Australia: life insurance, income protection, trauma, TPD, health insurance, and home & contents. Independent guides and comparisons. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Insurance Hub — Invest.com.au`,
    description: "Independent insurance comparison and guides for Australians. Life, income protection, health, and home.",
    url: `${SITE_URL}/insurance`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/insurance` },
};

const INSURANCE_CATEGORIES = [
  {
    title: "Life Insurance",
    description: "Pays a lump sum to your beneficiaries if you die or are diagnosed with a terminal illness. Essential for anyone with dependants or a mortgage.",
    href: "/insurance/life",
    icon: "🛡️",
    keyFact: "Average cover gap: $500,000+",
    color: "blue",
  },
  {
    title: "Income Protection",
    description: "Replaces up to 70% of your income if you're unable to work due to illness or injury. The most valuable insurance for working Australians.",
    href: "/insurance/income-protection",
    icon: "💼",
    keyFact: "Covers up to 70% of income",
    color: "green",
  },
  {
    title: "Health Insurance",
    description: "Covers private hospital treatment, extras (dental, optical, physio), and reduces the Medicare Levy Surcharge for higher earners.",
    href: "/insurance/health",
    icon: "🏥",
    keyFact: "Avoid MLS above $93,000 income",
    color: "red",
  },
  {
    title: "Home & Contents",
    description: "Protects your home building against damage and your belongings against theft, fire, and accidental damage. Essential for homeowners and renters.",
    href: "/insurance/home-contents",
    icon: "🏠",
    keyFact: "1 in 8 homes underinsured",
    color: "amber",
  },
  {
    title: "TPD Insurance",
    description: "Total and Permanent Disability insurance pays a lump sum if you become permanently unable to work due to illness or injury.",
    href: "/insurance/tpd",
    icon: "⚕️",
    keyFact: "Often held inside super",
    color: "purple",
  },
  {
    title: "Trauma Insurance",
    description: "Pays a lump sum if you're diagnosed with a specified serious illness (cancer, heart attack, stroke). Allows lifestyle adjustment during recovery.",
    href: "/insurance/trauma",
    icon: "❤️",
    keyFact: "60+ conditions typically covered",
    color: "rose",
  },
];

const KEY_CONCEPTS = [
  {
    term: "Sum Insured",
    definition: "The maximum amount the insurer will pay out under the policy. For life insurance, this is the lump sum your beneficiaries receive. For income protection, it's the monthly benefit amount.",
  },
  {
    term: "Waiting Period",
    definition: "For income protection, the waiting period (typically 30, 60, or 90 days) is how long you must be unable to work before benefits start. Longer waiting periods mean lower premiums but greater upfront financial exposure.",
  },
  {
    term: "Benefit Period",
    definition: "For income protection, this is how long the insurer will pay your monthly benefit — typically 2 years, 5 years, or to age 65. Longer benefit periods cost more but provide much better protection.",
  },
  {
    term: "Stepped vs Level Premiums",
    definition: "Stepped premiums start cheaper but increase with age each year. Level premiums are higher initially but remain relatively stable. Level premiums save money for long-term holders aged 35+.",
  },
  {
    term: "Inside Super vs Outside Super",
    definition: "Life, TPD, and income protection can be held inside super (paid from pre-tax super contributions, cheaper cash flow) or outside super (direct ownership, more flexibility, no lapse risk if super runs dry).",
  },
  {
    term: "Underwriting",
    definition: "The insurer's process of assessing your health history and risk. Standard underwriting occurs at application; guaranteed renewable means you can't be re-assessed after policy issue as long as you keep paying premiums.",
  },
];

const INSURANCE_NEED_CALCULATOR = [
  { situation: "Single, no dependants, no mortgage", recommended: "Income protection (high priority), Life insurance (low priority)", priority: "medium" },
  { situation: "Couple with a mortgage, no kids", recommended: "Life insurance + income protection for both partners, cover the mortgage balance minimum", priority: "high" },
  { situation: "Family with young children", recommended: "Life insurance (10x+ income), income protection (to 65), TPD, and consider trauma cover", priority: "very-high" },
  { situation: "Self-employed business owner", recommended: "Income protection is critical — no employer sick leave. Business expense insurance also recommended", priority: "very-high" },
  { situation: "Near retirement (60+)", recommended: "Review cover amounts — declining need for life as mortgage reduces. Consider maintaining income protection if still working", priority: "medium" },
];

const FAQS = [
  {
    question: "What insurance do I actually need in Australia?",
    answer: "The most universally needed insurance for working Australians is income protection — it replaces up to 70% of your income if you can't work. If you have dependants or a mortgage, life insurance is also essential. TPD is valuable as a lump-sum backup if you're permanently unable to work. Health insurance depends on your income (Medicare Levy Surcharge kicks in above $93,000 for singles).",
  },
  {
    question: "Should I get insurance through my super fund?",
    answer: "Holding life insurance and TPD through super uses pre-tax dollars (super contributions), which reduces the cash flow cost. However, there are drawbacks: income protection inside super has stricter definitions of disability, coverage can lapse if your super balance runs low, and ownership through super can complicate beneficiary arrangements. Most financial advisers recommend owning at least income protection outside super for employed Australians.",
  },
  {
    question: "Is life insurance tax-deductible?",
    answer: "Life insurance premiums held outside super are generally NOT tax-deductible for individuals. Income protection premiums held outside super ARE tax-deductible against your assessable income. Premiums paid from inside your super account are treated differently. TPD premiums inside super are partially deductible to the fund.",
  },
  {
    question: "What is the Medicare Levy Surcharge?",
    answer: "The Medicare Levy Surcharge (MLS) is an additional 1–1.5% tax on singles earning above $93,000 and families above $186,000 who don't hold a private hospital cover policy. Buying a basic private hospital policy (from around $100/month) eliminates the MLS — making health insurance a financial no-brainer for higher earners.",
  },
  {
    question: "How much life insurance do I need?",
    answer: "A common guideline is 10x your annual salary, but a more precise approach considers: your outstanding mortgage balance, number of years of income replacement needed, future education costs for children, and any existing super/TPD cover. An insurance calculator or adviser can produce a personalised figure.",
  },
  {
    question: "What is the difference between TPD 'own occupation' and 'any occupation'?",
    answer: "'Own occupation' pays if you can no longer perform your specific job. 'Any occupation' only pays if you can't perform any work suited to your education and experience. 'Own occupation' provides much better protection — a surgeon who loses a hand would receive TPD under own occupation but might be denied under any occupation if they could theoretically work as a consultant. Own occupation is generally required to be held outside super (since 2014 tax changes).",
  },
];

const EDITORIAL = [
  {
    heading: "How to compare insurance policies — what really matters",
    body: `Insurance comparison is more complex than comparing loan rates. The lowest premium doesn't mean the best policy — what matters is what the policy actually covers and whether it'll pay when you need it.

**Key factors for life insurance:**
- Premium structure: stepped (cheaper now, increases with age) vs level (higher now, stable later)
- Definition of terminal illness
- Whether premiums are waived during a claim

**Key factors for income protection:**
- Benefit period: 2 years vs 5 years vs to-age-65 — this is the biggest lever on premium and protection
- Waiting period: 30, 60, or 90 days — how long before payments start
- Definition of disability: own occupation vs any occupation
- Agreed value vs indemnity: agreed value pays the insured amount; indemnity pays based on actual income at claim time (important for income variability)
- Inclusion of superannuation contributions in benefit payments

**Why you should use an insurance broker (not a comparison website):**
Insurance comparison websites compare prices but not policy quality. A specialist insurance broker compares dozens of policies on quality metrics, advocates for you at claim time, and structures your cover tax-efficiently. For life insurance above $500K and income protection, the adviser fee typically saves more than it costs.`,
  },
  {
    heading: "Insurance inside vs outside super — the real trade-off",
    body: `Most Australians have some insurance inside their super fund by default. Here's when that's fine vs when you need to act:

**Inside super works well for:**
- Life insurance and TPD — the most common structure
- Tax efficiency: premiums paid from concessionally-taxed super contributions
- People who want 'set and forget' without thinking about premiums

**Outside super is better for:**
- Income protection — critical point: income protection inside super is assessed under 'any occupation' definition for the first 2 years, which is far more restrictive
- Ownership and beneficiary flexibility — outside super, you can structure trust ownership and nominate any beneficiary
- Long-term holders: your super balance won't run down paying premiums (lapse risk inside super is a real risk for low-balance members)

**The hybrid approach:**
Many advisers recommend holding life insurance and TPD inside super (tax-efficient, no cash flow impact) while holding income protection outside super (better definition, premium is tax-deductible, no lapse risk). This is the most common professional recommendation.`,
  },
];

export default function InsuranceHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Insurance" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <span className="text-slate-300">Insurance</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Insurance Hub · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Insurance Australia{" "}
              <span className="text-amber-400">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
              Independent guides to all types of personal insurance in Australia — life, income protection,
              health, home and contents, TPD, and trauma. What you need, what to look for, and how to avoid
              paying too much for too little cover.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-red-200 p-5">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Underinsurance Gap</p>
              <p className="text-xl font-black text-red-700">$500K+</p>
              <p className="text-xs text-slate-600 mt-1">The average Australian household is underinsured by over $500,000 in life cover.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Income Protection Tax</p>
              <p className="text-xl font-black text-slate-900">100% deductible</p>
              <p className="text-xs text-slate-600 mt-1">Premiums on income protection policies held outside super are fully tax-deductible.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">MLS Threshold</p>
              <p className="text-xl font-black text-amber-700">$93,000</p>
              <p className="text-xs text-slate-600 mt-1">Singles earning above $93K face a 1–1.5% Medicare Levy Surcharge without private hospital cover.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading eyebrow="Insurance Types" title="Find the Right Insurance Cover" sub="Compare options in each insurance category — independent analysis with no insurer bias." />
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {INSURANCE_CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group block bg-white border border-slate-200 rounded-2xl p-6 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h2 className="text-base font-bold text-slate-900 group-hover:text-amber-700 mb-2 transition-colors">
                  {cat.title}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{cat.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded font-semibold border border-amber-200">
                    {cat.keyFact}
                  </span>
                  <span className="text-xs font-semibold text-amber-600 group-hover:text-amber-700">
                    Compare →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Do I Need This Table */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <SectionHeading eyebrow="Insurance Calculator" title="How Much Insurance Do You Need?" sub="General guidance by life situation — not personalised advice." />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left py-3 px-4 text-xs font-bold">Life Situation</th>
                  <th className="text-left py-3 px-4 text-xs font-bold">Recommended Cover</th>
                  <th className="text-center py-3 px-4 text-xs font-bold">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {INSURANCE_NEED_CALCULATOR.map((row) => (
                  <tr key={row.situation} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-semibold text-slate-800">{row.situation}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{row.recommended}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        row.priority === "very-high" ? "bg-red-100 text-red-700" :
                        row.priority === "high" ? "bg-orange-100 text-orange-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {row.priority === "very-high" ? "Very High" : row.priority === "high" ? "High" : "Medium"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">General guidance only. See a financial adviser for personalised insurance advice.</p>
          </div>
        </div>
      </section>

      {/* Key Terms */}
      <section className="py-10 md:py-12">
        <div className="container-custom">
          <SectionHeading eyebrow="Terminology" title="Insurance Terms Explained" />
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {KEY_CONCEPTS.map((c) => (
              <div key={c.term} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-2">{c.term}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{c.definition}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Insurance Guide" title="How to Choose the Right Insurance" />
          <div className="mt-8 space-y-10">
            {EDITORIAL.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Insurance Questions Answered" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.question} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Get personalised insurance advice</h2>
          <p className="text-sm text-slate-300 mb-6">
            An insurance broker compares dozens of policies and advocates for you at claim time. Service is typically free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisors/insurance-brokers" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find an Insurance Broker →
            </Link>
            <Link href="/advisors/financial-planners" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              Find a Financial Planner →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
