import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Catch-Up Super Contributions — Carry-Forward Concessional Rules Explained (${CURRENT_YEAR})`,
  description:
    "How carry-forward concessional super contributions work. Use unused caps from the prior 5 years if your Total Super Balance is under $500K. Updated 2026.",
  alternates: { canonical: `${SITE_URL}/super/catch-up-contributions` },
  openGraph: {
    title: `Catch-Up Super Contributions — Carry-Forward Concessional Rules (${CURRENT_YEAR})`,
    description:
      "Use unused concessional contribution caps from the prior 5 years to make larger deductible super contributions — if your TSB is below $500,000.",
    url: `${SITE_URL}/super/catch-up-contributions`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Catch-Up Super Contributions 2026")}&sub=${encodeURIComponent("Carry-Forward Concessional Caps · TSB Under $500K · 5-Year Rule")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const CONTRIBUTION_CAPS = [
  { fy: "2021–22", concessional: "$27,500", nonConcessional: "$110,000" },
  { fy: "2022–23", concessional: "$27,500", nonConcessional: "$110,000" },
  { fy: "2023–24", concessional: "$27,500", nonConcessional: "$110,000" },
  { fy: "2024–25", concessional: "$30,000", nonConcessional: "$120,000" },
  { fy: "2025–26", concessional: "$30,000", nonConcessional: "$120,000" },
];

const COMMON_MISTAKES = [
  {
    mistake: "Exceeding the cap",
    why: "Excess concessional contributions are included in your assessable income at your marginal rate plus an excess concessional contributions charge — and only partially offset by the 15% already paid by your fund. The cost can be significant.",
  },
  {
    mistake: "TSB exceeds $500K on 30 June",
    why: "If your Total Super Balance is $500,000 or more at 30 June of the prior year, you cannot access carry-forward amounts that year — even if there are substantial unused caps sitting in your account.",
  },
  {
    mistake: "Not lodging a Notice of Intent",
    why: "Personal contributions (paid from your bank account) are treated as non-concessional by default. To claim the tax deduction and count them as concessional, you must lodge a Notice of Intent to Claim a Tax Deduction with your fund before lodging your tax return.",
  },
  {
    mistake: "Forgetting the 5-year expiry",
    why: "Unused concessional cap amounts expire after 5 financial years. The FY2019–20 unused amount (the first year carry-forward was tracked) expired after FY2024–25. Any unused cap older than 5 years is permanently lost.",
  },
];

const FAQS = [
  {
    q: "When did carry-forward concessional contributions start?",
    a: "The ATO began tracking unused concessional cap amounts from FY2018–19 (the 2018–19 financial year). However, these amounts could not be used until FY2019–20. This means FY2019–20 was the first year you could actually make a catch-up contribution by drawing on the prior year's unused amount. The carry-forward balance accumulates from FY2018–19 onwards — prior years are not tracked.",
  },
  {
    q: "How do I find out how much carry-forward I have available?",
    a: "The ATO pre-fills your available carry-forward concessional contribution balance in myTax each year. You can also view it by logging into myGov, selecting the ATO service, and navigating to the Super tab. The balance shown reflects your unused concessional cap amounts for the prior 5 financial years, subject to your TSB being below $500,000 at 30 June of the prior year.",
  },
  {
    q: "Do I need to stay with the same super fund to use carry-forward contributions?",
    a: "No. The ATO tracks your unused concessional cap amounts across all your super funds via the SuperStream and ATO data-matching system. You do not need to be a member of the same fund that received the original contribution. Carry-forward amounts are calculated at the individual level and are fund-agnostic — you can make the catch-up contribution to any complying super fund.",
  },
  {
    q: "Can my employer make the carry-forward contribution, or does it have to be me?",
    a: "Carry-forward concessional contributions can be made via salary sacrifice (pre-tax) or as personal after-tax contributions for which you claim a deduction. Salary sacrifice contributions made through your employer count as concessional contributions and will draw on carry-forward capacity if your employer agrees to an increased sacrifice amount. The employer's mandatory SG contributions also count as concessional and reduce your remaining cap.",
  },
  {
    q: "What happens if my TSB crosses $500,000 mid-year?",
    a: "The $500,000 TSB threshold is measured at 30 June of the prior financial year only. If your TSB crosses $500,000 during the year but was below $500,000 at 30 June of the previous year, you can still use your carry-forward amounts for the current year. Conversely, if your TSB was at or above $500,000 at that 30 June date, you cannot use carry-forward that year — even if it subsequently falls below $500,000.",
  },
  {
    q: "Can I use carry-forward contributions alongside salary sacrifice in the same year?",
    a: "Yes. Carry-forward concessional contributions combine with the current year's $30,000 concessional cap — they do not replace it. Your total concessional contributions for the year (employer SG + salary sacrifice + personal deductible contributions) can equal up to $30,000 (current year cap) plus your available carry-forward amount. All concessional contributions count toward the combined limit, so you need to account for your employer's SG when calculating how much extra you can contribute.",
  },
];

export default function CatchUpContributionsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Super", url: absoluteUrl("/super") },
    { name: "Catch-Up Contributions", url: absoluteUrl("/super/catch-up-contributions") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/super" className="hover:text-white">Super</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Catch-Up Contributions</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-green-600 text-white px-3 py-1 rounded-full">TSB under $500K</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Catch-Up Super Contributions &mdash; Carry-Forward Concessional Rules Explained
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              If your Total Super Balance was below $500,000 at 30 June of the prior year, you can use any unused
              concessional contribution cap from the previous five financial years — potentially making a much
              larger tax-deductible contribution in a single year.
            </p>
          </div>
        </section>

        {/* ── Key Stats ────────────────────────────────────────────────── */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "$30,000", l: "Current concessional cap", sub: "2025–26 per person, per year" },
                { v: "$500K", l: "TSB eligibility threshold", sub: "Must be below this at 30 June prior year" },
                { v: "5 years", l: "Maximum carry-forward window", sub: "Unused caps expire after 5 financial years" },
                { v: "FY2019–20", l: "First usable year", sub: "ATO tracking started from FY2018–19" },
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

        {/* ── What are catch-up contributions ──────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What are catch-up concessional contributions?</h2>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 mb-6">
              <p className="text-sm font-bold text-amber-800 mb-1">Use years of unused cap in a single year</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                Introduced from FY2018&ndash;19 and first usable in FY2019&ndash;20, the carry-forward rule lets you
                &ldquo;bank&rdquo; unused concessional contribution cap amounts for up to five years and deploy them
                in a later year when you have the cash &mdash; as long as your Total Super Balance (TSB) is below
                $500,000 at 30 June of the prior year.
              </p>
            </div>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700">
              <p>
                Each financial year, concessional contributions (employer SG, salary sacrifice, and personal
                deductible contributions) are measured against the concessional cap. If you contribute less than
                the cap, the unused portion is recorded by the ATO. From FY2019&ndash;20 onwards, you can carry
                that unused amount forward and add it on top of the current year&apos;s cap in any later year
                &mdash; as long as your TSB eligibility remains intact.
              </p>
              <p>
                The carry-forward amount is drawn in chronological order: the oldest unused cap is used first.
                Unused amounts expire five years after the financial year in which they arose. For example, unused
                cap from FY2019&ndash;20 could be used up to and including FY2024&ndash;25, after which it
                permanently lapses.
              </p>
              <p>
                Concessional contributions are taxed at 15% inside your super fund (or 30% if your income plus
                contributions exceed $250,000 under Division 293). The tax benefit arises because you claim a
                tax deduction at your marginal rate &mdash; the difference between your marginal rate and the 15%
                contributions tax is your net saving.
              </p>
            </div>
          </div>
        </section>

        {/* ── Contribution Caps Table ───────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Concessional and non-concessional caps by financial year</h2>
            <p className="text-sm text-slate-600 mb-6">
              The table below shows the caps for recent years. The carry-forward rule only applies to{" "}
              <strong>concessional</strong> contributions &mdash; there is no equivalent carry-forward for
              non-concessional caps (a 3-year bring-forward rule applies instead).
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Super contribution caps by financial year">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Financial Year</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-green-300">Concessional Cap</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-blue-300">Non-Concessional Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTRIBUTION_CAPS.map((row, i) => (
                    <tr key={row.fy} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs">{row.fy}</td>
                      <td className="px-5 py-3.5 text-slate-600 border-l border-green-100 text-xs font-bold text-green-800">{row.concessional}</td>
                      <td className="px-5 py-3.5 text-slate-600 border-l border-blue-100 text-xs">{row.nonConcessional}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Non-concessional caps shown for reference only. Unused NCC cap does not carry forward &mdash; use
              the 3-year bring-forward rule instead (subject to TSB limits).
            </p>
          </div>
        </section>

        {/* ── Step-by-step calculation example ─────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Step-by-step worked example</h2>
            <p className="text-sm text-slate-600 mb-6">
              Alex earns $130,000 and has had employer SG contributions of roughly $13,000 per year, leaving
              roughly $14,500&ndash;$17,000 of the concessional cap unused each year. Her TSB at 30 June 2024  {/* // dated-ok */}
              is $120,000 &mdash; well below the $500,000 threshold.
            </p>

            <div className="space-y-3 mb-8">
              {[
                {
                  step: "1",
                  title: "Identify unused cap for each prior year",
                  body: "FY2021–22: concessional cap $27,500 − $13,000 employer SG = $14,500 available, but Alex contributed nothing extra, so unused = $14,500. Assume similarly $14,500 unused in FY2022–23 and FY2023–24, and $15,500 unused in FY2024–25 (cap rose to $30,000, minus $14,500 SG = $15,500). The ATO pre-fills these figures in myTax. For simplicity, the example uses $5,000 unused per year across four years.",
                },
                {
                  step: "2",
                  title: "Sum the carry-forward balance",
                  body: "Available carry-forward = FY2021–22 $5,000 + FY2022–23 $5,000 + FY2023–24 $5,000 + FY2024–25 $5,000 = $20,000 total carry-forward available for use in FY2025–26. Note: FY2019–20 and FY2020–21 amounts would also be included if not yet used or expired.",
                },
                {
                  step: "3",
                  title: "Calculate total concessional cap for FY2025–26",
                  body: "Current year cap $30,000 + carry-forward $20,000 = $50,000 total concessional cap available for FY2025–26. Alex’s employer contributes $14,500 SG (11.5% of $130,000 rounded). Remaining room = $50,000 − $14,500 = $35,500 for personal deductible contributions.",
                },
                {
                  step: "4",
                  title: "Make the personal contribution and lodge a Notice of Intent",
                  body: "Alex transfers $35,500 into her super fund before 30 June 2026. She then lodges a Notice of Intent to Claim a Tax Deduction (form SS-308) with her fund before lodging her FY2025–26 tax return. Her fund acknowledges the notice and deducts 15% contributions tax ($5,325), leaving $30,175 added to her balance.",  // dated-ok
                },
                {
                  step: "5",
                  title: "Calculate the tax saving",
                  body: "Without the deduction, Alex would pay 32.5% marginal rate on the $35,500. With the deduction, the super fund pays 15% contributions tax instead. Tax saving = ($35,500 × 32.5%) − ($35,500 × 15%) = $11,537 − $5,325 = $6,212 net tax saving for the year. At the 37% marginal rate the saving would be $7,810.",
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

            {/* Summary callout */}
            <div className="rounded-xl border border-green-300 bg-green-50 p-6">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-3">Example summary &mdash; FY2025&ndash;26</p>
              <div className="space-y-2.5">
                {[
                  { label: "Alex's salary", value: "$130,000" },
                  { label: "Employer SG (11.5%)", value: "$14,500" },
                  { label: "Current year concessional cap", value: "$30,000" },
                  { label: "Carry-forward from prior 4 years", value: "+ $20,000" },
                  { label: "Total concessional cap this year", value: "= $50,000" },
                  { label: "Personal deductible contribution (room after SG)", value: "$35,500" },
                  { label: "Net tax saving (32.5% marginal vs 15% super tax)", value: "$6,212" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center text-sm border-b border-green-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-green-800">{row.label}</span>
                    <span className="font-bold text-green-900">{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">Illustrative only. Assumes Alex has TSB below $500K at 30 June 2025. Exact SG base and carry-forward amounts will vary.</p>  {/* // dated-ok */}
            </div>
          </div>
        </section>

        {/* ── Who is this for ──────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Who benefits most from catch-up contributions?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "People who took career breaks",
                  badge: "Parental leave, illness, redundancy",
                  body: "If you left the workforce or moved to reduced hours for any reason, your concessional contributions likely fell well short of the cap during those years. Those unused amounts accumulate and can be deployed when you return to full-time work and have the cash flow to top up.",
                },
                {
                  title: "Business owners with variable income",
                  badge: "Irregular cash flow",
                  body: "Sole traders and company directors often have lean years where they take minimal salary or drawings. Contributions in those years are low, building up carry-forward amounts. In a strong revenue year, a large deductible catch-up contribution can significantly reduce taxable income.",
                },
                {
                  title: "Employees who underutilised early years",
                  badge: "Young and mid-career workers",
                  body: "If you began your career without salary sacrificing, you may have years of unused cap available. Using carry-forward before your TSB crosses $500,000 captures the benefit while you still have access.",
                },
                {
                  title: "People approaching retirement with a lump sum",
                  badge: "Pre-retirement planning",
                  body: "Receiving a redundancy payment, selling a business, or crystallising a capital gain? A large carry-forward contribution can shelter a portion of that income inside super, taxed at 15% rather than your marginal rate &mdash; as long as you are under the preservation age release conditions and your TSB qualifies.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How to claim ─────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to make and claim a catch-up contribution</h2>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Check your available carry-forward balance in myGov",
                  body: "Log into myGov, select the ATO service, and navigate to Super > Carry-forward concessional contributions. The ATO pre-fills this figure in myTax each year. Confirm the amount reflects contributions already made in the current year.",
                },
                {
                  step: "2",
                  title: "Confirm your TSB at 30 June of the prior year",
                  body: "Your fund will report your TSB to the ATO. You can verify the figure in myGov under Super > Information. If your combined super balance across all funds was $500,000 or more at 30 June of the prior year, you cannot use carry-forward amounts this year regardless of how much unused cap you have.",
                },
                {
                  step: "3",
                  title: "Make the personal contribution before 30 June",
                  body: "Transfer the amount from your bank account to your super fund. Allow time for the funds to be received and processed by your fund before 30 June. Contact your fund if you are close to year-end to confirm processing times.",
                },
                {
                  step: "4",
                  title: "Lodge a Notice of Intent to Claim a Tax Deduction",
                  body: "This is the critical step. Without this notice, personal contributions are treated as non-concessional (no deduction). Download form SS-308 from the ATO or lodge via your fund's online portal. The notice must be lodged before you file your tax return, or before 30 June of the following financial year, whichever is earlier. Your fund must acknowledge it in writing before you can claim the deduction.",
                },
                {
                  step: "5",
                  title: "Claim the deduction in your tax return",
                  body: "Include the total amount of personal super contributions for which you have a valid notice at item D12 (personal super contributions) in your individual tax return. The ATO’s myTax pre-fills the carry-forward balance but you must manually enter the deduction claim.",
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center">{s.step}</div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Common mistakes ───────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">4 common catch-up contribution mistakes</h2>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Common catch-up contribution mistakes">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide w-64">Mistake</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-red-300">Why it matters</th>
                  </tr>
                </thead>
                <tbody>
                  {COMMON_MISTAKES.map((row, i) => (
                    <tr key={row.mistake} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-5 py-4 font-semibold text-red-700 text-xs align-top">{row.mistake}</td>
                      <td className="px-5 py-4 text-slate-600 border-l border-red-100 text-xs leading-relaxed">{row.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Integration with other strategies ────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Integration with other super strategies</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: "Combine with salary sacrifice",
                  badge: "Current-year synergy",
                  color: "border-green-200 bg-green-50",
                  badgeColor: "bg-green-100 text-green-700",
                  body: "Salary sacrifice and carry-forward contributions are not mutually exclusive. Your total concessional contributions for the year (SG + salary sacrifice + personal deductible) can collectively draw on both the current year cap and any carry-forward balance. Model the combined figure carefully to avoid exceeding the total cap.",
                },
                {
                  title: "Act before TSB hits $500K",
                  badge: "Timing is critical",
                  color: "border-amber-200 bg-amber-50",
                  badgeColor: "bg-amber-100 text-amber-700",
                  body: "Once your TSB reaches $500,000 at any 30 June, you lose access to carry-forward for the following year. If your balance is growing and you have unused carry-forward amounts, consider deploying them while you still meet the eligibility threshold. The window closes permanently at $500K.",
                },
                {
                  title: "Consider Division 296 planning",
                  badge: "High-balance members",
                  color: "border-blue-200 bg-blue-50",
                  badgeColor: "bg-blue-100 text-blue-700",
                  body: "For members approaching $3 million in super, large catch-up contributions will push the balance higher and into Division 296 territory sooner. From 1 July 2026, an additional 30% tax applies to earnings above $3M. Model the trade-off between tax-deductible catch-up contributions now versus the ongoing Div 296 tax on a larger balance.",  // dated-ok
                },
              ].map((item) => (
                <div key={item.title} className={`rounded-xl border p-5 ${item.color}`}>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full mb-3 inline-block ${item.badgeColor}`}>{item.badge}</span>
                  <h3 className="font-extrabold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQs ─────────────────────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
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

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white mb-1">Compare super funds and seek personalised advice</h2>
              <p className="text-slate-500 text-sm">A financial planner can model your specific carry-forward amounts, TSB trajectory, and the tax saving available to you.</p>
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

        {/* ── Related pages ────────────────────────────────────────────── */}
        <section className="py-8 bg-white border-t border-slate-100">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Related guides</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/super" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Super hub &rarr;</Link>
              <Link href="/super/contributions" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">All contribution types &rarr;</Link>
              <Link href="/super/division-296" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Division 296 tax &rarr;</Link>
            </div>
          </div>
        </section>

        {/* ── Compliance disclaimer ─────────────────────────────────────── */}
        <section className="py-6 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">General advice warning</p>
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
