import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `First Home Super Saver (FHSS) Scheme Guide — ${CURRENT_YEAR} | invest.com.au`,
  description: `FHSS guide: $15k/year and $50k lifetime cap, tax savings, contribution types, and the 7-step claim process. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `First Home Super Saver (FHSS) Scheme Guide (${CURRENT_YEAR})`,
    description:
      "Save for your first home deposit inside super and pay as little as 2.5% tax on withdrawal instead of your marginal rate. Full guide to the FHSS scheme: caps, eligibility, how-to steps, worked examples.",
    url: `${SITE_URL}/first-home-buyer/fhss-guide`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("FHSS Scheme Guide")}&sub=${encodeURIComponent("$50k Cap · Tax Savings · First Home Buyer · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/first-home-buyer/fhss-guide` },
};

const KEY_STATS = [
  { stat: "$15,000/year", label: "max voluntary contributions designated for FHSS" },
  { stat: "$50,000", label: "lifetime cap per person (from 1 July 2022)" }, // dated-ok — static legal effective date
  { stat: "$100,000", label: "combined cap for couples buying together" },
  { stat: "2.5%", label: "effective exit tax for 32.5% bracket earners" },
];

const ELIGIBILITY_CRITERIA = [
  {
    title: "Australian resident for tax purposes",
    detail:
      "You must be an Australian resident when you apply for a FHSS determination. Temporary visa holders are generally not eligible.",
  },
  {
    title: "Never previously owned property in Australia",
    detail:
      "You must never have held a freehold interest in real property, a lease of land, or a company title interest in Australia. If you have previously requested a FHSS release, you are also ineligible for a further release.",
  },
  {
    title: "Age 18 or over",
    detail:
      "You must be at least 18 years old when you apply for the FHSS release. You can make contributions to super before age 18, but you cannot request the release until you turn 18.",
  },
  {
    title: "Intend to occupy the property",
    detail:
      "You must intend to live in the property as your home for at least 6 months within the first 12 months of being entitled to occupy it. The FHSS cannot be used to buy a pure investment property without living in it first.",
  },
  {
    title: "Each person in a couple independently qualifies",
    detail:
      "If you are buying with a partner, each of you is assessed separately. There is no requirement that your partner qualifies — you can access your own FHSS balance even if your partner does not qualify (e.g., they previously owned). No income caps apply.",
  },
];

const TAX_COMPARISON = [
  {
    method: "Regular savings account",
    contributionTax: "After-tax income (e.g., 32.5% marginal rate already paid)",
    earningsTax: "Interest taxed at full marginal rate (~32.5%)",
    withdrawalTax: "None",
    effectiveRate: "32.5% entry — high tax before saving even starts",
  },
  {
    method: "FHSS scheme (concessional)",
    contributionTax: "15% contributions tax (via salary sacrifice or personal deductible)",
    earningsTax: "15% on deemed earnings (~5.9% deemed rate in 2024-25)",
    withdrawalTax: "Marginal rate minus 30% offset = 2.5% (for 32.5% bracket)",
    effectiveRate: "~17.5% tax saving on entry + 2.5% exit — big win for 32.5%+ earners",
  },
  {
    method: "FHSS (non-concessional)",
    contributionTax: "None extra — already paid marginal rate on income",
    earningsTax: "15% on deemed earnings (still better than bank interest)",
    withdrawalTax: "Nil — non-concessional component not taxed on withdrawal",
    effectiveRate: "No entry tax benefit, but earnings grow at low 15% rate inside super",
  },
];

