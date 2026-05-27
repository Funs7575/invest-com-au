import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best FX Providers Australia (${CURRENT_YEAR}) — International Money Transfer Comparison`,
  description: `Compare the best foreign exchange and international money transfer providers for Australian investors and expats: Wise, OFX, TorFX, Western Union, banks. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best FX Providers Australia (${CURRENT_YEAR})`,
    description: "Wise, OFX, TorFX, Western Union vs the banks. Compare FX spreads, fees, and transfer limits.",
    url: `${SITE_URL}/global-investing/currency/best-fx-providers`,
  },
  alternates: { canonical: `${SITE_URL}/global-investing/currency/best-fx-providers` },
};

const FAQS = [
  {
    q: "Why is Wise often cheaper than a bank for international transfers?",
    a: "Banks typically mark up the mid-market exchange rate by 1–3% and charge fixed transfer fees on top. Wise uses the real mid-market rate (the same rate you'd see on Google) and charges a transparent percentage fee (typically 0.3–1.0% depending on the currency pair and amount). For a $50,000 transfer, a 2% bank spread costs $1,000 — Wise might cost $250–$400 in comparison. The key is checking the all-in cost: rate spread plus fixed fee.",
  },
  {
    q: "Which FX provider is best for large international transfers?",
    a: "For transfers above $50,000–$100,000, dedicated FX brokers like OFX, TorFX, and Currency Fair often beat Wise on rate (they negotiate larger spreads for higher volumes) and offer dedicated account managers. OFX has no maximum transfer limit and rate-lock (forward contracts) for investors who want to lock in rates ahead of settlement. For regular automated transfers (e.g. DCA into overseas accounts), Wise's recurring transfer feature is more convenient.",
  },
  {
    q: "Can I use Wise to fund an overseas brokerage account?",
    a: "Yes. Wise allows transfers to foreign brokerage accounts in most countries. You'll need the SWIFT/BIC code and IBAN (or account/routing number for US) of the receiving brokerage. IBKR, Stake, and most foreign brokers accept international wire transfers. Note that some brokers have minimum deposit amounts and may charge their own incoming wire fee.",
  },
  {
    q: "What is a forward contract and should I use one?",
    a: "A forward contract locks in a specific exchange rate for a future date — you agree to exchange currency at today's rate in 30, 60, or 90 days. It's useful if you have a known future obligation in foreign currency (e.g. property settlement in USD) and want certainty. It's not usually appropriate for investment purposes — you're speculating on rate direction, which adds currency risk rather than reducing it. OFX and TorFX both offer forward contracts; Wise does not.",
  },
];

const FX_PROVIDERS = [
  {
    name: "Wise (formerly TransferWise)",
    bestFor: "Most individuals; small to medium transfers",
    rateType: "Mid-market rate",
    spreadRange: "None — charges transparent % fee",
    feeRange: "0.3–1.5% depending on currency",
    maxTransfer: "$1M+ per transfer",
    minTransfer: "$1",
    speed: "Instant to 1–2 business days",
    notableFeature: "Multi-currency account; debit card; recurring transfers",
  },
  {
    name: "OFX",
    bestFor: "Large transfers; property/business; forward contracts",
    rateType: "Competitive spread (varies by amount)",
    spreadRange: "0.3–1.5%",
    feeRange: "$0 for transfers over $10,000 (AUD); otherwise $15",
    maxTransfer: "No maximum",
    minTransfer: "$1,000",
    speed: "1–3 business days",
    notableFeature: "No-max transfers; forward contracts; 24/7 transfers available",
  },
  {
    name: "TorFX",
    bestFor: "High-value transfers; property transactions",
    rateType: "Competitive spread; rate matching",
    spreadRange: "0.5–1.5%",
    feeRange: "$0 transfer fee",
    maxTransfer: "No maximum",
    minTransfer: "$2,000",
    speed: "1–2 business days",
    notableFeature: "Personal account manager; forward contracts; rate alerts",
  },
  {
    name: "Western Union",
    bestFor: "Cash pickup in destination country",
    rateType: "Mid-market with spread",
    spreadRange: "1–3%",
    feeRange: "Variable; $0–$15+",
    maxTransfer: "$50,000 AUD (online)",
    minTransfer: "$1",
    speed: "Minutes to bank account (for cash pickup)",
    notableFeature: "Cash pickup in 200+ countries; very wide network",
  },
  {
    name: "Major AU banks (ANZ, CBA, NAB, Westpac)",
    bestFor: "Existing customers needing convenience",
    rateType: "Bank retail rate",
    spreadRange: "1.5–3.5%",
    feeRange: "$10–$35 per transfer",
    maxTransfer: "Varies by banking tier",
    minTransfer: "$1",
    speed: "1–3 business days",
    notableFeature: "Integrated with existing account; SWIFT tracking; familiar UI",
  },
];

export default function BestFxProvidersPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Global Investing", url: absoluteUrl("/global-investing") },
    { name: "Currency", url: absoluteUrl("/global-investing/currency") },
    { name: "Best FX Providers" },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 to-blue-950 text-white py-12 md:py-16">
          <div className="container-custom max-w-4xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link href="/global-investing" className="hover:text-white">Global Investing</Link>
              <span>/</span>
              <Link href="/global-investing/currency" className="hover:text-white">Currency</Link>
              <span>/</span>
              <span className="text-white">Best FX Providers</span>
            </nav>
            <div className="inline-block bg-blue-800 text-blue-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
              {CURRENT_YEAR} Comparison
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Best FX Providers for Australians
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl">
              Compare international money transfer providers on rate, fees, and transfer limits. Banks typically charge 1.5–3.5% spread; specialist providers charge 0.3–1.5%.
            </p>
          </div>
        </section>

        {/* Key metric callout */}
        <section className="py-10 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-extrabold text-amber-900">1.5–3.5%</div>
                <div className="text-sm text-amber-800 mt-1">Typical bank spread</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-emerald-700">0.3–1.0%</div>
                <div className="text-sm text-slate-700 mt-1">Specialist FX provider spread</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">$1,000+ saved</div>
                <div className="text-sm text-slate-600 mt-1">On a $100,000 transfer</div>
              </div>
            </div>
          </div>
        </section>

        {/* Provider comparison */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Provider comparison ({CURRENT_YEAR})</h2>
            <p className="text-xs text-slate-400 mb-6">{GENERAL_ADVICE_WARNING}</p>
            <div className="space-y-4">
              {FX_PROVIDERS.map((p) => (
                <div key={p.name} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <h3 className="font-extrabold text-slate-900 text-lg">{p.name}</h3>
                    <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">{p.bestFor}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "FX rate type", value: p.rateType },
                      { label: "Fee range", value: p.feeRange },
                      { label: "Transfer range", value: `${p.minTransfer} – ${p.maxTransfer}` },
                      { label: "Speed", value: p.speed },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                        <div className="text-sm font-bold text-slate-800">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {p.notableFeature && (
                    <p className="text-xs text-slate-500 mt-3">
                      <strong>Notable:</strong> {p.notableFeature}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How to choose */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">How to choose the right provider</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  scenario: "Transfers under $20,000",
                  recommendation: "Wise",
                  why: "Mid-market rate + transparent fee. Open an account in 10 minutes. Multi-currency holding account useful for receiving foreign dividends.",
                },
                {
                  scenario: "Transfers over $50,000",
                  recommendation: "OFX or TorFX",
                  why: "Rate typically improves with volume. Account manager can negotiate. No maximum transfer limit. Forward contracts available.",
                },
                {
                  scenario: "Property settlement abroad",
                  recommendation: "TorFX or OFX",
                  why: "Forward contracts let you lock in the rate months ahead of settlement date. Account manager to help with timing and documentation.",
                },
                {
                  scenario: "Funding a foreign brokerage",
                  recommendation: "Wise or IBKR",
                  why: "Wise transfers directly to most foreign brokers. IBKR has its own internal FX conversion at mid-market rates (tiny spread) — fund in AUD, convert inside IBKR.",
                },
                {
                  scenario: "Cash pickup overseas",
                  recommendation: "Western Union",
                  why: "Widest agent network globally for cash pickup. More expensive on rate; use only where bank account not available.",
                },
                {
                  scenario: "Expat regular transfers",
                  recommendation: "Wise recurring transfers",
                  why: "Automate monthly transfers at mid-market rate. Notifications on rate movements. Business account if sending for a company.",
                },
              ].map((item) => (
                <div key={item.scenario} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="text-xs text-slate-500 font-medium mb-1">{item.scenario}</div>
                  <div className="text-lg font-extrabold text-slate-900 mb-2">{item.recommendation}</div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.why}</p>
                </div>
              ))}
            </div>
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
              <Link href="/global-investing/currency" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Currency risk for investors →
              </Link>
              <Link href="/global-investing/tax/cgt-on-foreign-shares" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                CGT on foreign shares →
              </Link>
              <Link href="/global-investing/shares/us" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Best US share brokers →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
