import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

const FAQS = [
  {
    q: "Do I need to declare overseas dividends in my Australian tax return?",
    a: "Yes. Australian residents are taxed on their worldwide income, which includes dividends received from foreign companies. You must include foreign dividends in your assessable income in the year they are received. The AUD-equivalent amount (converted at the exchange rate on the payment date) is included as income. Any foreign withholding tax (WHT) deducted at source can be claimed as a Foreign Income Tax Offset (FITO), reducing your Australian tax dollar-for-dollar.",
  },
  {
    q: "What is a Double Tax Agreement and how do I benefit from it?",
    a: "A Double Tax Agreement (DTA) is a bilateral treaty between Australia and another country that prevents the same income from being taxed twice. For dividends, DTAs typically reduce the withholding tax (WHT) rate the foreign country can impose. For example, the Australia-USA DTA caps US dividend WHT at 15% (instead of the standard 30%) for Australian residents. To access the reduced DTA rate, you must lodge the appropriate declaration or W-8BEN form with your foreign broker or custodian. If you fail to lodge the form, the standard (higher) WHT rate applies — you can still claim a FITO for whatever tax was withheld, but you may pay more foreign tax than necessary.",
  },
  {
    q: "How do I claim a Foreign Income Tax Offset?",
    a: "The Foreign Income Tax Offset (FITO) is claimed in your individual tax return under the 'Foreign income tax offset' label. You report the total amount of foreign tax paid on income that you have also included in your Australian assessable income. The FITO reduces your Australian income tax dollar-for-dollar. It is capped at the Australian tax attributable to the foreign income — it cannot create a refund. In myTax or tax agent software, you enter foreign income and the foreign taxes paid, and the software calculates the allowable offset automatically. Keep records of your dividend statements and broker annual tax statements that show WHT deducted.",
  },
  {
    q: "Do I pay CGT on shares I hold overseas?",
    a: "Yes. Australian tax residents are liable for capital gains tax (CGT) on the disposal of foreign assets, including shares listed on overseas exchanges, foreign property, and interests in foreign trusts. The 50% CGT discount applies for assets held more than 12 months. Proceeds and cost base must both be converted to AUD using the exchange rate on the respective transaction dates. Most foreign countries do not withhold tax on capital gains, so a Foreign Income Tax Offset is rarely available for foreign CGT. You must keep records in AUD of all purchase prices, brokerage, and sale proceeds.",
  },
  {
    q: "What exchange rate should I use for foreign income?",
    a: "The ATO requires you to convert foreign amounts to Australian dollars using the exchange rate at the time of the transaction — not a year-end or average rate. For dividends, use the rate on the payment date. For capital gains, use the rate on the date of acquisition (to convert the cost base) and the date of disposal (to convert sale proceeds). The ATO accepts the Reserve Bank of Australia (RBA) exchange rates, available at rba.gov.au. Most brokers also provide AUD-converted amounts on their annual tax statements, which the ATO generally accepts.",
  },
  {
    q: "Are my VGS/IVV ETF distributions foreign income?",
    a: "Partly. ETFs like Vanguard MSCI Index International Shares (VGS) and iShares S&P 500 (IVV) are structured as Australian managed investment trusts listed on the ASX. Their distributions contain multiple components, including foreign income and a foreign income tax offset. The fund manager prepares an Annual Managed Fund Amounts (AMMA) statement each year that breaks down each component for your tax return. You report the foreign income component as foreign income and claim the pre-calculated FITO shown on the AMMA. You do not need to calculate individual exchange rates or withholding amounts — the fund manager does this for you.",
  },
];

const DTA_TABLE = [
  { country: "USA", standardWHT: "30%", dtaRate: "15% (or 5% if >10% stake)" },
  { country: "UK", standardWHT: "0%", dtaRate: "0%" },
  { country: "Japan", standardWHT: "20.42%", dtaRate: "10%" },
  { country: "Germany", standardWHT: "25%", dtaRate: "15%" },
  { country: "France", standardWHT: "12.8%", dtaRate: "15%" },
  { country: "Singapore", standardWHT: "0%", dtaRate: "0%" },
  { country: "New Zealand", standardWHT: "15%", dtaRate: "15%" },
];