const HOW_TO_STEPS = [
  {
    n: 1,
    step: "Open a super account",
    detail:
      "If you do not already have a super fund, open one. Choose a fund with low fees and suitable investment options. Most Australians already have a fund through their employer.",
  },
  {
    n: 2,
    step: "Make voluntary contributions each year",
    detail:
      "Salary sacrifice through your employer (pre-tax) or make personal contributions and claim a tax deduction. Up to $15,000 per financial year counts toward your FHSS balance. Contributions hit your fund's account as normal — the FHSS tracking is done by the ATO, not your fund.",
  },
  {
    n: 3,
    step: "Claim deductions and lodge your tax return",
    detail:
      "For personal deductible contributions, lodge a Notice of Intent to Claim a Deduction with your fund before lodging your tax return. For salary sacrifice, your employer handles contributions tax. The ATO tracks your FHSS-eligible amounts in the background.",
  },
  {
    n: 4,
    step: "Check your FHSS balance in myGov",
    detail:
      "Log in to myGov, navigate to the ATO section, and select Super > FHSS. You will see your maximum releasable amount based on contributions made and deemed earnings accumulated. This is not real-time — there may be a lag while recent contributions are processed.",
  },
  {
    n: 5,
    step: "Request a FHSS determination before signing a contract",
    detail:
      "When you are ready to buy, request a FHSS determination from the ATO. This is a formal calculation of how much you can release. You must do this BEFORE signing a contract — or within 14 days of signing. Do not sign first and then apply.",
  },
  {
    n: 6,
    step: "Apply for the FHSS release",
    detail:
      "Once you have a determination, apply for the FHSS release via myGov. The ATO instructs your super fund to release the funds. Processing takes approximately 15 to 20 business days. Funds are paid directly to you, not to a vendor or conveyancer. This step is irreversible — once released, the money cannot go back into super as a FHSS contribution.",
  },
  {
    n: 7,
    step: "Use the funds toward your deposit",
    detail:
      "Apply the released amount to your property purchase within 12 months of receiving it. The released amount typically forms part of your deposit at settlement, or sits in a bank account ready for exchange. If you do not enter a property contract within 12 months, you must either re-contribute to super or pay a 20% FHSS tax on the released amount.",
  },
];

const CONTRIBUTION_TYPES = [
  {
    type: "Concessional (salary sacrifice)",
    howItWorks:
      "Your employer diverts pre-tax salary directly into your super fund before income tax is calculated. You reduce your taxable income dollar-for-dollar. The fund pays 15% contributions tax.",
    fhssLimit: "Counts toward the $15,000/year FHSS limit",
    bestFor: "Employees with access to salary sacrifice. Best tax outcome for 32.5%+ earners.",
    watchOut:
      "Counts toward the $30,000 annual concessional cap (includes employer SG). Going over the cap means excess is taxed at your marginal rate plus a charge.",
  },
  {
    type: "Concessional (personal deductible)",
    howItWorks:
      "You pay from your bank account into super, then lodge a Notice of Intent to Claim a Deduction with your fund before your tax return. The deduction reduces your taxable income; the fund pays 15% contributions tax.",
    fhssLimit: "Counts toward the $15,000/year FHSS limit",
    bestFor: "Self-employed, contractors, or employees whose employer does not offer salary sacrifice.",
    watchOut:
      "Must lodge the Notice of Intent before lodging your tax return. Cannot claim if you have already withdrawn the contribution as a rollover or under another condition of release.",
  },
  {
    type: "Non-concessional (after-tax)",
    howItWorks:
      "You contribute from your take-home pay — no deduction is claimed. No additional tax is applied on the way in (you have already paid income tax). Counts toward the $15,000/year FHSS limit.",
    fhssLimit: "Counts toward the $15,000/year FHSS limit",
    bestFor:
      "People who have already used their $30,000 concessional cap for the year, or who want to contribute more without the concessional complexity. Less tax-efficient overall.",
    watchOut:
      "No entry tax benefit. Non-concessional FHSS amounts are not taxed again on withdrawal. Counts toward the $120,000 annual non-concessional cap.",
  },
];

const WORKED_EXAMPLE_ROWS = [
  { label: "Annual salary", value: "$85,000", highlight: false },
  { label: "Marginal tax rate (incl. Medicare)", value: "34.5%", highlight: false },
  { label: "Annual FHSS salary sacrifice (3 years)", value: "$15,000/year", highlight: false },
  { label: "Total FHSS contributions over 3 years", value: "$45,000", highlight: false },
  { label: "Income tax saved vs taking as salary (3yr)", value: "$8,775", highlight: true },
  { label: "Deemed earnings accumulated (~5.9% p.a.)", value: "~$4,000", highlight: false },
  { label: "Exit tax on release (marginal 32.5% minus 30% = 2.5%)", value: "~$1,125", highlight: false },
  { label: "Approximate net FHSS release", value: "~$47,875", highlight: true },
];

