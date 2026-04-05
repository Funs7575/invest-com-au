import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";

export const metadata: Metadata = {
  title: `Forex Trading Australia — AUD/USD, Brokers & ASIC Guide (${CURRENT_YEAR})`,
  description:
    "How to trade forex in Australia. Compare ASIC-regulated forex brokers, AUD/USD spreads, leverage limits, CFDs vs spot forex, and tax treatment for Australian traders.",
  alternates: { canonical: `${SITE_URL}/invest/forex` },
  openGraph: {
    title: `Forex Trading Australia — AUD/USD, Brokers & ASIC Guide (${CURRENT_YEAR})`,
    description:
      "How to trade forex in Australia. Compare ASIC-regulated forex brokers, AUD/USD spreads, leverage limits, CFDs vs spot forex, and tax treatment for Australian traders.",
    url: `${SITE_URL}/invest/forex`,
  },
};

export default function ForexPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Forex Trading" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Forex Trading Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/forex`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Is forex trading legal in Australia?", acceptedAnswer: { "@type": "Answer", text: "Yes, forex trading is fully legal in Australia. It is regulated by ASIC (Australian Securities and Investments Commission), which requires all forex and CFD brokers operating in Australia to hold an Australian Financial Services Licence (AFSL). Australia is one of the world's largest forex trading hubs, with ASIC considered among the strictest global regulators." } },
      { "@type": "Question", name: "How does ASIC regulate forex brokers?", acceptedAnswer: { "@type": "Answer", text: "ASIC imposes strict rules including leverage caps (30:1 for major pairs), mandatory negative balance protection for retail clients, margin close-out at 50% equity, client money segregation in Australian ADI trust accounts, a ban on inducements and bonuses, and mandatory loss disclosure showing the percentage of retail clients who lose money." } },
      { "@type": "Question", name: "What is the best forex broker in Australia?", acceptedAnswer: { "@type": "Answer", text: "IC Markets and Pepperstone are the most popular for low spreads (0.0 pips on raw accounts). CMC Markets offers the widest range of currency pairs (330+). IG Markets provides excellent education and research. Interactive Brokers suits professional traders wanting multi-asset access. All hold ASIC AFSLs and segregate client funds." } },
      { "@type": "Question", name: "How much money do I need to start forex trading?", acceptedAnswer: { "@type": "Answer", text: "Most Australian forex brokers allow you to start with $200-$500, with some like CMC Markets and IG Markets having no minimum deposit. However, trading with very small amounts under high leverage is extremely risky. Most experienced traders recommend starting with at least $2,000-$5,000 and using conservative position sizing (risking no more than 1-2% per trade)." } },
      { "@type": "Question", name: "Is forex trading gambling?", acceptedAnswer: { "@type": "Answer", text: "While forex trading involves significant risk and speculation, it differs from gambling in that skilled traders can develop an edge through technical analysis, fundamental analysis, and disciplined risk management. However, ASIC data shows 70-80% of retail forex traders lose money, and for many retail participants who trade without a strategy or risk management, it can function similarly to gambling." } },
      { "@type": "Question", name: "How is forex income taxed in Australia?", acceptedAnswer: { "@type": "Answer", text: "Most retail forex trading is treated as a revenue activity by the ATO, meaning profits are taxed as ordinary income at your marginal rate and the 50% CGT discount does not apply. Losses can offset other assessable income if you are a bona fide trader. GST does not apply to financial supplies like forex trading. Keep detailed records of every trade for ATO compliance." } },
      { "@type": "Question", name: "What is the difference between spot forex and forex CFDs?", acceptedAnswer: { "@type": "Answer", text: "Spot forex involves actual currency exchange with T+2 settlement, used primarily by businesses and institutions. Forex CFDs are derivatives that track currency prices without physical delivery — you profit or lose based on price movements. Most retail forex trading in Australia is done via CFDs, which are subject to ASIC leverage caps of 30:1 for major pairs." } },
      { "@type": "Question", name: "What are the ASIC leverage limits for forex?", acceptedAnswer: { "@type": "Answer", text: "ASIC caps retail forex CFD leverage at 30:1 for major currency pairs (e.g., AUD/USD, EUR/USD) and 20:1 for minor pairs and gold. This means a 3.3% adverse move in a major pair at maximum leverage would wipe out your entire deposit. These caps were introduced in 2021 to protect retail traders and are among the strictest globally alongside ESMA rules." } },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14 md:py-20">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">Forex Trading</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-red-500 text-white px-3 py-1 rounded-full">
              High Risk — Leveraged Product
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Forex Trading in Australia
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Australia is one of the world&apos;s largest forex trading hubs thanks to strong ASIC regulation and proximity to Asian markets. Here is everything you need to know about forex trading as an Australian.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "AUD/USD", label: "5th most traded currency pair globally" },
              { value: "30:1", label: "Max leverage (major pairs, ASIC)" },
              { value: "70–80%", label: "Retail forex/CFD traders who lose (ASIC)" },
              { value: "24/5", label: "Forex market trading hours" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: What Is Forex */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What Is Forex Trading?</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Foreign exchange (forex/FX) trading involves buying one currency while selling another, speculating on exchange rate movements. The forex market is the world&apos;s largest financial market, with over US$7.5 trillion traded daily. The Australian Dollar (AUD) is the 5th most traded currency globally, and AUD/USD is one of the most liquid pairs.
            </p>
            <p>
              In Australia, retail forex trading is primarily conducted via <strong>Contracts for Difference (CFDs)</strong> — you don&apos;t take physical delivery of currencies but instead profit or lose based on price movements. All retail forex/CFD providers must hold an ASIC Australian Financial Services Licence (AFSL).
            </p>

            <h3>Popular AUD Pairs</h3>
            <ul>
              <li><strong>AUD/USD</strong> — the &quot;Aussie&quot;; most traded AUD pair</li>
              <li><strong>AUD/JPY</strong> — popular carry trade pair</li>
              <li><strong>AUD/NZD</strong> — trans-Tasman; tight spreads</li>
              <li><strong>EUR/AUD</strong> — European exposure</li>
              <li><strong>GBP/AUD</strong> — British Pound cross</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 2: Broker Comparison */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Best Forex Brokers for Australians</h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Broker</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">ASIC AFSL</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">AUD/USD Spread</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Pairs</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Min Deposit</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Platform</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { broker: "IC Markets", afsl: "Yes", spread: "0.0 pips (Raw)", pairs: "60+", min: "$200", platform: "MT4, MT5, cTrader" },
                  { broker: "Pepperstone", afsl: "Yes", spread: "0.0 pips (Razor)", pairs: "60+", min: "$200", platform: "MT4, MT5, cTrader, TradingView" },
                  { broker: "CMC Markets", afsl: "Yes", spread: "0.7 pips", pairs: "330+", min: "$0", platform: "Proprietary + MT4" },
                  { broker: "IG Markets", afsl: "Yes", spread: "0.6 pips", pairs: "100+", min: "$0", platform: "Proprietary + MT4" },
                  { broker: "Interactive Brokers", afsl: "Yes", spread: "0.1 pips", pairs: "100+", min: "$0", platform: "TWS, IBKR Mobile" },
                  { broker: "FP Markets", afsl: "Yes", spread: "0.0 pips (Raw)", pairs: "70+", min: "$100", platform: "MT4, MT5, IRESS" },
                ].map((r, i) => (
                  <tr key={r.broker} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.broker}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.afsl}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">{r.spread}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.pairs}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.min}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.platform}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Lead Magnet */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <ContextualLeadMagnet segment="beginner-guide" />
        </div>
      </section>

      {/* Section 3: ASIC Regulation */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">ASIC Regulation for Forex/CFD Brokers</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              ASIC is one of the world&apos;s strictest regulators for retail forex and CFD trading. Key protections include:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { rule: "Leverage Caps", detail: "30:1 major forex, 20:1 minor/gold, 10:1 commodities, 5:1 shares, 2:1 crypto" },
              { rule: "Negative Balance Protection", detail: "You cannot lose more than your account balance as a retail client" },
              { rule: "Margin Close-Out", detail: "Positions closed at 50% margin level to prevent further losses" },
              { rule: "Loss Disclosure", detail: "Brokers must display % of retail clients who lose money on their platform" },
              { rule: "No Inducements", detail: "Banned bonuses, rebates, and promotional gifts for retail traders" },
              { rule: "Client Money Segregation", detail: "Client funds must be held in segregated trust accounts with Australian ADIs" },
            ].map((r) => (
              <div key={r.rule} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900">{r.rule}</p>
                <p className="text-sm text-slate-500 mt-1">{r.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Forex vs CFDs */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Spot Forex vs Forex CFDs</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Spot Forex</h3>
              <dl className="space-y-3">
                {[
                  { dt: "What it is", dd: "Actual currency exchange; delivery in T+2" },
                  { dt: "Used by", dd: "Businesses, importers/exporters, institutions" },
                  { dt: "Leverage", dd: "Varies; no ASIC retail leverage cap on physical forex" },
                  { dt: "Tax", dd: "Often on revenue account (ordinary income)" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Forex CFDs</h3>
              <dl className="space-y-3">
                {[
                  { dt: "What it is", dd: "Derivative tracking currency price; no delivery" },
                  { dt: "Used by", dd: "Retail traders, speculators" },
                  { dt: "Leverage", dd: "Max 30:1 major pairs (ASIC cap)" },
                  { dt: "Tax", dd: "Gains/losses on revenue account (ordinary income)" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Tax */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Tax Treatment of Forex Trading</h2>

          <div className="prose prose-slate max-w-none">
            <ul>
              <li><strong>Revenue vs capital</strong> — most retail forex trading is treated as a <strong>revenue activity</strong> (ordinary income), not capital gains</li>
              <li><strong>No CGT discount</strong> — because forex trading is generally on revenue account, the 50% CGT discount does not apply</li>
              <li><strong>Losses</strong> — forex trading losses can offset other assessable income if you are a bona fide trader</li>
              <li><strong>GST</strong> — financial supplies (forex trading) are input-taxed; no GST on trading profits</li>
              <li><strong>Record keeping</strong> — keep detailed records of every trade, including date, pair, size, entry/exit, and P&amp;L</li>
              <li><strong>Non-residents</strong> — forex gains from an Australian broker are not generally subject to Australian tax unless from an Australian PE (permanent establishment)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Risk warning */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Risk Warning</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Most retail traders lose money</strong> — ASIC data consistently shows 70–80% of retail forex/CFD traders are unprofitable</li>
              <li><strong>Leverage amplifies losses</strong> — even with ASIC&apos;s 30:1 cap, a 3.3% adverse move can wipe out your entire deposit</li>
              <li><strong>Overnight risk</strong> — gap events, central bank decisions, and geopolitical events can cause extreme moves outside trading hours</li>
              <li><strong>Psychological risk</strong> — forex trading is psychologically demanding; overtrading and revenge trading are common pitfalls</li>
              <li><strong>Not investing</strong> — forex trading is speculation, not investing. It has no expected positive return unlike equities or property</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">FAQ</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqSchema.mainEntity.map((faq: { name: string; acceptedAnswer: { text: string } }) => (
              <details key={faq.name} className="group bg-white border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors">
                  {faq.name}
                  <svg className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.acceptedAnswer.text}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related guides */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Explore Related Investment Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Options & Derivatives", href: "/invest/options-trading", desc: "ASX-listed options, CFDs, warrants and futures for Australian traders." },
              { title: "Commodities", href: "/invest/commodities", desc: "Invest in gold, silver, oil and more from Australia via ETFs and futures." },
              { title: "Managed Funds & Index Funds", href: "/invest/managed-funds", desc: "Compare passive index funds and actively managed strategies in Australia." },
              { title: "Crypto Staking & DeFi", href: "/invest/crypto-staking", desc: "Earn yield through staking, DeFi protocols and crypto ETFs on the ASX." },
            ].map((guide) => (
              <Link key={guide.href} href={guide.href} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-200 hover:shadow-md transition-all">
                <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{guide.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{guide.desc}</p>
                <span className="inline-flex items-center text-amber-600 text-sm font-semibold mt-2">Read guide →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Compare Forex &amp; CFD Platforms</h2>
              <p className="text-sm text-slate-500">
                Find an ASIC-regulated forex broker with competitive spreads, the platforms you prefer, and the risk management tools you need.
              </p>
            </div>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Compare Platforms &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
