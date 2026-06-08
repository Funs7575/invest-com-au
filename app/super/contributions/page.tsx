import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Super Contributions Guide — Concessional, Non-Concessional & Catch-Up (${CURRENT_YEAR})`,
  description:
    "Super contributions: $30k concessional, $120k non-concessional, carry-forward rules, salary sacrifice, and government co-contribution. Updated 2025–26.",
  openGraph: {
    title: `Super Contributions Guide — Concessional, Non-Concessional & Catch-Up (${CURRENT_YEAR})`,
    description:
      "Everything about Australian super contributions: the $30k concessional cap, $120k non-concessional cap, salary sacrifice tax benefits, catch-up contributions, spouse offset, and government co-contribution.",
    url: `${SITE_URL}/super/contributions`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Super Contributions Guide " + String(CURRENT_YEAR))}&sub=${encodeURIComponent("Concessional · Non-Concessional · Catch-Up · Salary Sacrifice")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/super/contributions` },
};

// ─── Static data ─────────────────────────────────────────────────────────────

const COMPARISON_ROWS = [
  {
    feature: "Who makes it?",
    concessional: "Employer (SG), salary sacrifice, or personal deductible",
    nonConcessional: "You — from after-tax income; no deduction claimed",
  },
  {
    feature: "Annual cap (2024-25)",
    concessional: "$30,000",
    nonConcessional: "$120,000 (or up to $360,000 using the 3-year bring-forward rule)",
  },
  {
    feature: "Tax on entry to super",
    concessional: "15% contributions tax (30% via Division 293 if income > $250k)",
    nonConcessional: "0% — already taxed; earnings inside super taxed at 15%",
  },
  {
    feature: "Tax deduction available?",
    concessional: "Yes — salary sacrifice and personal deductible contributions reduce taxable income",
    nonConcessional: "No — contributions come from after-tax dollars; no deduction",
  },
  {
    feature: "Who benefits most?",
    concessional: "Higher earners — top marginal rate 47% vs 15% inside super",
    nonConcessional: "People with excess savings, an inheritance, or proceeds from selling an asset",
  },
  {
    feature: "Excess cap penalty",
    concessional: "Included in assessable income at marginal rate + excess concessional contributions charge",
    nonConcessional: "Taxed at 47% on excess amount (or elect to withdraw it)",
  },
  {
    feature: "Carry-forward / bring-forward?",
    concessional: "Carry-forward — unused cap last 5 years, if TSB < $500k",
    nonConcessional: "3-year bring-forward rule; no carry-forward",
  },
  {
    feature: "TSB eligibility limit",
    concessional: "No limit to make contributions; carry-forward requires TSB < $500k",
    nonConcessional: "Must be under $1.9M to make any NCC",
  },
];

const CONTRIBUTIONS_TYPES = [
  {
    type: "Employer SG",
    rate: "11.5% (2024-25)",
    taxTreatment: "Concessional — 15% tax in fund",
    notes: "Mandatory; calculated on ordinary time earnings. Rising to 12% from 1 July 2025.", // dated-ok — legislated SG rate-rise commencement date, fixed by statute
  },
  {
    type: "Salary sacrifice",
    rate: "Any amount (up to cap)",
    taxTreatment: "Concessional — pre-tax; reduces PAYG withholding",
    notes: "Agreed with employer before salary is earned; FBT-exempt for super contributions.",
  },
  {
    type: "Personal deductible",
    rate: "Any amount (up to cap)",
    taxTreatment: "Concessional — deduction claimed in tax return",
    notes: "s290-180 notice must be lodged with fund before lodging tax return.",
  },
  {
    type: "Personal non-deductible",
    rate: "Up to $120,000/yr (NCC cap)",
    taxTreatment: "Non-concessional — 0% on entry; 15% on earnings",
    notes: "No tax deduction. Bring-forward rule may allow up to $360,000 in one year.",
  },
  {
    type: "Spouse contributions",
    rate: "Up to $3,000 for max offset",
    taxTreatment: "Non-concessional in spouse's fund; contributor gets up to $540 tax offset",
    notes: "Offset available when spouse earns ≤ $37,000; phases out at $40,000.",
  },
  {
    type: "Government co-contribution",
    rate: "$0.50 per $1 NCC (max $500)",
    taxTreatment: "Non-concessional; paid automatically by ATO",
    notes: "Income-tested: full match for income ≤ $45,400; phases out at $58,445.",
  },
];

