import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import { createClient } from "@/lib/supabase/server";
import { getAffiliateLink, AFFILIATE_REL, renderStars } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Franking Credits Australia (${CURRENT_YEAR}) — How They Work & How to Maximise Them`,
  description: `Complete guide to franking credits for Australian investors: how imputation works, how to calculate your benefit by tax bracket, cash refunds, and maximising franking in super. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Franking Credits Australia (${CURRENT_YEAR}) — Complete Guide`,
    description: "How franking credits work, who benefits most, and how to maximise them through shares, ETFs, and super.",
    url: `${SITE_URL}/tax/franking-credits`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/franking-credits` },
};

/* ── Hero stat callouts ──────────────────────────────────────── */
const KEY_STATS = [
  {
    value: "43%",
    label: "Grossed-up yield on fully franked dividend",
    sub: "30% company tax turns a 7% cash yield into ~10% grossed-up yield for low-income investors",
  },
  {
    value: "Refundable",
    label: "Franking credits for low-income earners",
    sub: "Excess credits are paid as a cash refund — SMSFs in pension phase receive the full credit amount",
  },
  {
    value: "~$20B",
    label: "Franking credits distributed annually",
    sub: "Australian companies distribute around $20 billion in franking credits to shareholders each year",
  },
  {
    value: "Defeated 2019",
    label: "Labor refund removal proposal",
    sub: "Bill Shorten's proposal to end cash refunds of excess franking credits was rejected at the 2019 federal election",
  },
];

/* ── Tax bracket table data ──────────────────────────────────── */
const BRACKET_TABLE = [
  {
    bracket: "0% (below $18,200 threshold)",
    marginalRate: 0,
    grossedUp: 1429,
    taxOnGross: 0,
    frankingCredit: 429,
    netPosition: "+$429 cash refund",
    color: "text-green-700",
  },
  {
    bracket: "19% ($18,201 – $45,000)",
    marginalRate: 19,
    grossedUp: 1429,
    taxOnGross: 272,
    frankingCredit: 429,
    netPosition: "+$157 cash refund",
    color: "text-green-700",
  },
  {
    bracket: "32.5% ($45,001 – $135,000)",
    marginalRate: 32.5,
    grossedUp: 1429,
    taxOnGross: 465,
    frankingCredit: 429,
    netPosition: "$36 top-up tax",
    color: "text-slate-700",
  },
  {
    bracket: "37% ($135,001 – $190,000)",
    marginalRate: 37,
    grossedUp: 1429,
    taxOnGross: 529,
    frankingCredit: 429,
    netPosition: "$100 top-up tax",
    color: "text-slate-700",
  },
  {
    bracket: "45% (above $190,000)",
    marginalRate: 45,
    grossedUp: 1429,
    taxOnGross: 643,
    frankingCredit: 429,
    netPosition: "$214 top-up tax",
    color: "text-amber-700",
  },
];

/* ── Partial franking examples ───────────────────────────────── */
const PARTIAL_FRANKING = [
  {
    company: "Commonwealth Bank (CBA)",
    frankingPct: "100%",
    note: "All earnings are Australian-sourced — full 30% corporate tax paid on every dollar of profit",
    creditPer1000: "$429",
  },
  {
    company: "ANZ Group",
    frankingPct: "100%",
    note: "Primarily Australian banking operations — dividends are typically fully franked",
    creditPer1000: "$429",
  },
  {
    company: "BHP Group",
    frankingPct: "Partially franked (~50–70%)",
    note: "Significant international earnings (copper, oil) not subject to Australian corporate tax",
    creditPer1000: "$150–$214",
  },
  {
    company: "Macquarie Group",
    frankingPct: "Partially franked (~40–60%)",
    note: "Large international asset management and infrastructure revenue reduces franking ratio",
    creditPer1000: "$120–$180",
  },
];

