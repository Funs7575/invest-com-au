import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `CGT on Foreign Shares Australia (${CURRENT_YEAR}) — AUD Conversion, FX Gains & FITO`,
  description: `CGT on foreign shares for Australians: AUD cost base, currency conversion, 50% discount, FITO, and myTax reporting. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `CGT on Foreign Shares Australia (${CURRENT_YEAR})`,
    description:
      "AUD cost base rules, FX gain impact, 50% CGT discount, and FITO for Australian investors holding US and other foreign shares.",
    url: `${SITE_URL}/global-investing/tax/cgt-on-foreign-shares`,
    images: [{ url: `/api/og?title=${encodeURIComponent("CGT on Foreign Shares")}&sub=${encodeURIComponent("Australian Tax on Overseas Investments · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: {
    canonical: `${SITE_URL}/global-investing/tax/cgt-on-foreign-shares`,
  },
};

const FAQS = [
  {
    q: "Do I pay CGT on US shares as an Australian?",
    a: "Yes. Australian tax residents pay CGT on capital gains from all assets worldwide, including US shares. The gain is calculated in AUD using the exchange rate on each transaction date. The same 50% CGT discount applies if you held the shares for more than 12 months. The US does not impose capital gains tax on Australian investors selling US-listed shares — only US-sourced dividends attract US withholding tax.",
  },
  {
    q: "How do I convert my foreign share gains to AUD?",
    a: "The ATO requires all amounts to be expressed in AUD. Convert your purchase price to AUD using the exchange rate on the date you bought the shares, and convert your sale proceeds using the rate on the date you sold. The ATO recommends using the Reserve Bank of Australia (RBA) exchange rate for the relevant date, available at rba.gov.au. Do not use today's rate or an average rate — the transaction-date rate is the legal requirement.",
  },
  {
    q: "Does the 50% CGT discount apply to foreign shares?",
    a: "Yes. Individual Australian resident investors qualify for the 50% CGT discount on foreign shares held for more than 12 months, in the same way as Australian shares. The 12-month holding period is measured from the trade (contract) date of purchase to the trade date of sale. Companies and most trusts do not receive the CGT discount.",
  },
  {
    q: "What exchange rate does the ATO require?",
    a: "The ATO requires you to use the exchange rate on the date of each transaction — the purchase date rate for your cost base, and the sale date rate for your proceeds. The Reserve Bank of Australia publishes daily exchange rates at rba.gov.au and these are the accepted reference rates. Keep a record of the specific rate you used for each trade. While international brokers such as Interactive Brokers (IBKR) may provide AUD-converted reports, you should verify the rates against RBA published rates.",
  },
  {
    q: "Are capital gains on foreign shares taxed twice?",
    a: "For capital gains specifically, no — most countries (including the US) do not impose capital gains tax on non-resident investors selling shares listed on their exchanges. You pay CGT only in Australia. However, dividends from US shares are subject to 15% US withholding tax (under the Australia–US tax treaty), which you can offset against your Australian tax via the Foreign Income Tax Offset (FITO). The FITO prevents double taxation on dividend income, but capital gains are generally not subject to foreign tax in the first place.",
  },
];

