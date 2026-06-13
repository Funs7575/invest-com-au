import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Investment Income Tax Australia (${CURRENT_YEAR}) — Dividends, Interest & Rent Guide`,
  description: `How dividends, interest, rent, and trust distributions are taxed in Australia. Franking credits, deductions, and marginal rates. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Investment Income Tax Australia (${CURRENT_YEAR}) — Complete Guide`,
    description:
      "How investment income is taxed in Australia — dividends (with franking credits), bank interest, rent, and ETF distributions. Deductions, marginal rates, and strategies.",
    url: `${SITE_URL}/tax/investment-income`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Investment Income Tax Australia")}&sub=${encodeURIComponent("Dividends · Interest · Rent · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/investment-income` },
};

// ─── Data ─────────────────────────────────────────────────────

const INCOME_TYPES = [
  {
    type: "Dividends (franked)",
    assessable: "Dividend + franking credit grossed-up",
    rate: "Marginal rate, offset by franking credit",
    note: "Refundable if credits exceed tax liability",
  },
  {
    type: "Dividends (unfranked)",
    assessable: "Full dividend amount",
    rate: "Marginal rate — no offset",
    note: "Common from foreign-listed shares",
  },
  {
    type: "Bank interest",
    assessable: "Full interest received",
    rate: "Marginal rate",
    note: "All accounts: savings, term deposits, offset",
  },
  {
    type: "Bonds / P2P lending",
    assessable: "Interest as received or accrued",
    rate: "Marginal rate",
    note: "Accruals basis may apply to some bonds",
  },
  {
    type: "Gross rental income",
    assessable: "Rent + insurance paid by tenant + bond kept",
    rate: "Marginal rate (less deductions)",
    note: "Short-term rental pro-rated to nights let",
  },
  {
    type: "Trust / ETF distributions — income",
    assessable: "Income component per tax statement",
    rate: "Marginal rate",
    note: "Include foreign income and FITO credits",
  },
  {
    type: "Trust / ETF distributions — CGT gains",
    assessable: "Net capital gain (may be discounted 50%)",
    rate: "Marginal rate on assessable portion",
    note: "Discount already applied by fund manager",
  },
  {
    type: "Capital gains",
    assessable: "Separate CGT event rules apply",
    rate: "Marginal rate (50% discount if 12+ months)",
    note: "See our Capital Gains Tax guide →",
    link: "/tax/capital-gains",
  },
];

const MARGINAL_RATES = [
  { income: "$0 – $18,200", rate: "0%", medicare: "0%", effective: "0%" },
  { income: "$18,201 – $45,000", rate: "16%", medicare: "2%", effective: "18%" },
  { income: "$45,001 – $135,000", rate: "30%", medicare: "2%", effective: "32%" },
  { income: "$135,001 – $190,000", rate: "37%", medicare: "2%", effective: "39%" },
  { income: "$190,001+", rate: "45%", medicare: "2%", effective: "47%" },
];

const DEDUCTIONS = [
  {
    item: "Interest on margin loans / investment loans",
    deductible: "Yes — fully deductible while loan is used to produce assessable income",
  },
  {
    item: "Brokerage and account fees",
    deductible: "Yes — annual custody/admin fees are deductible; brokerage on acquisition reduces cost base instead",
  },
  {
    item: "Investment advice fees",
    deductible: "Partial — ongoing advice fees on existing investments deductible; upfront/initial advice fees are not",
  },
  {
    item: "Tax agent and accountant fees",
    deductible: "Yes — fees to prepare your investment income tax return",
  },
  {
    item: "Depreciation on investment property",
    deductible: "Yes — building depreciation (Div 43) and plant/equipment (Div 40) for qualifying properties",
  },
  {
    item: "Borrowing costs (investment property)",
    deductible: "Yes — spread over loan term or 5 years (whichever is shorter)",
  },
  {
    item: "Landlord insurance and rates",
    deductible: "Yes — proportionate to rental period for mixed-use properties",
  },
  {
    item: "Home office for investment administration",
    deductible: "Limited — only actual direct costs attributable to investment record-keeping",
  },
];

