import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { faqJsonLd } from "@/lib/schema-markup";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Spouse Super Contributions & Tax Offset Guide 2026 — Up to $540",
  description:
    "Learn how the spouse super contribution tax offset works in Australia. Contribute to your spouse's super and claim up to $540 tax offset if your spouse earns below $40,000. Eligibility, worked examples, and comparison with super splitting. Updated 2026.",
  openGraph: {
    title: "Spouse Super Contributions & Tax Offset Guide 2026 — Up to $540",
    description:
      "Contribute to your spouse's super and claim up to $540 tax offset. Full guide: eligibility rules, offset calculation, worked examples, and how spouse contributions compare to super splitting.",
    url: `${SITE_URL}/super/spouse-contributions`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Spouse Super Contributions 2026")}&sub=${encodeURIComponent("Tax Offset · Up to $540 · Eligibility & Worked Examples")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/super/spouse-contributions` },
};

const OFFSET_ROWS = [
  {
    income: "Below $37,000",
    rate: "18%",
    onFirst: "$3,000",
    maxOffset: "$540",
  },
  {
    income: "$37,001 – $39,999",
    rate: "18% (reduced)",
    onFirst: "Progressively less",
    maxOffset: "Reduces to $0",
  },
  {
    income: "$40,000+",
    rate: "0%",
    onFirst: "N/A",
    maxOffset: "Nil",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "What moves",
    spouseContribution: "Your after-tax money contributed to your spouse's fund",
    superSplitting: "Existing super from your fund transferred to your spouse's account",
  },
  {
    feature: "Tax offset",
    spouseContribution: "Yes — up to $540 (if spouse earns below $37,000)",
    superSplitting: "No direct tax offset",
  },
  {
    feature: "Cash required",
    spouseContribution: "Yes — from your after-tax income",
    superSplitting: "No — uses your existing super balance",
  },
  {
    feature: "Annual limit",
    spouseContribution: "Counts toward receiving spouse's non-concessional cap ($120,000)",
    superSplitting: "85% of your concessional contributions from prior year",
  },
  {
    feature: "When useful",
    spouseContribution: "You have spare cash and your spouse earns below $37,000",
    superSplitting: "You have a large balance disparity, estate planning focus",
  },
];

const WORKED_EXAMPLES = [
  {
    name: "Example 1 — Full offset",
    scenario: "Partner Alex earns $25,000 part-time. You contribute $3,000 to Alex's super fund.",
    calculation: "Offset = 18% × $3,000 = $540",
    result: "$540 tax offset on your tax return.",
    highlight: "green",
  },
  {
    name: "Example 2 — Partial offset",
    scenario: "Partner Sam earns $38,500. You contribute $3,000 to Sam's super fund.",
    calculation:
      "Offset = 18% × ($3,000 − ($38,500 − $37,000)) = 18% × ($3,000 − $1,500) = 18% × $1,500 = $270",
    result: "$270 tax offset — partially phased out because Sam's income is above $37,000.",
    highlight: "amber",
  },
  {
    name: "Example 3 — No offset",
    scenario: "Partner Riley earns $42,000. You contribute $3,000 to Riley's super fund.",
    calculation: "Spouse income ($42,000) exceeds $40,000 threshold.",
    result: "No tax offset. The contribution still goes into Riley's super — it just does not attract an offset.",
    highlight: "slate",
  },
];