const GOTCHAS = [
  {
    heading: "Sign timing is critical",
    body: "You must request your FHSS determination and release BEFORE signing a purchase contract, or within 14 days of signing. If you sign first and then apply, you will be outside the window and cannot use FHSS for that purchase.",
  },
  {
    heading: "Funds are released to you, not your conveyancer",
    body: "The ATO releases FHSS funds directly into your bank account — not to your solicitor or to a vendor. Plan for this in your settlement logistics. The 15–20 business day processing window means you should apply well in advance of exchange.",
  },
  {
    heading: "One release only — irreversible",
    body: "You can only request a FHSS release once in your lifetime. Once instructed, the release cannot be reversed. You cannot partially release and come back for more later.",
  },
  {
    heading: "If you decide not to buy",
    body: "If you receive the FHSS release and then decide not to purchase a home: you have 12 months to re-contribute the full amount to any complying super fund as a non-concessional contribution. If you do not, you will owe a 20% FHSS tax on the released amount at tax time. Get advice early if your plans change.",
  },
  {
    heading: "Must intend to occupy — not a pure investment",
    body: "The property must be a home you intend to live in for at least 6 months within the first 12 months. You cannot use FHSS to purchase a pure investment property without occupying it first.",
  },
  {
    heading: "Employer SG contributions are not eligible",
    body: "Only VOLUNTARY contributions count toward your FHSS balance. Mandatory employer Superannuation Guarantee contributions (11.5% of your salary) are not eligible and are not tracked as FHSS-eligible by the ATO.",
  },
  {
    heading: "Deemed rate, not actual returns",
    body: "The ATO calculates FHSS earnings using a deemed rate (Treasury note rate + 3%, approximately 5.9% in 2024-25), not your fund's actual investment returns. If your fund underperformed, you benefit. If your fund earned 15%, you only receive the deemed rate.",
  },
];

const FAQS = [
  {
    q: "How much can I save with the FHSS scheme?",
    a: "The saving depends on your marginal tax rate and how long you contribute. For someone on the 32.5% marginal rate (income roughly $45,001 to $135,000 in 2025-26): contributing $15,000/year via salary sacrifice saves approximately 32.5% minus 15% = 17.5% in tax per dollar, or $2,625/year. Over three years, the tax saving is approximately $7,875. For someone on 37% ($135,001 to $190,000), the saving is $3,300/year, or about $9,900 over three years. Add deemed earnings of roughly $4,000 for a three-year $45,000 balance, and the total advantage over a regular savings account can be $10,000 or more. The scheme becomes less compelling if you are in the 19% bracket (the effective saving is only 4%), but it is still positive.",
  },
  {
    q: "Can I use the FHSS scheme and also get the First Home Owner Grant?",
    a: "Yes. The FHSS scheme and the First Home Owner Grant (FHOG) are independent programs that can be used simultaneously. The FHSS is a federal ATO program for saving via super; the FHOG is a state/territory cash grant for purchasing or building new homes. Using FHSS does not affect your FHOG eligibility, and receiving the FHOG does not affect your FHSS release. You can also combine both with the First Home Guarantee (5% deposit, no LMI). Stack all three if you are eligible.",
  },
  {
    q: "What happens if I cannot buy a home after releasing FHSS funds?",
    a: "If you receive your FHSS release and do not sign a property contract within 12 months, you have two choices: (1) Re-contribute the released amount to any complying super fund within 12 months of receiving it. This counts as a non-concessional contribution and must fit within your annual non-concessional cap ($120,000). (2) Keep the funds and pay a 20% FHSS tax at tax time (automatically calculated by the ATO when you lodge). The 12-month clock starts from the date you receive the released funds, not from when you applied. If your situation changes, seek advice from a registered tax agent before the window closes.",
  },
  {
    q: "Can both partners use the FHSS scheme?",
    a: "Yes. Each person has their own $50,000 lifetime FHSS limit. A couple buying together can each access up to $50,000, giving a combined $100,000 FHSS release. Each partner must independently qualify (never previously owned property, intends to live in the home). Both apply separately through their own myGov accounts and each receives their own separate release. If one partner has previously owned property in Australia, they cannot use FHSS, but the other partner can still access their own balance. There is no requirement that both partners participate.",
  },
  {
    q: "When should I apply for the FHSS release?",
    a: "Apply for a FHSS determination (the calculation step) once you are actively looking to buy and before you sign any contract. When you find a property and are ready to exchange: apply for the release immediately, because processing takes 15 to 20 business days. You must sign a contract within 14 days before or after your release request date. The safest sequence is: get the determination, find the property, apply for release, receive funds, then exchange and settle. Do not exchange first and apply for release after — the 14-day window is strict.",
  },
  {
    q: "Is the FHSS scheme worth it if I am in a low tax bracket?",
    a: "It depends. If you are in the 19% marginal rate bracket (income $18,201 to $45,000 in 2025-26): salary sacrificing $15,000 saves 19% minus 15% = 4%, or $600/year. The tax benefit is modest but still positive. You also benefit from the low 15% earnings rate on deemed returns inside super. If you are in the tax-free threshold (under $18,200), there is no income tax saving from salary sacrifice, but non-concessional contributions still benefit from the lower 15% deemed earnings rate. For very low-income earners, the government co-contribution (on non-concessional super contributions) is often a better priority first. For earners under $45,400 who also make non-concessional contributions, the government will match 50 cents per dollar up to $500 per year.",
  },
];

