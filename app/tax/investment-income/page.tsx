import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "How is dividend income from Australian shares taxed?",
    a: "Dividends from Australian companies are included in your assessable income and taxed at your marginal rate. However, franked dividends come with franking credits (imputation credits) that represent corporate tax already paid at 30%. These credits offset your personal tax liability dollar-for-dollar. If your marginal rate is lower than 30%, you receive the excess as a cash refund. Example: $700 cash dividend + $300 franking credit = $1,000 grossed-up dividend. If your marginal rate is 32.5%, tax on $1,000 = $325. Net tax = $325 - $300 credit = $25 payable.",
  },
  {
    q: "How is interest income taxed in Australia?",
    a: "Bank interest, term deposit income, and interest from bonds are included in your assessable income and taxed at your marginal rate. There is no discount, offset, or special treatment — interest is treated the same as salary income. Banks and financial institutions report interest income directly to the ATO (through TFN withholding data), so it is pre-filled in your tax return. If you have not provided your TFN to the institution, they withhold tax at 47% (the top rate). Tax is payable in the year the interest is received, not when it accrues.",
  },
  {
    q: "Are ETF distributions the same as dividends?",
    a: "Not exactly. ETF distributions can contain multiple components: Australian dividends (with franking credits), foreign income (no franking credits), capital gains distributions (the CGT discount may or may not apply depending on how the ETF manages this), and tax-deferred amounts (from certain property and infrastructure ETFs). Each component is taxed differently. iShares, Vanguard, and BetaShares provide annual AMMA tax statements that break down each component for your tax return. Do not just treat the whole distribution as a dividend — the components matter for accurate tax reporting.",
  },
  {
    q: "How is income from a managed fund or trust taxed?",
    a: "Income from managed funds flows through to unitholders as a trust distribution. The ATO's trust taxation rules require that each component retains its character — Australian dividends, franking credits, foreign income, capital gains — and is reported and taxed in your hands accordingly. Most managed funds (and ETFs structured as trusts) provide a Tax Statement or Annual Tax Summary that itemises these components by 30 June. You report them in your individual return as if you earned them directly. This is more complex than simply receiving a cash distribution.",
  },
  {
    q: "Do I need to declare investment income under $18,200?",
    a: "If your total income (including investment income) is below the tax-free threshold ($18,200), you may not owe tax — but you still need to lodge a tax return if: you have had tax withheld from investment income (bank TFN withholding, dividend withholding), you have franking credits to claim a refund for, or the ATO requires it based on prior lodgements. Most investors with any investment income should lodge annually to claim refunds and reconcile pre-filled ATO data.",
  },
  {
    q: "What is the difference between income and capital gain from investments?",
    a: "Income (dividends, interest, distributions, rent) is received in the ordinary course of holding the investment — it is taxed at your marginal rate in the year received. Capital gains arise on the disposal of an asset (selling shares, property, ETF units) and are calculated as proceeds minus cost base. Capital gains are only taxed when you sell — there is no annual tax on unrealised appreciation. Gains on assets held more than 12 months receive the 50% CGT discount. Losses on income cannot offset capital gains; losses on capital assets (capital losses) can only offset capital gains, not income.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Investment Income Tax Australia (${CURRENT_YEAR}) — Dividends, Interest & ETF Distributions`,
  description:
    "How investment income is taxed in Australia: dividends and franking credits, interest income, ETF distributions, managed fund components, and the difference between income and capital gains.",
  alternates: { canonical: `${SITE_URL}/tax/investment-income` },
  openGraph: {
    title: `Investment Income Tax Australia (${CURRENT_YEAR})`,
    description: "Dividends, franking credits, interest, ETF distributions, managed fund tax statements — how each type of investment income is taxed.",
    url: `${SITE_URL}/tax/investment-income`,
  },
};