const FAQS = [
  {
    q: "How do I claim the spouse contribution tax offset on my tax return?",
    a: "You claim the spouse contribution tax offset in your personal income tax return — not your spouse's. At tax time, enter the total amount you contributed to your spouse's complying super fund in the relevant field (currently Item T3 in the ATO's myTax). The ATO calculates the offset based on your spouse's income, which you will also need to enter. Keep your super fund contribution receipts as evidence. The offset directly reduces your tax payable, not your taxable income.",
  },
  {
    q: "Is there a limit on how much I can contribute to my spouse's super?",
    a: "There is no specific dollar cap on spouse contributions — however, the amounts you contribute count toward your spouse's non-concessional contributions cap of $120,000 for 2025–26. If your spouse has a Total Super Balance (TSB) of $1.9 million or more at 30 June of the prior year, non-concessional contributions (including spouse contributions) are not permitted. The tax offset itself is capped at $540 and is based on contributions up to $3,000 — contributing more than $3,000 does not increase the offset, but does add to your spouse's super balance.",
  },
  {
    q: "Can I contribute to my spouse's super if they are not working?",
    a: "Yes. Your spouse does not need to be employed for you to make spouse contributions. A non-working spouse is typically well below the $37,000 income threshold, meaning you would qualify for the full $540 offset on a $3,000 contribution. The main eligibility conditions are that both of you must be Australian residents, your spouse must be under 75, and you must not be permanently separated. There is no work test requirement for the receiving spouse when accepting non-concessional contributions before age 75.",
  },
  {
    q: "What is the difference between spouse contributions and super splitting?",
    a: "Spouse contributions involve you adding new after-tax money from your own income into your spouse's super fund. They can attract a tax offset of up to $540 per year. Super splitting, on the other hand, moves a portion of your existing concessional contributions (up to 85%) from your fund into your spouse's account — no new money enters super. Super splitting does not attract a tax offset but is useful for equalising balances or estate planning purposes. Both strategies can be used together.",
  },
  {
    q: "Can my spouse receive the government co-contribution AND spouse contributions from me?",
    a: "Yes — these are separate government programs and can be used concurrently. The government co-contribution is triggered when your spouse makes their own personal (non-concessional) contribution from their own income, and they earn below $60,400. Spouse contributions you make on their behalf do not count toward co-contribution matching. So your spouse could contribute $1,000 of their own money (attracting up to $500 co-contribution from the government), and you could separately contribute $3,000 as a spouse contribution (giving you up to $540 tax offset) — all within the same financial year.",
  },
  {
    q: "Does my spouse's super fund need to accept spouse contributions?",
    a: "Most complying super funds accept spouse contributions, but you should confirm with the fund before making a contribution. Some defined benefit or older employer-sponsored funds may have restrictions. When making the contribution, clearly identify it as a spouse contribution (not a personal contribution) so the fund attributes it to your spouse's account correctly. Contributions into a self-managed super fund (SMSF) are also eligible, provided the SMSF is a complying fund and your spouse is a member.",
  },
];

