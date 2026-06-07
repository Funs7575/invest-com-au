import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Foreign Bonds for Australian Investors (${CURRENT_YEAR}) | invest.com.au`,
  description: `How Australian investors access foreign bonds — US Treasuries via IBKR, AU-listed global bond ETFs (IAF, VBND, IHCB), yield, currency hedging, and tax treatment. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Foreign Bonds for Australian Investors (${CURRENT_YEAR})`,
    description: "US Treasuries direct via IBKR, AU-listed global bond ETFs, yield, hedging, and Australian tax treatment.",
    url: `${SITE_URL}/global-investing/bonds`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Foreign Bonds Australia")}&sub=${encodeURIComponent("US Treasuries · Bond ETFs · Currency Hedging · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/bonds` },
};

const BOND_ETFS = [
  { ticker: "IAF", name: "iShares Core Composite Bond ETF", exposure: "AU investment-grade bonds (government + corporate)", mer: "0.15%", hedged: "N/A (AUD assets)", yield: "~4–5% (varies with rates)" },
  { ticker: "VBND", name: "Vanguard Global Aggregate Bond Index ETF", exposure: "Global investment-grade bonds, hedged to AUD", mer: "0.20%", hedged: "Yes (AUD-hedged)", yield: "~4–5%" },
  { ticker: "IHCB", name: "iShares Global High Yield Bond ETF (Hedged)", exposure: "Global high-yield corporate bonds, hedged AUD", mer: "0.35%", hedged: "Yes", yield: "~6–8%" },
  { ticker: "ILB", name: "iShares Government Inflation ETF", exposure: "Australian government inflation-linked bonds", mer: "0.18%", hedged: "N/A (AUD)", yield: "Real yield ~1–2% + CPI" },
  { ticker: "USIG", name: "BetaShares USD Corporate Bond ETF (Hedged)", exposure: "US investment-grade corporate bonds, AUD-hedged", mer: "0.25%", hedged: "Yes", yield: "~5–6%" },
];

const FAQS = [
  {
    q: "Can Australian investors buy US Treasuries directly?",
    a: "Yes, via IBKR (Interactive Brokers). IBKR provides direct access to US Treasury bonds, Treasury bills, notes, and TIPS, with no minimum purchase beyond the face value. The yield on 10-year US Treasuries is publicly quoted; the after-tax return depends on your Australian marginal rate (interest from US Treasuries is assessable in Australia, and you may also face US withholding tax on interest, which is creditable via FITO). Most Australian retail investors find AU-listed bond ETFs simpler — no US account setup, no SWIFT transfers, and the currency risk is hedged.",
  },
  {
    q: "Should I use a hedged or unhedged global bond ETF?",
    a: "For bonds, most investors should use hedged. Unlike equities (where AUD volatility provides natural portfolio diversification), bond returns are primarily yield-driven — currency volatility on top of small yields can overwhelm the investment case entirely. A 5% annual bond yield with a 10% AUD/USD move in the wrong direction turns your bond into an equity-like return. The hedging cost on global bond ETFs is typically 0.5–1% p.a. (the cost of AUD/USD forward contracts), which is meaningful but usually justified by the reduced volatility.",
  },
  {
    q: "How are foreign bond returns taxed in Australia?",
    a: "Interest income from foreign bonds is assessable in Australia as ordinary income at your marginal rate. No 50% CGT discount applies to interest. If the bond is sold before maturity, the capital gain/loss is a CGT event — the cost base is in AUD at acquisition; the proceeds are in AUD at sale. Foreign withholding tax on bond interest (e.g. 10% US tax on US corporate bond interest for non-residents) is creditable via the FITO. AU-listed bond ETFs distribute interest income as trust distributions, which are taxed at your marginal rate but avoid the complexity of direct bond tax treatment.",
  },
  {
    q: "What is duration risk and why does it matter for foreign bonds?",
    a: "Duration measures a bond's price sensitivity to interest rate changes. A 10-year government bond with 9-year duration falls ~9% in price for each 1% rise in interest rates. This is systemic risk: if you hold a global aggregate bond ETF with 7-year duration and rates rise 2% globally, the fund falls ~14% in capital value before any distributions. For Australian investors using bonds as a portfolio diversifier, short-duration bonds (1–3 year) are safer in rising-rate environments. The iShares Core Composite Bond ETF (IAF) has a modified duration published monthly on the BlackRock website.",
  },
];

export default function GlobalBondsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Foreign Bonds" },
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
            <span className="text-slate-900 font-medium">Foreign Bonds</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Foreign bonds for Australian investors
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            US Treasuries direct via IBKR, or AU-listed bond ETFs (VBND, IHCB, USIG) that deliver
            global fixed income with AUD currency hedging. Yield comparison, hedging tradeoffs, and
            how bond interest is taxed in Australia.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only</p>
        </div>
      </section>

      {/* Bond ETF table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">ASX-listed bond ETFs</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="ASX-listed bond ETFs — ticker, exposure, MER, yield and currency hedging">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Ticker</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Name</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Exposure</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">MER</th>
                  <th scope="col" className="text-center px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">AUD hedged</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">~Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {BOND_ETFS.map((b, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-mono text-sm text-amber-700 font-bold">{b.ticker}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{b.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{b.exposure}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{b.mer}</td>
                    <td className="px-3 py-3 text-center text-xs font-bold">
                      {b.hedged === "Yes" ? <span className="text-emerald-600">Yes</span> : b.hedged === "N/A (AUD assets)" || b.hedged === "N/A (AUD)" ? <span className="text-slate-400">N/A</span> : <span className="text-slate-400">No</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{b.yield}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Yields are approximate and change with interest rates. Check the ETF issuer&apos;s fact sheet for current yield to maturity.</p>
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
              { href: "/global-investing/etfs/global", label: "Global ETFs (ASX-listed)" },
              { href: "/global-investing/currency", label: "FX & currency accounts" },
              { href: "/global-investing/tax/fito", label: "FITO (foreign tax credit)" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Yield figures are approximate and change with market conditions. This page is general information; it is not financial advice. Consult a licensed financial adviser before investing in fixed income.
          </p>
        </div>
      </section>
    </div>
  );
}
