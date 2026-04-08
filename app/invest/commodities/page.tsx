import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";
import { SHOW_RATINGS, SHOW_EDITORIAL_BADGES, SHOW_ADVISOR_RATINGS, SHOW_ADVISOR_VERIFIED_BADGE, getRegisterWording, FACTUAL_COMPARISON_DISCLAIMER, ADVISOR_DIRECTORY_HEADING, ADVISOR_DIRECTORY_SUBTEXT } from "@/lib/compliance-config";

export const metadata: Metadata = {
  title: `How to Invest in Commodities from Australia (${CURRENT_YEAR})`,
  description:
    "Invest in commodities from Australia — gold, silver, oil, natural gas, agricultural. ASX commodity ETFs, ETCs, Perth Mint, and commodity futures via ASIC-regulated brokers.",
  alternates: { canonical: `${SITE_URL}/invest/commodities` },
  openGraph: {
    title: `How to Invest in Commodities from Australia (${CURRENT_YEAR})`,
    description:
      "Invest in commodities from Australia — gold, silver, oil, natural gas, agricultural. ASX commodity ETFs, ETCs, Perth Mint, and commodity futures via ASIC-regulated brokers.",
    url: `${SITE_URL}/invest/commodities`,
  },
};

export const revalidate = 3600;

export default async function CommoditiesPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, rating, platform_type, asx_fee, us_fee, min_deposit, affiliate_url, deal, deal_text, icon")
    .eq("status", "active")
    .in("platform_type", ["share_broker", "cfd_forex"])
    .order("rating", { ascending: false })
    .limit(5);

  const { data: advisors } = await supabase
    .from("professionals")
    .select("slug, name, firm_name, type, location_display, rating, review_count, photo_url, verified")
    .eq("status", "active")
    .in("type", ["financial_planner"])
    .order("rating", { ascending: false })
    .limit(3);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Commodities" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `How to Invest in Commodities from Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/commodities`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "How do I invest in gold in Australia?", acceptedAnswer: { "@type": "Answer", text: "The easiest way is through ASX-listed gold ETFs: PMGOLD (Perth Mint backed, 0.15% MER) or GOLD (ETFS Physical Gold, 0.40% MER). You can also buy physical gold from the Perth Mint (GoldPass app from $1), ABC Bullion, or dealers. For leveraged exposure, gold mining stocks like Newmont (NEM) or Northern Star (NST) provide indirect exposure with additional operational risk." } },
      { "@type": "Question", name: "What is the difference between physical gold and a gold ETF?", acceptedAnswer: { "@type": "Answer", text: "Physical gold gives you direct ownership of bars or coins with no counterparty risk, but requires secure storage and insurance, and has wider buy-sell spreads (3-8%). Gold ETFs like PMGOLD and GOLD are backed by physical gold stored in vaults, trade on the ASX with tight spreads, require no storage, but involve trust in the custodian. For most investors, ETFs are simpler and cheaper." } },
      { "@type": "Question", name: "Is gold GST-free in Australia?", acceptedAnswer: { "@type": "Answer", text: "Yes, investment-grade precious metals are GST-free in Australia. For gold, this means bars and coins of at least 99.5% purity. For silver, the threshold is 99.9% purity. Perth Mint products and most dealer bullion products meet these standards. Gold ETFs on the ASX are also GST-free as financial products. Non-investment-grade jewellery and collectible coins may attract GST." } },
      { "@type": "Question", name: "What is the best commodity ETF in Australia?", acceptedAnswer: { "@type": "Answer", text: "For gold specifically, PMGOLD (0.15% MER) is the cheapest. For a broad commodity basket, QCO (Betashares Commodities, 0.69% MER) provides diversified exposure across energy, metals, and agriculture. For oil, OOO (Betashares Crude Oil, 1.29% MER) tracks crude oil but suffers from contango drag over time. ETFS also offers physical silver (ETPMAG), platinum (ETPMPT), and palladium (ETPMPD)." } },
      { "@type": "Question", name: "How can I invest in oil from Australia?", acceptedAnswer: { "@type": "Answer", text: "The main options are: OOO (Betashares Crude Oil ETF) on the ASX, which uses futures contracts and is subject to contango drag; oil company shares like Woodside Energy (WDS) and Santos (STO); or oil CFDs through brokers like IG Markets or CMC Markets (leveraged, high risk). Direct oil futures are available through Interactive Brokers but require significant capital and experience." } },
      { "@type": "Question", name: "Are commodities a good investment for SMSFs?", acceptedAnswer: { "@type": "Answer", text: "Gold ETFs (PMGOLD, GOLD) and commodity ETFs are straightforward SMSF investments traded like any ASX share. Physical gold can be held in an SMSF but must be stored independently (not at a member's home) and insured. Capital gains are taxed at 15% in accumulation or 0% in pension phase. Commodities can serve as a portfolio diversifier, but note that most produce no income." } },
      { "@type": "Question", name: "What is the difference between Perth Mint gold and a gold ETF?", acceptedAnswer: { "@type": "Answer", text: "Perth Mint offers government-backed gold through its GoldPass app (digital gold from $1, physical delivery available) and the PMGOLD ETF on ASX. PMGOLD is the cheapest gold ETF at 0.15% MER. The key difference is that Perth Mint products are backed by the Western Australian Government, while other gold ETFs like GOLD are backed by private custodians storing gold in London vaults." } },
      { "@type": "Question", name: "How are commodity investments taxed in Australia?", acceptedAnswer: { "@type": "Answer", text: "Commodity ETFs and physical gold/silver are CGT assets — you pay capital gains tax on disposal, with a 50% discount if held for 12+ months. Investment-grade gold and silver are GST-free. Commodity CFDs and futures are generally treated as revenue (ordinary income) with no CGT discount. Resource stock dividends are taxed at your marginal rate with franking credits where applicable." } },
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
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Commodities</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Gold, Silver, Oil &amp; More
            </span>
          </div>

          <h1 className="text-slate-900 text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            How to Invest in Commodities from Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            Australia is a commodities superpower — the world&apos;s largest exporter of iron ore, lithium, and LNG. Here is how to invest in commodities via ASX ETFs, physical bullion, futures, and commodity stocks.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Compare Platforms &rarr;
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold text-sm px-5 py-2.5 rounded-lg border transition-colors"
            >
              Filter Platforms
            </Link>
          </div>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "$450B+", label: "Australia's annual resource exports" },
              { value: "#1", label: "World's largest iron ore & lithium exporter" },
              { value: "20+", label: "Commodity ETFs/ETCs on ASX" },
              { value: "AUD $4,000+", label: "Gold price per ounce (AUD)" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Ways to Invest */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Ways to Invest in Commodities</h2>

          <div className="space-y-4">
            {[
              { method: "ASX-Listed ETFs & ETCs", desc: "The easiest route for most investors. Buy and sell like shares on the ASX. Physical-backed (gold, silver) or synthetic (oil, broad commodity baskets).", access: "Any ASX broker", min: "1 unit (~$20–200)" },
              { method: "Physical Bullion", desc: "Buy gold or silver bars/coins directly from Perth Mint, ABC Bullion, or dealers. Store at home, in a bank safe deposit, or via allocated/unallocated accounts.", access: "Perth Mint, ABC Bullion, dealers", min: "~$100 for coins; $5,000+ for bars" },
              { method: "Commodity Futures", desc: "Leveraged contracts to buy/sell commodities at a future date. Used by professional traders. Requires margin and carries significant risk.", access: "Interactive Brokers, CMC, Saxo", min: "$5,000+ margin" },
              { method: "Commodity CFDs", desc: "Trade price movements of gold, oil, natural gas, and more via CFDs. Leveraged; ASIC cap of 10:1 for commodities.", access: "IG, CMC, Pepperstone, IC Markets", min: "$200+" },
              { method: "Resource Stocks", desc: "Buy shares in commodity producers (BHP, Rio Tinto, Fortescue, Pilbara Minerals, Newmont). Leveraged exposure to commodity prices plus operational and management risk.", access: "Any ASX broker", min: "~$500" },
            ].map((m) => (
              <div key={m.method} className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{m.method}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">{m.desc}</p>
                <div className="flex flex-wrap gap-3">
                  <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded">{m.access}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Min: {m.min}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Commodity ETFs on ASX */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Commodity ETFs &amp; ETCs on the ASX</h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Code</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Name</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Commodity</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Backing</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">MER</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "GOLD", name: "ETFS Physical Gold", commodity: "Gold", backing: "Physical (London vault)", mer: "0.40%" },
                  { code: "PMGOLD", name: "Perth Mint Gold", commodity: "Gold", backing: "Physical (Perth Mint)", mer: "0.15%" },
                  { code: "ETPMAG", name: "ETFS Physical Silver", commodity: "Silver", backing: "Physical", mer: "0.49%" },
                  { code: "QAU", name: "Betashares Gold Bullion (AUD Hedged)", commodity: "Gold", backing: "Physical", mer: "0.59%" },
                  { code: "OOO", name: "Betashares Crude Oil (Currency Hedged)", commodity: "Crude Oil", backing: "Synthetic (futures)", mer: "1.29%" },
                  { code: "ETPMPT", name: "ETFS Physical Platinum", commodity: "Platinum", backing: "Physical", mer: "0.49%" },
                  { code: "ETPMPD", name: "ETFS Physical Palladium", commodity: "Palladium", backing: "Physical", mer: "0.49%" },
                  { code: "QCO", name: "Betashares Commodities (Currency Hedged)", commodity: "Broad basket", backing: "Synthetic", mer: "0.69%" },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.commodity}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.backing}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.mer}</td>
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
          <ContextualLeadMagnet segment="switching-checklist" />
        </div>
      </section>

      {/* Section 3: Gold Deep Dive */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Gold — Australia&apos;s Favourite Commodity</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Gold is the most popular commodity investment in Australia, serving as an inflation hedge, portfolio diversifier, and safe haven asset. Australia is the world&apos;s second-largest gold producer, and the Perth Mint is a globally trusted refiner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { route: "Perth Mint GoldPass", desc: "Government-backed digital gold. Buy fractions from $1. Physical delivery available. Stored at Perth Mint." },
              { route: "PMGOLD ETF", desc: "ASX-listed; backed by Perth Mint gold. Lowest MER at 0.15%. No physical delivery but easy to trade." },
              { route: "GOLD ETF", desc: "ETFS Physical Gold; backed by gold in London vaults. MER 0.40%. AUD-denominated but unhedged (USD gold price exposure)." },
              { route: "Physical bars/coins", desc: "Buy from Perth Mint, ABC Bullion, or dealers. Spreads of 3–8% over spot. Storage and insurance costs." },
            ].map((r) => (
              <div key={r.route} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900">{r.route}</p>
                <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link
              href="/invest/gold"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Read Full Gold Investment Guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Section 4: Resource Stocks */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Major ASX Resource Stocks</h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Code</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Company</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Commodity Focus</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "BHP", name: "BHP Group", focus: "Iron ore, copper, coal, nickel", cap: "$200B+" },
                  { code: "RIO", name: "Rio Tinto", focus: "Iron ore, aluminium, copper", cap: "$150B+" },
                  { code: "FMG", name: "Fortescue", focus: "Iron ore, green energy", cap: "$60B+" },
                  { code: "WDS", name: "Woodside Energy", focus: "LNG, natural gas, oil", cap: "$40B+" },
                  { code: "NEM", name: "Newmont (ASX listing)", focus: "Gold", cap: "$60B+" },
                  { code: "STO", name: "Santos", focus: "Natural gas, oil, LNG", cap: "$20B+" },
                  { code: "PLS", name: "Pilbara Minerals", focus: "Lithium (spodumene)", cap: "$12B+" },
                  { code: "IGO", name: "IGO Limited", focus: "Lithium, nickel, copper", cap: "$5B+" },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.focus}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.cap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 5: Tax */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Tax Treatment</h2>

          <div className="prose prose-slate max-w-none">
            <ul>
              <li><strong>Commodity ETFs/ETCs</strong> — treated as CGT assets; 50% discount applies if held 12+ months</li>
              <li><strong>Physical gold/silver</strong> — CGT asset; GST-free for investment-grade precious metals (at least 99.5% pure gold, 99.9% pure silver)</li>
              <li><strong>Commodity CFDs/futures</strong> — generally on revenue account (ordinary income); no CGT discount</li>
              <li><strong>Resource stocks</strong> — capital gains treatment; dividends taxed at marginal rate with franking credits</li>
              <li><strong>SMSF</strong> — all commodity investments permitted within an SMSF; taxed at 15% (accumulation) or 0% (pension)</li>
              <li><strong>Perth Mint gold</strong> — CGT asset; no GST on purchase of investment-grade gold</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Risk */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Key Risks</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Price volatility</strong> — commodity prices can swing 20–50% in a year; oil dropped below $0 in April 2020</li>
              <li><strong>No income</strong> — physical commodities and most commodity ETFs produce no income or dividends</li>
              <li><strong>Contango (futures-based ETFs)</strong> — synthetic/futures-based ETFs like OOO can underperform spot prices due to roll costs</li>
              <li><strong>Currency risk</strong> — most commodities are priced in USD; AUD/USD movements affect AUD-denominated returns</li>
              <li><strong>Storage and insurance</strong> — physical bullion requires secure storage and insurance</li>
              <li><strong>Geopolitical risk</strong> — supply disruptions, trade wars, and OPEC decisions can cause sudden price shocks</li>
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


      {/* Compare Platforms */}
      {brokers && brokers.length > 0 && (
        <section className="py-14 bg-slate-50">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Compare Platforms</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Where to Trade Commodities</h2>
            <p className="text-sm text-slate-500 mb-6">Top-rated Australian platforms ranked by fees, features, and user ratings.</p>
            <div className="space-y-3">
              {(brokers as { id: number; name: string; slug: string; rating: number | null; asx_fee: string | null; min_deposit: string | null; affiliate_url: string | null; deal: boolean | null; deal_text: string | null; icon: string | null }[]).map((broker, i) => (
                <div key={broker.id} className={`flex items-center gap-4 bg-white border rounded-xl p-4 ${i === 0 ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200"}`}>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-sm font-bold text-slate-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{broker.name}</p>
                      {SHOW_EDITORIAL_BADGES && i === 0 && <span className="text-[0.6rem] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">TOP RATED</span>}
                      {broker.deal && <span className="text-[0.6rem] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">DEAL</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {SHOW_RATINGS && broker.rating && <span className="text-xs text-amber-600 font-semibold">&#9733; {broker.rating.toFixed(1)}</span>}
                      {broker.asx_fee && <span className="text-xs text-slate-500">ASX: {broker.asx_fee}</span>}
                      {broker.min_deposit && <span className="text-xs text-slate-500">Min: {broker.min_deposit}</span>}
                    </div>
                    {broker.deal_text && <p className="text-xs text-green-700 mt-1">{broker.deal_text}</p>}
                  </div>
                  {broker.affiliate_url ? (
                    <a
                      href={`/go/${broker.slug}`}
                      target="_blank"
                      rel="noopener noreferrer nofollow sponsored"
                      className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Visit Site &rarr;
                    </a>
                  ) : (
                    <Link
                      href={`/broker/${broker.slug}`}
                      className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/compare" className="text-sm font-semibold text-amber-600 hover:text-amber-700">
                Compare all platforms &rarr;
              </Link>
            </div>
            {!SHOW_EDITORIAL_BADGES && (
              <p className="text-xs text-slate-400 mt-3">{FACTUAL_COMPARISON_DISCLAIMER}</p>
            )}
          </div>
        </section>
      )}

      {/* Find an Advisor */}
      {advisors && advisors.length > 0 && (
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Expert Advisors</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{ADVISOR_DIRECTORY_HEADING}</h2>
            <p className="text-sm text-slate-500 mb-6">{ADVISOR_DIRECTORY_SUBTEXT}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(advisors as { slug: string; name: string; firm_name: string | null; type: string; location_display: string | null; rating: number | null; review_count: number | null; photo_url: string | null; verified: boolean | null }[]).map((advisor) => (
                <Link
                  key={advisor.slug}
                  href={`/advisor/${advisor.slug}`}
                  className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-200 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {advisor.photo_url ? (
                      <Image src={advisor.photo_url} alt={advisor.name} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-slate-400">{advisor.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{advisor.name}</p>
                      {SHOW_ADVISOR_VERIFIED_BADGE && advisor.verified && <span className="text-[0.6rem] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">VERIFIED</span>}
                    </div>
                    {advisor.firm_name && <p className="text-xs text-slate-500">{advisor.firm_name}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {SHOW_ADVISOR_RATINGS && advisor.rating && <span className="text-xs text-amber-600 font-semibold">&#9733; {advisor.rating.toFixed(1)}</span>}
                      {SHOW_ADVISOR_RATINGS && advisor.review_count && advisor.review_count > 0 && <span className="text-xs text-slate-400">({advisor.review_count} reviews)</span>}
                      {advisor.location_display && <span className="text-xs text-slate-400">{advisor.location_display}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/advisors" className="text-sm font-semibold text-amber-600 hover:text-amber-700">
                Browse all advisors &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}
      {/* Related guides */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Explore Related Investment Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Gold Investment", href: "/invest/gold", desc: "Perth Mint, ASX gold ETFs, physical bullion and gold mining stocks." },
              { title: "Mining & Resources", href: "/invest/mining", desc: "ASX mining stocks, lithium, iron ore and resource sector investing." },
              { title: "Infrastructure", href: "/invest/infrastructure", desc: "Toll roads, airports, utilities and ports for stable inflation-linked income." },
              { title: "Managed Funds & Index Funds", href: "/invest/managed-funds", desc: "Compare passive index funds and actively managed strategies in Australia." },
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
              <h2 className="text-lg font-bold text-slate-900 mb-1">Get Advice on Commodity Allocation</h2>
              <p className="text-sm text-slate-500">
                A financial planner can help you determine the right commodity allocation for your portfolio and risk profile.
              </p>
            </div>
            <Link
              href="/advisors/financial-planners"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Find a Financial Planner &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
