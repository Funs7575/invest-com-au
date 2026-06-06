/**
 * Positive Gearing Guide — comprehensive explainer for Australian property investors.
 *
 * Covers: definition, positive vs negative gearing comparison, regional markets,
 * cash-flow calculations, cost structures, the equity inflection point, strategies
 * (regional, commercial, granny flats, holiday lets, student accommodation),
 * tax treatment, the cash-flow vs capital-growth trade-off, depreciation's role,
 * and 6 FAQ accordions.
 *
 * Compliance posture: general information only — no personal advice, no credit
 * assistance. Mortgage queries directed to /advisors/mortgage-brokers only.
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

const PAGE_TITLE = `Positive Gearing: Australian Property Guide (${CURRENT_YEAR})`;
const PAGE_DESC =
  "What is positive gearing? How to calculate cash flow, where to find positively geared properties in Australia, tax treatment of surplus rental income, and the cash-flow vs capital-growth trade-off. General information only.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: absoluteUrl("/property/positive-gearing") },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: absoluteUrl("/property/positive-gearing"),
    type: "article",
  },
  twitter: { card: "summary_large_image", title: PAGE_TITLE, description: PAGE_DESC },
};

// ─── FAQ data ──────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Is positive gearing better than negative gearing?",
    a: "Neither is universally better — they suit different investor profiles and goals. Positive gearing produces immediate cash flow (extra money in your pocket each week) and lower financial risk because the property pays for itself. Negative gearing produces a tax deduction against other income, and is typically used by investors who expect strong capital growth to outweigh the weekly shortfall. High-yield regional properties are more likely to be positively geared; inner-city Sydney and Melbourne properties are usually negatively geared at current purchase prices and interest rates. The right choice depends on your income tax rate, cash-flow needs, and growth expectations.",
  },
  {
    q: "How much deposit do I need to achieve positive gearing?",
    a: "The required deposit depends on the property price, rent, and interest rate. Using the worked example in this guide (a $450,000 property renting at $450/week), annual rent is $23,400 and annual costs excluding interest are approximately $7,540. To break even, your annual interest bill must be no more than $15,860 — which at 6.5% means a loan of no more than $243,846. That requires a deposit (and equity) of at least $206,154, or about 46% of the purchase price. Lower-priced properties, higher-yield areas, or lower interest rates reduce the required deposit significantly. A mortgage broker can model the exact numbers for your target property.",
  },
  {
    q: "Do I pay tax on positive gearing income?",
    a: "Yes. Net rental income (gross rent minus all deductible expenses including depreciation) is added to your other assessable income and taxed at your marginal rate. If the property is in both partners' names, the income is split according to ownership percentage, which can reduce the total tax if one partner is in a lower bracket. Depreciation deductions (Division 40 for plant/equipment and Division 43 for the building structure) can significantly reduce — or eliminate — the taxable surplus from a positively geared property, effectively producing a tax-neutral outcome even though cash flow is positive.",
  },
  {
    q: "Can I make a positively geared property from an existing negatively geared one?",
    a: "Yes — in several ways. Paying down principal reduces your loan balance and therefore your interest costs, eventually tipping the cash flow positive. Improving the property (granny flat, additional bedroom, cosmetic renovation) can increase rent above what the cost improvement adds to outgoings. Switching from principal-and-interest to interest-only reduces cash outflow temporarily (though it does not reduce the loan balance). Refinancing to a lower interest rate directly reduces the main cost. None of these are personal recommendations — model the numbers for your specific property and circumstances.",
  },
  {
    q: "What Australian regions typically produce positively geared properties?",
    a: "As at mid-2026, rental yields tend to be highest in regional Queensland (Townsville, Mackay, Rockhampton, Gladstone), regional Western Australia (Karratha, Port Hedland, Geraldton), regional New South Wales (Broken Hill, Dubbo, Tamworth, Orange), and parts of regional South Australia (Whyalla, Port Augusta). Mining-town yields can be very high (8-10%+) but carry elevated vacancy and price-volatility risk. Toowoomba, Cairns, and Launceston have produced consistent yields with more stable demand. Inner-city Sydney and Melbourne, and the Sunshine Coast/Gold Coast, have low gross yields (2.5–3.5%) that are almost never positively geared at current prices without a large deposit.",
  },
  {
    q: "Does depreciation make a positively geared property tax-free?",
    a: "Depreciation can turn a positively geared property tax-neutral or even into a paper loss for tax purposes, even though cash flow remains positive. Division 43 (building allowance, typically 2.5% p.a. of construction cost for post-1985 buildings) and Division 40 (plant and equipment — appliances, carpet, blinds, hot water systems) are non-cash deductions that reduce taxable income without reducing actual cash in your bank account. A quantity surveyor prepares a tax depreciation schedule, which your accountant then uses to claim the deductions. New and near-new properties have the largest depreciation pools; established properties built before 1985 have no Division 43 entitlement. This is general information — see your accountant for advice on your specific property.",
  },
];

// ─── Comparison table data ─────────────────────────────────────────────────────

interface ComparisonRow {
  attribute: string;
  positive: string;
  negative: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    attribute: "Cash flow",
    positive: "Positive — rent exceeds all holding costs each week",
    negative: "Negative — holding costs exceed rent; shortfall from your pocket",
  },
  {
    attribute: "Tax treatment",
    positive: "Net surplus added to taxable income; taxed at marginal rate",
    negative: "Net loss deducted against other income; reduces tax bill",
  },
  {
    attribute: "Wealth building",
    positive: "Cash flow re-deployed to pay down debt or invest elsewhere",
    negative: "Relies on capital growth to justify the annual cash shortfall",
  },
  {
    attribute: "Risk profile",
    positive: "Lower: property self-funds; vacancy periods are manageable",
    negative: "Higher: vacancy or rate rises compound the cash shortfall",
  },
  {
    attribute: "Suitable investor profile",
    positive: "Lower-income earners; retirees; investors needing cash flow",
    negative: "High-income earners (37-47% marginal rate) with spare cash flow",
  },
  {
    attribute: "Typical markets",
    positive: "Regional QLD/WA/NSW; mining towns; commercial property",
    negative: "Inner Sydney; inner Melbourne; premium beachside suburbs",
  },
];

// ─── Strategies data ──────────────────────────────────────────────────────────

interface Strategy {
  title: string;
  description: string;
  typicalYield: string;
  note: string;
}

const STRATEGIES: Strategy[] = [
  {
    title: "High-yield regional residential",
    description:
      "Regional towns in QLD, WA, and NSW where median prices are lower but rents remain strong due to local employment (mining, agriculture, healthcare). Gross yields of 6–9% are achievable.",
    typicalYield: "6–9% gross",
    note: "Higher vacancy risk in single-industry towns. Research local employment base.",
  },
  {
    title: "Commercial property",
    description:
      "Offices, retail, and industrial properties typically yield 5–7% — well above residential. Tenants pay outgoings (rates, insurance, maintenance) under net leases, boosting effective net yield.",
    typicalYield: "5–7% gross (net leases common)",
    note: "Longer vacancy periods possible. Requires larger deposits and commercial financing.",
  },
  {
    title: "Granny flat addition",
    description:
      "Adding a secondary dwelling to an existing property can generate $250–$450/week in additional rent from the same land cost. Many councils now offer streamlined approvals for compliant granny flats.",
    typicalYield: "+$13k–$23k/yr additional income",
    note: "Check zoning, council requirements, and strata by-laws. Construction costs $100k–$200k.",
  },
  {
    title: "Short-stay / holiday let (Airbnb)",
    description:
      "In high-demand tourist regions, short-stay platforms can generate 2–3x the equivalent long-term rent. Management intensity and platform fees (15–20%) must be factored into the net yield.",
    typicalYield: "Varies widely — 8–15% in premium locations",
    note: "Council short-stay regulations are tightening in many LGAs. Factor in occupancy risk.",
  },
  {
    title: "Student accommodation",
    description:
      "Properties near major universities rented per-room (HMO model) can achieve aggregate yields of 6–8% vs 3–4% for single-family tenancy. Management is more intensive.",
    typicalYield: "6–8% gross (HMO model)",
    note: "Occupancy drops significantly in semester breaks and during university-capacity contractions.",
  },
];

// ─── Cost breakdown ────────────────────────────────────────────────────────────

interface CostItem {
  label: string;
  amount: number;
  note: string;
}

const COST_ITEMS: CostItem[] = [
  { label: "Loan interest ($350K @ 6.5% p.a.)", amount: 22750, note: "Largest cost by far" },
  { label: "Property management (10.2% of rent)", amount: 2387, note: "~10–12% varies by agent" },
  { label: "Council rates", amount: 1800, note: "Varies by council" },
  { label: "Landlord insurance", amount: 1400, note: "Typically $1,200–$1,800" },
  { label: "Maintenance & repairs", amount: 2000, note: "Budget ~1% of value p.a." },
];

const TOTAL_COSTS = COST_ITEMS.reduce((sum, item) => sum + item.amount, 0); // 30_337
const ANNUAL_RENT = 450 * 52; // 23_400
const NET_CASH_FLOW = ANNUAL_RENT - TOTAL_COSTS; // −6_937

// ─── JSON-LD ───────────────────────────────────────────────────────────────────

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Property", url: absoluteUrl("/property") },
  { name: "Positive Gearing", url: absoluteUrl("/property/positive-gearing") },
]);

const faqSchema = faqJsonLd(FAQS);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default function PositiveGearingPage() {
  return (
    <>
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

      <main className="bg-white text-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-800">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/property" className="hover:text-slate-800">Property</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Positive Gearing</span>
          </nav>

          {/* Hero */}
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-3">
              Property investing &middot; {UPDATED_LABEL}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Positive gearing: the complete Australian guide ({CURRENT_YEAR})
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              A positively geared property earns more in rent than it costs to hold — putting
              money into your pocket rather than drawing from it. This guide explains the maths,
              where to find such properties in Australia, the tax treatment, and the trade-offs
              versus capital-growth investing.
            </p>
            <p className="mt-4 text-xs text-slate-500 italic">
              General information only &mdash; not financial or tax advice. See your accountant
              and a licensed financial adviser for advice tailored to your circumstances.
            </p>
          </header>

          {/* What is positive gearing */}
          <section className="mb-10" id="what-is-positive-gearing">
            <h2 className="text-2xl font-bold mb-4">What is positive gearing?</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              A property is <strong>positively geared</strong> when the rental income it
              generates exceeds <em>all</em> holding costs: loan interest, council rates,
              landlord insurance, property management fees, and maintenance. The surplus is
              net rental profit — real, spendable cash flow after every bill is paid.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              The term &ldquo;gearing&rdquo; simply means borrowing to invest. Gearing is
              positive when the asset earns more than the cost of the borrowed money used to
              fund it. Gearing is negative when the reverse is true.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-4">
              <p className="font-semibold text-emerald-900 mb-1">The simple test:</p>
              <p className="text-emerald-800 font-mono text-sm">
                Annual rent &minus; (interest + rates + insurance + management + maintenance)
                = positive number
              </p>
              <p className="text-xs text-emerald-700 mt-2">
                If the result is positive, the property is positively geared.
                If negative, it is negatively geared.
              </p>
            </div>
            <p className="text-slate-700 leading-relaxed">
              Do not confuse positive gearing with <em>positive cash flow after tax</em>.
              Depreciation deductions can turn a negatively geared property into a positive
              after-tax position without changing the pre-tax cash deficit. Likewise, positive
              gearing produces taxable income, and the after-tax surplus is smaller than
              the pre-tax surplus.
            </p>
          </section>

          {/* Comparison table */}
          <section className="mb-10" id="positive-vs-negative">
            <h2 className="text-2xl font-bold mb-4">Positive vs negative gearing — comparison</h2>
            <p className="text-slate-700 mb-5 leading-relaxed">
              The table below compares the two strategies across six dimensions that matter
              most to Australian property investors.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-600 text-xs w-1/4">
                      Attribute
                    </th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-emerald-700 text-xs">
                      Positive gearing
                    </th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-500 text-xs">
                      Negative gearing
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.attribute}
                      className={
                        i % 2 === 0
                          ? "border-b border-slate-100"
                          : "bg-slate-50 border-b border-slate-100"
                      }
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800 text-xs align-top">
                        {row.attribute}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs align-top">
                        {row.positive}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs align-top">
                        {row.negative}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3 italic">
              General information only. Tax outcomes depend on your personal circumstances.
            </p>
          </section>

          {/* Where positive gearing is easier to find */}
          <section className="mb-10" id="where-to-find">
            <h2 className="text-2xl font-bold mb-4">
              Where is positive gearing easier — and harder — to find?
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Positive gearing is a function of yield: the ratio of annual rent to purchase
              price. A $450,000 property renting at $450/week has a gross yield of 5.2%.
              A $2,000,000 property renting at $1,200/week has a gross yield of 3.1%. At
              6.5% interest on a 70% LVR loan, positive gearing is impossible on the
              second property without a very large deposit; it is achievable on the first.
            </p>

            <h3 className="text-lg font-semibold mb-2 mt-6">
              Where yields are typically low (hard to achieve positive gearing)
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-5">
              <li>
                <strong>Inner Sydney and eastern suburbs</strong> &mdash; gross yields of
                2.5–3.5% on median house prices of $1.5M–$4M+. Virtually impossible to
                positively gear without a 50%+ deposit.
              </li>
              <li>
                <strong>Inner Melbourne (Fitzroy, Richmond, South Yarra)</strong> &mdash;
                similar story: median prices $1M–$2M with yields below 3%.
              </li>
              <li>
                <strong>Sunshine Coast and Gold Coast prestige</strong> &mdash; prices
                have risen faster than rents; yields 3–4%.
              </li>
            </ul>

            <h3 className="text-lg font-semibold mb-2">
              Where positive gearing is more attainable
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-4">
              <li>
                <strong>Regional Queensland</strong> &mdash; Townsville, Mackay,
                Rockhampton, Gladstone, Toowoomba, Cairns. Median prices $350k–$550k;
                gross yields 6–9% not uncommon, driven by healthcare, mining, and
                education employment.
              </li>
              <li>
                <strong>Western Australia mining towns</strong> &mdash; Karratha, Port
                Hedland, Newman. Yields can exceed 10% during mining booms but with
                elevated vacancy and price-cycle risk when commodity cycles turn.
              </li>
              <li>
                <strong>Regional New South Wales</strong> &mdash; Broken Hill, Dubbo,
                Tamworth, Orange, Wagga Wagga. Lower prices, stable government and
                healthcare employment, yields 5–7%.
              </li>
              <li>
                <strong>Regional South Australia</strong> &mdash; Whyalla, Port Augusta,
                Port Pirie. Affordable entry prices and consistent industrial/healthcare
                demand produce yields of 6–8%.
              </li>
              <li>
                <strong>Tasmania</strong> &mdash; Launceston and regional centres have
                median prices well below $500k with yields improving after the rapid
                post-COVID price correction.
              </li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <strong>Research tip:</strong> High yield is not sufficient justification for
              a purchase decision. Vacancy rate, population trend, local industry
              diversity, and liquidity (how long it takes to resell) matter as much as
              the yield number. A 9% yield on a property that sits vacant for 3 months
              per year is worse than a 6% yield on a property with near-zero vacancy.
            </div>
          </section>

          {/* Cash flow calculation */}
          <section className="mb-10" id="cash-flow-calculation">
            <h2 className="text-2xl font-bold mb-4">How to calculate cash flow: gross vs net yield</h2>

            <h3 className="text-lg font-semibold mb-2">Gross yield</h3>
            <p className="text-slate-700 leading-relaxed mb-3">
              Gross yield is the starting point — the simplest measure of how much rent a
              property produces relative to its price, before deducting any costs.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm mb-4">
              Gross yield = (Annual rent &divide; Property price) &times; 100
            </div>

            <h3 className="text-lg font-semibold mb-2">Net yield</h3>
            <p className="text-slate-700 leading-relaxed mb-3">
              Net yield deducts ongoing costs (excluding financing) from annual rent before
              dividing by the property price. It tells you what the property earns before
              considering how much debt you have on it.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm mb-4">
              Net yield = ((Annual rent &minus; Annual costs excl. interest) &divide;
              Property price) &times; 100
            </div>

            <h3 className="text-lg font-semibold mb-3 mt-6">Worked example</h3>
            <p className="text-slate-700 mb-4">
              A $450,000 house in regional Queensland rents for $450/week. The investor
              borrows $350,000 at 6.5% p.a. interest-only, putting in a $100,000 deposit.
            </p>

            {/* Income */}
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="bg-emerald-50 border-b border-slate-200 px-4 py-2">
                <p className="font-semibold text-emerald-800 text-sm">Income</p>
              </div>
              <div className="px-4 py-3 flex justify-between text-sm border-b border-slate-100">
                <span className="text-slate-700">Gross weekly rent</span>
                <span className="font-semibold text-slate-900">$450 / week</span>
              </div>
              <div className="px-4 py-3 flex justify-between text-sm bg-emerald-50">
                <span className="font-semibold text-emerald-800">Annual gross rent</span>
                <span className="font-bold text-emerald-800">{formatCurrency(ANNUAL_RENT)} / year</span>
              </div>
            </div>

            {/* Costs */}
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
                <p className="font-semibold text-slate-700 text-sm">Annual costs</p>
              </div>
              {COST_ITEMS.map((item, i) => (
                <div
                  key={item.label}
                  className={`px-4 py-3 flex justify-between items-start text-sm ${
                    i < COST_ITEMS.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  <div>
                    <span className="text-slate-700">{item.label}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{item.note}</p>
                  </div>
                  <span className="text-slate-800 font-medium shrink-0 ml-4">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
              <div className="px-4 py-3 flex justify-between text-sm bg-slate-50 border-t border-slate-200">
                <span className="font-semibold text-slate-800">Total annual costs</span>
                <span className="font-bold text-slate-900">{formatCurrency(TOTAL_COSTS)}</span>
              </div>
            </div>

            {/* Net position */}
            <div
              className={`rounded-xl border px-4 py-4 flex justify-between items-center ${
                NET_CASH_FLOW >= 0
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div>
                <p className="font-bold text-sm text-slate-800">Net annual cash flow</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatCurrency(ANNUAL_RENT)} rent &minus; {formatCurrency(TOTAL_COSTS)} costs
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-xl font-extrabold ${
                    NET_CASH_FLOW >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {NET_CASH_FLOW < 0 ? "-" : "+"}{formatCurrency(NET_CASH_FLOW)}
                </p>
                <p className="text-xs text-slate-500">
                  ({NET_CASH_FLOW < 0 ? "negatively geared" : "positively geared"})
                </p>
              </div>
            </div>

            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700">
              <p className="font-semibold mb-2">Gross and net yield summary:</p>
              <ul className="space-y-1">
                <li>
                  <strong>Gross yield:</strong> ({formatCurrency(ANNUAL_RENT)} &divide;
                  $450,000) &times; 100 = <strong>5.20%</strong>
                </li>
                <li>
                  <strong>Net yield (excl. interest):</strong> (({formatCurrency(ANNUAL_RENT)}
                  &nbsp;&minus; $7,587) &divide; $450,000) &times; 100 = <strong>3.52%</strong>
                </li>
                <li className="text-slate-500 text-xs mt-2">
                  At 6.5% interest on a $350k loan, the interest cost alone (
                  {formatCurrency(22750)}) exceeds the net income, making this property
                  negatively geared in this scenario.
                </li>
              </ul>
            </div>
          </section>

          {/* The inflection point */}
          <section className="mb-10" id="inflection-point">
            <h2 className="text-2xl font-bold mb-4">
              The cash-flow inflection point: how much equity do you need?
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Using the $450,000 / $450/week example above, the property covers its own
              non-interest costs ({formatCurrency(TOTAL_COSTS - 22750)} per year) and leaves
              a net income of approximately {formatCurrency(ANNUAL_RENT - (TOTAL_COSTS - 22750))}
              &nbsp;to service debt. Dividing by 6.5%:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm mb-4">
              Maximum interest-neutral loan = {formatCurrency(ANNUAL_RENT - (TOTAL_COSTS - 22750))} &divide; 6.5% ={" "}
              <strong>{formatCurrency(Math.round((ANNUAL_RENT - (TOTAL_COSTS - 22750)) / 0.065))}</strong>
            </div>
            <p className="text-slate-700 leading-relaxed mb-4">
              To be positively geared, your loan must be below approximately{" "}
              <strong>{formatCurrency(Math.round((ANNUAL_RENT - (TOTAL_COSTS - 22750)) / 0.065))}</strong> on
              this $450,000 property — meaning a deposit and equity of at least{" "}
              <strong>
                {formatCurrency(450000 - Math.round((ANNUAL_RENT - (TOTAL_COSTS - 22750)) / 0.065))}
              </strong>{" "}
              (around{" "}
              {Math.round(
                ((450000 - Math.round((ANNUAL_RENT - (TOTAL_COSTS - 22750)) / 0.065)) /
                  450000) *
                  100
              )}
              % of the purchase price).
            </p>
            <p className="text-slate-700 leading-relaxed">
              The inflection point shifts with every change in interest rates or rent. A
              rent increase from $450 to $500/week extends the maximum neutral loan by
              roughly {formatCurrency(Math.round((50 * 52) / 0.065))}. This is why
              experienced investors model scenarios across a range of rates and rent
              assumptions, not just the current numbers.
            </p>
            <p className="mt-4 text-xs text-slate-500 italic">
              For personalised loan modelling, speak with a mortgage broker at{" "}
              <Link href="/advisors/mortgage-brokers" className="text-emerald-700 underline">
                /advisors/mortgage-brokers
              </Link>
              . This page provides general information only and is not credit assistance.
            </p>
          </section>

          {/* Strategies */}
          <section className="mb-10" id="strategies">
            <h2 className="text-2xl font-bold mb-4">
              Strategies for achieving positive gearing in Australia
            </h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              There are five main strategies Australian property investors use to achieve
              positive cash flow. Each has different risk profiles, management demands, and
              capital requirements.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {STRATEGIES.map((s) => (
                <div
                  key={s.title}
                  className="border border-slate-200 rounded-xl p-5 bg-white"
                >
                  <h3 className="font-bold text-slate-900 text-base mb-1">{s.title}</h3>
                  <p className="text-xs text-emerald-700 font-semibold mb-2">
                    Typical yield: {s.typicalYield}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    {s.description}
                  </p>
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    {s.note}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Tax treatment */}
          <section className="mb-10" id="tax-treatment">
            <h2 className="text-2xl font-bold mb-4">Tax treatment of positive gearing income</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Unlike negative gearing (where the loss reduces your tax), positive gearing
              creates <strong>taxable income</strong>. The net rental surplus — annual rent
              minus all allowable deductions — is added to your other assessable income
              (salary, business income, etc.) and taxed at your marginal rate.
            </p>

            <h3 className="text-lg font-semibold mb-2">How it appears in your tax return</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              You declare rental income at Item 21 (Rent) of your individual tax return.
              All allowable deductions (interest, rates, insurance, management fees,
              repairs, depreciation) are listed against that income. If the net result is
              positive, it adds to your taxable income. If you own the property jointly,
              each owner declares their proportional share.
            </p>

            <h3 className="text-lg font-semibold mb-3">Example tax impact</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-600 text-xs">
                      Scenario
                    </th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">
                      Net surplus
                    </th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">
                      Marginal rate
                    </th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">
                      Tax owed
                    </th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">
                      After-tax surplus
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { scenario: "Investor in 32.5% bracket", surplus: 8000, rate: 0.325 },
                    { scenario: "Investor in 37% bracket", surplus: 8000, rate: 0.37 },
                    { scenario: "Investor in 47% bracket (incl. Medicare)", surplus: 8000, rate: 0.47 },
                    { scenario: "Investor in 19% bracket", surplus: 8000, rate: 0.19 },
                  ].map((row) => (
                    <tr key={row.scenario} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-700 text-xs">{row.scenario}</td>
                      <td className="px-4 py-3 text-right text-slate-800 font-medium text-xs">
                        {formatCurrency(row.surplus)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 text-xs">
                        {(row.rate * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 text-xs font-medium">
                        {formatCurrency(Math.round(row.surplus * row.rate))}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-semibold text-xs">
                        {formatCurrency(Math.round(row.surplus * (1 - row.rate)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 italic">
              Illustrative only. Assumes $8,000 net rental surplus before depreciation.
              Tax rates are 2025&ndash;26. Does not account for PAYG, offsets, or
              Medicare Levy Surcharge. See your accountant for your actual position.
            </p>
          </section>

          {/* Depreciation section */}
          <section className="mb-10" id="depreciation">
            <h2 className="text-2xl font-bold mb-4">
              Depreciation&apos;s role: turning positive gearing tax-neutral
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Depreciation is a non-cash deduction that reduces taxable income without
              reducing actual cash flow. There are two types relevant to investment property:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-slate-700 mb-5">
              <li>
                <strong>Division 43 (building structure allowance):</strong> 2.5% p.a. of
                the original construction cost of buildings built after 16 September 1987
                (2.5% for most; 4% for certain structures). On a $300,000 construction
                cost, that is $7,500/year in non-cash deductions for up to 40 years.
              </li>
              <li>
                <strong>Division 40 (plant and equipment):</strong> Depreciates
                &ldquo;removable&rdquo; items — appliances, carpet, blinds, hot water
                systems, air conditioning — at ATO-prescribed effective life rates. New
                properties or properties with recent renovations have the largest pools.
                Note: legislation from 1 July 2017 restricts second-hand plant and
                equipment claims for residential properties purchased from that date (the
                claim passes to the vendor, not the purchaser, on established properties).
              </li>
            </ul>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
              <p className="font-semibold text-slate-800 mb-2">Illustrative impact:</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                A new $450,000 property with a construction cost of $280,000 generates
                $7,000/year in Division 43 deductions plus perhaps $3,500 in Division 40
                deductions in Year 1 = $10,500 total depreciation. If the pre-depreciation
                net rental surplus is $8,000, the depreciation wipes it out entirely and
                produces a $2,500 <em>paper loss</em> (deductible against other income)
                while the investor still pockets the $8,000 in cash. This is the mechanism
                behind &ldquo;tax-effective&rdquo; property investing.
              </p>
            </div>
            <p className="text-xs text-slate-500 italic">
              A quantity surveyor prepares the depreciation schedule. Their fee is itself
              tax-deductible. Older properties (pre-1985 buildings) have no Division 43
              entitlement. General information only &mdash; see your accountant.
            </p>
          </section>

          {/* Cash flow vs capital growth */}
          <section className="mb-10" id="cash-flow-vs-growth">
            <h2 className="text-2xl font-bold mb-4">
              The debate: positive cash flow vs capital growth
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              There is an observable trade-off in Australian property markets between yield
              (cash flow) and capital growth. The markets where properties are most easily
              positively geared &mdash; regional mining towns, outer suburban areas, smaller
              cities &mdash; have historically delivered lower long-run capital growth than
              inner-city Sydney and Melbourne, where yields are too low for positive gearing
              but where 20-year median price growth has been significant.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-600 text-xs">Factor</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-emerald-700 text-xs">High yield / positive gearing</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-500 text-xs">Low yield / capital growth</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Immediate income", "Strong weekly cash flow from day one", "Nil or negative; subsidised from salary"],
                    ["Long-run growth", "Lower historical growth in regional/mining markets", "Higher historical growth in major capitals"],
                    ["Portfolio expansion", "Cash flow helps fund next deposit without salary", "Salary must fund both shortfall and next deposit"],
                    ["Interest rate risk", "Lower risk: property self-funds at higher rates", "Higher risk: shortfall widens with rate rises"],
                    ["Wealth at 20 years", "Depends on reinvestment of cash flow", "Depends on growth rate actually materialising"],
                  ].map(([factor, yieldCol, growthCol], i) => (
                    <tr key={factor} className={i % 2 === 0 ? "border-b border-slate-100" : "bg-slate-50 border-b border-slate-100"}>
                      <td className="px-4 py-3 font-semibold text-slate-700 text-xs align-top">{factor}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs align-top">{yieldCol}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs align-top">{growthCol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-slate-700 leading-relaxed">
              Neither approach is universally superior. Investors in lower tax brackets
              benefit less from negative gearing deductions; investors who need their
              portfolio to be self-sustaining (e.g. retired, or with limited surplus
              income) typically prefer positive cash flow. Some sophisticated investors
              combine both: a cash-flow property to fund holding costs of a high-growth
              asset in a major city.
            </p>
          </section>

          {/* NCCP note */}
          <section className="mb-10">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-semibold text-blue-900 mb-2">Mortgage and finance queries</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                If you are working out how much to borrow, comparing loan structures for
                an investment property, or exploring refinancing options to improve cash
                flow, a licensed mortgage broker can model the numbers for your specific
                situation. We do not provide credit assistance on this site.
              </p>
              <Link
                href="/advisors/mortgage-brokers"
                className="inline-block mt-3 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg"
              >
                Compare mortgage brokers &rarr;
              </Link>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-10" id="faq">
            <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <details
                  key={i}
                  className="group border border-slate-200 rounded-xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none bg-white hover:bg-slate-50 transition-colors">
                    <span className="font-semibold text-slate-900 text-sm pr-4">
                      {faq.q}
                    </span>
                    <span
                      className="shrink-0 text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <div className="px-5 py-4 text-sm text-slate-600 leading-relaxed bg-slate-50 border-t border-slate-200">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Related links */}
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Related guides</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { href: "/tax/negative-gearing", label: "Negative gearing guide", desc: "How negative gearing works and when it makes sense" },
                { href: "/property/finance", label: "Investment loan comparison", desc: "Compare investment loan rates from major lenders" },
                { href: "/advisors/mortgage-brokers", label: "Mortgage brokers", desc: "Find a licensed mortgage broker for personalised rate comparisons" },
                { href: "/property", label: "Property investing hub", desc: "All property guides, tools, and calculators" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                >
                  <p className="font-semibold text-slate-900 text-sm mb-1">{link.label}</p>
                  <p className="text-xs text-slate-500">{link.desc}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Compliance footer */}
          <footer className="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-6">
            <p className="mb-2">{GENERAL_ADVICE_WARNING}</p>
            <p className="mb-2">
              Calculations in this guide use illustrative figures and current interest rate
              assumptions (6.5% p.a.) as at {UPDATED_LABEL}. Actual costs, yields, and tax
              outcomes will differ. All figures are for educational purposes only.
            </p>
            <p>
              Invest.com.au does not hold an Australian Credit Licence and does not provide
              credit assistance. Mortgage and loan enquiries should be directed to a
              licensed mortgage broker. See{" "}
              <Link href="/advisors/mortgage-brokers" className="underline hover:text-slate-700">
                /advisors/mortgage-brokers
              </Link>
              .
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