const GUIDE_SECTIONS = [
  {
    heading: "What are spouse contributions?",
    body: "A spouse contribution is a non-concessional (after-tax) contribution you make to your spouse's super fund from your own money. The contribution goes into your spouse's super account — building their retirement savings — while you may be entitled to a tax offset on your own tax return.\n\nSpouse contributions are one of the simplest strategies available for couples with an income disparity. They are particularly useful when one partner works part-time, has taken parental leave, is studying, or is otherwise on a lower income.\n\nYou make the contribution directly to your spouse's fund (or SMSF) and then claim the offset in your own tax return. The process is straightforward and requires no special election or paperwork beyond the fund's standard contribution form.",
  },
  {
    heading: "Eligibility requirements",
    body: "To qualify for the spouse contribution tax offset, all of the following conditions must be met:\n\n• Both you and your spouse must be Australian residents at the time of the contribution.\n• Your spouse must be under 75 years of age at the time you make the contribution.\n• Your spouse's super fund must be a complying super fund (most retail, industry, and employer funds qualify; check with the ATO if unsure).\n• The contribution must be a non-concessional (after-tax) contribution — concessional (pre-tax) contributions do not qualify for the spouse offset.\n• You must not be living separately and apart on a permanent basis. A couple temporarily living apart (e.g., for work) still qualifies.\n• Your spouse's Total Super Balance (TSB) must be below $1.9 million at 30 June of the prior financial year — otherwise non-concessional contributions are not permitted at all.\n\nNote: 'Spouse' includes both married and de facto partners (opposite-sex and same-sex).",
  },
  {
    heading: "How the offset is calculated",
    body: "The offset formula is:\n\nOffset = 18% × (Contributions − max(0, Spouse Income − $37,000))\n\nWhere 'Spouse Income' means your spouse's assessable income plus reportable fringe benefits plus reportable employer super contributions — the same income figure used across most means-tested super concessions.\n\nKey points:\n• The offset is based on the first $3,000 of contributions — contributing more than $3,000 does not increase the offset above $540.\n• If the spouse's income is $37,000 or below, the offset is simply 18% × contributions (capped at 18% × $3,000 = $540).\n• As income rises from $37,000 to $40,000, the effective contribution base eligible for the offset reduces proportionally.\n• Above $40,000, the offset is nil — but the contribution itself can still be made (subject to the NCC cap).",
  },
  {
    heading: "Long-term impact — why this strategy matters",
    body: "The $540 annual tax offset is modest in isolation, but the compounding effect of regular spouse contributions over a career can be substantial.\n\nIllustrative scenario: You contribute $3,000 per year to your 35-year-old spouse's super for 20 years — a total of $60,000 in contributions. Assuming 7% p.a. net investment return, that $60,000 grows to approximately $117,000 by the time your spouse reaches 55. Over the same 20-year period, tax offsets of $540 per year (assuming income remains below $37,000) total $10,800 in direct tax savings.\n\nBeyond the numbers, equalising retirement balances between partners can be critically important. A lower-income spouse — often one who has taken time out of the workforce for caregiving — may otherwise reach retirement with a significantly smaller super balance than their partner. Regular spouse contributions directly address this imbalance.\n\nSpouse contributions also complement the government co-contribution: if your spouse earns below $60,400 and makes their own personal contributions, the government separately matches 50 cents in the dollar (up to $500). Both programs can be used in the same year.",
  },
  {
    heading: "Interaction with other contribution rules",
    body: "Spouse contributions are non-concessional contributions for the receiving spouse. This means they count toward your spouse's $120,000 non-concessional cap for the year. If your spouse's TSB is below $300,000, the three-year bring-forward rule may allow up to $360,000 in total non-concessional contributions.\n\nImportant interactions to understand:\n\nTSB restriction: If your spouse's TSB at 30 June of the prior year is $1.9 million or above, they cannot accept non-concessional contributions — including spouse contributions. Check your spouse's TSB in myGov before contributing.\n\nConcessional contributions: The spouse offset only applies to non-concessional contributions. If you make concessional contributions (e.g., salary sacrifice) to your own fund and then split them to your spouse under the super splitting rules, that is a separate process and does not attract the spouse contribution tax offset.\n\nNot the same as super splitting: Super splitting moves existing concessional contributions from your fund to your spouse's fund. Spouse contributions are new money going directly into your spouse's fund. Both can be done in the same financial year — they are independent strategies.",
  },
];