/* ── ETF franking comparison ────────────────────────────────── */
const ETF_FRANKING = [
  {
    etf: "VAS — Vanguard Australian Shares",
    exposure: "ASX 300",
    frankingRatio: "~70–75%",
    notes: "Broad Australian exposure — banks and miners drive high franking ratio",
  },
  {
    etf: "VHY — Vanguard Australian High Yield",
    exposure: "High-dividend ASX stocks",
    frankingRatio: "~80–90%",
    notes: "Concentrated in banks and high-dividend payers — highest franking among popular ETFs",
  },
  {
    etf: "IHD — iShares S&P/ASX Dividend",
    exposure: "ASX dividend stocks",
    frankingRatio: "~75–85%",
    notes: "Similar income focus to VHY — strong franking from financial sector weighting",
  },
  {
    etf: "A200 — BetaShares Australia 200",
    exposure: "ASX 200",
    frankingRatio: "~70%",
    notes: "Low-cost ASX 200 access — similar franking to VAS",
  },
  {
    etf: "IVV — iShares S&P 500",
    exposure: "US equities",
    frankingRatio: "0%",
    notes: "Zero franking — US companies pay US tax, not Australian corporate tax",
  },
  {
    etf: "VGS — Vanguard MSCI World (ex-AU)",
    exposure: "Global equities",
    frankingRatio: "0%",
    notes: "Zero franking — no Australian corporate tax in the underlying holdings",
  },
];

/* ── FAQ items (8 questions) ────────────────────────────────── */
const FAQS = [
  {
    q: "Can I get a cash refund if my franking credits exceed my tax bill?",
    a: "Yes. If your total franking credits for the year exceed your total income tax payable (including the Medicare Levy), the ATO refunds the excess as cash when you lodge your tax return. This benefits retirees below the $18,200 tax-free threshold, SMSFs in pension phase (0% tax rate), and any investor whose franking credits outstrip their other tax liabilities. The refund is part of normal tax reconciliation — you do not need to apply separately.",
  },
  {
    q: "Do I need to hold shares at a specific time to get the franking credit?",
    a: "Yes — the 45-day rule requires you to hold the shares 'at risk' for at least 45 continuous days in the period starting 45 days before the ex-dividend date (90 days for preference shares). Buying shares the day before the ex-dividend date and selling immediately after does not satisfy the rule. A key exception: if your total franking credits from all sources are $5,000 or less for the income year, the 45-day rule does not apply and you can claim the credits regardless of your holding period.",
  },
  {
    q: "Do ETFs pass on franking credits?",
    a: "Yes. Australian share ETFs collect dividends (with attached franking credits) from portfolio companies and distribute them proportionally to unitholders. At year end your ETF manager provides a tax statement (or AMMA statement for attribution managed investment trusts) that itemises ordinary income, capital gains, and franking credits from your distributions. You include these credits on your tax return exactly as you would for direct share dividends. International ETFs (IVV, VGS, VTS, NDQ) carry zero franking because their underlying companies pay foreign taxes, not Australian corporate tax.",
  },
  {
    q: "Are franking credits available to non-residents?",
    a: "No. Non-residents cannot claim Australian franking credits or receive a cash refund. Fully franked dividends paid to non-residents are exempt from Australian withholding tax — the franking credit effectively absorbs the withholding tax obligation — but non-residents cannot use any excess credit. Partially franked or unfranked dividends paid to non-residents are subject to withholding tax at 30% (reduced to 15% for residents of countries with which Australia has a double-tax agreement, such as the US, UK, and New Zealand).",
  },
  {
    q: "What is a 'grossed-up' dividend?",
    a: "A grossed-up dividend is the cash dividend you receive plus the franking credit attached to it. Because the company has already paid 30% corporate tax on the underlying profit, the grossed-up amount reconstructs the full pre-tax profit. For a $1,000 fully franked cash dividend: grossed-up = $1,000 ÷ (1 − 0.30) = $1,428.57. The franking credit is $428.57. You declare $1,428.57 as assessable income, pay tax at your marginal rate, then offset the $428.57 franking credit — paying tax only once on the full profit.",
  },
  {
    q: "Do I need to declare franking credits even if I don't receive a cash refund?",
    a: "Yes. All franking credits attached to dividends you receive must be declared on your tax return, regardless of whether they result in a refund or a top-up. You include the grossed-up dividend (cash + credit) as income, offset the franking credit against your tax bill, and pay or receive the difference. Omitting franking credits from your return when you owe top-up tax would understate your income and may attract ATO attention — the ATO data-matches dividend and franking credit information directly from company tax returns.",
  },
  {
    q: "What were the 2019 Labor franking credit changes that were proposed?",
    a: "Before the 2019 federal election, the Labor Party led by Bill Shorten proposed ending cash refunds of excess franking credits. Under the plan, investors could still use franking credits to offset their tax bill to zero, but any remaining excess would no longer be paid as cash. The policy would have most significantly affected retirees on low incomes, SMSFs in pension phase, and self-funded retirees relying on franking refunds as income. The Coalition government under Scott Morrison campaigned against the policy, and Labor lost the 2019 election. The refund system remains intact and is unchanged.",
  },
  {
    q: "How do I find out the franking percentage of my dividend?",
    a: "Your dividend statement (sent by the company or your share registry) will show the cash dividend amount, the franking credit, and the franking percentage. If you hold via an ETF or managed fund, the annual tax statement itemises franking credits from each distribution. For direct shares, the ATO's myTax system is pre-filled with dividend and franking credit data from the company's tax return, so amounts usually appear automatically. You can also check ASX announcements — listed companies announce their dividend and franking percentage when they declare results.",
  },
];

