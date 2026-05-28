import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Direct US Shares vs ASX ETFs: Total Cost Comparison (${CURRENT_YEAR})`,
  description: `Compare the total annual cost of buying US shares directly vs AU-listed ETFs like IVV. FX spread, brokerage, MER, and tax friction at $5K–$500K investment amounts. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Direct US Shares vs ASX-Listed ETFs: True Cost (${CURRENT_YEAR})`,
    description: "Total cost comparison across investment sizes. At what amount does direct US share investing beat AU-listed ETFs?",
    url: `${SITE_URL}/global-investing/calculators/direct-vs-asx-cost`,
    images: [{ url: "/api/og?title=Direct+US+Shares+vs+ASX+ETFs&subtitle=True+Cost+Calculator&type=default", width: 1200, height: 630 }],
  },
  alternates: { canonical: `${SITE_URL}/global-investing/calculators/direct-vs-asx-cost` },
};

const FAQS = [
  {
    q: "At what investment amount does direct US share investing beat ASX-listed ETFs on cost?",
    a: "For most Australian investors, AU-listed ETFs are cheaper below ~$30,000–$50,000 per year invested. Above that threshold — especially on platforms like IBKR with 0.002% FX spread — the annual savings from lower FX costs can outweigh the ETF's MER. However, the breakeven depends on your holding period: if you're a buy-and-hold investor who rarely rebalances, the MER compounds against you over time even on small amounts. The key insight is that for a 10-year hold of $100,000 in IVV (0.04% MER), you pay ~$4,000 in MER over the period; on IBKR the FX cost is ~$200 per purchase, so after 2 purchases you've spent ~$400 — much cheaper.",
  },
  {
    q: "Which broker has the lowest FX cost for buying US shares?",
    a: "Interactive Brokers (IBKR) has the lowest FX conversion cost of any broker accessible to Australians: approximately 0.002% of the transaction amount plus a fixed US$2 fee per conversion. On a $50,000 transaction, that's $1 + $100 = ~$101 total FX cost. Stake charges ~0.5% FX spread (no separate fee) = ~$250 on the same amount. CommSec International charges 0.6% = ~$300. Banks typically charge 1.5–3.5% = $750–$1,750. IBKR wins clearly on FX for any amount above ~$5,000.",
  },
  {
    q: "Does an AU-listed ETF avoid US estate tax?",
    a: "Yes — this is often the decisive advantage. AU-listed ETFs (IVV, VGS, NDQ, etc.) are Australian financial products. The underlying assets are US stocks held by the fund manager, not by you. So you have no direct US-situs asset exposure, and US estate tax does not apply. If you buy US shares directly, your estate has US-situs assets above US$60,000 — triggering potential federal estate tax of up to 40% on the excess (though the Australia-US Estate Tax Treaty provides significant mitigation). For estates above US$5M, the estate tax exposure is real and direct US shares require careful estate planning.",
  },
  {
    q: "Are there tax differences between direct US shares and AU-listed ETFs?",
    a: "Yes, two key differences: (1) Dividends — direct US shares incur 15% US withholding on dividends (after W-8BEN), which you can claim as FITO in Australia. AU-listed ETFs have no withholding on your distribution (the ETF manages it internally); you receive a grossed-up distribution. (2) CGT — selling AU-listed ETFs is straightforward (AUD cost base, AUD proceeds). Selling direct US shares requires translating both purchase and sale prices into AUD at the RBA rate on each date, then calculating your AUD gain/loss. FX movements can create a gain even when the share price is flat. AU-listed ETFs are significantly simpler for tax purposes.",
  },
];

const SCENARIOS = [
  {
    amount: "$5,000",
    directFX: "$25 (Stake 0.5%) / $10 (IBKR)",
    directBrokerage: "US$0 (Stake) / US$0.35 (IBKR)",
    etfMER: "$2 (IVV 0.04%)",
    etfBrokerage: "$0–$9.50 (varies by broker)",
    winner: "ETF",
    note: "FX + brokerage on direct > MER at small amounts",
  },
  {
    amount: "$20,000",
    directFX: "$100 (Stake) / $44 (IBKR)",
    directBrokerage: "US$0 (Stake) / US$0.35 (IBKR)",
    etfMER: "$8 (IVV, annual)",
    etfBrokerage: "$0–$9.50",
    winner: "ETF",
    note: "IBKR is competitive but ETF MER compounds favourably",
  },
  {
    amount: "$100,000",
    directFX: "$500 (Stake) / $200 (IBKR, one-off)",
    directBrokerage: "US$0 (Stake) / US$1 (IBKR)",
    etfMER: "$40/yr (IVV, ongoing)",
    etfBrokerage: "$0–$9.50 (one-off)",
    winner: "Direct (IBKR) after 5+ years",
    note: "IBKR FX cost $200 one-off vs IVV MER $40/yr = breakeven at 5 years",
  },
  {
    amount: "$500,000",
    directFX: "$2,500 (Stake) / $1,000 (IBKR)",
    directBrokerage: "US$0 (Stake) / US$5 (IBKR)",
    etfMER: "$200/yr (IVV, ongoing)",
    etfBrokerage: "$0–$9.50 (one-off)",
    winner: "Direct (IBKR) after 5 years",
    note: "At scale, ongoing MER compounds; IBKR FX is a one-time cost per purchase",
  },
];

const COST_FACTORS = [
  { factor: "FX conversion spread", etf: "None (AUD investment)", direct: "0.002% (IBKR) to 0.5–0.7% (Stake/CommSec)", notes: "Paid once at purchase; recurring on new purchases" },
  { factor: "Brokerage", etf: "$0–$9.50 (ASX trade)", direct: "US$0–$0.0035/share", notes: "Small; both can be negligible" },
  { factor: "Management fee (MER)", etf: "0.04–0.48% p.a. (ongoing)", direct: "None — you hold shares directly", notes: "MER compounds annually — significant over long horizons" },
  { factor: "US withholding tax", etf: "Managed by fund internally", direct: "15% on dividends (after W-8BEN); claim FITO", notes: "AU ETFs net of withholding in distribution" },
  { factor: "Tax complexity", etf: "Simple — AUD in, AUD out", direct: "AUD cost base per parcel; FX gain/loss possible", notes: "Direct requires more detailed records" },
  { factor: "US estate tax exposure", etf: "None (AU product)", direct: "Yes, if >US$60K held directly", notes: "For large estates, decisive factor for ETFs" },
  { factor: "Currency hedging option", etf: "Available (IHVV, VGAD)", direct: "Not available", notes: "Hedged ETFs add ~0.06% p.a." },
];

export default function DirectVsAsxCostPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Global Investing", url: absoluteUrl("/global-investing") },
    { name: "Calculators", url: absoluteUrl("/global-investing/calculators") },
    { name: "Direct vs ASX Cost" },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 to-blue-950 text-white py-12 md:py-16">
          <div className="container-custom max-w-4xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link href="/global-investing" className="hover:text-white">Global Investing</Link>
              <span>/</span>
              <span className="text-white">Direct vs ASX ETF Cost</span>
            </nav>
            <div className="inline-block bg-blue-800 text-blue-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
              Cost Guide {CURRENT_YEAR}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Direct US Shares vs AU-Listed ETFs: True Total Cost
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl">
              FX spread, brokerage, MER, and tax friction compared. Which is actually cheaper at your investment amount?
            </p>
          </div>
        </section>

        {/* Key insight callout */}
        <section className="py-10 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-lg font-extrabold text-amber-900 mb-3">The key insight</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white border border-amber-200 p-4">
                <div className="text-sm font-extrabold text-amber-900 mb-2">AU-listed ETF wins when...</div>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• Short holding period (FX cost amortises poorly)</li>
                  <li>• Small amounts (MER is tiny in absolute terms)</li>
                  <li>• You want currency hedging (IHVV, VGAD)</li>
                  <li>• You&apos;re concerned about US estate tax</li>
                  <li>• You want tax simplicity</li>
                </ul>
              </div>
              <div className="rounded-xl bg-white border border-amber-200 p-4">
                <div className="text-sm font-extrabold text-amber-900 mb-2">Direct US shares (IBKR) wins when...</div>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• Large amount, long hold (MER compounds against ETF)</li>
                  <li>• You need specific stock exposure (not just index)</li>
                  <li>• You want broadest market access (LSE, HKEX, TSE)</li>
                  <li>• IBKR FX cost (0.002%) beats MER over time</li>
                  <li>• You want DRIP (dividend reinvestment programme)</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">{GENERAL_ADVICE_WARNING}</p>
          </div>
        </section>

        {/* Cost factors table */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">All cost factors compared</h2>
            <p className="text-sm text-slate-500 mb-5">AU-listed ETF (e.g. IVV) vs direct US shares via IBKR, Stake, CommSec International.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Cost factor</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">AU ETF (IVV)</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Direct US shares</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700 hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COST_FACTORS.map((row) => (
                    <tr key={row.factor} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.factor}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{row.etf}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{row.direct}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Scenario table */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Indicative cost scenarios</h2>
            <p className="text-sm text-slate-500 mb-5">Single lump-sum purchase. Direct = IBKR (lowest cost) vs Stake (highest common retail cost). ETF MER is annual, ongoing.</p>
            <div className="space-y-3">
              {SCENARIOS.map((s) => (
                <div key={s.amount} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-xl font-extrabold text-slate-900">{s.amount}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${s.winner.startsWith("ETF") ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}>
                      Likely winner: {s.winner}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-xs text-slate-500 mb-1">Direct FX cost</div>
                      <div className="text-sm font-bold text-slate-800">{s.directFX}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-xs text-slate-500 mb-1">Direct brokerage</div>
                      <div className="text-sm font-bold text-slate-800">{s.directBrokerage}</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <div className="text-xs text-blue-600 mb-1">ETF MER (p.a.)</div>
                      <div className="text-sm font-bold text-blue-800">{s.etfMER}</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <div className="text-xs text-blue-600 mb-1">ETF brokerage</div>
                      <div className="text-sm font-bold text-blue-800">{s.etfBrokerage}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">{s.note}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">{GENERAL_ADVICE_WARNING} Scenarios are indicative; actual costs depend on broker rates, FX at time of conversion, and number of purchases.</p>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((faqItem) => (
                <details key={faqItem.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {faqItem.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{faqItem.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Related */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <Link href="/global-investing/shares/us" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Compare US share brokers →
              </Link>
              <Link href="/global-investing/etfs/us" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                AU-listed US ETFs →
              </Link>
              <Link href="/global-investing/tax/us-estate-tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                US estate tax →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
