import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Global Crypto Exchanges for Australians (${CURRENT_YEAR}) | invest.com.au`,
  description: `Binance, Kraken, Bybit, and KuCoin for Australians — AUSTRAC status, AUD on-ramps, fees, and CGT on crypto gains. Compare global vs domestic exchanges. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Global Crypto Exchanges for Australians (${CURRENT_YEAR})`,
    description: "Binance, Kraken, Bybit — AUSTRAC registration, AUD on-ramp, fees, and Australian CGT treatment for offshore exchange users.",
    url: `${SITE_URL}/global-investing/crypto`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Global Crypto Exchanges Australia")}&sub=${encodeURIComponent("Binance · Kraken · Bybit · AUSTRAC · CGT · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/crypto` },
};

const EXCHANGES = [
  { name: "Binance (International)", austrac: "No — exited AU 2023", audOnRamp: "No (USD/USDT entry required)", fees: "0.10% maker/taker; 0% BNB discount", bestFor: "Advanced traders wanting deepest liquidity and widest token selection", risk: "High — unregulated for AU users" },
  { name: "Kraken", austrac: "No (US entity; AUSTRAC-registered as agent possible)", audOnRamp: "Partial (PayID AUD deposits possible on Kraken AU LLC)", fees: "0.16%/0.26% maker/taker (standard)", bestFor: "US-listed tokens, futures, staking — more regulated than Binance", risk: "Medium" },
  { name: "Bybit", austrac: "No", audOnRamp: "No direct AUD; P2P or crypto bridge required", fees: "0.10%/0.10% spot", bestFor: "Futures and perp trading; large altcoin selection", risk: "High — no AU regulatory oversight" },
  { name: "Coinbase (US)", austrac: "No", audOnRamp: "No direct AUD", fees: "0.6%/1.2% Coinbase; 0.04%/0.06% Pro", bestFor: "US-listed tokens; highest brand trust for US markets", risk: "Medium-low (US-regulated exchange)" },
  { name: "CoinSpot (AU)", austrac: "Yes", audOnRamp: "Yes — PayID, POLi, card", fees: "0.1% taker; flat 1% instant buy", bestFor: "Easiest AUD on-ramp; widest AU token selection", risk: "Low (AU-regulated)" },
  { name: "Swyftx (AU)", austrac: "Yes", audOnRamp: "Yes — bank transfer, PayID", fees: "0.6% spread-based", bestFor: "Simple buy/sell for beginners; good AUD liquidity", risk: "Low (AU-regulated)" },
];

const FAQS = [
  {
    q: "Is it legal for Australians to use Binance or Bybit?",
    a: "It is not illegal for an Australian individual to access an offshore crypto exchange. However, Binance exited the Australian market in 2023 after ASIC concerns, meaning it is no longer registered with AUSTRAC (Australia's financial intelligence agency) for Australian users. If Binance or Bybit suffers an insolvency or security breach, Australian users have little to no legal recourse — they are not protected by Australian consumer laws or AFCA. From a legal and practical perspective, using an AUSTRAC-registered exchange (CoinSpot, Swyftx, Independent Reserve, Kraken AU) gives you more protection and simpler ATO reporting.",
  },
  {
    q: "How are crypto gains taxed in Australia?",
    a: "The ATO treats crypto as property, not currency. Selling, swapping, or spending crypto is a CGT event. Cost base is the AUD value at acquisition; disposal value is AUD at sale. If held >12 months, the 50% CGT discount applies. CGT is assessed in your income tax return at Item 18 (Capital gains). DeFi, staking rewards, and airdrops are generally assessable as ordinary income at market value when received. The ATO has data-matching arrangements with Australian exchanges — records from international exchanges should still be reported accurately via crypto tax software (Koinly, CryptoTaxCalculator, Syla).",
  },
  {
    q: "What is AUSTRAC registration and why does it matter?",
    a: "AUSTRAC (Australian Transaction Reports and Analysis Centre) is Australia's financial intelligence agency. Under the Anti-Money Laundering and Counter-Terrorism Financing Act 2006 (AML/CTF Act), digital currency exchanges operating in Australia must register with AUSTRAC and comply with KYC/AML requirements. AUSTRAC-registered exchanges are required to report suspicious transactions and verify customer identity. Using an AUSTRAC-registered exchange means: your exchange is complying with AU law, your identity has been verified (better for ATO data-matching), and you may have some recourse if the exchange fails (though AUSTRAC registration is not a deposit guarantee).",
  },
  {
    q: "What are the advantages of using a global exchange over an Australian one?",
    a: "Three main advantages: (1) Liquidity and token selection: global exchanges (Binance, OKX) list thousands of tokens vs 300–400 on domestic exchanges, with far deeper order books. (2) Fees: maker/taker fees on global exchanges can be 0.04–0.10% vs 0.5–1% on Australian instant-buy platforms. (3) Advanced features: futures, perpetuals, options, lending, DeFi integrations are generally more developed on global platforms. The tradeoffs: regulatory uncertainty, no AUD on-ramp (requires USDT/BTC bridge), harder tax reporting (no direct ATO reporting), and no AU investor protections on exchange failure.",
  },
];

export default function GlobalCryptoPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Global Crypto Exchanges" },
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
            <span className="text-slate-900 font-medium">Global Crypto</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Global crypto exchanges for Australian investors
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Binance, Kraken, Bybit vs Australian AUSTRAC-registered exchanges — regulatory status, AUD
            on-ramp options, fees, and how gains on offshore exchanges are taxed by the ATO.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only</p>
        </div>
      </section>

      {/* Exchange table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Exchange comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="Crypto exchange comparison — AUSTRAC registration, AUD on-ramp, fees and best use">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Exchange</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">AUSTRAC</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">AUD on-ramp</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Fees</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Best for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {EXCHANGES.map((e, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{e.name}</td>
                    <td className="px-3 py-3 text-xs font-bold">
                      {e.austrac === "Yes"
                        ? <span className="text-emerald-600">Yes</span>
                        : <span className="text-red-600">No</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{e.audOnRamp}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{e.fees}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{e.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">▾</span>
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
              { href: "/crypto", label: "Australian crypto exchanges" },
              { href: "/global-investing/tax/cgt-on-foreign-shares", label: "CGT on foreign assets" },
              { href: "/smsf/crypto", label: "Crypto in SMSF" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Crypto exchange status (AUSTRAC registration, supported features) changes frequently. Verify current registration on the AUSTRAC register before using any exchange. This page is general information; it is not financial advice.
          </p>
        </div>
      </section>
    </div>
  );
}