export default function InvestmentIncomeTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Investment Income Tax", url: absoluteUrl("/tax/investment-income") },
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
              <Link href="/tax" className="hover:text-white">Tax</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Investment Income Tax</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">Dividends · Interest · ETFs</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              How Investment Income Is Taxed in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Dividends, interest, ETF distributions, and managed fund income are all taxed differently in Australia. Here is how each type works — and how to report them correctly.
            </p>
          </div>
        </section>

        {/* Quick summary table */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom max-w-4xl">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-bold text-slate-700">Income type</th>
                    <th className="text-center p-4 font-bold text-slate-700">Tax rate</th>
                    <th className="text-center p-4 font-bold text-slate-700">50% CGT discount</th>
                    <th className="text-left p-4 font-bold text-slate-700">Special features</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { type: "Australian dividends (franked)", rate: "Marginal", discount: "No", feature: "Franking credits offset tax; refund if excess" },
                    { type: "Australian dividends (unfranked)", rate: "Marginal", discount: "No", feature: "No offset; straightforward marginal tax" },
                    { type: "Bank interest", rate: "Marginal", discount: "No", feature: "TFN withholding at 47% if no TFN provided" },
                    { type: "Foreign dividends", rate: "Marginal", discount: "No", feature: "FITO credit for foreign withholding tax paid" },
                    { type: "ETF / managed fund distributions", rate: "Marginal", discount: "Partial (on CGT component)", feature: "Multiple components; requires AMMA tax statement" },
                    { type: "Rental income", rate: "Marginal", discount: "No", feature: "Net of deductions; negative gearing if loss" },
                    { type: "Capital gains (< 12 months)", rate: "Marginal", discount: "No", feature: "Full gain assessable; added to income" },
                    { type: "Capital gains (> 12 months)", rate: "Marginal", discount: "Yes — 50%", feature: "Only 50% of gain included in income" },
                  ].map((row) => (
                    <tr key={row.type} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-700">{row.type}</td>
                      <td className="p-4 text-center text-slate-600">{row.rate}</td>
                      <td className="p-4 text-center font-medium text-slate-600">{row.discount}</td>
                      <td className="p-4 text-xs text-slate-500">{row.feature}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Dividends + franking */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Dividends and franking credits in detail</h2>
            <div className="space-y-4">
              {[
                {
                  title: "How dividend imputation works",
                  body: "When an Australian company pays a fully franked dividend, it attaches a franking credit equal to the 30% corporate tax already paid on the earnings. You include the grossed-up dividend (cash + credit) in your assessable income, calculate tax at your marginal rate, then subtract the credit. If your marginal rate is 32.5%, you pay 2.5% more tax. If your marginal rate is 19%, you pay no additional tax and receive the 10.5% excess as a cash refund. Super funds in pension phase (0% tax) receive the full 30% franking credit as a cash refund.",
                },
                {
                  title: "Dividend Reinvestment Plans (DRP)",
                  body: "If you participate in a company's DRP, you still receive a taxable dividend — the dividend is assessable income even though you receive shares instead of cash. The shares have a cost base equal to the dividend plus any amount you paid to acquire them. This creates a CGT asset from the DRP date. At sale, you calculate the CGT on the difference between the sale price and each parcel's DRP acquisition price.",
                },
                {
                  title: "When to watch for partially franked dividends",
                  body: "Some dividends are only partially franked — e.g., a 50% franked dividend means the franking credit covers tax on 50% of the dividend. Foreign-source income that flows through an Australian company is often unfranked (no Australian corporate tax has been paid on it). ETFs holding foreign shares typically pay unfranked or partially franked distributions. The ATO pre-fills dividend data from company share registries, but it can miss partial franking calculations — always cross-check your dividend statements.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-extrabold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ETF and fund distributions */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">ETF and managed fund distributions: the components</h2>
            <p className="text-sm text-slate-600 mb-5">Unlike simple dividends, ETF and managed fund distributions contain multiple components that are taxed differently. The fund provides an Annual Tax Statement (AMMA statement) by 30 June each year. Key components:</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  component: "Australian dividends (franked)",
                  tax: "Include grossed-up amount, claim franking credits",
                  colour: "bg-blue-50 border-blue-200",
                },
                {
                  component: "Australian dividends (unfranked)",
                  tax: "Include in assessable income at marginal rate",
                  colour: "bg-blue-50 border-blue-200",
                },
                {
                  component: "Foreign income",
                  tax: "Include in assessable income; claim FITO for foreign tax withheld",
                  colour: "bg-indigo-50 border-indigo-200",
                },
                {
                  component: "Capital gains — discounted",
                  tax: "Only 50% included in assessable income (the fund has already applied the discount)",
                  colour: "bg-amber-50 border-amber-200",
                },
                {
                  component: "Capital gains — not discounted",
                  tax: "Full amount included in assessable income",
                  colour: "bg-amber-50 border-amber-200",
                },
                {
                  component: "Tax-deferred amounts",
                  tax: "Reduce the cost base of your units (not immediately taxable; increases future CGT)",
                  colour: "bg-slate-50 border-slate-200",
                },
                {
                  component: "Tax-free amounts",
                  tax: "Not assessable; may reduce cost base depending on fund type",
                  colour: "bg-green-50 border-green-200",
                },
                {
                  component: "Interest income",
                  tax: "Include in assessable income at marginal rate",
                  colour: "bg-blue-50 border-blue-200",
                },
              ].map((item) => (
                <div key={item.component} className={`rounded-xl border p-4 ${item.colour}`}>
                  <h3 className="font-extrabold text-slate-900 mb-1 text-sm">{item.component}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.tax}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Interest income */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Interest income and withholding</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Bank accounts and term deposits",
                  body: "All interest from savings accounts, term deposits, and offset accounts is assessable income in the year it is credited to your account. Banks report interest directly to the ATO — pre-fill data in your tax return should include it automatically. However, pre-fill can sometimes lag or miss accounts, so always reconcile against your bank statements.",
                },
                {
                  title: "TFN withholding",
                  body: "If you have not provided your Tax File Number to a bank or financial institution, they must withhold 47% of interest payments. This shows up as 'TFN amounts withheld' in your tax return and is fully creditable against your tax liability — you'll receive the excess as a refund. Always provide your TFN to financial institutions to avoid unnecessary withholding.",
                },
                {
                  title: "Bonds and fixed income",
                  body: "Interest from corporate bonds, government bonds, and fixed-income securities is assessable income when received. For discount bonds (bought below face value), the discount accrues over the bond's life and may be treated as interest (not capital gain), depending on the bond structure. The ATO has specific rules for traditional securities under Division 16E and financial arrangement rules under TOFA (Division 230) for large investors.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-extrabold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
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

        {/* Compliance + nav */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Tax hub →</Link>
              <Link href="/tax/capital-gains" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Capital gains tax guide →</Link>
              <Link href="/tax/franking-credits" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Franking credits guide →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
