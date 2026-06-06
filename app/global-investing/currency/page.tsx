import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `FX & Currency Accounts for Australian Investors (${CURRENT_YEAR}) | invest.com.au`,
  description: `Compare Wise, OFX, WorldFirst, Revolut, Airwallex for AUD conversions and multi-currency accounts. FX spreads, fees, and best options for funding foreign brokers, international transfers, and multi-currency portfolios. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `FX & Currency Accounts for Australian Investors (${CURRENT_YEAR})`,
    description: "Wise vs OFX vs WorldFirst vs Revolut — FX spreads, transfer fees, and multi-currency accounts compared for Australian investors.",
    url: `${SITE_URL}/global-investing/currency`,
    images: [{ url: `/api/og?title=${encodeURIComponent("FX & Currency Accounts")}&sub=${encodeURIComponent("Wise · OFX · WorldFirst · Revolut · Airwallex · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/currency` },
};

const PROVIDERS = [
  { name: "Wise", spread: "~0.4–0.7% (mid-rate + variable fee)", fixedFee: "$0–$3", bestFor: "One-off transfers up to $50k; multi-currency debit card", min: "$0", multiCurrency: true },
  { name: "OFX", spread: "~0.3–0.8% (negotiable above $50k)", fixedFee: "None above $10k", bestFor: "Larger transfers $10k+; dedicated dealer relationship", min: "$0 (no minimum above $1k)", multiCurrency: false },
  { name: "WorldFirst", spread: "~0.3–0.7%", fixedFee: "None above $3k", bestFor: "Business and investor-sized transfers; Amazon seller payments", min: "$1,000 recommended", multiCurrency: true },
  { name: "Revolut", spread: "0% (mid-rate) on weekdays within limits; ~1% weekends", fixedFee: "None (Premium plan $12.99/mo for higher limits)", bestFor: "Frequent small conversions; travel; crypto on/off ramp", min: "$0", multiCurrency: true },
  { name: "Airwallex", spread: "~0.5% (business-focused)", fixedFee: "None", bestFor: "Business bank accounts; USD/HKD accounts for IBKR funding", min: "$0", multiCurrency: true },
  { name: "Bank (CBA/ANZ/NAB/WBC)", spread: "1.5–3.0% (hidden in quoted rate)", fixedFee: "$20–$30 SWIFT fee", bestFor: "Small one-offs where convenience > cost", min: "$0", multiCurrency: false },
];

const FAQS = [
  {
    q: "What is an FX spread and why does it matter for investors?",
    a: "The FX spread is the difference between the interbank mid-rate (what banks trade at between themselves) and the rate a provider offers you. A 1% spread means for every $10,000 AUD you convert to USD, $100 goes to the FX provider — not visible as a fee but real nonetheless. For a $50,000 investment in US shares, the difference between a 0.4% spread (Wise) and a 2% bank spread is $800. Over a 10-year investing life with regular top-ups, FX spreads can easily cost $5,000–$20,000 vs using a specialist provider.",
  },
  {
    q: "Which provider is best for funding a foreign broker (IBKR, Stake, Tiger)?",
    a: "For IBKR: transfer AUD into your IBKR account and convert inside IBKR using their native FX desk — IBKR's FX spread is ~0.002%, far below any specialist FX provider. You only need to send AUD from your bank account to IBKR directly. For Stake, Tiger, and moomoo AU: these accept AUD deposits and handle the FX internally (they disclose the spread in their fee schedules, typically 0.5–0.7%). Using Wise or OFX to pre-convert AUD→USD then SWIFT the USD is rarely worth the SWIFT fee for retail-sized transfers ($20–$40).",
  },
  {
    q: "What is a multi-currency account and do I need one?",
    a: "A multi-currency account lets you hold balances in multiple currencies in a single account. Useful for investors who receive USD dividends or sale proceeds and want to re-invest without converting back to AUD and then to USD again (avoiding two FX spreads). Wise, Revolut, Airwallex, and WorldFirst all offer some form of multi-currency account. For most retail investors making 1–4 transactions per year, a dedicated multi-currency account isn't necessary — just use a specialist FX provider for each transfer.",
  },
  {
    q: "How do FX gains and losses affect my Australian tax?",
    a: "FX movements are fully embedded in the CGT calculation — there is no separate FX gain/loss calculation for investments held in foreign currencies. Your cost base is calculated in AUD at the acquisition exchange rate; proceeds are calculated in AUD at the disposal exchange rate. If AUD weakened between your buy and sell dates, your AUD gain will be larger than the foreign-currency gain. See /global-investing/tax/cgt-on-foreign-shares for worked examples. One exception: foreign-currency bank accounts (not investment accounts) may generate a separate foreign-currency gain/loss if treated as a financial arrangement under TOFA.",
  },
];

export default function GlobalCurrencyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "FX & Currency" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link><span>/</span>
            <span className="text-slate-900 font-medium">FX &amp; Currency</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            FX &amp; currency accounts for Australian investors
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Wise, OFX, WorldFirst, Revolut, Airwallex — compare FX spreads, transfer fees, and
            multi-currency account options for Australians funding foreign broker accounts,
            converting dividends, and managing cross-border portfolios.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only</p>
        </div>
      </section>

      {/* Provider table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">FX provider comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Provider</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">FX spread</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Fixed fee</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Best for</th>
                  <th className="text-center px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Multi-currency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {PROVIDERS.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{p.spread}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{p.fixedFee}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{p.bestFor}</td>
                    <td className="px-3 py-3 text-center text-xs font-bold">
                      {p.multiCurrency ? <span className="text-emerald-600">Yes</span> : <span className="text-slate-400">No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Spreads vary by currency pair, amount, and time. Verify current rates on each provider&apos;s calculator before transacting.</p>
        </div>
      </section>

      {/* Key insight */}
      <section className="py-8 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <span className="text-2xl shrink-0" aria-hidden>💡</span>
            <div>
              <p className="font-bold text-slate-900 mb-1">For IBKR users: convert inside IBKR</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                IBKR&apos;s internal FX desk charges ~0.002% spread — 200x cheaper than a bank and 2–3x cheaper than
                Wise. Send AUD directly from your Australian bank account to IBKR, then convert AUD→USD inside the platform.
                No SWIFT fees, no third-party FX provider needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/global-investing/shares/us", label: "Buy US shares from Australia" },
              { href: "/global-investing/tax/cgt-on-foreign-shares", label: "CGT on foreign shares" },
              { href: "/tools/currency-converter", label: "AUD currency converter" },
              { href: "/foreign-investment/send-money-australia", label: "Send money to Australia" },
              { href: "/global-investing", label: "Global investing hub" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} FX spreads and fees change frequently — verify on each provider&apos;s website before transacting. This page is general information; it is not financial advice.
          </p>
        </div>
      </section>
    </div>
  );
}
