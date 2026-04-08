import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { SUPER_WARNING_SHORT, GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Super Contributions Guide — Concessional, Non-Concessional & Catch-Up (2026)",
  description:
    "Complete guide to super contributions in Australia. Concessional cap $30,000, non-concessional cap $120,000, carry-forward rules, salary sacrifice, spouse contributions, and government co-contribution. Updated March 2026.",
  openGraph: {
    title: "Super Contributions Guide — Concessional, Non-Concessional & Catch-Up (2026)",
    description:
      "Everything about Australian super contributions: the $30k concessional cap, $120k non-concessional cap, salary sacrifice tax benefits, catch-up contributions, spouse offset, and government co-contribution.",
    url: `${SITE_URL}/super/contributions`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Super Contributions Guide 2026")}&sub=${encodeURIComponent("Concessional · Non-Concessional · Catch-Up · Salary Sacrifice")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/super/contributions` },
};

const CONTRIBUTION_COMPARISON = [
  {
    label: "Who makes it?",
    concessional: "Employer (SG), salary sacrifice, or personal deductible",
    nonConcessional: "You — from after-tax income",
  },
  {
    label: "Annual cap (2025–26)",
    concessional: "$30,000",
    nonConcessional: "$120,000 (or $360,000 using 3-year bring-forward rule)",
  },
  {
    label: "Tax rate inside super",
    concessional: "15% (30% if income > $250k — Division 293)",
    nonConcessional: "0% — already taxed in your hands",
  },
  {
    label: "Tax deduction",
    concessional: "Yes — salary sacrifice and personal deductible contributions reduce taxable income",
    nonConcessional: "No deduction — contributions come from after-tax dollars",
  },
  {
    label: "Who benefits most?",
    concessional: "Higher earners (top marginal rate 47% vs 15% in super)",
    nonConcessional: "People with excess savings, selling an asset, or receiving a windfall",
  },
  {
    label: "Excess penalty",
    concessional: "Included in assessable income + excess concessional charge",
    nonConcessional: "Taxed at 47% on the excess (or choose to withdraw it)",
  },
  {
    label: "Catch-up (carry-forward)?",
    concessional: "Yes — unused cap from prior 5 years if TSB < $500k",
    nonConcessional: "No carry-forward — but 3-year bring-forward rule applies",
  },
];

const CONTRIBUTIONS_SECTIONS = [
  {
    heading: "Employer Superannuation Guarantee — the foundation",
    body: "The Superannuation Guarantee (SG) is the mandatory employer contribution to your super fund. For 2025–26, the SG rate is 11.5% of your ordinary time earnings (OTE). This rate is legislated to increase to 12% from 1 July 2025.\n\nThe SG is calculated on your 'ordinary time earnings' — your regular salary, wages, and some allowances. Overtime is generally excluded from the calculation base.\n\nHow to check it's being paid: Your payslip should show the super contribution amount. You can also log into myGov and check the ATO Super tab — employers must report contributions to the ATO within 28 days of the end of each quarter. If your employer isn't paying, contact the ATO's super complaints line or lodge an unpaid super tip-off online.\n\nSelf-employed: If you are genuinely self-employed (sole trader or contractor) you are not required to pay yourself the SG — but you are strongly encouraged to make personal contributions for your own retirement security.",
  },
  {
    heading: "Salary sacrifice — the most efficient way to boost super",
    body: "Salary sacrifice means asking your employer to divert part of your pre-tax salary into your super fund. This reduces your taxable income, meaning you pay less income tax.\n\nExample: $100,000 salary, $10,000 salary sacrifice\n• Without sacrifice: $10,000 taxed at ~34.5% marginal rate = $6,550 after tax\n• With salary sacrifice: $10,000 goes into super at 15% contributions tax = $8,500 in super\n• Net advantage: $1,950 more in super from the same gross income\n\nThe advantage grows with your marginal tax rate — at the 47% rate (income > $180k), every $10,000 salary sacrificed saves $3,200 in tax compared to taking it as salary.\n\nNote: salary sacrifice counts towards your $30,000 concessional cap. Contributions above the cap are included in your assessable income and taxed at your marginal rate plus an excess concessional contributions charge.\n\nDivision 293 tax: If your income (including concessional contributions) exceeds $250,000, an additional 15% tax (Division 293) is applied to your super contributions — bringing the effective tax rate to 30% rather than 15%. Even at 30%, super is often still more tax-efficient than taking salary at 47%.",
  },
  {
    heading: "Personal deductible contributions — for the self-employed and others with capacity",
    body: "If your employer doesn't offer salary sacrifice (or you're self-employed), you can still make personal after-tax contributions to your super fund and claim a tax deduction for the full amount — effectively achieving the same outcome as salary sacrifice.\n\nTo do this:\n1. Make a contribution to your super fund using your bank account\n2. Lodge a 'Notice of Intent to Claim a Tax Deduction' (form SS-308) with your fund before lodging your tax return\n3. Your fund will acknowledge the notice, and you claim the deduction in your tax return\n\nThis is particularly useful for:\n• Self-employed people without an employer\n• Employees whose employers don't offer salary sacrifice\n• Part-year employees who want to top up before 30 June\n\nThe personal deductible contribution is treated as a concessional contribution and counted toward the $30,000 cap. The 15% contributions tax is deducted by your fund.",
  },
  {
    heading: "Non-concessional contributions — after-tax wealth-building",
    body: "Non-concessional contributions (NCCs) are personal contributions made from your after-tax income that you do not claim a deduction for. They are not taxed when they enter super (you've already paid income tax).\n\nThe annual NCC cap for 2025–26 is $120,000. If you have a Total Super Balance (TSB) below $300,000, you can 'bring forward' up to 3 years of NCCs — contributing up to $360,000 in a single year.\n\nBring-forward caps by TSB (2025–26):\n• TSB < $300,000: $360,000 (3-year bring-forward)\n• TSB $300,000–$399,999: $240,000 (2-year bring-forward)\n• TSB $400,000–$499,999: $120,000 (1-year, no bring-forward)\n• TSB ≥ $500,000: $0 — NCCs prohibited\n\nWhen NCCs make sense: large windfall (inheritance, property sale), downsizer contributions, and people who want to build super without reducing their taxable income.",
  },
  {
    heading: "Carry-forward (catch-up) contributions — the 5-year rule",
    body: "If your Total Super Balance (TSB) was below $500,000 at 30 June of the previous year, you can use any unused concessional contribution cap from the previous 5 financial years.\n\nHow it works: The ATO tracks your unused concessional cap amounts from FY2019–20 onwards. You can see your available carry-forward amount in myGov under the ATO Super section.\n\nExample: You averaged only $10,000/year in concessional contributions for the past 3 years (vs the $27,500 cap in those years — noting the cap was lower historically). You have approximately $52,500 in unused amounts available to carry forward. If you receive a $50,000 bonus in 2025–26, you could make a $50,000 personal deductible contribution and claim it in full — as long as your total concessional contributions for the year don't exceed $30,000 + $50,000 = $80,000.\n\nWho benefits most: people who took career breaks, worked part-time, ran a business at a loss for several years, or simply didn't maximise contributions in earlier years but now have the financial capacity.",
  },
  {
    heading: "Spouse contributions and the tax offset",
    body: "You can contribute to your spouse's super fund and receive a tax offset if your spouse earns below $40,000. The maximum offset is $540 (18% of $3,000 contribution) when your spouse earns $37,000 or less, phasing out at $40,000.\n\nSpouse contribution strategy: Even a small contribution to a lower-income spouse's fund can provide the offset and begin building their super balance. This is particularly relevant where one spouse has taken parental leave or works part-time.\n\nSplitting concessional contributions: You can also split up to 85% of your concessional contributions made in one year to your spouse's super account. This doesn't provide an additional tax deduction but can equalise super balances (relevant for accessing the pension, tax-free thresholds in retirement, and estate planning).",
  },
  {
    heading: "Government co-contribution — for lower income earners",
    body: "If you earn below $60,400 (2025–26) and make a non-concessional contribution, the government will match 50 cents for every $1 you contribute — up to $500 for people earning $45,400 or less.\n\nMaximum co-contribution: $500 (if you contribute $1,000 and earn ≤ $45,400).\nPhase-out: The $500 maximum reduces progressively as income rises, reaching $0 at $60,400.\n\nEligibility requirements:\n• At least 10% of income from eligible employment, running a business, or both\n• Total income ≤ $60,400\n• TSB < $1.9 million\n• Age 71 or under\n• Australian resident (not on a temporary visa)\n\nThe co-contribution is automatically paid by the ATO after you lodge your tax return — you don't need to apply.",
  },
  {
    heading: "Total Super Balance — how it affects your contributions",
    body: "Your Total Super Balance (TSB) as at 30 June of the prior year is a key figure that determines which super strategies are available to you.\n\nKey TSB thresholds (2025–26):\n• < $500,000: Can use carry-forward concessional contributions\n• < $300,000: Can use 3-year NCC bring-forward ($360,000)\n• < $1.9 million: Government co-contribution available; can make non-concessional contributions\n• ≥ $1.9 million (General Transfer Balance Cap): No non-concessional contributions allowed\n\nYour TSB is your combined balance across all super accounts (accumulation and pension phase), including your super interest in a defined benefit scheme. It is calculated at 30 June each year and determines your options for the following financial year.",
  },
];

const CONTRIBUTIONS_FAQS = [
  {
    question: "What is the super guarantee rate in 2025–26?",
    answer:
      "The Superannuation Guarantee (SG) rate for the 2025–26 financial year is 11.5% of ordinary time earnings. The rate is legislated to increase to 12% on 1 July 2025. Your employer must pay this on your ordinary time earnings (your regular salary — generally excluding overtime) at least quarterly, within 28 days of the end of each quarter.",
  },
  {
    question: "Can I claim a tax deduction for personal super contributions?",
    answer:
      "Yes — if you are under 75, you can claim a tax deduction for personal super contributions regardless of your employment status. You must lodge a valid 'Notice of Intent to Claim a Tax Deduction' with your fund before you lodge your tax return (or 30 June of the following year, whichever is earlier). Your fund will acknowledge the notice. The contributed amount is treated as a concessional contribution (15% tax inside super) and counts toward the $30,000 concessional cap.",
  },
  {
    question: "What happens if I exceed the concessional contributions cap?",
    answer:
      "Excess concessional contributions are included in your assessable income for that year (taxed at your marginal rate plus Medicare levy), with a 15% tax offset to account for the contributions tax already paid by your fund. An excess concessional contributions charge (interest) is also applied. You have the option to withdraw up to 85% of the excess from your fund to help pay the tax bill. Excess contributions do not count toward your non-concessional cap.",
  },
  {
    question: "Who qualifies for the government co-contribution?",
    answer:
      "You qualify for the government co-contribution if: you earn below $60,400 (2025–26), at least 10% of your income is from eligible employment or running a business, you make a personal (non-concessional) contribution, your TSB is below $1.9 million, you're aged 71 or under, and you're an Australian resident (not a temporary visa holder). The maximum co-contribution is $500 (50% of a $1,000 contribution) for those earning $45,400 or less. The ATO automatically calculates and pays it after you lodge your tax return.",
  },
  {
    question: "Can I contribute to super if I'm retired or over 67?",
    answer:
      "Yes, with some restrictions. From age 67–74, you can make super contributions (both concessional and non-concessional) only if you meet the 'work test' — gainfully employed for at least 40 hours over 30 consecutive days in the financial year. From 1 July 2022, this test is only required for non-concessional contributions and salary sacrifice for people aged 67–74; employer SG contributions continue automatically. Once you reach age 75, only mandatory employer SG contributions and downsizer contributions are permitted.",
  },
];

export default function SuperContributionsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Super", url: `${SITE_URL}/super` },
    { name: "Contributions" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CONTRIBUTIONS_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/super" className="hover:text-slate-900">Super</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Contributions</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Super Contributions · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Super Contributions Guide —{" "}
              <span className="text-amber-600">Concessional, Non-Concessional &amp; Catch-Up Contributions</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Everything you need to know about contributing to super in Australia — from employer SG to salary sacrifice,
              personal deductible contributions, catch-up rules, and the government co-contribution.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Concessional Cap</p>
              <p className="text-xl font-black text-green-700">$30,000</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Per annum (2025–26). Includes employer SG, salary sacrifice, and personal deductible contributions.</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-200 p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Non-Concessional Cap</p>
              <p className="text-xl font-black text-blue-700">$120,000</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Per annum (2025–26). Up to $360,000 under the 3-year bring-forward rule if TSB &lt; $300,000.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Super Rate (2025–26)</p>
              <p className="text-xl font-black text-amber-700">11.5%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Superannuation Guarantee rate. Rising to 12% from 1 July 2025.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Tax Rate in Super</p>
              <p className="text-xl font-black text-slate-700">15%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Contributions tax on concessional contributions. 30% if income exceeds $250,000 (Division 293).</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="At a glance"
            title="Concessional vs Non-Concessional contributions"
            sub="The two main contribution types — understand which applies to you and when each makes sense."
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide w-[200px]">Feature</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-green-300">Concessional (Pre-Tax)</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-blue-300">Non-Concessional (After-Tax)</th>
                </tr>
              </thead>
              <tbody>
                {CONTRIBUTION_COMPARISON.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs">{row.label}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-green-100 text-xs leading-relaxed">{row.concessional}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-blue-100 text-xs leading-relaxed">{row.nonConcessional}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Salary sacrifice calculator example ─────────────────────── */}
      <section className="py-10 bg-amber-50 border-y border-amber-100">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="Example calculation" title="Salary sacrifice: how much could you save?" />
          <div className="bg-white rounded-2xl border border-amber-200 p-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Scenario: $80,000 salary, $5,000 salary sacrifice</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Annual salary</span>
                <span className="font-bold text-slate-900">$80,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Salary sacrifice amount</span>
                <span className="font-bold text-amber-700">−$5,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Taxable income reduced to</span>
                <span className="font-bold text-slate-900">$75,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Income tax saved (at 32.5% marginal)</span>
                <span className="font-bold text-green-700">$1,625</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Contributions tax paid by fund (15%)</span>
                <span className="font-bold text-amber-600">−$750</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-base pt-1">
                <span className="text-slate-900">Net advantage of salary sacrifice</span>
                <span className="text-green-700">$875/year</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">Illustrative only. Employer SG contribution of $9,200 (11.5% × $80,000) also applies — salary sacrifice does not reduce the SG base.</p>
          </div>
        </div>
      </section>

      {/* ── Content Sections ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Full guide" title="All contribution types explained" />
          <div className="space-y-10">
            {CONTRIBUTIONS_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3 className="text-base font-extrabold text-slate-900 mb-3">{section.heading}</h3>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {section.body.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-4">
            {CONTRIBUTIONS_FAQS.map((faq) => (
              <details key={faq.question} className="group bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3">⌄</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">Compare super funds and get advice</h2>
            <p className="text-slate-400 text-sm">Find a fund with low fees and strong performance, or speak with a financial planner about your contributions strategy.</p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link
              href="/compare/super"
              className="px-5 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Compare Super Funds
            </Link>
            <Link
              href="/advisors/financial-planners"
              className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Find a Financial Planner
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">{SUPER_WARNING_SHORT} {GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