export default function SpouseContributionsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Super", url: `${SITE_URL}/super` },
    { name: "Spouse Contributions" },
  ]);

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/super" className="hover:text-slate-900">Super</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Spouse Contributions</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Spouse Super Contributions &middot; Updated 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Spouse Super Contributions &amp;{" "}
              <span className="text-green-600">Tax Offset — Up to $540 Back</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Contribute to your spouse&apos;s super from your after-tax income and claim a tax offset of up to $540
              per year. Here&apos;s how the offset works, who qualifies, and how to make it count.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Maximum Offset</p>
              <p className="text-xl font-black text-green-700">$540</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">18% of the first $3,000 contributed when spouse earns below $37,000.</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-200 p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Contribution for Full Offset</p>
              <p className="text-xl font-black text-blue-700">$3,000</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">You only need to contribute $3,000 to achieve the maximum $540 offset.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Full Offset Threshold</p>
              <p className="text-xl font-black text-amber-700">$37,000</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Spouse income at or below this level qualifies for the full offset.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Phase-Out Threshold</p>
              <p className="text-xl font-black text-slate-700">$40,000</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Offset reduces to nil once spouse income reaches $40,000.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Offset Rate Table ────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="At a glance"
            title="Spouse contribution tax offset rates"
            sub="The offset phases out progressively as your spouse's income rises from $37,000 to $40,000."
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table aria-label="Spouse contribution tax offset rates by income" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Spouse&apos;s Income</th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-green-300">Offset Rate</th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-blue-300">Offset Applies On First</th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-amber-300">Maximum Offset</th>
                </tr>
              </thead>
              <tbody>
                {OFFSET_ROWS.map((row, i) => (
                  <tr key={row.income} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs">{row.income}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-green-100 text-xs">{row.rate}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-blue-100 text-xs">{row.onFirst}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-amber-100 text-xs font-semibold">{row.maxOffset}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Offset formula: 18% &times; (Contributions &minus; max(0, Spouse Income &minus; $37,000)). Spouse income includes assessable income, reportable fringe benefits, and reportable employer super contributions.
          </p>
        </div>
      </section>

      {/* ── Worked Examples ──────────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-y border-slate-100">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Worked examples"
            title="Offset calculations in practice"
            sub="Three scenarios showing how the offset works at different spouse income levels."
          />
          <div className="grid sm:grid-cols-3 gap-5">
            {WORKED_EXAMPLES.map((ex) => {
              const borderClass =
                ex.highlight === "green"
                  ? "border-green-200"
                  : ex.highlight === "amber"
                    ? "border-amber-200"
                    : "border-slate-200";
              const labelClass =
                ex.highlight === "green"
                  ? "text-green-700 bg-green-50"
                  : ex.highlight === "amber"
                    ? "text-amber-700 bg-amber-50"
                    : "text-slate-600 bg-slate-100";

              return (
                <div key={ex.name} className={`bg-white rounded-2xl border ${borderClass} p-5`}>
                  <p className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-md inline-block mb-3 ${labelClass}`}>
                    {ex.name}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{ex.scenario}</p>
                  <p className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed text-slate-700 mb-3">
                    {ex.calculation}
                  </p>
                  <p className="text-xs font-semibold text-slate-800">{ex.result}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Guide Sections ───────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Full guide" title="Everything about spouse contributions" />
          <div className="space-y-10">
            {GUIDE_SECTIONS.map((section) => (
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

      {/* ── Long-term impact callout ─────────────────────────────────── */}
      <section className="py-10 bg-green-50 border-y border-green-100">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="Long-term impact" title="What $3,000/year could grow to" />
          <div className="bg-white rounded-2xl border border-green-200 p-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">
              Scenario: Contributing $3,000/year to a 35-year-old spouse&apos;s super for 20 years
            </p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Total contributions over 20 years</span>
                <span className="font-bold text-slate-900">$60,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Estimated value at retirement (7% p.a.)</span>
                <span className="font-bold text-green-700">~$117,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Tax offsets saved over 20 years (at $540/yr)</span>
                <span className="font-bold text-green-700">$10,800</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-base pt-1">
                <span className="text-slate-900">Effective retirement boost</span>
                <span className="text-green-700">$117,000 + $10,800 in tax saved</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Illustrative only. Assumes consistent 7% p.a. net return and spouse income remaining below $37,000. Actual returns will vary.
            </p>
          </div>
        </div>
      </section>

      {/* ── Spouse Contributions vs Super Splitting ──────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Strategy comparison"
            title="Spouse contributions vs super splitting"
            sub="Two different tools for equalising super balances — understanding both helps you choose the right approach."
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table aria-label="Spouse contributions vs super splitting comparison" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide w-40">Feature</th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-green-300">Spouse Contribution</th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-blue-300">Super Splitting</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs">{row.feature}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-green-100 text-xs leading-relaxed">{row.spouseContribution}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-blue-100 text-xs leading-relaxed">{row.superSplitting}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Both strategies can be used in the same financial year and serve complementary purposes.
          </p>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3">&#x2304;</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
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
            <h2 className="text-lg font-extrabold text-white mb-1">Build your spouse&apos;s super today</h2>
            <p className="text-slate-400 text-sm">Compare super funds to find the right home for spouse contributions, or speak with an adviser about maximising both partners&apos; retirement savings.</p>
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
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