const FAQS = [
  {
    q: "How is dividend income taxed in Australia?",
    a: "Dividends are included in your assessable income and taxed at your marginal income tax rate. For franked dividends, you gross up the dividend by the attached franking credit (e.g. a $700 fully franked dividend from a company that paid 30% company tax is grossed up to $1,000) and include the full $1,000 in income — then claim the $300 franking credit as a tax offset. If your franking credits exceed your total tax liability, the ATO refunds the excess as cash.",
  },
  {
    q: "Can I claim deductions against my dividend income?",
    a: "Yes. Interest on a margin loan used to buy dividend-paying shares is fully deductible against dividend (and other) income. Ongoing investment advice fees related to your portfolio are also deductible. However, brokerage paid when buying shares is a capital cost — it goes into your cost base and reduces your capital gain on disposal, rather than being a current-year deduction. Upfront financial advice fees (charged for initial advice and SOA preparation) are not deductible.",
  },
  {
    q: "Do I need to declare interest from savings accounts?",
    a: "Yes — all interest you receive from any bank, building society, credit union, term deposit, or online savings account must be declared. This includes interest from offset accounts linked to investment (but not owner-occupied) mortgages. The ATO pre-fills much of this data via data-matching with financial institutions, but pre-fill is not exhaustive — you must declare any interest not already appearing in myTax. Foreign bank interest must also be declared.",
  },
  {
    q: "How are ETF distributions taxed?",
    a: "ETF distributions can contain several components: ordinary income (interest, dividends), Australian franking credits, discounted capital gains (50% discount already applied by the fund manager before distributing), non-assessable amounts (return of capital), and foreign income with associated foreign income tax offsets (FITO). Each component is taxed differently. Your ETF provider issues an annual tax statement (usually by mid-July) that breaks down each component. Enter each component in the correct label in your tax return — do not simply enter the cash amount received.",
  },
  {
    q: "What records do I need to keep for investment income?",
    a: "You must keep records for five years from when you lodge the relevant tax return. Key records: dividend statements for each payment, distribution statements from managed funds and ETFs, bank statements showing interest received, brokerage confirmations for every buy and sell (needed for CGT), rental income and expense receipts (including depreciation schedules), and foreign income documents. The ATO's myTax pre-fill provides a useful starting point but is not a substitute for your own records — pre-fill data may arrive after lodgement deadlines for early lodgers.",
  },
];

const COMMON_MISTAKES = [
  {
    mistake: "Not grossing up franked dividends",
    detail:
      "You must include the franking credit in assessable income and then claim it as an offset. Declaring only the cash dividend understates income and may cause an ATO data-matching discrepancy.",
  },
  {
    mistake: "Forgetting bank interest from all accounts",
    detail:
      "Every account earns interest — even low-rate savings accounts. Check every institution, including accounts you rarely use. The ATO matches with hundreds of institutions; unexplained gaps trigger reviews.",
  },
  {
    mistake: "Not declaring foreign investment income",
    detail:
      "Australian tax residents pay tax on worldwide income. Foreign dividends, interest, and rental income must all be declared. You can claim a foreign income tax offset (FITO) for tax already paid overseas.",
  },
  {
    mistake: "Missing ETF distribution components",
    detail:
      "Entering only the cash distribution ignores franking credits, discounted capital gains, and foreign income components — all of which carry different tax treatment or offsets you're entitled to.",
  },
  {
    mistake: "Treating rental bond as non-assessable",
    detail:
      "A security bond is only non-assessable while the tenant could demand its return. If you retain the bond (e.g. for damage), it becomes assessable income in the year you become entitled to keep it.",
  },
  {
    mistake: "Claiming interest on a loan used for private purposes",
    detail:
      "If a loan is split between investment and private use (e.g. redraw for a holiday), only the investment portion of interest is deductible. Mixed-purpose loans require careful apportionment.",
  },
];

