/**
 * First Home Deposit Guide — comprehensive explainer covering:
 * deposit sizes, LMI, government schemes, genuine savings rules,
 * saving strategies, worked example, additional costs, and FAQ.
 *
 * Compliance posture: general information only — no personal advice.
 * All figures are illustrative; readers should verify with their lender.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  breadcrumbJsonLd,
  SITE_URL,
  CURRENT_YEAR,
  UPDATED_LABEL,
  absoluteUrl,
} from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

const PAGE_TITLE = `First Home Deposit Guide Australia (${CURRENT_YEAR}) — How Much You Really Need`;
const PAGE_DESC =
  `Complete guide to saving a first home deposit in Australia. How much you need, LMI explained, government schemes (FHBG, HB2B), genuine savings rules, FHSS, stamp duty, and a worked example. ${UPDATED_LABEL}.`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: `${SITE_URL}/first-home-buyer/deposit-guide` },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: `${SITE_URL}/first-home-buyer/deposit-guide`,
    type: "article",
  },
  twitter: { card: "summary_large_image", title: PAGE_TITLE, description: PAGE_DESC },
};

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "First Home Buyer", url: absoluteUrl("/first-home-buyer") },
  { name: "Deposit Guide", url: absoluteUrl("/first-home-buyer/deposit-guide") },
]);

const FAQ_ITEMS = [
  {
    q: "What counts as genuine savings for a home loan?",
    a: "Genuine savings are funds you have held or accumulated over at least 3 months, typically in a savings account, term deposit, or shares. Most lenders require 5% of the purchase price to come from genuine savings. Gifts, inheritances, First Home Owner Grants, and proceeds from selling a car or personal items are usually not considered genuine savings by stricter lenders, though some will accept them if they have been held in your account for 3+ months. Always confirm with your specific lender.",
  },
  {
    q: "Is LMI worth paying to get into the market sooner?",
    a: "It depends on property price growth in your target area. If prices are rising faster than you can save additional deposit, paying LMI now could be cheaper than waiting 1-2 extra years. On a $750,000 property at 5% deposit, LMI might cost $22,000-$28,000 — but if that property grows at 8% per year, that is $60,000 in extra price appreciation you avoid by buying sooner. The maths favours paying LMI in strong markets and waiting in flat or falling markets. LMI protects the lender, not you.",
  },
  {
    q: "How does the First Home Guarantee (FHBG) work?",
    a: "The First Home Guarantee (formerly FHLDS) lets eligible first home buyers purchase with as little as 5% deposit without paying LMI. The federal government guarantees up to 15% of the purchase price with a participating lender, which means the lender treats the loan as if you had a 20% deposit. There are 35,000 places per financial year. Income caps apply: $125,000 for singles and $200,000 for couples. Property price caps vary by state and whether it is in a capital city or regional area. The guarantee does NOT mean the government pays your deposit — you still need the 5% yourself.",
  },
  {
    q: "What is the Help to Buy (HB2B) shared equity scheme?",
    a: "Help to Buy is the federal government's shared equity scheme that lets eligible buyers purchase with as little as 2% deposit. The government co-buys up to 30% of an existing home or 40% of a new build alongside you, reducing your mortgage size and repayments. You do not pay rent on the government's share, but you share any capital gains when you sell or buy out the government's stake over time. Income caps ($90,000 single, $120,000 couples) and property price caps apply. The scheme launched in 2024 in limited states.",
  },
  {
    q: "What other costs should I budget for beyond the deposit?",
    a: "The deposit is just the start. Budget for: stamp duty (varies by state — first home buyers get concessions or exemptions in most states), conveyancing and legal fees ($1,500–$3,000), building and pest inspection ($400–$700), lender fees (application, valuation, mortgage registration — typically $500–$2,000), lenders mortgage insurance if applicable, moving costs ($500–$3,000 depending on distance), utility connections, and a buffer for immediate repairs or furniture. In NSW and VIC, stamp duty on a $750K property is roughly $28,000–$30,000 for non-FHB buyers, but FHB concessions can reduce or eliminate this.",
  },
  {
    q: "How does the First Home Super Saver (FHSS) scheme work?",
    a: "The FHSS scheme lets you save up to $15,000 per financial year (max $50,000 total) inside your super fund for a first home deposit. Contributions are taxed at 15% inside super rather than your marginal rate, which saves most buyers 15–30%. You can use voluntary before-tax (salary sacrifice) or after-tax contributions. To withdraw, you must apply to the ATO for a FHSS determination and have an exchange of contracts within 12 months of the release. The earnings on your FHSS savings are calculated at a deemed rate, not the actual earnings of your fund. It suits buyers with 2+ year savings horizons.",
  },
];

const faqLd = faqJsonLd(FAQ_ITEMS);

// ─── LMI Cost Table data ──────────────────────────────────────────────────────

const LMI_ROWS = [
  {
    lvr: "95% (5% deposit)",
    p500: "$14,000–$18,000",
    p750: "$22,000–$28,000",
    p1000: "$30,000–$38,000",
  },
  {
    lvr: "90% (10% deposit)",
    p500: "$5,500–$7,500",
    p750: "$8,500–$12,000",
    p1000: "$11,000–$16,000",
  },
  {
    lvr: "85% (15% deposit)",
    p500: "$1,500–$2,500",
    p750: "$2,500–$4,000",
    p1000: "$3,500–$5,500",
  },
  {
    lvr: "82% (18% deposit)",
    p500: "$600–$1,200",
    p750: "$900–$1,800",
    p1000: "$1,200–$2,400",
  },
];

// ─── Saving timeline data ─────────────────────────────────────────────────────

const SAVINGS_TIMELINE = [
  { rate: "$500/week", weekly: 500, months26: "$52,000", months52: "$104,000" },
  { rate: "$1,000/week", weekly: 1000, months26: "$104,000", months52: "$208,000" },
  { rate: "$1,500/week", weekly: 1500, months26: "$156,000", months52: "$312,000" },
];

// ─── Government scheme cards ──────────────────────────────────────────────────

const GOV_SCHEMES = [
  {
    name: "First Home Guarantee (FHBG)",
    minDeposit: "5%",
    noLmi: true,
    income: "$125K single / $200K couple",
    places: "35,000/yr",
    detail:
      "Government guarantees 15% of purchase price with participating lender. No LMI payable. Still need 5% genuine savings. Price caps vary by state and region.",
    color: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    name: "Help to Buy (HB2B) Shared Equity",
    minDeposit: "2%",
    noLmi: true,
    income: "$90K single / $120K couple",
    places: "Limited",
    detail:
      "Government co-buys up to 30% (existing) or 40% (new) alongside you. Smaller mortgage, lower repayments. Share capital gain when you sell or buy out the government stake.",
    color: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
  },
  {
    name: "First Home Super Saver (FHSS)",
    minDeposit: "N/A (savings tool)",
    noLmi: false,
    income: "No cap",
    places: "Unlimited",
    detail:
      "Save up to $50K inside super at concessional tax rates (15% vs marginal). ATO releases funds at exchange of contracts. Suits buyers 2+ years from purchase.",
    color: "bg-violet-50 border-violet-200",
    badge: "bg-violet-100 text-violet-800",
  },
  {
    name: "First Home Owner Grant (FHOG)",
    minDeposit: "N/A (cash grant)",
    noLmi: false,
    income: "Varies by state",
    places: "Unlimited (state funded)",
    detail:
      "One-off cash grant for new builds only. $10,000 in NSW, QLD, WA, SA and VIC. Up to $30,000 in NT and TAS for new builds. Does not apply to established homes in most states.",
    color: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
];

// ─── Page component ───────────────────────────────────────────────────────────

export default function DepositGuidePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <main className="bg-white text-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

          {/* ── Breadcrumb ── */}
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-800">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/first-home-buyer" className="hover:text-slate-800">First Home Buyer</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium">Deposit Guide</span>
          </nav>

          {/* ── Hero ── */}
          <header className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              {UPDATED_LABEL} &mdash; First Home Buyer
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
              First home deposit guide: how much do you actually need?
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              The deposit is the biggest upfront barrier for most first home buyers in Australia.
              This guide explains the real numbers: the difference between 5% and 20%, what
              Lenders Mortgage Insurance actually costs, which government schemes can reduce your
              deposit requirement, and practical strategies to get there faster.
            </p>
          </header>

          {/* ── Quick summary box ── */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-10">
            <h2 className="text-base font-bold text-slate-900 mb-3">Key numbers at a glance</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">5</span>
                <span><strong>5% minimum deposit</strong> — most lenders accept this, but you will pay LMI unless you qualify for FHBG or another scheme.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">20</span>
                <span><strong>20% deposit avoids LMI</strong> — saves $10K–$38K in insurance costs depending on purchase price and LVR.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">G</span>
                <span><strong>Government schemes</strong> — FHBG (5% deposit, no LMI) and Help to Buy (2% deposit) can significantly reduce what you need to save.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">+</span>
                <span><strong>Add 5–7% for purchase costs</strong> — stamp duty, legal fees, inspections, and lender fees on top of the deposit.</span>
              </li>
            </ul>
          </div>

          {/* ── Section 1: How much deposit ── */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              How much deposit do you actually need?
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Most Australian lenders will approve a home loan with a deposit as low as 5% of the
              purchase price. However, depositing less than 20% triggers Lenders Mortgage Insurance
              (LMI) — a one-off insurance premium that protects the <em>lender</em> (not you) if
              you default. The target most financial planners suggest is 20% plus purchase costs,
              giving you the lowest interest rate tier and no LMI.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              In practice, the right deposit depends on your situation. For a $750,000 property:
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th scope="col" className="text-left px-3 py-2 font-semibold text-slate-700 border border-slate-200">Deposit size</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">Deposit amount</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">LMI payable?</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">Loan size</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-medium">5%</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$37,500</td>
                    <td className="px-3 py-2 border border-slate-200 text-right text-red-600 font-medium">Yes — ~$22K–28K</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$712,500</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2 border border-slate-200 font-medium">10%</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$75,000</td>
                    <td className="px-3 py-2 border border-slate-200 text-right text-orange-600 font-medium">Yes — ~$8.5K–12K</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$675,000</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-medium">15%</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$112,500</td>
                    <td className="px-3 py-2 border border-slate-200 text-right text-amber-600 font-medium">Yes — ~$2.5K–4K</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$637,500</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2 border border-slate-200 font-medium">20%</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$150,000</td>
                    <td className="px-3 py-2 border border-slate-200 text-right text-emerald-600 font-medium">No LMI</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$600,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 italic">
              Example only — $750,000 purchase price. LMI estimates are indicative; exact premiums
              vary by lender, property type, and loan purpose.
            </p>
          </section>

          {/* ── Section 2: LMI explained ── */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Lenders Mortgage Insurance (LMI) explained
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              LMI is a one-off insurance premium charged when your loan-to-value ratio (LVR)
              exceeds 80%. It is calculated as a percentage of the loan amount — the higher the
              LVR, the higher the rate. The premium is usually capitalised into the loan (added to
              your debt) rather than paid upfront, meaning you also pay interest on the LMI amount.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              <strong>LMI protects the lender, not you.</strong> If you default and the property
              is sold at a loss, the insurer (Helia or QBE in Australia) reimburses the lender —
              but can still pursue you for the shortfall. LMI provides no benefit to the borrower
              beyond enabling the loan.
            </p>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Indicative LMI cost table</h3>
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th scope="col" className="text-left px-3 py-2 font-semibold text-slate-700 border border-slate-200">LVR (deposit)</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">$500K purchase</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">$750K purchase</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">$1M purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {LMI_ROWS.map((row) => (
                    <tr key={row.lvr} className="odd:bg-slate-50">
                      <td className="px-3 py-2 border border-slate-200 font-medium">{row.lvr}</td>
                      <td className="px-3 py-2 border border-slate-200 text-right">{row.p500}</td>
                      <td className="px-3 py-2 border border-slate-200 text-right">{row.p750}</td>
                      <td className="px-3 py-2 border border-slate-200 text-right">{row.p1000}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 italic mb-4">
              Indicative ranges only. Actual LMI premiums depend on the lender, insurer, loan
              purpose (owner-occupier vs investment), and whether the premium is capitalised.
              Use a lender&apos;s LMI calculator for an exact quote.
            </p>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">When is it worth paying LMI?</h3>
            <p className="text-slate-700 leading-relaxed mb-2">
              LMI can make sense when:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700 text-sm mb-4">
              <li>Property prices are rising faster than you can save the additional deposit.</li>
              <li>You are relocating for work and need to buy now.</li>
              <li>Renting costs more than your projected mortgage repayments.</li>
              <li>You have stable income and a long investment horizon in a growth area.</li>
            </ul>
            <p className="text-slate-700 leading-relaxed">
              LMI may not be worth it in flat or falling markets, or if you are 12–18 months away
              from reaching 20% without it. Run the numbers for your specific scenario.
            </p>
          </section>

          {/* ── Section 3: Genuine savings ── */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              What counts as genuine savings?
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Most lenders require at least 5% of the purchase price to be &ldquo;genuine
              savings&rdquo; — funds you have held or accumulated yourself over a sustained period,
              not a windfall. The standard minimum holding period is <strong>3 months</strong>.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                  Usually accepted as genuine savings
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#x2713;</span>
                    Regular savings contributions held for 3+ months
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#x2713;</span>
                    Term deposits and managed investments held 3+ months
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#x2713;</span>
                    FHSS withdrawals (treated as genuine savings by most lenders)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#x2713;</span>
                    Equity in an existing property or vehicle (some lenders)
                  </li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2">
                  May NOT qualify as genuine savings
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">&#x2717;</span>
                    Gifts from family (at most lenders without 3-month hold)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">&#x2717;</span>
                    Inheritance received recently
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">&#x2717;</span>
                    Lump-sum windfall not held 3+ months
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">&#x2717;</span>
                    First Home Owner Grant (cash grant, not savings)
                  </li>
                </ul>
              </div>
            </div>
            <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <strong>Tip:</strong> If you receive a gift or inheritance, park it in a savings
              account and wait 3 months before applying. Many lenders will then accept it as part
              of the deposit — but policies vary. Always confirm with your mortgage broker.
            </p>
          </section>

          {/* ── Section 4: Government schemes ── */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Government schemes that reduce your deposit
            </h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              Several federal and state programs can help first home buyers purchase with a smaller
              deposit, avoid LMI, or boost savings faster.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {GOV_SCHEMES.map((scheme) => (
                <div
                  key={scheme.name}
                  className={`rounded-xl border p-5 ${scheme.color}`}
                >
                  <p className="font-bold text-slate-900 text-sm mb-2">{scheme.name}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scheme.badge}`}>
                      Min {scheme.minDeposit}
                    </span>
                    {scheme.noLmi && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        No LMI
                      </span>
                    )}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {scheme.places}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">{scheme.detail}</p>
                  <p className="text-xs text-slate-500">
                    Income cap: {scheme.income}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
              <strong>State-based programs:</strong> Most states offer stamp duty exemptions or
              concessions for first home buyers on purchases below a threshold (typically $650K–$800K
              depending on state). NSW also offers a property tax (land tax) option as an
              alternative to upfront stamp duty for eligible purchases. Check your state revenue
              office for current thresholds and eligibility.
            </div>
          </section>

          {/* ── Section 5: Saving strategies ── */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Practical strategies to save your deposit faster
            </h2>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">1. Use the FHSS scheme</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              The First Home Super Saver scheme lets you make voluntary contributions into your
              super at 15% tax — well below the 32–47% marginal rate most full-time employees pay.
              You can contribute up to $15,000 per financial year and withdraw up to $50,000 total.
              On $50,000 saved, the tax saving versus a standard savings account can be $7,500–
              $15,000 depending on your income. The trade-off: funds are locked inside super until
              you apply to withdraw, and you must have an unconditional exchange of contracts within
              12 months of release.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">2. Maximise your savings account rate</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              High-interest savings accounts (HISA) are offering 4.5–5.5% p.a. base or bonus rates
              in {CURRENT_YEAR}. On a $60,000 deposit balance, that is $2,700–$3,300 per year in
              interest before tax — around $170–$210 per month working for you passively.
              Compare rates monthly as introductory bonuses expire. ING Savings Maximiser, Macquarie
              Savings Account, and UBank Save are consistently competitive, but the ranking changes.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">3. Automate contributions</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              Set up an automatic transfer to your savings account on payday before discretionary
              spending occurs. Treat the savings target as a non-negotiable bill. Couples saving
              together should maintain a shared &ldquo;deposit account&rdquo; that both can see —
              joint visibility is one of the strongest behavioural tools for staying on track.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">4. Audit lifestyle expenses</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              The biggest lever for most savers is reducing consumption rather than earning more.
              A household spending $500/month on dining out and entertainment that reduces this by
              50% adds $250/month to savings — $3,000 per year — which compounds inside HISA and
              cuts your timeline meaningfully. Review subscriptions, insurance, and discretionary
              categories using a bank&apos;s transaction categorisation tool.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">5. Consider a term deposit for short-term buckets</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              If you are 12–18 months from purchasing, a 12-month term deposit (currently 4.8–5.2%
              p.a.) locks in a rate and removes the temptation to spend the funds. Split large
              deposits into rolling 3-month terms so a portion is always accessible if your
              purchase timeline accelerates.
            </p>
          </section>

          {/* ── Section 6: Deposit savings calculator concept ── */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              How long does it take to save $80,000?
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              A common target for a 10% deposit on a $750K–$800K home (plus costs buffer) is
              approximately $80,000–$90,000. Here is how different weekly saving rates translate to
              reaching an $80,000 target — not accounting for interest earned on the balance:
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th scope="col" className="text-left px-3 py-2 font-semibold text-slate-700 border border-slate-200">Savings rate</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">After 12 months</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">After 24 months</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">Time to $80K</th>
                  </tr>
                </thead>
                <tbody>
                  {SAVINGS_TIMELINE.map((row) => {
                    const weeksNeeded = Math.ceil(80000 / row.weekly);
                    const monthsNeeded = Math.ceil(weeksNeeded / 4.33);
                    return (
                      <tr key={row.rate} className="odd:bg-slate-50">
                        <td className="px-3 py-2 border border-slate-200 font-medium">{row.rate}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right">{row.months26}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right">{row.months52}</td>
                        <td className="px-3 py-2 border border-slate-200 text-right font-semibold text-emerald-700">
                          ~{monthsNeeded} months
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 italic">
              Excludes interest earned. At 5% p.a. on a growing balance, actual time is shorter.
              Interest and tax effects vary — use a compound interest calculator for precision.
            </p>
          </section>

          {/* ── Section 7: Worked example ── */}
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-10">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Worked example
            </p>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              James and Emma: $750K home on a combined $150K income
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              James and Emma earn a combined $150,000 per year. They want to buy a $750,000
              home in a major city. Here are their two deposit scenarios:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">
                  Scenario A: 5% deposit (buy sooner)
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <li><span className="font-medium">Deposit needed:</span> $37,500</li>
                  <li><span className="font-medium">LMI cost:</span> ~$25,000</li>
                  <li><span className="font-medium">Stamp duty (NSW, FHB exemption):</span> $0</li>
                  <li><span className="font-medium">Legal + inspection fees:</span> ~$3,500</li>
                  <li><span className="font-medium">Total funds needed:</span> ~$66,000</li>
                  <li><span className="font-medium">Loan size:</span> $712,500 + LMI = ~$737,500</li>
                </ul>
                <p className="text-xs text-slate-500 mt-3">
                  LMI capitalised into loan; they qualify for FHBG to waive LMI if under income
                  cap — check scheme eligibility.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
                  Scenario B: 20% deposit (no LMI)
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <li><span className="font-medium">Deposit needed:</span> $150,000</li>
                  <li><span className="font-medium">LMI cost:</span> $0</li>
                  <li><span className="font-medium">Stamp duty (NSW, FHB exemption):</span> $0</li>
                  <li><span className="font-medium">Legal + inspection fees:</span> ~$3,500</li>
                  <li><span className="font-medium">Total funds needed:</span> ~$153,500</li>
                  <li><span className="font-medium">Loan size:</span> $600,000</li>
                </ul>
                <p className="text-xs text-slate-500 mt-3">
                  No LMI saves ~$25K but requires saving $112,500 more. At $1,500/wk combined,
                  the extra saving takes ~18 additional months.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-slate-700">
              <strong>The FHBG option:</strong> If James and Emma qualify for the First Home
              Guarantee (combined income $150K — just at the $200K cap), they can buy with
              just the $37,500 deposit and pay no LMI. They would need approximately $41,000
              all-in for costs, and their loan would be $712,500 at standard rates.
            </div>
          </section>

          {/* ── Section 8: Additional costs ── */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Additional costs to budget beyond your deposit
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              The deposit is only part of what you need on settlement day. Budget for these
              additional costs upfront — they can add 4–8% of the purchase price in total:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th scope="col" className="text-left px-3 py-2 font-semibold text-slate-700 border border-slate-200">Cost</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">Typical range</th>
                    <th scope="col" className="text-left px-3 py-2 font-semibold text-slate-700 border border-slate-200">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-medium">Stamp duty</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$0–$30,000+</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">FHB exemptions/concessions apply in most states below property thresholds</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2 border border-slate-200 font-medium">Conveyancing / legal</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$1,500–$3,000</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">Includes contract review, title search, settlement. Higher for complex transactions</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-medium">Building and pest inspection</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$400–$700</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">Essential for established properties. Do not skip to save money here</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2 border border-slate-200 font-medium">Lender fees</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$500–$2,000</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">Application fee, valuation, mortgage registration, settlement fee. Some lenders waive</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-medium">LMI (if LVR &gt; 80%)</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$1,000–$38,000</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">Usually capitalised into the loan. Waived via FHBG scheme</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2 border border-slate-200 font-medium">Moving costs</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$500–$3,000</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">Depends on distance, volume, and whether you hire a removalist</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-medium">Immediate repairs &amp; setup</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$1,000–$10,000+</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">Budget for urgent repairs, locks, appliances, and essential furniture</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Section 9: First home buyer concessions ── */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              First home buyer concessions by state
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              State governments offer a range of stamp duty exemptions, concessions, and grants
              that can reduce your upfront costs significantly. These change regularly — always
              verify current thresholds with your state revenue office.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th scope="col" className="text-left px-3 py-2 font-semibold text-slate-700 border border-slate-200">State</th>
                    <th scope="col" className="text-left px-3 py-2 font-semibold text-slate-700 border border-slate-200">Stamp duty concession</th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold text-slate-700 border border-slate-200">FHOG (new builds)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-medium">NSW</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">Full exemption up to $800K; concession $800K–$1M. Optional land tax instead of duty for eligible purchases</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$10,000</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2 border border-slate-200 font-medium">VIC</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">Full exemption up to $600K; concession $600K–$750K. Principal place of residence only</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$10,000</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-medium">QLD</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">Full concession up to $550K; graduated reduction $550K–$700K. Home concession also applies</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$30,000</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2 border border-slate-200 font-medium">WA</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">Full exemption up to $450K (established); concession $450K–$600K. New homes up to $600K exempt</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$10,000</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-medium">SA</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">No FHB stamp duty exemption. General concessional rates apply. Check RevenueSA</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$15,000</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2 border border-slate-200 font-medium">ACT</td>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">No stamp duty exemption; income-tested household support scheme may reduce duty for eligible FHBs</td>
                    <td className="px-3 py-2 border border-slate-200 text-right">$0 (abolished)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 italic mt-3">
              Thresholds and grant amounts as of {CURRENT_YEAR} — subject to state budget changes.
              Verify with your state revenue office before purchase.
            </p>
          </section>

          {/* ── Section 10: Timeline ── */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Typical timeline: from saving to settlement
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              For most first home buyers, the journey from &ldquo;starting to save seriously&rdquo;
              to holding the keys takes 12–36 months depending on income, savings rate, and target
              price. Here is a rough sequence:
            </p>
            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">1</span>
                <div>
                  <p className="font-semibold">Set your target property price and required deposit</p>
                  <p className="text-slate-500 text-xs mt-0.5">Research your target suburb, estimate purchase price, calculate 5% vs 20% deposit needed, and decide whether to pursue FHBG or save to 20%.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">2</span>
                <div>
                  <p className="font-semibold">Open a dedicated savings account and set up FHSS contributions</p>
                  <p className="text-slate-500 text-xs mt-0.5">High-interest savings account for short-term money; voluntary super contributions via FHSS for the tax benefit. Automate transfers on payday.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">3</span>
                <div>
                  <p className="font-semibold">Hit your genuine savings threshold (3 months)</p>
                  <p className="text-slate-500 text-xs mt-0.5">Maintain 5% of your target purchase price in your account for at least 3 continuous months to satisfy lender genuine savings requirements.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">4</span>
                <div>
                  <p className="font-semibold">Get a pre-approval (conditional approval) from a lender</p>
                  <p className="text-slate-500 text-xs mt-0.5">Pre-approval gives you a borrowing limit and shows vendors you are serious. Valid for 3–6 months typically. Use a mortgage broker to compare options.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">5</span>
                <div>
                  <p className="font-semibold">Search, inspect, make an offer, sign contracts (exchange)</p>
                  <p className="text-slate-500 text-xs mt-0.5">Active search typically takes 2–6 months. Cooling-off period (5 days in NSW/QLD/VIC) applies for private sales. Building inspection before exchange.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">6</span>
                <div>
                  <p className="font-semibold">Settlement (typically 30–90 days after exchange)</p>
                  <p className="text-slate-500 text-xs mt-0.5">Final loan drawdown, remaining balance paid, keys collected. FHSS funds must be released before or shortly after exchange.</p>
                </div>
              </li>
            </ol>
          </section>

          {/* ── Section 11: FAQ ── */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group border border-slate-200 rounded-xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-slate-900 font-semibold text-sm hover:bg-slate-50 transition-colors list-none">
                    <span>{item.q}</span>
                    <span className="ml-3 flex-shrink-0 text-slate-400 group-open:rotate-180 transition-transform">
                      &#x25BE;
                    </span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* ── CTA box ── */}
          <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Ready to start saving?
            </h2>
            <p className="text-slate-700 text-sm leading-relaxed mb-4">
              Compare high-interest savings accounts to maximise your deposit growth, and find
              a mortgage broker who can advise on FHBG eligibility, FHSS, and the right loan
              structure for your situation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/best/savings"
                className="inline-block px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-sm"
              >
                Compare savings accounts &rarr;
              </Link>
              <Link
                href="/find-advisor"
                className="inline-block px-5 py-2.5 border border-emerald-700 text-emerald-700 hover:bg-emerald-50 font-semibold rounded-lg text-sm"
              >
                Find a mortgage broker &rarr;
              </Link>
            </div>
          </section>

          {/* ── Related guides ── */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Related guides</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <Link
                href="/first-home-buyer"
                className="block bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
              >
                <p className="font-semibold text-slate-900 text-sm mb-1">First Home Buyer Hub</p>
                <p className="text-xs text-slate-500">All first home buyer guides, calculators and grants in one place</p>
              </Link>
              <Link
                href="/grants"
                className="block bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
              >
                <p className="font-semibold text-slate-900 text-sm mb-1">Government Grants</p>
                <p className="text-xs text-slate-500">FHOG, HomeBuilder, state stamp duty exemptions — all in one place</p>
              </Link>
              <Link
                href="/best/savings"
                className="block bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
              >
                <p className="font-semibold text-slate-900 text-sm mb-1">Best Savings Accounts</p>
                <p className="text-xs text-slate-500">Current rates on high-interest savings accounts and term deposits</p>
              </Link>
            </div>
          </section>

          {/* ── Compliance footer ── */}
          <footer className="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-6">
            <p className="mb-2">{GENERAL_ADVICE_WARNING}</p>
            <p>
              Deposit, LMI, stamp duty, and grant figures are indicative as of {CURRENT_YEAR} and
              subject to change. Lender policies on genuine savings, LMI premiums, and government
              scheme eligibility vary and are updated regularly. Always verify current requirements
              with your lender, mortgage broker, or state revenue office before making any financial
              decisions.
            </p>
          </footer>

        </div>
      </main>
    </>
  );
}