export const metadata: Metadata = {
  title: `Foreign Income Tax Australia (${CURRENT_YEAR}) — Dividends, CGT & DTAs Explained`,
  description:
    "How foreign income is taxed in Australia: dividends, withholding tax, Double Tax Agreements, Foreign Income Tax Offset, and CGT on overseas assets.",
  alternates: { canonical: `${SITE_URL}/tax/foreign-income` },
  openGraph: {
    title: `Foreign Income Tax Australia (${CURRENT_YEAR}) — Dividends, CGT & DTAs`,
    description:
      "Foreign dividends, withholding tax offsets, Double Tax Agreements, currency conversion, ETF AMMA statements, and CFC/FIF rules — all explained for Australian investors.",
    url: `${SITE_URL}/tax/foreign-income`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Foreign Income Tax Australia")}&sub=${encodeURIComponent("Dividends · Withholding Tax · DTAs · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function ForeignIncomeTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Foreign Income Tax", url: absoluteUrl("/tax/foreign-income") },
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
              <span className="text-white font-medium">Foreign Income Tax</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">Dividends &middot; DTAs &middot; FITO &middot; CGT</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              How Foreign Income Is Taxed in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Australian residents are taxed on their worldwide income. Foreign dividends, overseas capital gains, and income from foreign property must all be declared. Here is how each type works — including withholding tax offsets and Double Tax Agreements.
            </p>
          </div>
        </section>

        {/* Key stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom max-w-4xl">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-amber-200 p-5">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Worldwide Income</p>
                <p className="text-xl font-black text-amber-700">Taxed in Australia</p>
                <p className="text-xs text-slate-600 mt-1">All Australian tax residents must declare foreign income regardless of where it was earned</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">FITO Credit</p>
                <p className="text-xl font-black text-slate-900">Dollar-for-dollar</p>
                <p className="text-xs text-slate-600 mt-1">Foreign withholding tax paid offsets Australian income tax on that foreign income</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">CGT Discount</p>
                <p className="text-xl font-black text-slate-900">50% — still applies</p>
                <p className="text-xs text-slate-600 mt-1">The 50% CGT discount is available for foreign assets held more than 12 months</p>
              </div>
            </div>
          </div>
        </section>

        {/* What is foreign income */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What counts as foreign income?</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Australia taxes its residents on their worldwide income. It does not matter where the income was earned, where the assets are held, or whether the money was remitted to Australia. Any income sourced from outside Australia must be declared in your Australian tax return.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Types of foreign income and key tax considerations">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Foreign income type</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Examples</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Key tax consideration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      type: "Foreign dividends",
                      examples: "US, UK, European shares; foreign ETFs held directly",
                      consideration: "Assessed at marginal rate; FITO available for WHT paid",
                    },
                    {
                      type: "Foreign interest",
                      examples: "Savings in overseas banks; foreign bond interest",
                      consideration: "Assessed at marginal rate; FITO for any withholding tax",
                    },
                    {
                      type: "Foreign rental income",
                      examples: "Rental income from a property in the US, UK, or NZ",
                      consideration: "Net of deductible expenses; FITO for foreign tax paid",
                    },
                    {
                      type: "Foreign employment income",
                      examples: "Salary paid by an overseas employer while working abroad",
                      consideration: "Marginal rate; partial exemptions may apply under some DTAs",
                    },
                    {
                      type: "Foreign business income",
                      examples: "Income from an overseas business or sole trader activity",
                      consideration: "CFC rules may apply if operating through a foreign company",
                    },
                    {
                      type: "Capital gains on foreign assets",
                      examples: "Profit on sale of foreign shares, property, or ETFs",
                      consideration: "50% CGT discount if held 12+ months; convert to AUD at transaction dates",
                    },
                  ].map((row) => (
                    <tr key={row.type} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-700">{row.type}</td>
                      <td className="p-4 text-xs text-slate-500">{row.examples}</td>
                      <td className="p-4 text-xs text-slate-500">{row.consideration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Foreign dividends */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Foreign dividends: how they are taxed</h2>
            <div className="space-y-4">
              {[
                {
                  title: "No franking credits on foreign dividends",
                  body: "Only Australian companies paying tax in Australia can attach franking credits to dividends. Foreign dividends have no franking credits. The full cash dividend (plus any gross-up for withholding tax) is included in your assessable income and taxed at your marginal rate.",
                },
                {
                  title: "Foreign withholding tax (WHT)",
                  body: "Most countries withhold tax on dividends paid to non-residents before the cash reaches you. The withholding rate depends on the country and whether a Double Tax Agreement (DTA) applies. Standard US WHT is 30%, but the Australia-USA DTA reduces this to 15% for qualifying Australian residents who have lodged a W-8BEN form. You receive the net amount after WHT — but for Australian tax purposes, you must include the gross dividend (before WHT) as income.",
                },
                {
                  title: "Worked example: US dividend",
                  body: "You receive a US dividend of $1,000 (USD), converted to $1,500 AUD at the payment date. The US withholds 15% WHT under the DTA = $225 AUD. You receive $1,275 AUD in your account. In your Australian tax return: include $1,500 AUD as foreign income; claim $225 AUD as Foreign Income Tax Offset (FITO). If your marginal rate is 32.5%, Australian tax on $1,500 = $487.50. After FITO of $225: net Australian tax payable = $262.50.",
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

        {/* DTAs */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Double Tax Agreements (DTAs)</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Australia has DTAs with over 40 countries. These treaties cap the WHT rate the other country can impose on dividends paid to Australian residents. The DTA rate only applies when you have lodged the correct declaration or form with your foreign broker or custodian (e.g. a W-8BEN for US accounts). If no form is lodged, the standard (higher) withholding rate applies.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table className="w-full text-sm" aria-label="Dividend withholding tax rates by country under Double Tax Agreements">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Country</th>
                    <th scope="col" className="text-center p-4 font-bold text-slate-700">Standard dividend WHT</th>
                    <th scope="col" className="text-center p-4 font-bold text-slate-700">DTA rate (qualifying)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DTA_TABLE.map((row) => (
                    <tr key={row.country} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-700">{row.country}</td>
                      <td className="p-4 text-center text-slate-600">{row.standardWHT}</td>
                      <td className="p-4 text-center font-semibold text-green-700">{row.dtaRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              DTA rates apply only when the required declaration or withholding form is lodged with the foreign broker or custodian. Rates are subject to change — verify at ato.gov.au/treaties or with a tax adviser.
            </p>
          </div>
        </section>

        {/* FITO — how it works */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Foreign Income Tax Offset (FITO) — how it works</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  title: "What it is",
                  body: "A credit for foreign taxes you have paid on income that is also included in your Australian assessable income. It prevents genuine double taxation on the same income.",
                  colour: "bg-blue-50 border-blue-200",
                },
                {
                  title: "Dollar-for-dollar offset",
                  body: "The FITO reduces your Australian income tax by the amount of foreign tax paid, dollar-for-dollar. If you paid $200 in US withholding tax, you reduce your Australian tax bill by $200.",
                  colour: "bg-blue-50 border-blue-200",
                },
                {
                  title: "The cap — not refundable",
                  body: "The FITO is capped at the Australian tax attributable to the foreign income. It can reduce your Australian tax on that income to zero, but it cannot create a tax refund or offset Australian tax on unrelated income.",
                  colour: "bg-amber-50 border-amber-200",
                },
                {
                  title: "How to claim it",
                  body: "In myTax or tax agent software, enter the gross foreign income and the total foreign taxes paid. The software calculates the allowable FITO automatically. Keep dividend statements and your broker's annual tax statement showing WHT deducted.",
                  colour: "bg-green-50 border-green-200",
                },
              ].map((item) => (
                <div key={item.title} className={`rounded-xl border p-5 ${item.colour}`}>
                  <h3 className="font-extrabold text-slate-900 mb-2 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Foreign capital gains */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">CGT on foreign assets</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Same CGT rules apply",
                  body: "Capital gains on the disposal of foreign shares, foreign property, or other foreign assets are calculated using the same rules as Australian assets. Capital Gain = Proceeds (AUD) minus Cost Base (AUD). If you held the asset for more than 12 months, the 50% CGT discount still applies.",
                },
                {
                  title: "Convert everything to AUD at transaction dates",
                  body: "Your cost base must be converted to AUD using the exchange rate on the date of acquisition. Your proceeds must be converted to AUD using the exchange rate on the date of disposal. Using different rates (e.g. a year-end rate) is not correct and can over- or under-state your capital gain. The ATO accepts RBA published exchange rates.",
                },
                {
                  title: "Foreign CGT and FITO",
                  body: "Most countries do not withhold tax on capital gains paid to non-residents (unlike dividends). As a result, a Foreign Income Tax Offset for foreign CGT is rarely available in practice. The main exception is foreign rental property where the foreign country has taxed a capital gain on sale — in that case, a FITO may be claimable. Check with a tax adviser for your specific country.",
                },
                {
                  title: "Foreign property: Section 26AG cost base adjustment",
                  body: "If you own foreign rental property, Section 26AG of the ITAA 1936 may reduce the cost base of the property by the amount of net foreign rental income that was exempt from Australian tax under a DTA. This reduces the cost base, which increases your capital gain on sale. This is an area where specialist tax advice is strongly recommended.",
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

        {/* Currency translation */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Currency conversion rules</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              All foreign amounts must be converted to Australian dollars for Australian tax purposes. The ATO requires you to use the exchange rate at the time of each transaction — not a year-end spot rate, a 12-month average, or a rate of your choosing.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table className="w-full text-sm" aria-label="Exchange rates to use for foreign income tax transactions">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Transaction</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Exchange rate to use</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { txn: "Foreign dividend received", rate: "Rate on the dividend payment date" },
                    { txn: "Foreign interest received", rate: "Rate on the date interest is credited" },
                    { txn: "Foreign asset purchased (cost base)", rate: "Rate on the acquisition (trade/settlement) date" },
                    { txn: "Foreign asset sold (proceeds)", rate: "Rate on the disposal (trade/settlement) date" },
                    { txn: "Foreign withholding tax deducted", rate: "Rate on the dividend or income payment date" },
                  ].map((row) => (
                    <tr key={row.txn} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-700">{row.txn}</td>
                      <td className="p-4 text-xs text-slate-600">{row.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The ATO accepts RBA published exchange rates, available at rba.gov.au. Most online brokers that hold foreign shares provide AUD-converted amounts on annual tax statements — the ATO generally accepts these. Keep the original statements as supporting records.
            </p>
          </div>
        </section>

        {/* ASX-listed international ETFs */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">ASX-listed international ETFs — the simpler path</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              For most retail investors, the easiest way to gain international exposure is through ASX-listed ETFs structured as Australian managed investment trusts — funds like VGS (Vanguard MSCI International), IVV (iShares S&P 500), NDQ (BetaShares Nasdaq 100), and multi-asset funds like VDHG.
            </p>
            <div className="space-y-4">
              {[
                {
                  title: "AMMA statement does the hard work",
                  body: "Each financial year, the fund manager prepares an Annual Managed Fund Amounts (AMMA) statement by 30 June. This statement shows each component of your distributions — Australian dividends, foreign income, foreign income tax offset, capital gains (discounted and non-discounted), and tax-deferred amounts. You report these components in your tax return exactly as shown on the AMMA.",
                },
                {
                  title: "No individual exchange rate calculations",
                  body: "Because the ETF is an Australian trust, the fund manager handles all currency conversions internally. You do not need to look up exchange rates for each underlying dividend from US, European, or Japanese companies. The AMMA shows AUD amounts throughout. This makes tax reporting significantly simpler than holding a portfolio of foreign shares directly.",
                },
                {
                  title: "Foreign income and FITO are pre-calculated",
                  body: "The AMMA shows a foreign income amount and a corresponding foreign income tax offset amount. You enter both figures in your tax return. The FITO reflects the proportionate share of withholding taxes paid by the fund on underlying dividends from countries like the US, Japan, and Germany. You do not need to calculate the individual withholding tax rates for each country the fund invests in.",
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

        {/* CFC and FIF */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">CFCs and FIFs — offshore structures</h2>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Two complex regimes apply to Australians who hold interests in foreign entities. Most retail investors in mainstream global ETFs are unaffected, but they are relevant for anyone investing through or in offshore companies or funds.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Controlled Foreign Companies (CFCs)",
                  body: "If you (together with associates) own 10% or more of a foreign company, the CFC rules may apply. Under CFC rules, certain passive income earned by the foreign company is attributed to you as an Australian resident, even if it has not been distributed. This means you may pay Australian tax on company profits before they are paid to you as a dividend. CFC rules are complex and require specialist advice for anyone considering offshore business structures.",
                  colour: "bg-red-50 border-red-200",
                },
                {
                  title: "Foreign Investment Funds (FIFs)",
                  body: "The FIF rules can apply to Australian residents who hold interests below 10% in certain foreign companies or foreign trusts. FIF rules require you to calculate and include attributable income using one of four methods, the default being complex. However, most retail investors in global ETFs are exempt because ASX-listed ETFs structured as widely-held Australian trusts are not subject to the FIF regime. If you are directly investing in offshore managed funds or foreign unit trusts (not ASX-listed), seek specific tax advice.",
                  colour: "bg-amber-50 border-amber-200",
                },
              ].map((item) => (
                <div key={item.title} className={`rounded-xl border p-5 ${item.colour}`}>
                  <h3 className="font-extrabold text-slate-900 mb-2 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900">Practical note for retail investors:</span> If you hold VGS, IVV, NDQ, VDHG, or similar ASX-listed ETFs, you are not subject to CFC or FIF rules — these funds are Australian managed investment trusts. CFC and FIF rules become relevant if you are setting up an offshore company, investing in a foreign private fund, or acquiring a significant direct stake in a foreign company. In those cases, engage a specialist international tax accountant before proceeding.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-white border-t border-slate-200">
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

        {/* Advisor CTA */}
        <HubAdvisorCTA
          heading="Get expert advice on Australian foreign income tax"
          subheading="DTAs, FIF rules, foreign tax credits, and Part IVA anti-avoidance are complex. A registered tax agent with international tax experience can ensure you're paying the correct amount."
          intent={{ need: "tax", context: ["foreign_income", "international_tax"] }}
          source="tax_foreign_income"
          ctaLabel="Find an international tax specialist"
          className="py-12 bg-amber-50 border-t border-amber-200"
        />

        {/* Navigation links */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Related tax guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-8">
              <Link href="/tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Tax hub &#8594;</Link>
              <Link href="/tax/investment-income" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Investment income tax &#8594;</Link>
              <Link href="/tax/capital-gains" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Capital gains tax guide &#8594;</Link>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