const CGT_STEPS = [
  {
    step: "1",
    label: "Convert purchase price to AUD",
    detail:
      "Record the price paid in the foreign currency. Divide by the AUD/foreign currency exchange rate on the trade date. For example: US$150 ÷ 0.70 (AUD/USD rate) = AUD$214.29 per share.",
  },
  {
    step: "2",
    label: "Add brokerage to the AUD cost base",
    detail:
      "Brokerage paid in AUD is added directly. Brokerage in a foreign currency must also be converted to AUD at the trade date rate. The total (share cost + brokerage) is your cost base.",
  },
  {
    step: "3",
    label: "Convert sale proceeds to AUD",
    detail:
      "When you sell, convert the foreign currency proceeds to AUD using the exchange rate on the sale trade date — not the settlement date. Sale brokerage in AUD reduces your proceeds (or is added to your cost base of disposal).",
  },
  {
    step: "4",
    label: "Calculate the capital gain or loss",
    detail:
      "AUD Proceeds minus AUD Cost Base equals your gross capital gain (or loss). Because both rates are fixed at different points in time, currency movements are automatically captured in this number.",
  },
  {
    step: "5",
    label: "Apply the 50% CGT discount (if eligible)",
    detail:
      "If you held the shares for more than 12 months from trade date to trade date, multiply the gross gain by 50%. This is your net assessable capital gain.",
  },
  {
    step: "6",
    label: "Add to assessable income at your marginal rate",
    detail:
      "The net assessable capital gain is included in your taxable income for the financial year in which you sold. It is taxed at your marginal income tax rate (plus Medicare Levy).",
  },
];

const COMMON_MISTAKES = [
  {
    mistake: "Using today's exchange rate",
    fix: "Always use the RBA rate published on the exact date of each transaction. Using any other rate — average, approximate, or settlement date — creates an incorrect cost base.",
  },
  {
    mistake: "Forgetting brokerage in the cost base",
    fix: "Brokerage is a legitimate cost base element. For foreign shares, convert brokerage to AUD at the trade date rate and add it. Higher cost base = lower taxable gain.",
  },
  {
    mistake: "Assuming foreign shares have no Australian tax",
    fix: "Australian residents are taxed on worldwide income and capital gains. There is no exemption for foreign-listed shares. The only exception is assets acquired before 20 September 1985 (pre-CGT).",
  },
  {
    mistake: "Not keeping exchange rate records",
    fix: "The ATO requires you to keep records for 5 years after lodging your return for the year of disposal. Save RBA rate screenshots or export confirmation from your broker at the time of each trade.",
  },
  {
    mistake: "Confusing dividend withholding tax with CGT",
    fix: "US withholding tax on dividends (typically 15% under the tax treaty) is a separate matter from CGT on gains. Withholding tax on dividends is claimed back via the FITO; it has no effect on your CGT calculation.",
  },
];