export default async function FrankingCreditsPage() {
  const supabase = await createClient();
  const { data: brokerRows } = await supabase
    .from("brokers")
    .select("id, name, slug, color, logo_url, rating, asx_fee, asx_fee_value, cta_text, benefit_cta, tagline, affiliate_url, status, platform_type, created_at, updated_at, chess_sponsored, smsf_support, is_crypto, deal, editors_pick")
    .eq("status", "active")
    .eq("platform_type", "share_broker")
    .not("asx_fee_value", "is", null)
    .order("asx_fee_value", { ascending: true })
    .limit(3);
  const brokers: Broker[] = brokerRows ?? [];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax Strategy", url: `${SITE_URL}/tax` },
    { name: "Franking Credits" },
  ]);

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-slate-900 text-white overflow-hidden py-10 md:py-14">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5 flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/tax" className="hover:text-white">Tax Strategy</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium">Franking Credits</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
            <span className="text-xs font-semibold bg-green-600 text-white px-3 py-1 rounded-full">Refunds Available</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
            Franking Credits Australia{" "}
            <span className="text-amber-400">({CURRENT_YEAR})</span>
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
            How dividend imputation works, how to calculate your franking benefit at every tax bracket,
            who gets cash refunds, and how to maximise franking credits through direct shares, ETFs, and super.
          </p>
        </div>
      </section>

      {/* ── Key stats ────────────────────────────────────────── */}
      <section className="bg-white py-8 border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {KEY_STATS.map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-xl font-extrabold text-slate-900">{s.value}</div>
                <div className="text-xs font-bold text-slate-700 mt-0.5">{s.label}</div>
                <div className="text-xs text-slate-500 mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How dividend imputation works — the mechanics ─────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            How dividend imputation works &mdash; the mechanics
          </h2>
          <div className="text-sm text-slate-700 leading-relaxed space-y-4">
            <p>
              Australia operates one of the few dividend imputation systems in the world. The core idea is straightforward:
              when a company pays corporate tax on its profits, shareholders should not pay tax again on the same profits
              when they receive them as dividends. The tax already paid by the company is passed through to shareholders
              as a <strong>franking credit</strong>.
            </p>
            <p>
              Here is the step-by-step sequence for a $1,000 fully franked dividend:
            </p>
          </div>

          <ol className="mt-5 space-y-3">
            {[
              "Company earns $1,429 in pre-tax profit",
              "Pays 30% corporate tax: $429 in tax, leaving $1,000 after-tax profit",
              "Distributes the $1,000 as a cash dividend to shareholders",
              "Attaches $429 in franking credits (representing the tax already paid)",
              "Shareholder declares $1,429 as assessable income (grossed-up: $1,000 + $429)",
              "Shareholder calculates income tax at their marginal rate on $1,429",
              "Franking credit of $429 is offset against that tax bill",
              "Net result: tax is paid once (at the shareholder's personal rate) on the full $1,429",
            ].map((step, i) => (
              <li key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="shrink-0 w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-extrabold">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">
              The grossing-up formula
            </p>
            <div className="space-y-2 text-sm font-mono text-slate-800">
              <p>Grossed-up dividend = Cash dividend &divide; (1 &minus; 0.30)</p>
              <p>= $1,000 &divide; 0.70 = <strong>$1,428.57</strong></p>
              <p className="mt-2">Franking credit = $1,428.57 &times; 0.30 = <strong>$428.57</strong></p>
            </div>
            <p className="mt-3 text-xs text-amber-900">
              Your $1,000 cash dividend carries $428.57 in franking credits. You declare $1,428.57 as income,
              then offset the $428.57 against your tax bill.
            </p>
          </div>
        </div>
      </section>

      {/* ── Tax benefit by income bracket ────────────────────── */}
      <section className="py-10 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-4xl">
          <SectionHeading
            eyebrow="Tax Calculator"
            title="Franking credit benefit by income bracket"
            sub="Based on $1,000 cash dividend, fully franked (corporate rate 30%). Figures approximate — does not include Medicare Levy."
          />
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Tax bracket</th>
                  <th scope="col" className="text-right p-3 text-xs font-bold">Grossed-up income</th>
                  <th scope="col" className="text-right p-3 text-xs font-bold">Tax on grossed-up</th>
                  <th scope="col" className="text-right p-3 text-xs font-bold">Franking credit</th>
                  <th scope="col" className="text-right p-3 text-xs font-bold">Net position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {BRACKET_TABLE.map((row) => (
                  <tr key={row.bracket} className="hover:bg-slate-50 align-top">
                    <td className="p-3 font-semibold text-slate-800 text-xs">{row.bracket}</td>
                    <td className="p-3 text-right text-xs text-slate-600">${row.grossedUp.toLocaleString()}</td>
                    <td className="p-3 text-right text-xs text-slate-600">${row.taxOnGross.toLocaleString()}</td>
                    <td className="p-3 text-right text-xs text-slate-600">${row.frankingCredit.toLocaleString()}</td>
                    <td className={`p-3 text-right text-xs font-bold ${row.color}`}>{row.netPosition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            The break-even point is approximately the 30% corporate rate. Investors above 30% pay a top-up;
            those below 30% receive a refund of the difference.
          </p>
        </div>
      </section>

      {/* ── Partial franking ──────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Partial franking &mdash; not all dividends are 100% franked
          </h2>
          <div className="text-sm text-slate-700 leading-relaxed space-y-4">
            <p>
              A company can only attach franking credits equal to the Australian corporate tax it has actually paid.
              Companies with significant international operations often pay a lower effective Australian tax rate,
              resulting in partially franked dividends. The franking percentage can range from 0% to 100%.
            </p>
            <p>
              The formula for the franking credit on a partially franked dividend is:
            </p>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 space-y-1">
            <p>Franking credit = Cash dividend &times; (franking% &divide; (1 &minus; 0.30)) &times; 0.30</p>
            <p className="text-xs text-slate-500 mt-2 font-sans">
              Example: $1,000 dividend at 70% franking = $1,000 &times; (0.70 &divide; 0.70) &times; 0.30 = <strong>$300 franking credit</strong>
            </p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Company</th>
                  <th scope="col" className="text-center p-3 text-xs font-bold">Typical franking</th>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Reason</th>
                  <th scope="col" className="text-right p-3 text-xs font-bold">Credit per $1,000 dividend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PARTIAL_FRANKING.map((row) => (
                  <tr key={row.company} className="hover:bg-slate-50 align-top">
                    <td className="p-3 font-bold text-slate-900 text-xs">{row.company}</td>
                    <td className="p-3 text-center text-xs text-slate-600">{row.frankingPct}</td>
                    <td className="p-3 text-xs text-slate-600">{row.note}</td>
                    <td className="p-3 text-right text-xs font-semibold text-amber-700">{row.creditPer1000}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Franking percentages vary year to year. Check the company announcement or your dividend statement for the
            exact franking percentage for each dividend payment.
          </p>
        </div>
      </section>

      {/* ── Franking credits in super ────────────────────────── */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Franking credits in super &mdash; the pension-phase bonanza
          </h2>
          <div className="text-sm text-slate-700 leading-relaxed space-y-4">
            <p>
              Superannuation funds receive franking credits on Australian share dividends just like individual
              investors. The benefit depends on the fund&apos;s tax rate, which varies by phase.
            </p>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Accumulation phase</p>
              <p className="text-xl font-extrabold text-slate-900 mb-1">15% tax rate</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Super funds pay 15% tax on investment income. A fully franked dividend comes with a 30% franking
                credit, so the excess (30% &minus; 15% = 15%) is almost always refunded. The effective tax rate on
                fully franked dividends in accumulation phase is 0% &mdash; the fund pays nothing after the credit.
              </p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">Pension phase (0% tax)</p>
              <p className="text-xl font-extrabold text-green-900 mb-1">Full refund</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Super funds paying pensions (TRIS or retirement income stream) pay 0% tax on income and capital gains.
                Every dollar of franking credits is refunded in full as cash. This makes fully franked Australian shares
                one of the most tax-efficient assets a pension-phase SMSF can hold.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">
              SMSF pension phase worked example
            </p>
            <p className="text-sm text-slate-700 mb-3">
              An SMSF in full pension phase holds $200,000 in CBA shares yielding 5% cash, 100% franked.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between gap-4 border-b border-amber-200/60 pb-2">
                <span className="text-slate-700">Cash dividends received</span>
                <span className="font-bold text-slate-900">$10,000</span>
              </li>
              <li className="flex justify-between gap-4 border-b border-amber-200/60 pb-2">
                <span className="text-slate-700">Franking credits attached (30/70 of cash)</span>
                <span className="font-bold text-slate-900">$4,286</span>
              </li>
              <li className="flex justify-between gap-4 border-b border-amber-200/60 pb-2">
                <span className="text-slate-700">Tax on income at 0%</span>
                <span className="font-bold text-slate-900">$0</span>
              </li>
              <li className="flex justify-between gap-4 pt-1">
                <span className="font-extrabold text-slate-900">Franking credit refund (cash)</span>
                <span className="font-extrabold text-green-700">$4,286</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-amber-900">
              The total return from this position is $14,286 on $200,000 invested &mdash; a 7.1% cash return with
              zero tax paid.
            </p>
          </div>
        </div>
      </section>

      {/* ── ETFs and franking attribution ────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            ETFs and the franking credit attribution
          </h2>
          <div className="text-sm text-slate-700 leading-relaxed space-y-4 max-w-3xl mb-6">
            <p>
              Australian share ETFs pass franking credits through to unitholders via their annual tax statement or
              AMMA (Annual Mixed fund Amount) statement for Attribution Managed Investment Trusts (AMITs). The ETF
              collects dividends from its portfolio companies, accumulates the attached franking credits, and
              distributes them proportionally to unitholders at year end.
            </p>
            <p>
              Not all ETFs are equal when it comes to franking. An ETF focused on high-dividend Australian banks
              (like VHY) will have a much higher franking ratio than a broad international ETF which carries zero
              Australian corporate tax.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th scope="col" className="text-left p-3 text-xs font-bold">ETF</th>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Exposure</th>
                  <th scope="col" className="text-center p-3 text-xs font-bold">Franking ratio</th>
                  <th scope="col" className="text-left p-3 text-xs font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ETF_FRANKING.map((row) => (
                  <tr key={row.etf} className="hover:bg-slate-50 align-top">
                    <td className="p-3 font-bold text-slate-900 text-xs">{row.etf}</td>
                    <td className="p-3 text-xs text-slate-600">{row.exposure}</td>
                    <td className="p-3 text-center text-xs font-semibold">
                      {row.frankingRatio === "0%" ? (
                        <span className="text-red-600">{row.frankingRatio}</span>
                      ) : (
                        <span className="text-green-700">{row.frankingRatio}</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-600">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Franking ratios are approximate and vary year to year with portfolio composition and company payout
            decisions. Verify the annual tax statement from your ETF manager for precise figures.
          </p>
        </div>
      </section>

      {/* ── 45-day holding period rule ───────────────────────── */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            The 45-day rule &mdash; holding period requirement
          </h2>
          <div className="text-sm text-slate-700 leading-relaxed space-y-4">
            <p>
              To prevent investors from buying shares purely to capture a franking credit and then selling immediately
              (known as dividend stripping), the ATO requires investors to hold shares <strong>at risk</strong> for a
              minimum period around the ex-dividend date.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-extrabold text-slate-900 mb-2">The basic rule</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                You must hold ordinary shares <strong>at risk</strong> for at least 45 continuous days during the
                period beginning 45 days before the ex-dividend date and ending 45 days after the ex-dividend date.
                The acquisition and disposal days are not counted. For preference shares the period extends to
                90 days each side of the ex-dividend date.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-sm font-extrabold text-amber-900 mb-2">The &quot;at risk&quot; requirement</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Holding shares is not enough &mdash; you must be exposed to the risk of price movements. Strategies
                that neutralise this risk (such as covered calls or other hedging arrangements over the same shares)
                can cause you to fail the at-risk test even if you technically hold the shares throughout the period.
                Covered call (buy-write) strategies are a common trap.
              </p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <h3 className="text-sm font-extrabold text-green-900 mb-2">The $5,000 small investor exception</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                If your total franking credits from <em>all</em> sources in the income year are $5,000 or less,
                the 45-day rule does not apply. This exemption covers the vast majority of small retail investors,
                who can claim their franking credits regardless of how long they have held the shares.
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h3 className="text-sm font-extrabold text-red-900 mb-2">The ex-dividend timing trap</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Buying shares the day before the ex-dividend date and selling immediately after the date does not
                satisfy the 45-day rule (unless the $5,000 exception applies). The rule requires 45 continuous
                at-risk days &mdash; you would need to hold the shares for more than 6 weeks after purchasing before
                the ex-dividend date to qualify.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Non-residents and franking credits ───────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Non-residents and franking credits
          </h2>
          <div className="text-sm text-slate-700 leading-relaxed space-y-4">
            <p>
              Australian franking credits are a feature of the domestic tax system and are not available to
              non-residents. Understanding how dividends are taxed for non-residents is important for investors
              who may change their tax residency status.
            </p>
          </div>

          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Fully franked dividends</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                No Australian withholding tax applies. The franking credit is used to offset the withholding
                obligation &mdash; but non-residents cannot receive any excess credit as cash. The franking credit
                is simply stranded.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Partially franked dividends</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Withholding tax applies to the unfranked portion. At the standard rate of 30%, or 15% if the
                investor&apos;s country has a double-tax agreement with Australia (US, UK, NZ, and most OECD nations).
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Unfranked dividends</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Full 30% withholding tax applies (15% with a tax treaty). Non-residents receive the cash dividend
                less withholding, with no offset or refund mechanism available.
              </p>
            </div>
          </div>

          <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs font-semibold text-blue-900 mb-1">Residency change planning</p>
            <p className="text-xs text-blue-800 leading-relaxed">
              Investors planning to move overseas should consider the timing of high-dividend holdings. Once you
              become a non-resident for tax purposes, any franking credits on dividends received after that date
              are not accessible &mdash; a significant change if your portfolio relies heavily on franked income.
            </p>
          </div>
        </div>
      </section>

      {/* ── Record-keeping and tax return reporting ───────────── */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Record-keeping and tax return reporting
          </h2>
          <div className="text-sm text-slate-700 leading-relaxed space-y-4">
            <p>
              Franking credits must be declared in your income tax return. The ATO data-matches dividend and
              franking credit information directly from company tax returns, so discrepancies are easily detected.
              Good record-keeping avoids errors and ensures you claim every credit you are entitled to.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {[
              {
                title: "Dividend statements",
                body: "Each dividend payment is accompanied by a statement showing the cash amount, the franking credit, and the franking percentage. Keep these for every payment. Share registries (Computershare, Link Market Services) send statements by mail or make them available online.",
              },
              {
                title: "myTax pre-fill from ATO data matching",
                body: "For most investors who hold shares through a CHESS-sponsored broker, dividend and franking credit data is pre-filled into myTax directly from the company's own tax return lodgement. Review the pre-filled data carefully — it may be incomplete if the dividend was paid late in the financial year.",
              },
              {
                title: "AMMA statements for ETFs",
                body: "ETFs structured as Attribution Managed Investment Trusts (AMITs) issue an Annual Tax Statement (sometimes called an AMMA statement) that itemises your share of ordinary income, capital gains, and franking credits from the fund's distributions for the year. Use this statement to complete the relevant items in your tax return.",
              },
              {
                title: "Foreign income and franking credits",
                body: "Foreign dividends received from international ETFs or direct holdings are not franked. These are declared separately as foreign income, and any foreign tax withheld may be claimed as a foreign income tax offset (FITO) — a different mechanism from franking credits.",
              },
              {
                title: "Capital gains from dividend stripping",
                body: "If you trade shares around dividend dates and do not satisfy the 45-day rule, you may not be able to claim the franking credits — but you must still declare any capital gain or loss on the sale. The two obligations are independent.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 bg-white rounded-2xl border border-slate-200">
                <span className="shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{item.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ accordion ────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-2xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">&#9662;</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related guides ────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Related guides</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link href="/tax/capital-gains" className="block bg-white rounded-xl border border-slate-200 hover:border-amber-300 p-4 transition-colors group">
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Capital Gains Tax</p>
              <p className="text-xs text-slate-500 mt-1">CGT discount, 12-month rule, and how to calculate your gain on shares.</p>
            </Link>
            <Link href="/etfs/dividends" className="block bg-white rounded-xl border border-slate-200 hover:border-amber-300 p-4 transition-colors group">
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Dividend ETFs</p>
              <p className="text-xs text-slate-500 mt-1">Best Australian high-yield ETFs ranked by franking and distribution yield.</p>
            </Link>
            <Link href="/super/smsf" className="block bg-white rounded-xl border border-slate-200 hover:border-amber-300 p-4 transition-colors group">
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">SMSF Tax Guide</p>
              <p className="text-xs text-slate-500 mt-1">Accumulation vs pension phase — maximising franking refunds in your SMSF.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Broker comparison ─────────────────────────────────── */}
      {brokers.length > 0 && (
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Compare Brokers</p>
                <h2 className="text-lg font-bold text-slate-900">Brokers for Australian dividend investors</h2>
                <p className="text-sm text-slate-500 mt-1">CHESS-sponsored, low-cost access to ASX dividend-paying shares.</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {brokers.map((b) => (
                  <div key={b.slug} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                      <p className="text-xs"><span className="text-amber-600" aria-hidden="true">{renderStars(Number(b.rating))}</span> <span className="font-semibold text-slate-600" aria-label={`${(Number(b.rating) || 0).toFixed(1)} out of 5 stars`}>{(Number(b.rating) || 0).toFixed(1)}</span></p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.tagline}</p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-xs font-semibold text-slate-700 mb-2">{b.benefit_cta ?? b.cta_text ?? "Open Account"}</p>
                      <a
                        href={getAffiliateLink(b)}
                        rel={AFFILIATE_REL}
                        target="_blank"
                        className="block text-center w-full px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition-colors"
                      >
                        {b.cta_text ?? "Open Account →"}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Advisor prompt ────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Maximising your franking credit refund?</h2>
          <AdvisorPrompt type="tax_agent" />
        </div>
      </section>

      {/* ── Compliance disclaimer ─────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Tax information on this page is general in nature and does not constitute personal
            tax or financial advice. Franking credit rules, withholding tax rates, holding period requirements, and
            SMSF tax rates can change &mdash; verify current rules at ato.gov.au or consult a registered tax agent
            for advice specific to your circumstances.
          </p>
        </div>
      </section>
    </div>
  );
}
