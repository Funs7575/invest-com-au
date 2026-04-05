import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";

export const metadata: Metadata = {
  title: `Crypto Staking & DeFi Australia — Yields, Platforms & Tax (${CURRENT_YEAR})`,
  description:
    "Crypto staking yields, DeFi for Australians, crypto ETFs on ASX (Monochrome EBTC, Global X 21Shares), regulated platforms (Swyftx, CoinSpot) and ATO tax treatment.",
  alternates: { canonical: `${SITE_URL}/invest/crypto-staking` },
  openGraph: {
    title: `Crypto Staking & DeFi Australia — Yields, Platforms & Tax (${CURRENT_YEAR})`,
    description:
      "Crypto staking yields, DeFi for Australians, crypto ETFs on ASX (Monochrome EBTC, Global X 21Shares), regulated platforms (Swyftx, CoinSpot) and ATO tax treatment.",
    url: `${SITE_URL}/invest/crypto-staking`,
  },
};

export const revalidate = 3600;

export default async function CryptoStakingPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, rating, platform_type, asx_fee, us_fee, min_deposit, affiliate_url, deal, deal_text, icon")
    .eq("status", "active")
    .in("platform_type", ["crypto_exchange"])
    .order("rating", { ascending: false })
    .limit(5);

  const { data: advisors } = await supabase
    .from("professionals")
    .select("slug, name, firm_name, type, location_display, rating, review_count, photo_url, verified")
    .eq("status", "active")
    .in("type", ["crypto_advisor", "tax_agent"])
    .order("rating", { ascending: false })
    .limit(3);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Crypto Staking & DeFi" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Crypto Staking & DeFi Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/crypto-staking`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What is crypto staking?", acceptedAnswer: { "@type": "Answer", text: "Crypto staking involves locking up cryptocurrency to support a proof-of-stake (PoS) blockchain network in exchange for rewards. By staking, you help validate transactions and secure the network, earning new tokens as a reward — similar to earning interest on a savings account. Popular stakeable assets include Ethereum (3-5% p.a.), Solana (5-7% p.a.), and Polkadot (10-14% p.a.)." } },
      { "@type": "Question", name: "Is crypto staking taxed in Australia?", acceptedAnswer: { "@type": "Answer", text: "Yes, the ATO treats staking rewards as ordinary income, taxed at your marginal rate at the market value when received. You must declare the AUD value of each staking reward at the time it is received. When you later sell the staked tokens, any gain or loss is a CGT event, with the 50% discount available if held for 12+ months. Use crypto tax tools like Koinly or CryptoTaxCalculator to track everything." } },
      { "@type": "Question", name: "What is the best staking platform in Australia?", acceptedAnswer: { "@type": "Answer", text: "CoinSpot is the most popular Australian exchange with staking for 25+ tokens and a simple one-click interface. Swyftx is AUSTRAC-registered and offers staking for major tokens including ETH and SOL. For maximum security, Ledger Live allows staking from a hardware wallet with self-custody. For liquid staking specifically, Lido protocol lets you stake ETH while keeping it liquid as stETH." } },
      { "@type": "Question", name: "What is DeFi?", acceptedAnswer: { "@type": "Answer", text: "Decentralised Finance (DeFi) uses smart contracts on blockchains to provide financial services — lending, borrowing, trading, and yield generation — without intermediaries like banks. Australians can access DeFi through self-custody wallets (MetaMask, Ledger). Popular protocols include Aave (lending/borrowing), Uniswap (decentralised trading), and Curve Finance (stablecoin pools). DeFi carries significant smart contract and hacking risks." } },
      { "@type": "Question", name: "Are crypto ETFs available on the ASX?", acceptedAnswer: { "@type": "Answer", text: "Yes, several crypto ETFs now trade on the ASX. Monochrome offers IBTC (Bitcoin) and IETH (Ethereum) with 0.50% MER, backed by physical crypto. Global X 21Shares offers EBTC (Bitcoin) and EETH (Ethereum) at 0.59% MER. Betashares CRYP provides exposure to crypto company stocks rather than direct crypto. These ETFs provide regulated, custody-managed access without needing to manage wallets or private keys." } },
      { "@type": "Question", name: "How is staking different from mining?", acceptedAnswer: { "@type": "Answer", text: "Mining (proof-of-work) requires specialised hardware and massive electricity consumption to solve mathematical puzzles — used by Bitcoin. Staking (proof-of-stake) requires holding and locking tokens to validate transactions — used by Ethereum, Solana, and most modern blockchains. Staking is far more energy-efficient, accessible to retail investors with no special hardware, and provides predictable yield returns." } },
      { "@type": "Question", name: "Is crypto staking safe?", acceptedAnswer: { "@type": "Answer", text: "Staking carries several risks: slashing risk (validators can lose a portion of staked tokens for network violations), platform risk (centralised exchanges like FTX and Celsius have failed, losing customer funds), smart contract risk (DeFi staking protocols can be hacked), and underlying asset volatility (staking yields are meaningless if the token price drops 50%+). Self-custody through hardware wallets reduces platform risk but not market risk." } },
      { "@type": "Question", name: "Which cryptocurrencies can you stake?", acceptedAnswer: { "@type": "Answer", text: "Most proof-of-stake blockchains support staking. Major options include Ethereum (ETH, 3-5% p.a.), Solana (SOL, 5-7%), Cardano (ADA, 3-5%), Polkadot (DOT, 10-14%), Cosmos (ATOM, 8-12%), and Avalanche (AVAX, 7-10%). Bitcoin cannot be staked as it uses proof-of-work. Yields vary based on network conditions and are paid in the native token, so returns in AUD depend on price movements." } },
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
            <span className="text-slate-300">Crypto Staking &amp; DeFi</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
              Staking &middot; DeFi &middot; Crypto ETFs
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Crypto Staking &amp; DeFi for Australians
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Beyond buying and holding crypto — Australians can earn yield through staking, access DeFi protocols, and invest in crypto via ASX-listed ETFs. Here is what you need to know about yields, platforms, regulation, and ATO tax treatment.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Compare Platforms &rarr;
            </Link>
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-5 py-2.5 rounded-lg border border-white/20 transition-colors"
            >
              Take the Quiz (60s)
            </Link>
          </div>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "3–7%", label: "ETH staking yield (current)" },
              { value: "4–12%", label: "Stablecoin DeFi yields" },
              { value: "25%+", label: "Australians who own crypto" },
              { value: "2+", label: "Crypto ETFs on ASX" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Staking */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What Is Crypto Staking?</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Staking involves locking up cryptocurrency to support a proof-of-stake blockchain network (like Ethereum) in exchange for rewards. Think of it as earning interest on your crypto holdings by helping validate transactions on the network.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Asset</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Current Yield</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Lock-Up</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { asset: "Ethereum (ETH)", yield: "3–5% p.a.", lockup: "Variable (liquid staking available)", risk: "Low (blue-chip crypto)" },
                  { asset: "Solana (SOL)", yield: "5–7% p.a.", lockup: "~2 days unstaking", risk: "Medium" },
                  { asset: "Cardano (ADA)", yield: "3–5% p.a.", lockup: "No lock-up (delegated staking)", risk: "Medium" },
                  { asset: "Polkadot (DOT)", yield: "10–14% p.a.", lockup: "28 days unbonding", risk: "Medium-high" },
                  { asset: "Cosmos (ATOM)", yield: "8–12% p.a.", lockup: "21 days unbonding", risk: "Medium-high" },
                ].map((r, i) => (
                  <tr key={r.asset} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.asset}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">{r.yield}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.lockup}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 2: Australian Platforms */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Australian Platforms Offering Staking</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { platform: "Swyftx", desc: "AUSTRAC-registered Australian exchange. Staking available for ETH, SOL, DOT, and others. Rewards paid directly to your account.", feature: "Earn & stake built-in" },
              { platform: "CoinSpot", desc: "Australia's most popular exchange. Staking available for 25+ tokens. Simple one-click staking interface.", feature: "Largest AU coin selection" },
              { platform: "Binance Australia", desc: "Global exchange with Australian entity. Wide range of staking products including flexible and locked staking.", feature: "Highest yield options" },
              { platform: "Kraken", desc: "US-based exchange available to Australians. Staking for 15+ tokens. On-chain staking with transparent rewards.", feature: "On-chain staking" },
              { platform: "Lido (self-custody)", desc: "Decentralised liquid staking protocol. Stake ETH and receive stETH (liquid staking token) tradeable on DeFi. Requires own wallet (MetaMask, Ledger).", feature: "Liquid staking (DeFi)" },
              { platform: "Ledger Live", desc: "Stake directly from your Ledger hardware wallet. Supports ETH, SOL, DOT, ATOM, and others. Maximum security with self-custody.", feature: "Self-custody staking" },
            ].map((p) => (
              <div key={p.platform} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">{p.platform}</p>
                  <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded shrink-0">{p.feature}</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Magnet */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <ContextualLeadMagnet segment="beginner-guide" />
        </div>
      </section>

      {/* Section 3: DeFi */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">DeFi for Australians</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Decentralised Finance (DeFi) uses smart contracts on blockchains to provide financial services — lending, borrowing, trading, and yield generation — without intermediaries. Australian users can access DeFi through self-custody wallets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { protocol: "Aave", type: "Lending/Borrowing", desc: "Earn yield by lending crypto; borrow against your holdings. Supports multiple chains (Ethereum, Polygon, Arbitrum).", yield: "2–8% on stablecoins" },
              { protocol: "Uniswap", type: "DEX / Liquidity", desc: "Provide liquidity to trading pairs and earn fees. Most popular decentralised exchange. Requires understanding of impermanent loss.", yield: "5–30% (variable, with IL risk)" },
              { protocol: "Curve Finance", type: "Stablecoin DEX", desc: "Optimised for stablecoin trading. Lower risk than volatile pair LPs. Popular with conservative DeFi users.", yield: "3–10% on stablecoin pools" },
              { protocol: "Lido", type: "Liquid Staking", desc: "Stake ETH and receive stETH, which can be used in other DeFi protocols simultaneously. Largest liquid staking protocol.", yield: "3–5% (ETH staking)" },
            ].map((p) => (
              <div key={p.protocol} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">{p.protocol}</p>
                  <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded shrink-0">{p.type}</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">{p.desc}</p>
                <span className="inline-block text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-2">{p.yield}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Crypto ETFs */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Crypto ETFs on the ASX</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            For investors who want crypto exposure without managing wallets and private keys, ASX-listed crypto ETFs provide regulated, custody-managed access.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Code</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Name</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Underlying</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">MER</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "IBTC", name: "Monochrome Bitcoin ETF", underlying: "Physical Bitcoin", mer: "0.50%" },
                  { code: "IETH", name: "Monochrome Ethereum ETF", underlying: "Physical Ethereum", mer: "0.50%" },
                  { code: "EBTC", name: "Global X 21Shares Bitcoin ETF", underlying: "Physical Bitcoin", mer: "0.59%" },
                  { code: "EETH", name: "Global X 21Shares Ethereum ETF", underlying: "Physical Ethereum", mer: "0.59%" },
                  { code: "CRYP", name: "Betashares Crypto Innovators ETF", underlying: "Crypto company stocks (not direct crypto)", mer: "0.67%" },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.underlying}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.mer}</td>
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
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">ATO Tax Treatment</h2>

          <div className="prose prose-slate max-w-none">
            <ul>
              <li><strong>Staking rewards</strong> — the ATO treats staking rewards as <strong>ordinary income</strong> at the market value when received. You must declare the AUD value of each reward at the time it is received.</li>
              <li><strong>DeFi income</strong> — lending interest, liquidity provision rewards, and yield farming returns are assessable income</li>
              <li><strong>CGT on disposal</strong> — selling, swapping, or spending crypto is a CGT event; 50% discount if held 12+ months</li>
              <li><strong>Wrapping / liquid staking</strong> — swapping ETH to stETH or wrapping tokens is likely a CGT event (ATO guidance pending on some scenarios)</li>
              <li><strong>Crypto ETFs (ASX)</strong> — treated like any other ETF for tax; CGT on disposal, distributions taxed as income</li>
              <li><strong>Record keeping</strong> — the ATO requires detailed records of every transaction; use crypto tax tools (Koinly, CryptoTaxCalculator, Syla) to generate reports</li>
            </ul>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { tool: "Koinly", desc: "Most popular crypto tax software in Australia. Auto-imports from 700+ exchanges. ATO-ready reports." },
              { tool: "CryptoTaxCalculator", desc: "Australian-built crypto tax tool. Supports DeFi, staking, NFTs. Integrates with ATO myTax." },
              { tool: "Syla", desc: "Australian crypto tax platform. Free basic tier. Supports all major AU exchanges." },
            ].map((t) => (
              <div key={t.tool} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="font-bold text-slate-900 text-sm">{t.tool}</p>
                <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Key Risks</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Smart contract risk</strong> — DeFi protocols can be hacked; billions have been lost to smart contract exploits</li>
              <li><strong>Slashing risk</strong> — validators can be penalised (slashed) for network violations, reducing staked assets</li>
              <li><strong>Platform risk</strong> — centralised exchanges can fail (FTX, Celsius); prefer self-custody for large holdings</li>
              <li><strong>Impermanent loss</strong> — providing liquidity to DeFi pools can result in losses when token prices diverge</li>
              <li><strong>Regulatory risk</strong> — Australian crypto regulation is evolving; DeFi may face future licensing requirements</li>
              <li><strong>Underlying asset volatility</strong> — staking yields are irrelevant if the underlying token drops 50%+</li>
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
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Best Crypto Staking Platforms</h2>
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
                      {i === 0 && <span className="text-[0.6rem] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">TOP RATED</span>}
                      {broker.deal && <span className="text-[0.6rem] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">DEAL</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {broker.rating && <span className="text-xs text-amber-600 font-semibold">&#9733; {broker.rating.toFixed(1)}</span>}
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
          </div>
        </section>
      )}

      {/* Find an Advisor */}
      {advisors && advisors.length > 0 && (
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Expert Advisors</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Speak to a Verified Professional</h2>
            <p className="text-sm text-slate-500 mb-6">ASIC-registered advisors verified by Invest.com.au. Free initial consultation.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(advisors as { slug: string; name: string; firm_name: string | null; type: string; location_display: string | null; rating: number | null; review_count: number | null; photo_url: string | null; verified: boolean | null }[]).map((advisor) => (
                <Link
                  key={advisor.slug}
                  href={`/advisor/${advisor.slug}`}
                  className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-200 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {advisor.photo_url ? (
                      <img src={advisor.photo_url} alt={advisor.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-slate-400">{advisor.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{advisor.name}</p>
                      {advisor.verified && <span className="text-[0.6rem] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">VERIFIED</span>}
                    </div>
                    {advisor.firm_name && <p className="text-xs text-slate-500">{advisor.firm_name}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {advisor.rating && <span className="text-xs text-amber-600 font-semibold">&#9733; {advisor.rating.toFixed(1)}</span>}
                      {advisor.review_count && advisor.review_count > 0 && <span className="text-xs text-slate-400">({advisor.review_count} reviews)</span>}
                      {advisor.location_display && <span className="text-xs text-slate-400">{advisor.location_display}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/find-advisor" className="text-sm font-semibold text-amber-600 hover:text-amber-700">
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
              { title: "Options & Derivatives", href: "/invest/options-trading", desc: "ASX-listed options, CFDs, warrants and futures for Australian traders." },
              { title: "Forex Trading", href: "/invest/forex", desc: "AUD/USD pairs, ASIC-regulated brokers, spreads and leverage limits." },
              { title: "Managed Funds & Index Funds", href: "/invest/managed-funds", desc: "Compare passive index funds and actively managed strategies in Australia." },
              { title: "Alternative Investments", href: "/invest/alternatives", desc: "Wine, art, classic cars, watches and collectibles as investment assets." },
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
              <h2 className="text-lg font-bold text-slate-900 mb-1">Compare Crypto Platforms</h2>
              <p className="text-sm text-slate-500">
                Compare AUSTRAC-registered Australian crypto exchanges — fees, staking options, supported coins, and security features.
              </p>
            </div>
            <Link
              href="/crypto"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Compare Crypto Exchanges &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