const LIFE_STAGES = [
  {
    stage: "20s–30s",
    label: "Start early — let compounding do the work",
    strategies: [
      "Even small extra contributions now have decades to compound inside super's 15% earnings tax environment.",
      "If your employer offers salary sacrifice, start with a small amount ($50–$100/fortnight) and increase as your income grows.",
      "Check you're on a growth or high-growth investment option — at this age, short-term volatility is acceptable for higher long-term returns.",
      "Consolidate any existing super accounts to eliminate duplicate fees.",
    ],
  },
  {
    stage: "40s–50s",
    label: "Ramp up — prime earning years and catch-up opportunities",
    strategies: [
      "Use carry-forward contributions if you've had years with low concessional contributions (career breaks, part-time work, business losses).",
      "Maximise salary sacrifice to the $30,000 concessional cap — the tax saving is largest when you're at your peak marginal rate.",
      "Review your investment option — still likely growth-oriented, but consider adding some defensive exposure within the next 10 years.",
      "If your TSB is approaching $500k, prioritise using carry-forward contributions before you lose eligibility.",
    ],
  },
  {
    stage: "55+ (Pre-retirement)",
    label: "Maximise contributions and plan the transition",
    strategies: [
      "Consider a Transition to Retirement (TTR) strategy — draw a TTR pension and redirect salary back into super as salary sacrifice, potentially boosting your balance without reducing take-home pay.",
      "Maximise both the concessional cap ($30,000) and non-concessional cap ($120,000) where cashflow allows.",
      "Monitor your TSB against the Transfer Balance Cap ($1.9M) — contributions may become restricted as your balance grows.",
      "Review Division 296 exposure if your TSB is approaching $3M — an additional 15% tax on earnings applies above that threshold from FY 2025-26.",
    ],
  },
];

const COMMON_MISTAKES = [
  {
    mistake: "Forgetting employer SG counts towards the concessional cap",
    detail:
      "Many people add salary sacrifice on top of employer SG and accidentally exceed the $30,000 cap. At 11.5% SG on a $200,000 salary, the employer alone contributes $23,000 — leaving only $7,000 of concessional cap before excess penalties apply.",
  },
  {
    mistake: "Missing the s290-180 notice for personal deductible contributions",
    detail:
      "This notice must be lodged with your super fund before you lodge your tax return (or 30 June of the following financial year, whichever is earlier). Forgetting it means you lose the tax deduction entirely — the contribution is treated as non-concessional.",
  },
  {
    mistake: "Making NCCs when TSB exceeds $1.9M",
    detail:
      "If your Total Super Balance was $1.9M or more on the prior 30 June, you cannot make any non-concessional contributions. Doing so results in a 47% tax charge on the excess. Check your TSB in myGov before making NCCs.",
  },
  {
    mistake: "Excess concessional contributions — the compounding penalty",
    detail:
      "Excess concessional contributions are included in your assessable income at your marginal rate, with only a 15% offset (for the tax already paid by the fund). An excess concessional contributions charge (interest) is also applied from the start of the income year — meaning the longer it takes to resolve, the more you pay.",
  },
  {
    mistake: "Assuming the bring-forward rule resets every year",
    detail:
      "Once triggered, the bring-forward period runs for 3 years and the cap is fixed at the amount determined in year 1. You cannot make additional NCCs mid-period beyond your allocated bring-forward amount. Wait for the 3-year period to expire before triggering another.",
  },
];