export default function FhssGuidePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "First Home Buyer", url: `${SITE_URL}/first-home-buyer` },
    { name: "FHSS Scheme Guide" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <section className="bg-slate-900 py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/first-home-buyer" className="hover:text-white">First Home Buyer</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">FHSS Scheme Guide</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            First Home Super Saver (FHSS) Scheme — complete guide ({CURRENT_YEAR})
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            The First Home Super Saver scheme lets you build a home deposit inside superannuation and
            withdraw it with a substantial tax advantage. For someone earning $85,000, using FHSS over
            three years can save more than $8,000 in tax compared to saving in a bank account. Here
            is exactly how it works, who qualifies, and what to watch out for.
          </p>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {KEY_STATS.map((item) => (
              <div key={item.stat} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-lg font-extrabold text-amber-400 mb-1">{item.stat}</p>
                <p className="text-xs text-slate-300 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-6">
            {UPDATED_LABEL} &middot; ATO rules and deemed rates change annually &mdash; verify at ato.gov.au &middot; General information only, not financial advice
          </p>
        </div>
      </section>

      {/* What is the FHSS? */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3">What is the FHSS scheme?</h2>
          <div className="prose prose-sm max-w-none text-slate-600 space-y-4">
            <p>
              The First Home Super Saver (FHSS) scheme is an Australian government program that lets
              eligible first home buyers save for a deposit inside their superannuation fund, taking
              advantage of super&apos;s lower tax environment. It was introduced in 2017 and the lifetime
              cap was increased from $30,000 to $50,000 per person from 1&nbsp;July&nbsp;2022.
            </p>
            <p>
              Here is the core tax advantage in plain terms: if you earn $85,000 and put $15,000 into
              super via salary sacrifice, that $15,000 is taxed at 15% (contributions tax) instead of
              your 32.5% marginal rate. When you withdraw the money to buy your home, the released amount
              is taxed at your marginal rate minus a 30% tax offset &mdash; so for a 32.5% earner, that
              is effectively 2.5% tax on the way out. Compare that to earning money, paying 32.5% tax on
              it, and then saving it in a bank account. The difference over three years can exceed $8,000.
            </p>
            <p>
              The FHSS only applies to <strong>voluntary contributions</strong> &mdash; money you
              deliberately put in above the mandatory employer Superannuation Guarantee. Employer SG
              contributions do not count toward your FHSS balance.
            </p>
          </div>
        </div>
      </section>

      {/* Eligibility */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Who is eligible for the FHSS scheme?</h2>
          <p className="text-sm text-slate-500 mb-6">
            There is no income cap for the FHSS scheme. The main requirements are about property
            ownership history and occupancy intent.
          </p>
          <div className="space-y-3">
            {ELIGIBILITY_CRITERIA.map((criterion, i) => (
              <div key={i} className="flex gap-4 bg-white rounded-xl border border-slate-200 p-4">
                <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-1">{criterion.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{criterion.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tax comparison */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Tax comparison: FHSS vs regular savings
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Based on a 32.5% marginal tax bracket (income approx. $45,001&ndash;$135,000 in 2025&ndash;26).
          </p>
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table aria-label="Tax comparison of FHSS scheme vs regular savings account" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Savings method</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">Contribution tax</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Earnings tax</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Withdrawal tax</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-emerald-300 uppercase tracking-wide whitespace-nowrap">Net outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {TAX_COMPARISON.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs whitespace-nowrap">{row.method}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.contributionTax}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.earningsTax}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.withdrawalTax}</td>
                    <td className={`px-4 py-3 text-xs font-semibold leading-relaxed ${i === 1 ? "text-emerald-700" : "text-slate-600"}`}>
                      {row.effectiveRate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            The 30% tax offset applies to the assessable FHSS released amount. For earners in the 19%
            bracket, the effective exit tax is 0% (capped at 0%). For earners in the 47% bracket, the
            exit rate is 47% &minus; 30% = 17% &mdash; still much lower than the 47% that would have
            applied if the income had been taken as salary.
          </p>
        </div>
      </section>

      {/* Concessional vs Non-concessional */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Concessional vs non-concessional FHSS contributions
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Both contribution types can be used for FHSS, but they have very different tax implications.
            Concessional contributions are almost always the better choice for people in the 32.5%+
            marginal rate bracket.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CONTRIBUTION_TYPES.map((ct, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="font-extrabold text-slate-900 mb-3 text-sm">{ct.type}</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">How it works</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{ct.howItWorks}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1">FHSS counting</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{ct.fhssLimit}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Best for</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{ct.bestFor}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Watch out for</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{ct.watchOut}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to use — 7 steps */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">
            How to use the FHSS scheme: 7 steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HOW_TO_STEPS.map((s) => (
              <div key={s.n} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center mb-3">
                  {s.n}
                </div>
                <p className="font-bold text-slate-900 mb-2 text-sm">{s.step}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deemed earnings rate explainer */}
      <section className="py-8 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <div className="bg-white border border-amber-200 rounded-xl p-6">
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">
              How FHSS earnings are calculated: the deemed rate
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              Your FHSS balance does not grow at your super fund&apos;s actual investment return. Instead, the
              ATO applies a <strong>deemed earnings rate</strong> equal to the 91-day Treasury Note rate
              plus 3%. For 2024&ndash;25, this rate was approximately <strong>5.9% per annum</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1">Benefit</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  You know approximately what you will receive, regardless of your fund&apos;s actual
                  performance. Market crashes don&apos;t reduce your FHSS release amount.
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1">Limitation</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  If your fund earns 12% in a bull market, your FHSS balance only grows at the deemed
                  rate. The excess stays in your super retirement balance.
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1">Tax on deemed earnings</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Deemed earnings are taxed at 15% inside super during accumulation, then included in the
                  released amount and subject to the marginal rate minus 30% offset on withdrawal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Worked example */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Worked example: Sophie, 3 years at $85,000 salary
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Sophie earns $85,000 a year (32.5% marginal rate + 2% Medicare levy = 34.5%). She salary
            sacrifices $15,000/year into super for three financial years, designating each contribution
            as FHSS-eligible. Here is how the numbers stack up.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table aria-label="FHSS worked example: Sophie 3 years at $85,000 salary" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Item</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {WORKED_EXAMPLE_ROWS.map((row, i) => (
                  <tr key={i} className={row.highlight ? "bg-emerald-50" : "hover:bg-slate-50"}>
                    <td className={`px-4 py-3 text-xs leading-relaxed ${row.highlight ? "font-bold text-slate-900" : "text-slate-600"}`}>
                      {row.label}
                    </td>
                    <td className={`px-4 py-3 text-xs font-bold text-right whitespace-nowrap ${row.highlight ? "text-emerald-700 text-base" : "text-slate-900"}`}>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Without FHSS:</strong> Sophie would have received $15,000 &times; 3 = $45,000 as
              salary, paid approximately $15,525 in income tax on those dollars (at 34.5%), leaving
              approximately $29,475 to save in a bank account. The FHSS scheme puts approximately
              $47,875 in her hands at the point of purchase &mdash; an advantage of roughly $18,400.
              Actual figures vary based on the exact deemed rate, timing, and whether contributions tax
              rates change.
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Illustrative only. Sophie&apos;s employer SG contributions (11.5% of $85,000 = $9,775/year)
            are not affected by salary sacrifice and continue to go into her super fund separately.
          </p>
        </div>
      </section>

      {/* Gotchas */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Limitations and gotchas to know before you start
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            The FHSS scheme has a number of rules that trip people up. Read these carefully before
            making your first FHSS-designated contribution.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GOTCHAS.map((g, i) => (
              <div key={i} className="bg-white rounded-xl border border-amber-200 p-5">
                <p className="font-bold text-slate-900 mb-2 text-sm">{g.heading}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Combined limits note */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 text-center">
              <p className="text-2xl font-extrabold text-emerald-700 mb-1">$15,000</p>
              <p className="text-xs text-slate-700 font-semibold mb-2">Max per year</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Per person, per financial year. Only voluntary contributions count &mdash; not employer SG.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center">
              <p className="text-2xl font-extrabold text-blue-700 mb-1">$50,000</p>
              <p className="text-xs text-slate-700 font-semibold mb-2">Lifetime cap per person</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Increased from $30,000 from 1&nbsp;July&nbsp;2022. Plus associated deemed earnings on top of the cap.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-center">
              <p className="text-2xl font-extrabold text-amber-700 mb-1">$100,000+</p>
              <p className="text-xs text-slate-700 font-semibold mb-2">Combined for couples</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Both partners each have their own $50,000 cap. Deemed earnings push the effective
                maximum above $100,000 combined.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4 bg-white">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">&#9662;</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <HubAdvisorCTA
        heading="Get financial advice on using the FHSS scheme"
        subheading="The FHSS scheme interacts with super contributions caps, concessional tax rates, and your withdrawal window. A financial adviser can model your contributions strategy and help you avoid common mistakes that delay or reduce your release amount."
        intent={{ need: "mortgage", context: ["fhss", "first_home_buyer", "super_strategy"] }}
        source="first_home_buyer_fhss"
        ctaLabel="Find a financial adviser"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related links */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/first-home-buyer", label: "First home buyer hub" },
              { href: "/first-home-buyer/grants", label: "First Home Owner Grants" },
              { href: "/first-home-buyer/stamp-duty", label: "Stamp duty guide" },
              { href: "/first-home-buyer/first-home-guarantee", label: "First Home Guarantee (5% deposit)" },
              { href: "/first-home-buyer/deposit-guide", label: "Saving your deposit" },
              { href: "/super/contributions", label: "Super contributions guide" },
              { href: "/advisors/financial-planners", label: "Find a financial planner" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance footer */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} FHSS scheme rules,
            contribution caps, deemed rates, and ATO processing timelines change. The $15,000 annual
            and $50,000 lifetime limits described on this page are current as of the 2025&ndash;26
            financial year. Always verify current rules at{" "}
            <span className="font-medium text-slate-700">ato.gov.au</span> and speak with a registered
            tax agent before making FHSS-designated contributions or applying for a FHSS release. This
            page is general information only and does not constitute financial, tax, or legal advice.
          </p>
        </div>
      </section>
    </div>
  );
}