export default function CgtOnForeignSharesPage() {
  const faqSchema = faqJsonLd(FAQS);
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Global Investing", url: absoluteUrl("/global-investing") },
    { name: "CGT on Foreign Shares" },
  ]);

  return (
    <div className="bg-white min-h-screen">
      <ArticleReadingProgress />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span>/</span>
            <Link href="/global-investing" className="hover:text-slate-900">
              Global Investing
            </Link>
            <span>/</span>
            <Link
              href="/global-investing/tax"
              className="hover:text-slate-900"
            >
              Tax
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">
              CGT on Foreign Shares
            </span>
          </nav>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Tax Guide &middot; {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              CGT on Foreign Shares{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Australian residents pay capital gains tax on profits from selling
              foreign shares — US, UK, or any other country. The same 50% CGT
              discount applies after 12 months, but currency conversion adds a
              layer of complexity: every purchase and sale must be expressed in
              AUD, and movements in the AUD exchange rate directly affect the
              size of your taxable gain.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#calculation-steps"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-xl transition-colors"
              >
                Step-by-step calculation
              </Link>
              <Link
                href="#worked-example"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Worked example
              </Link>
              <Link
                href="#faq"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key stats ────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                CGT Discount
              </p>
              <p className="text-2xl font-black text-amber-700">50%</p>
              <p className="text-xs text-slate-600 mt-1">
                Applies to foreign shares held for more than 12 months — same
                as Australian shares
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                AUD Rate Source
              </p>
              <p className="text-2xl font-black text-slate-900">RBA</p>
              <p className="text-xs text-slate-600 mt-1">
                Use the Reserve Bank of Australia daily rate for the exact
                transaction date (rba.gov.au)
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Record-Keeping
              </p>
              <p className="text-2xl font-black text-slate-900">5 yrs</p>
              <p className="text-xs text-slate-600 mt-1">
                Keep transaction records — including exchange rates — for 5
                years after lodging your return
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AUD cost base rule ───────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            The Fundamental Rule
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">
            Everything must be expressed in AUD
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The ATO&apos;s central rule for foreign assets: all cost base
            elements and all proceeds must be in Australian dollars. There is no
            option to report gains in a foreign currency and then convert the
            gain at the end.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            This matters because when you buy, you lock in an AUD cost base
            using the exchange rate on the buy date. When you sell months or
            years later, the exchange rate will almost certainly have moved. The
            AUD value of your proceeds is therefore not simply the foreign
            currency gain scaled up &mdash; currency movement adds to or
            subtracts from your taxable gain independently of the share
            price&apos;s own movement.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
              The Key Insight
            </p>
            <p className="text-sm text-amber-900 leading-relaxed">
              If the AUD <strong>weakens</strong> against the foreign currency
              between when you buy and when you sell, the foreign currency buys
              more AUD on exit than on entry — this <em>increases</em> your
              taxable gain even if the share price in foreign currency terms
              barely moved. If the AUD <strong>strengthens</strong>, the
              opposite occurs: your AUD proceeds are lower relative to your AUD
              cost base, reducing your gain (or creating a loss even if the
              share price rose).
            </p>
          </div>
        </div>
      </section>

      {/* ── CGT calculation steps ────────────────────────────────── */}
      <section
        id="calculation-steps"
        className="py-10 md:py-12 bg-slate-50 border-b border-slate-200"
      >
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            How to Calculate
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-6">
            Six steps to calculate CGT on a foreign share sale
          </h2>

          <div className="space-y-4">
            {CGT_STEPS.map((s) => (
              <div
                key={s.step}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4"
              >
                <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
                  <span className="text-sm font-black text-amber-700">
                    {s.step}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">
                    {s.label}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {s.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Worked example ───────────────────────────────────────── */}
      <section
        id="worked-example"
        className="py-10 md:py-12 bg-white border-b border-slate-100"
      >
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            Worked Example
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Buying 10 US shares and selling 14 months later
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            This example shows how currency movement amplifies a share-price
            gain.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Purchase */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                Purchase (Buy Date)
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Shares purchased</span>
                  <span className="font-semibold text-slate-900">10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Price per share</span>
                  <span className="font-semibold text-slate-900">US$150.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">AUD/USD rate</span>
                  <span className="font-semibold text-slate-900">0.70</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cost per share (AUD)</span>
                  <span className="font-semibold text-slate-900">
                    $214.29
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total share cost</span>
                  <span className="font-semibold text-slate-900">
                    $2,142.86
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Brokerage (AUD)</span>
                  <span className="font-semibold text-slate-900">$15.00</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="font-bold text-slate-900">
                    Total cost base
                  </span>
                  <span className="font-black text-slate-900">$2,157.86</span>
                </div>
              </div>
            </div>

            {/* Sale */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                Sale (14 months later)
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Shares sold</span>
                  <span className="font-semibold text-slate-900">10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Price per share</span>
                  <span className="font-semibold text-slate-900">US$220.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">AUD/USD rate</span>
                  <span className="font-semibold text-slate-900">0.65</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    Proceeds per share (AUD)
                  </span>
                  <span className="font-semibold text-slate-900">$338.46</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="font-bold text-slate-900">
                    Total proceeds
                  </span>
                  <span className="font-black text-slate-900">$3,384.62</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gain calculation */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-4">
              CGT Calculation
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-700">AUD proceeds</span>
                <span className="font-semibold text-slate-900">$3,384.62</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">Less: AUD cost base</span>
                <span className="font-semibold text-slate-900">
                  ($2,157.86)
                </span>
              </div>
              <div className="flex justify-between border-t border-amber-200 pt-3">
                <span className="font-bold text-slate-900">
                  Gross capital gain
                </span>
                <span className="font-black text-slate-900">$1,226.76</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">
                  Less: 50% CGT discount (held 14 months)
                </span>
                <span className="font-semibold text-slate-900">($613.38)</span>
              </div>
              <div className="flex justify-between border-t border-amber-200 pt-3">
                <span className="font-bold text-slate-900">
                  Net assessable gain
                </span>
                <span className="font-black text-amber-700">$613.38</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 pt-1">
                <span>Tax at 34.5% marginal rate (32.5% + 2% Medicare)</span>
                <span className="font-semibold">$211.62</span>
              </div>
            </div>
          </div>

          {/* FX note */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
              Currency Impact in This Example
            </p>
            <p className="text-sm text-blue-900 leading-relaxed mb-3">
              The AUD/USD rate moved from <strong>0.70 to 0.65</strong> — the
              Australian dollar weakened. From an Australian investor&apos;s
              perspective, each US dollar was worth more AUD on the sale date
              than on the purchase date. This currency tailwind added to the
              taxable gain on top of the US$70 per share price rise.
            </p>
            <p className="text-sm text-blue-900 leading-relaxed">
              <strong>The reverse scenario:</strong> if the AUD had
              strengthened (e.g., moved from 0.70 to 0.75), your AUD proceeds
              would have been lower &mdash; US$220 &divide; 0.75 = AUD$293.33
              per share, total AUD$2,933.33. Despite the share price rising
              US$70, your AUD capital gain would have been significantly smaller
              (AUD$775.47 gross before any discount), demonstrating that
              currency risk works against you when the AUD strengthens.
            </p>
          </div>
        </div>
      </section>

      {/* ── Record-keeping & exchange rate ──────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            ATO Requirements
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-6">
            Record-keeping for foreign shares
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                What records to keep
              </h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold mt-0.5 shrink-0">
                    &bull;
                  </span>
                  <span>
                    Trade confirmations for every purchase and sale, showing the
                    foreign currency price, number of shares, and trade date
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold mt-0.5 shrink-0">
                    &bull;
                  </span>
                  <span>
                    The RBA exchange rate for the trade date of each transaction
                    (save a screenshot from rba.gov.au at the time, or note the
                    rate in a spreadsheet)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold mt-0.5 shrink-0">
                    &bull;
                  </span>
                  <span>
                    Brokerage invoices and any platform fees charged in foreign
                    currency (these also need AUD conversion)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold mt-0.5 shrink-0">
                    &bull;
                  </span>
                  <span>
                    Annual tax statements from your broker (e.g., IBKR provides
                    a &quot;Tax Report&quot; with AUD conversions, but verify
                    rates against RBA data)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold mt-0.5 shrink-0">
                    &bull;
                  </span>
                  <span>
                    Dividend statements showing any foreign withholding tax
                    deducted (for your FITO claim)
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                How long to keep them
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                The ATO requires CGT records to be kept for{" "}
                <strong>5 years after the income year</strong> in which you
                lodge the return that includes the capital gain or loss. For
                shares held for many years, this means keeping acquisition
                records potentially for a decade or more — they are needed until
                5 years after the eventual sale.
              </p>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-700 mb-1">
                  Practical tip
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Create a spreadsheet at the time of each trade and record:
                  date, ticker, quantity, foreign currency price, AUD/FX rate
                  (source: RBA), AUD equivalent, brokerage in AUD. This takes
                  two minutes per trade and eliminates the pain of reconstructing
                  records years later when you come to sell.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FITO ─────────────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            Foreign Tax
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">
            Foreign Income Tax Offset (FITO) — dividends vs capital gains
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-bold text-slate-900 mb-2">
                Dividends — FITO applies
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                US shares pay dividends subject to 15% US withholding tax (under
                the Australia–USA Double Tax Agreement). This 15% is deducted at
                source before the dividend reaches you. You report the gross
                dividend as foreign income and claim the withheld tax as a
                Foreign Income Tax Offset (FITO), which reduces your Australian
                tax liability dollar-for-dollar, preventing double taxation.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-bold text-slate-900 mb-2">
                Capital gains — generally no foreign tax
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                The US does not impose capital gains tax on non-US-resident
                investors selling US-listed shares. Most other countries follow
                the same principle under their double tax agreements with
                Australia. You pay CGT only in Australia. No FITO is available
                for capital gains because no foreign tax was paid on those gains.
              </p>
            </div>
          </div>

          <div className="bg-slate-100 rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold text-slate-900 mb-2">
              How to claim the FITO in myTax
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              In your individual tax return, report foreign dividends at the
              &quot;Foreign income&quot; section. Enter the gross dividend (before
              withholding) and separately enter the foreign tax withheld. myTax
              uses this to calculate your FITO. You cannot claim more FITO than
              the Australian tax payable on that foreign income. Unused FITO does
              not carry forward.
            </p>
          </div>
        </div>
      </section>

      {/* ── CGT event timing ─────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            Important Detail
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">
            CGT event timing: trade date, not settlement date
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The CGT event occurs on the date you enter the sale contract — the
            trade date — not the settlement date. For shares listed on overseas
            exchanges (NYSE, NASDAQ, LSE), settlement typically occurs two
            business days after the trade (T+2 in the US, T+1 from 2025). The
            ATO&apos;s position is that the contract is entered into at the time
            the trade executes, not when cash and shares actually change hands.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-700 mb-2">
                12-month holding period
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Measured from the buy trade date to the sell trade date. If you
                bought on 15 March 2024 and sell on 16 March 2025, you have
                held for more than 12 months and qualify for the CGT discount.
                If you sell on 14 March 2025, you have held for exactly 364
                days — the discount does not apply.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-700 mb-2">
                Which financial year does the gain fall in?
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                The gain is assessed in the financial year the trade date falls
                in. A sale executed on 29 June 2025 is a 2024&ndash;25 event,
                even though it settles on 1 July 2025. Use the trade date for
                the exchange rate conversion and for determining which tax year
                to report in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reporting in myTax ───────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            Lodging Your Return
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">
            Reporting foreign share gains in myTax
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            myTax pre-fills data from Australian brokers via the ATO&apos;s
            data-matching program, but international share data is generally
            not pre-filled. You must enter it manually or use tax software that
            supports international brokers.
          </p>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-700 mb-2">
                Step 1: Capital gains worksheet
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Navigate to &quot;Capital gains&quot; in myTax. For each
                disposal, enter the asset description, date of acquisition, date
                of sale, AUD cost base, AUD proceeds, and whether the 50% CGT
                discount applies. The worksheet calculates your net capital gain
                automatically.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-700 mb-2">
                Step 2: Foreign income
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Foreign dividends (gross, before withholding) are declared
                separately in the &quot;Foreign income&quot; section. Capital
                gains are not foreign income — they go in the capital gains
                section only. Do not double-count a gain as both a capital gain
                and foreign income.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-700 mb-2">
                Step 3: Foreign tax withheld (FITO)
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter the amount of foreign tax withheld on dividends in the
                &quot;Foreign income tax offset&quot; field. This must match the
                amounts shown on your dividend statements. Keep the statements
                as supporting evidence.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-700 mb-2">
                Using tax software or a tax agent
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                If you have many international trades, tax software such as
                Sharesight can import IBKR or other broker data, apply ATO-
                approved FX rates, and produce a pre-filled tax report. A
                registered tax agent who specialises in investment income is
                also worth considering if your situation is complex (employee
                share schemes, multiple countries, large portfolios).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Special situations ───────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            Edge Cases
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-6">
            Special situations
          </h2>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Pre-CGT shares (before 20 September 1985)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Foreign shares acquired before 20 September 1985 are exempt from
                CGT — the same rule as for Australian shares. This applies
                regardless of whether the shares were listed on an overseas
                exchange. In practice, very few retail investors hold shares from
                this era, but it may arise in deceased estates.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Employee Share Schemes (ESS) with a foreign parent
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                If you receive shares or options in a foreign-listed company
                through an employee share scheme, the tax treatment is complex.
                There is typically a &quot;discount&quot; assessed as income at
                grant or vesting under the ESS rules, and then a separate CGT
                event when you eventually sell. The cost base for CGT purposes
                is typically the market value at the time the ESS discount was
                assessed as income — not the grant price. All amounts must be
                converted to AUD at the relevant dates. Specialist advice is
                strongly recommended.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Takeovers, mergers, and scrip-for-scrip rollovers
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                If your foreign shares are acquired by another company in a
                takeover and you receive shares in the acquiring company as
                consideration, this is a disposal for CGT purposes unless rollover
                relief applies. Australian scrip-for-scrip rollover rules do not
                automatically extend to foreign-to-foreign company mergers. The
                original cost base and acquisition date may carry over in some
                circumstances, but this requires careful analysis of the specific
                transaction structure.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Foreign ETFs and managed funds
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                If you hold a foreign ETF (for example, a US-domiciled ETF such
                as Vanguard&apos;s US-listed funds), the fund may distribute
                capital gains as part of its annual distribution. These are
                taxed in your hands as if you had made the capital gain directly
                — the CGT discount may apply if the fund held the underlying
                assets for 12+ months, as disclosed in the fund&apos;s AMMA
                (Attribution Managed Investment Trust Member Annual) statement.
                The ETF manager handles the AUD conversion for the distributions,
                but you need to verify this on your annual statement. Note that
                ASX-listed ETFs (such as VGS or IVV) are Australian-domiciled and
                their distributions follow standard Australian tax treatment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Common mistakes ──────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-white border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            Watch Out For
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-6">
            Common mistakes Australian investors make
          </h2>

          <div className="space-y-3">
            {COMMON_MISTAKES.map((item, i) => (
              <div
                key={i}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5"
              >
                <div className="flex gap-3 items-start">
                  <div className="shrink-0 mt-0.5">
                    <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                      Mistake
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-1">
                      {item.mistake}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-green-700">Fix:</span>{" "}
                      {item.fix}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-10 md:py-12 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            FAQ
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-6">
            Frequently asked questions
          </h2>

          <div className="divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">
                    &#9662;
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">
            Complex foreign share situation?
          </h2>
          <p className="text-sm text-slate-300 mb-6">
            Employee share schemes, multiple countries, or a large portfolio
            benefit from a specialist investment tax accountant who understands
            international CGT.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/advisors/tax-agents"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
            >
              Find a Tax Agent &#8594;
            </Link>
            <Link
              href="/global-investing"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Global Investing Hub &#8594;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Related pages ────────────────────────────────────────── */}
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">
            Related Guides
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link
              href="/tax/capital-gains"
              className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors"
            >
              <p className="text-sm font-bold text-slate-900 mb-1">
                CGT in Australia
              </p>
              <p className="text-xs text-slate-500">
                Complete guide to capital gains tax for Australian investors
              </p>
            </Link>
            <Link
              href="/global-investing/shares/us"
              className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors"
            >
              <p className="text-sm font-bold text-slate-900 mb-1">
                US Shares for Australians
              </p>
              <p className="text-xs text-slate-500">
                How to buy US shares from Australia and which brokers offer
                access
              </p>
            </Link>
            <Link
              href="/global-investing/etfs/global"
              className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors"
            >
              <p className="text-sm font-bold text-slate-900 mb-1">
                Global ETFs
              </p>
              <p className="text-xs text-slate-500">
                ASX-listed global ETFs — simpler tax treatment, same global
                exposure
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Tax information is general in nature and
            does not constitute tax advice. Exchange rate rules, CGT discount
            eligibility, and FITO conditions should be verified with the ATO
            (ato.gov.au) or a registered tax agent. Rates and rules are for
            FY2025&ndash;26.
          </p>
        </div>
      </section>
    </div>
  );
}