const FAQS = [
  {
    q: "What is the superannuation contribution limit for 2024-25?",
    a: "For the 2024-25 financial year, the concessional contributions cap is $30,000 per year. This includes employer Super Guarantee contributions (at 11.5%), salary sacrifice, and any personal contributions you claim as a tax deduction. The non-concessional contributions cap is $120,000 per year (or up to $360,000 using the 3-year bring-forward rule if your Total Super Balance was below $1.9M on the prior 30 June).",
  },
  {
    q: "How do I make a personal tax-deductible super contribution?",
    a: "Transfer money from your bank account directly into your super fund — this is a personal contribution. Then, before you lodge your tax return (or by 30 June of the following year, whichever comes first), lodge a 'Notice of Intent to Claim a Tax Deduction' (form SS-308) with your fund. Your fund must acknowledge the notice in writing. You then claim the deduction in your tax return. The contribution is treated as concessional — your fund pays 15% contributions tax — and counts toward the $30,000 concessional cap.",
  },
  {
    q: "What is the bring-forward rule for non-concessional contributions?",
    a: "The bring-forward rule lets you contribute up to 3 years' worth of non-concessional contributions in a single year — up to $360,000 — if your Total Super Balance (TSB) was below $1.9M on the prior 30 June and you are under 75. The exact amount you can bring forward depends on your TSB: under $1.68M allows the full $360,000 (3-year); $1.68M–$1.79M allows $240,000 (2-year); $1.79M–$1.9M allows $120,000 (1-year, no bring-forward); $1.9M or above — no NCCs at all. Once triggered, the 3-year period is locked in.",
  },
  {
    q: "Can I claim a tax deduction if I salary sacrifice into super?",
    a: "No — you do not separately claim a tax deduction for salary sacrifice contributions. The tax benefit of salary sacrifice is automatic: the sacrificed amount is diverted before income tax is calculated, so your PAYG withholding is reduced immediately. You do not need to lodge any notice with your super fund for salary sacrifice — the deduction is built into your reduced taxable income shown on your payment summary. Only personal contributions (paid from your own bank account) require the s290-180 Notice of Intent to be lodged.",
  },
  {
    q: "What happens if I exceed my concessional contributions cap?",
    a: "Excess concessional contributions are automatically included in your assessable income for that financial year and taxed at your marginal rate plus the Medicare levy. You receive a 15% tax offset to account for the contributions tax already paid by your fund. In addition, an excess concessional contributions charge (a form of interest) accrues from the start of the income year. The ATO will issue you an excess concessional contributions determination. You can elect to withdraw up to 85% of the excess from your super fund to help fund the tax bill, or you can leave the excess in the fund — but the tax is still payable. Any excess that remains in the fund does not count against your non-concessional cap.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SuperContributionsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Super", url: `${SITE_URL}/super` },
    { name: "Super Contributions" },
  ]);

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <ArticleReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav
            aria-label="Breadcrumb"
            className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap"
          >
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/super" className="hover:text-slate-900">Super</Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-900 font-medium">Super Contributions</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" aria-hidden="true" />
              {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Super Contributions Guide —{" "}
              <span className="text-amber-600">
                Concessional, Non-Concessional &amp; Catch-Up
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
              Super contributions are taxed at just 15% inside your fund — well below most
              Australians&apos; marginal income tax rate. This guide covers every contribution type,
              the 2024-25 caps, salary sacrifice, carry-forward rules, government co-contribution,
              and common mistakes that cost people thousands in unnecessary tax.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Super is a concessionally taxed environment: earnings inside an accumulation account
              are taxed at 15% (not your marginal rate), and capital gains held more than 12 months
              are taxed at just 10%. The more you contribute — within the caps — the more of your
              wealth grows in this low-tax environment.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Figures ──────────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-100">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">
                Concessional Cap
              </p>
              <p className="text-2xl font-black text-green-700">$30,000</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Per year (2024-25). Includes employer SG (11.5%), salary sacrifice, and personal
                deductible contributions.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-200 p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">
                Non-Concessional Cap
              </p>
              <p className="text-2xl font-black text-blue-700">$120,000</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Per year (2024-25). Bring-forward rule allows up to $360,000 in one year if
                TSB &lt; $1.9M.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                Employer SG Rate
              </p>
              <p className="text-2xl font-black text-amber-700">11.5%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {/* // dated-ok — legislated SG rate-rise dates from ATO */}
                Superannuation Guarantee rate for 2024-25. Rising to 12% from 1 July 2025.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Tax Rate in Super
              </p>
              <p className="text-2xl font-black text-slate-700">15%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Contributions tax on concessional contributions. 30% (Division 293) if income
                exceeds $250,000.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Concessional vs Non-Concessional Table ───────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="At a glance"
            title="Concessional vs non-concessional contributions"
            sub="The two main contribution types — understand which applies to you and when each makes sense."
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm" aria-label="Concessional vs non-concessional contributions comparison">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide w-44">
                    Feature
                  </th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-green-300">
                    Concessional (pre-tax)
                  </th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-blue-300">
                    Non-Concessional (after-tax)
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs">
                      {row.feature}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-green-100 text-xs leading-relaxed">
                      {row.concessional}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-blue-100 text-xs leading-relaxed">
                      {row.nonConcessional}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Contribution Types Table ─────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50 border-y border-slate-100">
        <div className="container-custom">
          <SectionHeading
            eyebrow="All contribution types"
            title="Every way to contribute to super — 2024-25"
            sub="From mandatory employer SG to government co-contributions — which types apply to you."
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm" aria-label="All super contribution types 2024–25">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="px-5 py-3.5 text-left font-bold text-xs uppercase tracking-wide">
                    Type
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left font-bold text-xs uppercase tracking-wide">
                    Amount / Rate
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left font-bold text-xs uppercase tracking-wide">
                    Tax treatment
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left font-bold text-xs uppercase tracking-wide">
                    Key notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONTRIBUTIONS_TYPES.map((ct, i) => (
                  <tr key={ct.type} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 text-xs whitespace-nowrap">
                      {ct.type}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{ct.rate}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs leading-relaxed">
                      {ct.taxTreatment}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs leading-relaxed">
                      {ct.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Salary Sacrifice Deep-Dive ───────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Most popular strategy"
            title="Salary sacrifice — how it works and how to set it up"
          />
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Salary sacrifice means asking your employer to redirect part of your pre-tax salary
              directly into your super fund before income tax is calculated. The contribution is
              treated as concessional — your fund pays 15% contributions tax — and your PAYG
              withholding drops immediately because your taxable income is lower.
            </p>
            <p>
              <strong className="text-slate-800">How to set it up:</strong> Contact your payroll
              department or HR team and ask to enter a salary sacrifice arrangement. Most employers
              require a written request specifying the dollar amount or percentage you wish to
              redirect. The arrangement must be agreed before the salary is earned (it cannot be
              applied retrospectively). Once set up, contributions flow automatically each pay cycle.
            </p>
            <p>
              <strong className="text-slate-800">FBT treatment:</strong> Super salary sacrifice
              contributions are exempt from Fringe Benefits Tax (FBT) — unlike some other benefits
              (cars, laptops) which attract FBT. This means your employer has no additional tax cost
              for providing the arrangement, making them more willing to accommodate it.
            </p>
            <p>
              <strong className="text-slate-800">Coordination with employer SG:</strong> Your
              employer SG (11.5% in 2024-25) and your salary sacrifice both count toward the same
              $30,000 concessional cap. Before setting up salary sacrifice, calculate how much of
              the cap your employer SG already uses. On a $200,000 salary, 11.5% SG = $23,000 —
              leaving only $7,000 of concessional cap for salary sacrifice before the excess
              penalty applies.
            </p>
            <p>
              <strong className="text-slate-800">Division 293 tax:</strong> If your income
              (including concessional contributions) exceeds $250,000, an additional 15% tax
              (Division 293) is applied to super contributions — bringing the effective rate to
              30% rather than 15%. Even at 30%, salary sacrifice is typically still more
              tax-efficient than taking income at the 47% top marginal rate.
            </p>
          </div>

          {/* Salary sacrifice example */}
          <div className="mt-8 bg-amber-50 rounded-2xl border border-amber-200 p-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">
              Example: $100,000 salary, $10,000 salary sacrifice
            </p>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm border-b border-amber-100 pb-2">
                <span className="text-slate-600">Gross salary</span>
                <span className="font-bold text-slate-900">$100,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-amber-100 pb-2">
                <span className="text-slate-600">Salary sacrificed to super</span>
                <span className="font-bold text-amber-700">−$10,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-amber-100 pb-2">
                <span className="text-slate-600">Taxable income</span>
                <span className="font-bold text-slate-900">$90,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-amber-100 pb-2">
                <span className="text-slate-600">Income tax saved (32.5% marginal + 2% Medicare)</span>
                <span className="font-bold text-green-700">+$3,450 saved</span>
              </div>
              <div className="flex justify-between text-sm border-b border-amber-100 pb-2">
                <span className="text-slate-600">Contributions tax paid by fund (15%)</span>
                <span className="font-bold text-red-600">−$1,500</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1">
                <span className="text-slate-900">Net tax advantage per $10,000 sacrificed</span>
                <span className="text-green-700">$1,950</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Illustrative only. Assumes 32.5% marginal rate + 2% Medicare levy. Employer SG of
              $11,500 (11.5% × $100,000) counts separately toward the concessional cap.
            </p>
          </div>
        </div>
      </section>

      {/* ── Personal Deductible Contributions ───────────────────────────── */}
      <section className="py-12 md:py-16 bg-green-50 border-y border-green-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="For self-employed and employees"
            title="Personal deductible contributions and the s290-180 notice"
          />
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Since 1 July 2017, the &quot;10% test&quot; was removed — meaning salaried employees can now{/* // dated-ok — fixed legislative effective date, never changes */}
              make personal after-tax contributions and claim a tax deduction for them, achieving
              the same outcome as salary sacrifice even if their employer doesn&apos;t offer it.
            </p>
            <p>
              <strong className="text-slate-800">How it works:</strong> Transfer money from your
              bank account into your super fund (this is initially treated as a non-concessional
              contribution). Then, before lodging your tax return or 30 June of the following
              financial year — whichever is earlier — lodge a{" "}
              <strong className="text-slate-800">Notice of Intent to Claim a Tax Deduction</strong>{" "}
              (form SS-308) with your fund. Once your fund acknowledges the notice in writing,
              you claim the full contribution amount as a deduction in your tax return. Your fund
              then pays 15% contributions tax on that amount, and it counts as a concessional
              contribution toward the $30,000 cap.
            </p>
            <div className="bg-white rounded-xl border border-green-200 p-4">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2">
                Critical: the notice locks in the deduction
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                If you lodge your tax return before lodging the notice, you permanently lose the
                deduction — the contribution stays non-concessional. The notice cannot be lodged
                retrospectively after your return is submitted. Set a calendar reminder before
                each 30 June and before lodging your tax return.
              </p>
            </div>
            <p>
              <strong className="text-slate-800">Effective tax saving:</strong> A person on a
              32.5% marginal rate (income $45,001–$135,000) who makes a $10,000 personal
              deductible contribution pays $1,500 in contributions tax inside the fund but saves
              $3,450 in income tax — a net saving of $1,950. At the 47% top marginal rate, the
              saving is $3,200 per $10,000 contributed.
            </p>
            <p>
              <strong className="text-slate-800">Who benefits most:</strong> self-employed sole
              traders and contractors (no employer SG), employees whose employers don&apos;t offer
              salary sacrifice, people who receive a lump sum (bonus, contract payment) and
              want to contribute near 30 June, and part-year workers topping up before year end.
            </p>
          </div>
        </div>
      </section>

      {/* ── Catch-Up Contributions ───────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="For those with unused cap"
            title="Carry-forward (catch-up) concessional contributions"
            sub="Unused concessional cap from the past five financial years can be carried forward if your Total Super Balance is below $500,000."
          />
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              If your Total Super Balance (TSB) was below $500,000 at 30 June of the previous
              financial year, you can access unused concessional cap from the prior five financial
              years (FY2019-20 onwards) on top of the current year&apos;s $30,000 cap. This can allow
              very large concessional contributions in a single year — up to the accumulated
              unused cap plus $30,000.
            </p>
            <p>
              <strong className="text-slate-800">How to check your unused cap:</strong> Log in
              to myGov, link the ATO, and navigate to the Super section. The ATO displays your
              available carry-forward amounts by financial year. This figure is updated after the
              tax return processing cycle (typically September–October each year).
            </p>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                Carry-forward example
              </p>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>FY2019-20 concessional contributions</span>
                  <span className="font-semibold">$10,000 (cap was $25,000 — $15,000 unused)</span>
                </div>
                <div className="flex justify-between">
                  <span>FY2020-21 contributions</span>
                  <span className="font-semibold">$8,000 ($17,500 unused)</span>
                </div>
                <div className="flex justify-between">
                  <span>FY2021-22 contributions</span>
                  <span className="font-semibold">$12,000 ($15,500 unused)</span>
                </div>
                <div className="flex justify-between">
                  <span>FY2022-23 contributions</span>
                  <span className="font-semibold">$12,000 ($15,500 unused)</span>
                </div>
                <div className="flex justify-between">
                  <span>FY2023-24 contributions</span>
                  <span className="font-semibold">$15,000 ($12,500 unused)</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5 font-bold text-slate-800">
                  <span>Total carry-forward available in 2024-25</span>
                  <span>$76,000 (+ $30,000 current cap = $106,000 max)</span>
                </div>
              </div>
            </div>
            <p>
              <strong className="text-slate-800">Who benefits most:</strong> people who had
              career breaks, worked part-time, ran a business at a loss, or simply didn&apos;t
              maximise contributions in earlier years. A once-in-a-career opportunity to shift a
              large lump sum (inheritance, business sale, bonus) into the low-tax super
              environment in a single year.
            </p>
          </div>
        </div>
      </section>

      {/* ── Non-Concessional and Bring-Forward ──────────────────────────── */}
      <section className="py-12 md:py-16 bg-blue-50 border-y border-blue-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="After-tax wealth building"
            title="Non-concessional contributions and the 3-year bring-forward rule"
          />
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Non-concessional contributions (NCCs) are personal contributions from after-tax
              income that you do not claim a deduction for. They are not taxed again when they
              enter your fund (you&apos;ve already paid income tax), but investment earnings inside the
              fund are taxed at 15%.
            </p>
            <p>
              The annual NCC cap for 2024-25 is $120,000. If you have a TSB below $1.9M on the
              prior 30 June, you may be eligible to &quot;bring forward&quot; up to three years of NCCs —
              contributing as much as $360,000 in a single financial year.
            </p>

            <div className="bg-white rounded-xl border border-blue-200 p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-3">
                Bring-forward caps by TSB (2024-25)
              </p>
              <div className="space-y-2 text-xs">
                {[
                  { tsb: "TSB below $1.68M", amount: "$360,000", period: "3-year bring-forward" },
                  { tsb: "$1.68M – $1.79M", amount: "$240,000", period: "2-year bring-forward" },
                  { tsb: "$1.79M – $1.9M", amount: "$120,000", period: "No bring-forward (1-year only)" },
                  { tsb: "$1.9M or above", amount: "$0", period: "NCCs prohibited" },
                ].map((row) => (
                  <div
                    key={row.tsb}
                    className="flex justify-between items-center border-b border-blue-50 pb-1.5"
                  >
                    <span className="text-slate-600">{row.tsb}</span>
                    <span className="font-bold text-slate-800">{row.amount}</span>
                    <span className="text-slate-500 text-right">{row.period}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                TSB thresholds are indexed to the general transfer balance cap. The $1.9M figure
                applies for 2024-25.
              </p>
            </div>

            <p>
              <strong className="text-slate-800">When NCCs make sense:</strong> large windfall
              events (inheritance, property sale, compensation), downsizer contributions (separate
              rules apply), or when you want to grow your super beyond what the concessional cap
              allows without reducing your taxable income.
            </p>
            <p>
              <strong className="text-slate-800">Spouse contributions:</strong> you can also make
              NCCs directly into your spouse&apos;s super account. If your spouse earns $37,000 or
              less you receive a tax offset of up to $540 (18% of a $3,000 contribution). The
              offset phases out at $40,000 of spouse income. Spouse contributions count toward the
              receiving spouse&apos;s NCC cap.
            </p>
          </div>
        </div>
      </section>

      {/* ── Government Co-Contribution ───────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Free money from the government"
            title="Low-income co-contribution — up to $500 matched by the ATO"
          />
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              If you earn below $58,445 (2024-25) and make a personal non-concessional
              contribution, the government will match 50 cents for every dollar — up to $500 for
              people earning $45,400 or less. This is one of the few financial strategies that
              delivers an immediate, guaranteed 50% return on a contribution.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-700 mb-2">Full $500 co-contribution</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>Total income ≤ $45,400</li>
                  <li>Make a $1,000 NCC to your fund</li>
                  <li>ATO automatically adds $500</li>
                  <li>No application required — paid after lodging tax return</li>
                </ul>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-700 mb-2">Eligibility checklist</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>Total income below $58,445</li>
                  <li>10%+ income from employment or business</li>
                  <li>TSB below $1.9M</li>
                  <li>Age 71 or under</li>
                  <li>Australian resident (not temporary visa)</li>
                </ul>
              </div>
            </div>
            <p>
              The co-contribution reduces proportionally between $45,400 and $58,445. The ATO
              calculates and pays the co-contribution automatically once you lodge your tax return
              — you don&apos;t need to apply, but the NCC must be in your super account before 30 June.
            </p>
          </div>
        </div>
      </section>

      {/* ── Division 296 ─────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-orange-50 border-y border-orange-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="High-balance super"
            title="Division 296 tax — additional 15% on earnings above $3 million"
          />
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Division 296 is a proposed measure that imposes an additional 15% tax on the portion
              of super earnings attributable to balances above $3 million. Originally legislated
              to apply from 1 July 2025, the start date has been deferred to{" "}{/* // dated-ok — Division 296 legislated commencement dates, fixed by statute */}
              <strong className="text-slate-800">1 July 2026</strong>. The legislation has passed
              the House of Representatives but was awaiting Senate passage as of the 2025-26
              budget.
            </p>
            <div className="bg-white rounded-xl border border-orange-200 p-4">
              <p className="text-xs font-bold text-orange-800 uppercase tracking-wide mb-2">
                How Division 296 works
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>
                  Applies only to the proportion of a fund&apos;s earnings above $3M in total super
                  balance.
                </li>
                <li>
                  Effective earnings rate is applied to the increase in TSB during the financial
                  year (including unrealised gains — this is a key difference from normal tax).
                </li>
                <li>
                  The additional tax (15%) is assessed personally against the fund member and can
                  be paid from the fund or personally.
                </li>
                <li>
                  SMSF members are directly impacted; APRA fund members will have the tax
                  calculated by the ATO and notified.
                </li>
              </ul>
            </div>
            <p>
              If your TSB is approaching $3 million, the Division 296 tax is a critical planning
              consideration. The super guarantee and salary sacrifice contributions still make sense
              below $3M — it is only the earnings attribution above that threshold that attracts the
              extra tax.
            </p>
            <p>
              <Link
                href="/super/division-296"
                className="font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
              >
                Read our full Division 296 explainer &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── SMSF Contributions ───────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Self-managed super"
            title="SMSF contributions — same rules, additional obligations"
          />
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              If you are a member of a self-managed super fund (SMSF), the same concessional and
              non-concessional contribution rules apply — the $30,000 and $120,000 caps, the
              bring-forward and carry-forward rules, and the TSB thresholds all operate
              identically to APRA-regulated funds.
            </p>
            <p>
              <strong className="text-slate-800">Trust deed requirements:</strong> your fund&apos;s
              trust deed must expressly permit the type of contribution you wish to make. Most
              modern deeds are drafted broadly, but older deeds (pre-2010 particularly) may
              restrict the types of contributions or the member ages at which contributions are
              permitted. Review your deed or seek trustee advice before making contributions to
              an SMSF.
            </p>
            <p>
              <strong className="text-slate-800">Accepting contributions:</strong> an SMSF can
              only accept a contribution if the fund is in a position to accept it under the
              superannuation laws — for instance, if a member is aged 67-74, the fund must
              verify the work test is met before accepting non-mandated contributions. If the fund
              accepts a contribution it shouldn&apos;t, the ATO may impose penalties and require the
              money to be returned.
            </p>
            <p>
              <strong className="text-slate-800">Record-keeping:</strong> SMSF trustees are
              responsible for tracking contributions against the caps for all members. Unlike APRA
              funds, the ATO doesn&apos;t automatically alert SMSF members when they are approaching
              cap limits during the year. Maintain a running contributions register.
            </p>
          </div>
        </div>
      </section>

      {/* ── Contribution Strategies by Life Stage ───────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50 border-y border-slate-100">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Strategy guide"
            title="Contributions by life stage — what to prioritise and when"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {LIFE_STAGES.map((ls) => (
              <div
                key={ls.stage}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <div className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full mb-3">
                  {ls.stage}
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-3">{ls.label}</h3>
                <ul className="space-y-2">
                  {ls.strategies.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                      <span className="text-amber-500 font-bold shrink-0 mt-0.5">›</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Common Mistakes ──────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Avoid these pitfalls"
            title="5 common super contribution mistakes that cost Australians tax"
          />
          <div className="space-y-4">
            {COMMON_MISTAKES.map((cm, i) => (
              <div
                key={cm.mistake}
                className="bg-red-50 border border-red-100 rounded-xl p-5"
              >
                <div className="flex gap-3">
                  <span className="text-red-400 font-black text-sm shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-1">{cm.mistake}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{cm.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50 border-y border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white rounded-xl border border-slate-200"
              >
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3" aria-hidden="true">
                    ⌄
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">
              Compare super funds and find an adviser
            </h2>
            <p className="text-slate-400 text-sm">
              Find a fund with low fees and strong long-term performance, or speak with a
              financial planner about your personal contributions strategy.
            </p>
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

      {/* ── Compliance ───────────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
