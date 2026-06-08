import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Super Co-Contribution Guide — Government Matching Explained (${CURRENT_YEAR})`,
  description:
    "Government super co-contribution: claim up to $500 free in your super. Income thresholds, eligibility, and worked examples. Updated 2025–26.",
  alternates: { canonical: `${SITE_URL}/super/co-contribution` },
  openGraph: {
    title: `Super Co-Contribution — Up to $500 Free Government Money in Your Super (${CURRENT_YEAR})`,
    description:
      "How the government co-contribution works, who is eligible, income thresholds, and step-by-step examples for low-to-middle income earners.",
    url: `${SITE_URL}/super/co-contribution`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Super Co-Contribution Guide")}&sub=${encodeURIComponent("$500 Government Match · Income Thresholds · How to Claim · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const INCOME_THRESHOLDS = [
  {
    range: "$0 – $45,400",
    maxContribution: "$500",
    calculation: "Maximum rate: 50 cents per $1 contributed",
    highlight: true,
  },
  {
    range: "$45,401 – $60,399",
    maxContribution: "$500 declining",
    calculation: "Reduces by 3.333 cents per $1 above $45,400",
    highlight: false,
  },
  {
    range: "$60,400",
    maxContribution: "$0",
    calculation: "Phase-out complete — no co-contribution",
    highlight: false,
  },
  {
    range: "Above $60,400",
    maxContribution: "$0",
    calculation: "No co-contribution available",
    highlight: false,
  },
];

const WORKED_EXAMPLES = [
  {
    name: "Emma",
    income: "$40,000",
    contribution: "$1,000",
    coContribution: "$500",
    calculation: "Below lower threshold — full 50 cents per $1 applies",
    color: "border-green-200 bg-green-50",
    badge: "bg-green-100 text-green-700",
    result: "Full $500",
  },
  {
    name: "Tom",
    income: "$52,000",
    contribution: "$1,000",
    coContribution: "$280",
    calculation: "$500 − [($52,000 − $45,400) × 0.03333] = $500 − $220 = $280",
    color: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    result: "Partial $280",
  },
  {
    name: "Sarah",
    income: "$70,000",
    contribution: "$1,000",
    coContribution: "$0",
    calculation: "Income above $60,400 threshold — no co-contribution",
    color: "border-slate-200 bg-slate-50",
    badge: "bg-slate-100 text-slate-600",
    result: "Not eligible",
  },
];

const ELIGIBILITY_REQUIREMENTS = [
  {
    title: "Income below $60,400",
    detail:
      "Your total income for the 2024-25 financial year must be below $60,400 to receive any co-contribution. Maximum co-contribution of $500 applies if income is at or below $45,400.",
  },
  {
    title: "Age under 71",
    detail:
      "You must be under age 71 at the end of the financial year in which you make the contribution.",
  },
  {
    title: "At least 10% income from employment or business",
    detail:
      "At least 10% of your total income must come from eligible employment, running a business, or both. Investment-only income (such as dividends, rent, or capital gains) does not count toward this threshold.",
  },
  {
    title: "Lodge a tax return",
    detail:
      "You must lodge an income tax return for the financial year. The ATO uses your tax return to calculate and verify your eligibility automatically.",
  },
  {
    title: "Do NOT claim a tax deduction for the contribution",
    detail:
      "The contribution must be a genuine personal after-tax (non-concessional) contribution. If you lodge a Notice of Intent to Claim a Tax Deduction for the contribution, it becomes a concessional contribution and you lose eligibility for the co-contribution.",
  },
  {
    title: "Complying super fund with TSB below $1.9 million",
    detail:
      "Your super must be held in a complying super fund (most industry and retail funds qualify). Your Total Super Balance (TSB) must be below $1.9 million at 30 June of the prior year.",
  },
];

const FAQS = [
  {
    q: "Does the co-contribution count toward my non-concessional cap?",
    a: "Only your personal contribution counts toward the non-concessional contributions cap ($120,000 for 2024-25). The government co-contribution itself is not counted toward any contribution cap. So if you contribute $1,000 of your own money, that $1,000 uses your non-concessional cap, and the government's $500 co-contribution sits on top as a bonus outside the cap.",
  },
  {
    q: "When does the ATO deposit the co-contribution?",
    a: "The ATO automatically calculates and deposits the co-contribution into your nominated super fund after you lodge your income tax return, usually within 60 days of lodgement. You do not need to apply separately or notify the ATO — it is entirely automatic once you have lodged your return and made an eligible personal contribution.",
  },
  {
    q: "Can I still get a co-contribution if I salary sacrifice?",
    a: "Yes — salary sacrifice and the co-contribution are separate. Salary sacrifice creates concessional contributions (pre-tax), while the co-contribution applies to personal after-tax (non-concessional) contributions. You can salary sacrifice AND make a separate personal after-tax contribution to the same fund in the same year, and both can apply simultaneously. Just make sure you do not lodge a Notice of Intent to Claim a Tax Deduction for the personal contribution, or it will become concessional and disqualify you from the co-contribution for that amount.",
  },
  {
    q: "Can I get the co-contribution if I am self-employed?",
    a: "Yes, provided at least 10% of your total income comes from running a business (not purely from investments). Self-employed people who make personal contributions to super are eligible as long as they meet the income thresholds, age requirement, and do not claim a tax deduction for those contributions. If you do claim a deduction, the contribution becomes concessional and co-contribution eligibility is lost for that amount.",
  },
  {
    q: "What is the difference between the co-contribution and LISTO?",
    a: "The Low Income Super Tax Offset (LISTO) and the co-contribution are separate, complementary schemes. LISTO automatically refunds the 15% tax your fund pays on concessional contributions for people earning below $37,000, up to a maximum of $500 per year. It applies to concessional (pre-tax) contributions such as employer SG and salary sacrifice. The co-contribution applies to non-concessional (after-tax) contributions. You can receive both LISTO and the co-contribution in the same financial year if you are eligible for each.",
  },
  {
    q: "Can my spouse get a co-contribution on my behalf?",
    a: "No. The co-contribution is based on your own personal contribution and your own income. Your spouse cannot make a contribution on your behalf and have it qualify for your co-contribution. However, your spouse could make a personal contribution to their own super fund and receive a co-contribution based on their own income, if they independently meet the eligibility requirements. This is separate from the spouse contribution tax offset, which is a different government incentive.",
  },
];

export default function SuperCoContributionPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Super", url: absoluteUrl("/super") },
    { name: "Super Co-Contribution", url: absoluteUrl("/super/co-contribution") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/super" className="hover:text-white">Super</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Super Co-Contribution</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-green-600 text-white px-3 py-1 rounded-full">Up to $500 free</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Super Co-Contribution &mdash; Government Matching for Low&#8209;to&#8209;Middle Income Earners
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              The Australian government matches personal after-tax super contributions 50 cents for every $1, up to a maximum of $500 per year, for eligible low-to-middle income earners.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "$500", l: "Maximum co-contribution", sub: "50 cents per $1 you contribute (up to $1,000)" },
                { v: "$45,400", l: "Lower income threshold", sub: "Full $500 available below this income (2024-25)" },
                { v: "$60,400", l: "Upper income threshold", sub: "Co-contribution phases out to $0 at this level" },
                { v: "Automatic", l: "How to claim", sub: "ATO deposits to your super fund after you lodge your tax return" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What is the co-contribution */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is the super co-contribution?</h2>
            <div className="rounded-xl border border-green-300 bg-green-50 p-5 mb-6">
              <p className="text-sm font-bold text-green-800 mb-1">A genuine government match on your personal super contributions</p>
              <p className="text-sm text-green-700 leading-relaxed">
                The <strong>government super co-contribution</strong> is a scheme where the Australian government contributes
                money directly into your super fund when you make personal after-tax contributions and your income falls
                below the threshold. For every $1 of eligible personal contribution, the government adds $0.50 &mdash;
                up to a maximum government co-contribution of <strong>$500</strong> (when you contribute $1,000 or more
                and earn below $45,400).
              </p>
            </div>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700">
              <p>
                The scheme targets <strong>personal non-concessional contributions</strong> &mdash; money you put into
                super from your after-tax income that you do not claim as a tax deduction. This is distinct from your
                employer&apos;s Superannuation Guarantee contributions and salary sacrifice, which are concessional
                (pre-tax) contributions.
              </p>
              <p>
                The co-contribution goes directly into your super fund alongside your personal contribution. You do not
                receive any money in your hands &mdash; it is deposited into super where it grows tax-advantaged until
                retirement. No application is required: the ATO automatically calculates your entitlement based on your
                lodged tax return and the contribution records reported by your super fund.
              </p>
              <p>
                The co-contribution is one of the most straightforward government incentives in the super system.
                Unlike salary sacrifice or personal deductible contributions, there is no notice to lodge, no form to
                submit, and no additional step beyond making the contribution and lodging your annual tax return.
              </p>
            </div>
          </div>
        </section>

        {/* Eligibility */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Eligibility requirements</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {ELIGIBILITY_REQUIREMENTS.map((req) => (
                <div key={req.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-green-600 font-extrabold flex-shrink-0 mt-0.5">&#10003;</span>
                    <h3 className="font-extrabold text-slate-900 text-sm">{req.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-5">{req.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Income thresholds table */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Income thresholds (2024-25)</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              The co-contribution is calculated based on your total income for the financial year.
              The formula for partial co-contributions is: <strong>Maximum = $500 &minus; [(income &minus; $45,400) &times; 0.03333]</strong>.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Government co-contribution income thresholds 2024-25">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Income Range</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-green-300">Maximum Co-Contribution</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-slate-300">How It&apos;s Calculated</th>
                  </tr>
                </thead>
                <tbody>
                  {INCOME_THRESHOLDS.map((row, i) => (
                    <tr key={row.range} className={row.highlight ? "bg-green-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs">{row.range}</td>
                      <td className={`px-5 py-3.5 text-xs font-bold border-l border-green-100 ${row.highlight ? "text-green-700" : "text-slate-600"}`}>
                        {row.maxContribution}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 border-l border-slate-100 text-xs leading-relaxed">{row.calculation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">Thresholds shown are for the 2024-25 financial year. The lower threshold ($45,400) and upper threshold ($60,400) are indexed annually and may change in future years.</p>
          </div>
        </section>

        {/* Worked examples */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Worked examples</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {WORKED_EXAMPLES.map((ex) => (
                <div key={ex.name} className={`rounded-xl border p-5 ${ex.color}`}>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full mb-3 inline-block ${ex.badge}`}>{ex.result}</span>
                  <p className="text-base font-extrabold text-slate-900 mb-1">{ex.name} earns {ex.income}</p>
                  <p className="text-sm text-slate-700 mb-3">Contributes {ex.contribution} after-tax to super</p>
                  <div className="border-t border-current border-opacity-20 pt-3">
                    <p className="text-xs font-bold text-slate-700 mb-1">Co-contribution received</p>
                    <p className="text-xl font-extrabold text-slate-900 mb-2">{ex.coContribution}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{ex.calculation}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">Examples are illustrative only and based on 2024-25 thresholds. Actual co-contribution depends on your total income across all sources.</p>
          </div>
        </section>

        {/* How to receive the co-contribution */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to receive the co-contribution</h2>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Make a personal after-tax contribution to your super fund",
                  body: "Transfer money from your bank account to your super fund as a personal contribution. Do this before 30 June of the financial year. Most super funds accept contributions via BPAY or EFT. Check your fund's contribution reference number to ensure it is coded correctly as a personal (non-concessional) contribution.",
                },
                {
                  step: "2",
                  title: "Do NOT lodge a Notice of Intent to Claim a Tax Deduction",
                  body: "If you want the co-contribution, do not lodge a Notice of Intent to Claim a Tax Deduction with your fund for this contribution. Claiming a deduction turns it into a concessional contribution, which disqualifies it from the co-contribution scheme. Keep it as a personal after-tax contribution.",
                },
                {
                  step: "3",
                  title: "Lodge your income tax return",
                  body: "Lodge your tax return for the financial year as normal. The ATO uses the income information in your return combined with the contribution data reported by your super fund to assess your co-contribution entitlement. You do not need to fill in a special co-contribution section — it is assessed automatically.",
                },
                {
                  step: "4",
                  title: "The ATO deposits the co-contribution into your super fund",
                  body: "The ATO automatically calculates and deposits the co-contribution directly into your nominated super fund, usually within 60 days of you lodging your tax return. You will typically see it appear in your super fund account balance without any further action required on your part.",
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center">{s.step}</div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LISTO comparison */}
        <section className="py-10 bg-amber-50 border-y border-amber-100">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Low Income Super Tax Offset (LISTO) &mdash; a complementary scheme
            </h2>
            <p className="text-sm text-slate-700 mb-6 leading-relaxed">
              The co-contribution is often confused with LISTO, but they are separate schemes targeting different types of contribution.
              You can receive <strong>both in the same year</strong> if you are eligible for each.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-amber-200">
              <table className="w-full text-sm" aria-label="Co-contribution vs LISTO comparison">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide w-40">Feature</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-green-300">Co-Contribution</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-amber-300">LISTO</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "Applies to",
                      co: "Non-concessional (after-tax) contributions",
                      listo: "Concessional contributions (employer SG, salary sacrifice, personal deductible)",
                    },
                    {
                      label: "Maximum benefit",
                      co: "$500 per year",
                      listo: "$500 per year",
                    },
                    {
                      label: "Income threshold",
                      co: "Phases out from $45,400 to $60,400",
                      listo: "For those earning $37,000 or below",
                    },
                    {
                      label: "How it works",
                      co: "Government adds 50 cents per $1 you contribute, into your super fund",
                      listo: "ATO refunds the 15% tax your fund pays on concessional contributions",
                    },
                    {
                      label: "Action required",
                      co: "Make a personal after-tax contribution and lodge tax return",
                      listo: "Automatic — no action required from you",
                    },
                  ].map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-amber-50/50"}>
                      <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs">{row.label}</td>
                      <td className="px-5 py-3.5 text-slate-600 border-l border-green-100 text-xs leading-relaxed">{row.co}</td>
                      <td className="px-5 py-3.5 text-slate-600 border-l border-amber-100 text-xs leading-relaxed">{row.listo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Who benefits most */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Who benefits most</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "Part-time and casual workers",
                  badge: "High benefit",
                  body: "Workers on reduced hours with income below the upper threshold can maximise the co-contribution by making a $1,000 personal contribution each year. A $500 return on a $1,000 contribution represents a guaranteed 50% return before any investment growth.",
                },
                {
                  title: "Spouses in low-income periods",
                  badge: "High benefit",
                  body: "A spouse who has stepped back from full-time work — whether for parenting, study, or carer responsibilities — may have income below the threshold. Making a $1,000 personal contribution to super in that year captures the full $500 government co-contribution while their income is low.",
                },
                {
                  title: "Students with some employment income",
                  badge: "Worth considering",
                  body: "Students earning employment income from part-time or casual work may qualify if at least 10% of their income is from employment and total income is below the threshold. Building super early via the co-contribution can have significant long-term compounding benefits.",
                },
                {
                  title: "Workers approaching retirement on reduced hours",
                  badge: "Worth considering",
                  body: "Employees winding down to part-time work before retirement who still have some employment income may find their income has dropped below the co-contribution thresholds. This window offers a final opportunity to capture government co-contributions before retirement.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contribution caps note */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Contribution caps &mdash; what counts and what does not
            </h2>
            <div className="rounded-xl border border-blue-300 bg-blue-50 p-5 mb-6">
              <p className="text-sm font-bold text-blue-800 mb-1">The government co-contribution does not count toward your non-concessional cap</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Only your <strong>personal contribution</strong> counts toward the non-concessional contributions cap
                ($120,000 for 2024-25). The government&apos;s co-contribution is deposited on top and does not count
                toward any cap. So contributing $1,000 of your own money uses $1,000 of your non-concessional cap
                and you receive up to $500 in government co-contribution on top of that &mdash; entirely cap-free.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: "Your personal contribution",
                  detail: "Counts toward the $120,000 non-concessional cap. A $1,000 contribution uses $1,000 of your annual cap.",
                  color: "border-slate-200",
                  badge: "bg-slate-100 text-slate-600",
                  badgeText: "Counts toward cap",
                },
                {
                  title: "Government co-contribution",
                  detail: "Does NOT count toward any contribution cap. The ATO deposits it directly into your fund as a government payment.",
                  color: "border-green-200",
                  badge: "bg-green-100 text-green-700",
                  badgeText: "Cap-free bonus",
                },
                {
                  title: "Total super balance limit",
                  detail: "Your TSB must be below $1.9 million at 30 June of the prior year to receive the co-contribution (same limit as the non-concessional contributions eligibility threshold).",
                  color: "border-amber-200",
                  badge: "bg-amber-100 text-amber-700",
                  badgeText: "TSB limit applies",
                },
              ].map((item) => (
                <div key={item.title} className={`rounded-xl border ${item.color} bg-white p-5`}>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full mb-3 inline-block ${item.badge}`}>{item.badgeText}</span>
                  <h3 className="font-extrabold text-slate-900 mb-2 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white mb-1">
                Make your co-contribution work harder
              </h2>
              <p className="text-slate-400 text-sm">
                Low fees compound your government bonus faster. Compare Australia&apos;s top super funds.
              </p>
            </div>
            <div className="flex gap-3 shrink-0 flex-wrap">
              <Link
                href="/compare/super"
                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
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

        {/* Related links + compliance */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/super" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Super hub &rarr;</Link>
              <Link href="/super/contributions" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Contributions guide &rarr;</Link>
              <Link href="/super/spouse-contributions" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Spouse contributions &rarr;</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