export default function InvestmentIncomeTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax", url: `${SITE_URL}/tax` },
    { name: "Investment Income Tax" },
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

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav
            aria-label="Breadcrumb"
            className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap"
          >
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span>/</span>
            <Link href="/tax" className="hover:text-slate-900">
              Tax
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Investment Income Tax</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Tax Guide &middot; {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Investment Income Tax Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
              Dividends, interest, rent, and trust distributions are all assessable income in
              Australia — added to your other income and taxed at your marginal rate. This guide
              covers how each income type is treated, how franking credits work, what you can
              deduct, and strategies to reduce the tax you pay.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                "Franking credits",
                "Interest income",
                "Rental income",
                "ETF distributions",
                "Deductions",
                "Tax rates",
                "Strategies",
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Key stats ─────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                Tax treatment
              </p>
              <p className="text-xl font-black text-amber-700">Marginal rate</p>
              <p className="text-xs text-slate-600 mt-1">
                All investment income is added to your other income and taxed at your marginal
                rate — up to 47% including Medicare Levy
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Franking credits
              </p>
              <p className="text-xl font-black text-slate-900">Refundable</p>
              <p className="text-xs text-slate-600 mt-1">
                If your franking credits exceed your total tax liability the ATO pays the excess
                to you as a cash refund
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Records required
              </p>
              <p className="text-xl font-black text-slate-900">5 years</p>
              <p className="text-xs text-slate-600 mt-1">
                Keep dividend statements, distribution tax statements, and bank records for five
                years from lodgement
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Income types table ────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container-custom">
          <div className="mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Income Types
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              How each type of investment income is taxed
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Every category below is assessable income — declared in your annual tax return and
              taxed at your marginal rate, unless a specific offset applies.
            </p>
          </div>
          <div className="overflow-x-auto max-w-4xl">
            <table className="w-full text-sm border-collapse" aria-label="How each type of investment income is taxed">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Income type</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">What&apos;s assessable</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Tax rate</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Key note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {INCOME_TYPES.map((row) => (
                  <tr key={row.type} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {row.type}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{row.assessable}</td>
                    <td className="py-3 px-4 text-xs text-slate-700">{row.rate}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {row.link ? (
                        <Link href={row.link} className="text-amber-700 hover:underline font-medium">
                          {row.note}
                        </Link>
                      ) : (
                        row.note
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2">
              FY2024–25 treatment. Verify current rules at ato.gov.au.
            </p>
          </div>
        </div>
      </section>

      {/* ── Franking credits deep-dive ───────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Franking Credits
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              How dividend imputation works
            </h2>
          </div>

          <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
            <p>
              Australia uses a dividend imputation system to avoid double-taxing company profits.
              When a company pays tax on its earnings at the corporate rate (30% for large
              companies, 25% for base-rate entities), it accumulates franking credits in a
              &ldquo;franking account.&rdquo; When it pays a dividend, it can attach (impute) those
              franking credits to the dividend.
            </p>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="text-base font-bold text-slate-900">Gross-up calculation</h3>
              <p>
                To calculate the grossed-up dividend — the amount that goes into your assessable
                income — use:
              </p>
              <div className="bg-slate-800 text-green-400 font-mono text-xs rounded-xl p-4">
                <p>Franking credit = Cash dividend × (company tax rate ÷ (1 − company tax rate))</p>
                <p className="mt-2">Grossed-up dividend = Cash dividend + Franking credit</p>
              </div>
              <p className="text-xs text-slate-500">
                For a large company paying 30% tax: franking credit = cash dividend × (0.30 ÷
                0.70) = cash dividend × 0.4286
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <h3 className="text-base font-bold text-amber-900">
                Worked example — $1,000 fully franked dividend
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-slate-800">The dividend</p>
                  <div className="flex justify-between border-b border-amber-200 pb-1">
                    <span>Cash dividend received</span>
                    <span className="font-mono font-bold">$1,000</span>
                  </div>
                  <div className="flex justify-between border-b border-amber-200 pb-1">
                    <span>Franking credit (30% company tax)</span>
                    <span className="font-mono font-bold">$428.57</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Grossed-up income</span>
                    <span className="font-mono">$1,428.57</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-slate-800">Tax at 32% marginal rate</p>
                  <div className="flex justify-between border-b border-amber-200 pb-1">
                    <span>Tax on grossed-up income (32%)</span>
                    <span className="font-mono font-bold">$457.14</span>
                  </div>
                  <div className="flex justify-between border-b border-amber-200 pb-1">
                    <span>Less franking credit offset</span>
                    <span className="font-mono font-bold text-green-700">−$428.57</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Net tax payable</span>
                    <span className="font-mono">$28.57</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                At a 16% marginal rate the franking credit ($428.57) exceeds the tax on the
                grossed-up income ($228.57), so the ATO refunds $200 in cash. This is the
                refundable nature of imputation credits.
              </p>
            </div>

            <p>
              Franking credits only attach to dividends paid out of Australian-taxed profits.
              Dividends from foreign companies carry no Australian franking credits (though a
              foreign income tax offset may apply for withholding tax paid). Shares held for
              fewer than 45 days around the ex-dividend date may have their franking credits
              denied under the holding period rule.
            </p>
          </div>
        </div>
      </section>

      {/* ── Interest income ───────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Interest Income
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              Bank accounts, term deposits, bonds, and P2P
            </h2>
          </div>

          <div className="space-y-5 text-sm text-slate-600 leading-relaxed">
            <p>
              Interest income is always fully assessable — there is no discount, offset, or
              exemption equivalent to the CGT 50% discount. Every dollar of interest you earn is
              added to your taxable income at your full marginal rate.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  label: "Bank savings accounts",
                  detail:
                    "Declared in year interest is credited. The ATO matches with financial institutions — undeclared interest triggers assessments.",
                },
                {
                  label: "Term deposits",
                  detail:
                    "Interest is assessable when received. A 12-month term deposit maturing on 1 July is declared in the new financial year.",
                },
                {
                  label: "Government and corporate bonds",
                  detail:
                    "Coupon interest is assessable when received. Discount on zero-coupon bonds accrues annually — you owe tax before you receive cash.",
                },
                {
                  label: "Margin lending interest received",
                  detail:
                    "Interest earned on a margin lending cash account is assessable — this is separate from interest you pay on the margin loan (which is deductible).",
                },
                {
                  label: "P2P lending",
                  detail:
                    "Returns from peer-to-peer lending platforms are interest income — fully assessable, declared in the year received.",
                },
                {
                  label: "Non-resident withholding tax",
                  detail:
                    "Non-resident investors pay a 10% withholding tax on Australian-sourced interest. Residents declare the gross amount and claim a credit for any tax withheld.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4"
                >
                  <p className="text-xs font-bold text-slate-800 mb-1">{item.label}</p>
                  <p className="text-xs text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
              <p className="font-bold mb-1">Received vs accrued basis</p>
              <p>
                Most individual investors declare interest on a &ldquo;received&rdquo; basis — when it
                lands in your account. Some bonds and structured products require an
                &ldquo;accruals&rdquo; basis, meaning you declare interest as it accrues even if not yet
                paid. Check the product disclosure statement or ask your tax agent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Rental income ─────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Rental Income
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              Gross rental receipts and what else counts
            </h2>
          </div>

          <div className="space-y-5 text-sm text-slate-600 leading-relaxed">
            <p>
              Rental income is the gross amount of rent you receive — not the net after expenses.
              You declare all rent received in the financial year (cash basis for most
              individuals) and then claim deductions separately. Getting this wrong in either
              direction causes problems: understating income is a compliance risk; overstating it
              means you miss deductions.
            </p>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">What counts as rental income</h3>
              <ul className="space-y-2 text-xs">
                {[
                  "Rental payments received during the income year",
                  "Rent paid in advance (assessable in the year received, not when it relates to)",
                  "Insurance payouts for rental income lost due to damage (assessable)",
                  "Tenant-paid insurance or utilities that should be your expense (assessable as rent-equivalent)",
                  "Security bond retained for damage or unpaid rent (assessable in the year you become entitled to keep it)",
                  "Goods or services received instead of cash rent (assessable at market value)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold mt-0.5 shrink-0">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Short-term rental (Airbnb / Stayz) pro-rata rules
              </h3>
              <p className="text-xs text-slate-600">
                If a property is only rented for part of the year, or only part of the property
                is rented (e.g. a spare bedroom), you must apportion income and expenses. The ATO
                accepts time-based apportionment (days available for rent ÷ total days) and
                floor-area apportionment (rented area ÷ total area). Only the proportionate share
                of expenses is deductible.
              </p>
              <div className="bg-slate-800 text-green-400 font-mono text-xs rounded-xl p-4">
                <p>Deductible % = (days rented ÷ days in year) × (rented area ÷ total area)</p>
                <p className="mt-2 text-slate-500">
                  Example: 90 days rented, 1 of 3 bedrooms = (90/365) × (1/3) = 8.2% of total
                  expenses
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Periods where the property is available but not rented (e.g. listed but vacant)
                may or may not be counted depending on genuine availability — the ATO scrutinises
                properties in popular holiday locations with implausibly low occupancy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Managed fund / ETF distributions ─────────────────── */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Managed Funds &amp; ETFs
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              How to read a trust distribution tax statement
            </h2>
          </div>

          <div className="space-y-5 text-sm text-slate-600 leading-relaxed">
            <p>
              Unlike dividends from direct shares, ETF and managed fund distributions can
              contain multiple components — each with a different tax treatment. Declaring only
              the cash amount you received misses credits you are entitled to and may leave
              income components incorrectly categorised.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" aria-label="ETF and managed fund distribution components and tax treatment">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th scope="col" className="text-left py-3 px-4 font-bold">Component</th>
                    <th scope="col" className="text-left py-3 px-4 font-bold">Tax treatment</th>
                    <th scope="col" className="text-left py-3 px-4 font-bold">Where to report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[
                    {
                      component: "Australian income (dividends, interest)",
                      treatment: "Assessable at marginal rate",
                      where: "Managed fund income label in tax return",
                    },
                    {
                      component: "Australian franking credits",
                      treatment: "Gross up income, claim as tax offset",
                      where: "Franking credits label",
                    },
                    {
                      component: "Discounted capital gains (CGT discount applied)",
                      treatment: "Assessable — discount already taken by fund manager",
                      where: "Managed fund capital gains label",
                    },
                    {
                      component: "Foreign income",
                      treatment: "Assessable at marginal rate",
                      where: "Foreign income label",
                    },
                    {
                      component: "Foreign income tax offsets (FITO)",
                      treatment: "Offset against tax on foreign income",
                      where: "Foreign tax offsets label",
                    },
                    {
                      component: "Non-assessable non-exempt (NANE) / return of capital",
                      treatment: "Not assessable — reduces your cost base in the fund",
                      where: "Not declared as income; adjusts CGT records",
                    },
                  ].map((row) => (
                    <tr key={row.component} className="bg-white hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.component}</td>
                      <td className="py-3 px-4 text-slate-600">{row.treatment}</td>
                      <td className="py-3 px-4 text-slate-500">{row.where}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
              <p className="font-bold mb-1">Annual tax statements</p>
              <p>
                ETF and managed fund providers issue an annual tax statement — usually by
                mid-July — that breaks down each distribution into its components. Most are
                available through your broker or fund manager&apos;s investor portal. The ATO&apos;s myTax
                pre-fill pulls in some fund data but may not include all components correctly;
                always cross-check with the official tax statement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Deductions ─────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Deductions
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              What you can deduct against investment income
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Deductions reduce your net assessable investment income, directly cutting your tax
              bill.
            </p>
          </div>

          <div className="space-y-3">
            {DEDUCTIONS.map((d) => (
              <div
                key={d.item}
                className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3"
              >
                <span className="text-green-600 font-bold text-sm shrink-0 mt-0.5">✓</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">{d.item}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{d.deductible}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Deductibility depends on individual circumstances. Confirm with a registered tax
            agent.
          </p>
        </div>
      </section>

      {/* ── Tax rates table ────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom">
          <div className="mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Tax Rates
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              Marginal tax rates 2024–25 (FY2025–26 new rates from 1 July 2024) // dated-ok — static historical/legal effective date (2026-06-11 sweep)
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Investment income is added to your other income (salary, business income) and taxed
              at the rate for your combined taxable income. The Low Income Tax Offset (LITO)
              effectively raises the tax-free threshold for residents.
            </p>
          </div>
          <div className="overflow-x-auto max-w-2xl">
            <table className="w-full text-sm border-collapse" aria-label="Australian marginal income tax rates 2024–25">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Taxable income</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Marginal rate</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Medicare levy</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">
                    Combined (incl. Medicare)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {MARGINAL_RATES.map((row) => (
                  <tr key={row.income} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-slate-700">{row.income}</td>
                    <td className="py-3 px-4 text-center text-xs font-bold text-slate-900">
                      {row.rate}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-slate-600">
                      {row.medicare}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-semibold text-amber-700">
                      {row.effective}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2">
              Rates for resident individuals FY2024–25 / FY2025–26 (Stage 3 tax cuts in effect).
              Does not include the Low Income Tax Offset (LITO) or Medicare Levy Surcharge (MLS).
              Verify at ato.gov.au.
            </p>
          </div>
        </div>
      </section>

      {/* ── Strategies ────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Tax Strategies
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              Strategies to reduce tax on investment income
            </h2>
          </div>

          <div className="space-y-5">
            {[
              {
                title: "Time income recognition across financial years",
                body:
                  "If you have control over when income is received — for example, choosing when to sell a term deposit or accepting an annual interest payment — consider whether deferring into a year with lower income could drop you into a lower tax bracket. This requires planning well before 30 June.",
              },
              {
                title: "Hold investments 12+ months for CGT discount on distributions",
                body:
                  "Capital gains distributed by managed funds include the CGT discount only if the underlying asset was held by the fund for 12+ months. You also qualify for the CGT discount on your own units/shares if you hold them for 12+ months before selling. A short-term trade that crystallises a gain at your full marginal rate versus a long-term holding taxed at half that rate is a significant difference.",
              },
              {
                title: "Salary sacrifice into superannuation",
                body:
                  "Concessional super contributions (salary sacrifice + employer SG) are taxed at 15% inside super rather than your marginal rate. Redirecting income into super (up to the $30,000 concessional cap for FY2025–26) can effectively reduce the marginal rate on that income from up to 47% to 15%. Returns on investments inside super are also taxed at 15% (or 0% in pension phase).",
              },
              {
                title: "Invest via a family or investment trust",
                body:
                  "A discretionary family trust can distribute investment income to beneficiaries in lower tax brackets — such as a spouse or adult children — rather than concentrating it in the highest earner's hands. This is legitimate tax planning but requires proper trust deed drafting, annual resolutions, and adherence to trust distribution rules. Anti-avoidance rules apply; the arrangement must reflect genuine economic entitlement.",
              },
              {
                title: "Tax-offset investments: infrastructure bonds",
                body:
                  "Certain approved infrastructure and social impact bonds carry a tax offset equal to a fixed percentage of the investment — effectively pre-paying tax by investing. These are complex products with liquidity constraints. They suit investors with predictable high-income years (e.g. a year of large capital gains) who want to pull forward tax-offset entitlements.",
              },
              {
                title: "Investment bonds for high-income earners",
                body:
                  "An investment bond (insurance bond) holds investments inside a tax-paid structure — the bond provider pays tax on earnings at the corporate rate of 30%. If you hold the bond for at least 10 years and make no excess contributions, withdrawals are received tax-free in your hands. For investors in the 45% + 2% Medicare Levy bracket, a 30% internal tax rate is materially better. The 10-year rule and contribution limits mean investment bonds require a long-term horizon.",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="bg-white border border-slate-200 rounded-2xl p-5"
              >
                <h3 className="text-sm font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Record-keeping ─────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Record-Keeping
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              What records you must keep — and for how long
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: "📄",
                label: "Dividend statements",
                detail:
                  "Each dividend payment notice from your share registry (Computershare, Link Market Services). Shows cash amount, franking credits, and company tax rate.",
              },
              {
                icon: "📊",
                label: "Distribution tax statements",
                detail:
                  "Annual statement from every ETF and managed fund manager. Breaks down income, franking credits, capital gains, foreign income, and NANE components.",
              },
              {
                icon: "🏦",
                label: "Bank interest summaries",
                detail:
                  "Annual interest summary from every bank, credit union, or building society. Available through your internet banking portal usually by mid-July.",
              },
              {
                icon: "📋",
                label: "Brokerage confirmations",
                detail:
                  "Every buy and sell confirmation — needed to calculate your cost base and capital gains. Keep even for shares you still hold.",
              },
              {
                icon: "🏠",
                label: "Rental records",
                detail:
                  "Lease agreements, rent receipts, insurance policies, council rates, repairs invoices, depreciation schedules, and property management statements.",
              },
              {
                icon: "💻",
                label: "ATO myTax pre-fill",
                detail:
                  "Available from 1 July each year. Pulls in data from many institutions but is not exhaustive — cross-check with your own records before lodging.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3"
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
            <p className="font-bold mb-1">Five-year retention rule</p>
            <p>
              Tax records must be kept for five years from the date you lodge your tax return (or
              from when the return was due, if you lodge late). For CGT assets still held, records
              of acquisition must be kept for as long as you own the asset plus five years after
              disposal. Digital copies are acceptable — the ATO does not require paper originals.
            </p>
          </div>
        </div>
      </section>

      {/* ── Common mistakes ────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="mb-6">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">
              Common Mistakes
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              Errors the ATO data-matches most frequently
            </h2>
          </div>

          <div className="space-y-3">
            {COMMON_MISTAKES.map((m) => (
              <div
                key={m.mistake}
                className="bg-white border border-red-100 rounded-xl p-4 flex gap-3"
              >
                <span className="text-red-500 font-bold text-sm shrink-0 mt-0.5">✕</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">{m.mistake}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{m.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-2xl">
          <div className="mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">FAQ</p>
            <h2 className="text-xl font-extrabold text-slate-900">
              Investment income tax questions answered
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">
                    &#9662;
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">
            Get personalised investment tax advice
          </h2>
          <p className="text-sm text-slate-300 mb-6">
            A specialist tax agent or financial adviser can identify deductions and structuring
            strategies specific to your portfolio and income level.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/advisors/tax-agents"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
            >
              Find a Tax Agent &#x2192;
            </Link>
            <Link
              href="/tax/capital-gains"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Capital Gains Tax Guide &#x2192;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Tax information on this page is general in nature and does
            not constitute personal tax advice. Tax laws change — verify current rates and rules
            with the ATO (ato.gov.au) or a registered tax agent before lodging.
          </p>
        </div>
      </section>
    </div>
  );
}
