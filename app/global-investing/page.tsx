import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import type { FaqItem } from "@/lib/schema-markup";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Global Investing for Australians (${CURRENT_YEAR}) — ETFs, US Shares, Currency & Tax`,
  description: `How Australians invest globally: VGS, IVV, NDQ ETFs; US shares via IBKR, Stake, CMC; currency risk, W-8BEN, and FITO explained. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Global Investing for Australians (${CURRENT_YEAR})`,
    description:
      "The ASX is only ~2% of world market cap. Here's how Australians access the other 98% — via AU-listed ETFs or direct international shares — and the tax rules that govern both.",
    url: `${SITE_URL}/global-investing`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Global Investing for Australians")}&sub=${encodeURIComponent("ETFs · US Shares · Currency · Tax · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing` },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const ASX_SECTORS = [
  { sector: "Financials", asx: "30%", msci: "17%" },
  { sector: "Materials", asx: "20%", msci: "4%" },
  { sector: "Healthcare", asx: "11%", msci: "13%" },
  { sector: "Real Estate (REITs)", asx: "9%", msci: "2%" },
  { sector: "Industrials", asx: "8%", msci: "11%" },
  { sector: "Consumer Staples", asx: "5%", msci: "7%" },
  { sector: "Technology", asx: "3%", msci: "25%" },
  { sector: "Energy", asx: "4%", msci: "4%" },
  { sector: "Other", asx: "10%", msci: "17%" },
];

const GLOBAL_ACCESS_METHODS = [
  {
    method: "Global ETFs (ASX-listed)",
    examples: "VGS, IVV, NDQ, VGE, VGAD",
    complexity: "Low",
    ownership: "Beneficial (via ETF trust)",
    costRange: "0.04%–0.48% MER p.a.",
    notes: "Simplest entry point. No foreign account needed, no W-8BEN, no US estate-tax exposure. Tax reporting via annual tax statement.",
    href: "/global-investing/etfs",
  },
  {
    method: "CHESS-sponsored international",
    examples: "IBKR, CMC International, Stake (some structures)",
    complexity: "Medium",
    ownership: "Direct — name on register (DRS)",
    costRange: "From US$0 + FX spread",
    notes: "Strongest ownership. You appear as registered holder. US estate-tax exposure if holdings >US$60k. W-8BEN required for US shares.",
    href: "/global-investing/shares/us",
  },
  {
    method: "Custodial international shares",
    examples: "SelfWealth International, CommSec International",
    complexity: "Medium",
    ownership: "Beneficial (nominee holds shares)",
    costRange: "From AU$0 + FX spread",
    notes: "Broker or custodian holds shares in their name. Counterparty risk if broker fails. US estate-tax exposure on US-listed shares still applies.",
    href: "/global-investing/guides/chess-vs-custodial-international",
  },
  {
    method: "International managed funds",
    examples: "Magellan, MFS, Platinum",
    complexity: "Low–Medium",
    ownership: "Beneficial (units in trust)",
    costRange: "0.50%–1.50%+ p.a.",
    notes: "Active management premium. Accessible via broker or directly. Performance varies widely; most underperform index equivalents over 10+ years.",
    href: "/global-investing/etfs",
  },
  {
    method: "Global LICs (ASX-listed)",
    examples: "MFF, WGB, PMC, FGG",
    complexity: "Low",
    ownership: "Shares in a listed company",
    costRange: "0.60%–1.20% p.a. (implicit)",
    notes: "Trade on ASX like any share. Can trade at a discount or premium to NTA. Franked dividends sometimes available depending on structure.",
    href: "/global-investing/lics",
  },
];

const POPULAR_ETFS = [
  {
    ticker: "VGS",
    name: "Vanguard MSCI Index Intl Shares ETF",
    index: "MSCI World ex-Australia",
    mer: "0.18%",
    hedged: false,
    focus: "Developed-world equities (~1,500 stocks); largest holdings Apple, Microsoft, NVIDIA, Amazon, Meta",
    pro: "Broad diversification, low cost, no single-country concentration risk",
    con: "US still ~70% of index; zero emerging-market exposure",
  },
  {
    ticker: "IVV",
    name: "iShares S&P 500 ETF (AU)",
    index: "S&P 500",
    mer: "0.04%",
    hedged: false,
    focus: "500 largest US companies; heavy technology and consumer discretionary",
    pro: "Lowest MER of any AU-listed international ETF; extremely liquid",
    con: "100% US exposure; no diversification outside the US",
  },
  {
    ticker: "NDQ",
    name: "BetaShares NASDAQ 100 ETF",
    index: "NASDAQ 100",
    mer: "0.22%",
    hedged: false,
    focus: "100 largest non-financial NASDAQ stocks; ~55% megacap tech",
    pro: "High-growth tech tilt; strong long-run track record",
    con: "Concentration risk — top 10 stocks are ~50% of portfolio; volatile",
  },
  {
    ticker: "VGE",
    name: "Vanguard FTSE Emerging Markets ETF",
    index: "FTSE Emerging Markets All Cap",
    mer: "0.48%",
    hedged: false,
    focus: "Emerging economies: China, India, Taiwan, South Korea, Brazil",
    pro: "Access to faster-growing economies not in VGS",
    con: "Higher political and currency risk; China ~25–30% of index",
  },
  {
    ticker: "VGAD",
    name: "Vanguard Intl Shares Hedged ETF",
    index: "MSCI World ex-Australia (AUD hedged)",
    mer: "0.21%",
    hedged: true,
    focus: "Same holdings as VGS but with AUD/USD forward contract overlay",
    pro: "Removes currency fluctuation; pure equity-return exposure",
    con: "Hedging costs ~0.03–0.08% p.a. extra; reduces natural AUD diversification benefit",
  },
];

const TOPIC_CARDS = [
  {
    href: "/global-investing/etfs",
    label: "Global ETFs",
    desc: "VGS, IVV, NDQ, VGE, VGAD compared — MER, index, region, hedging.",
    color: "from-blue-50 to-white",
  },
  {
    href: "/global-investing/currency",
    label: "Currency & FX",
    desc: "AUD/USD dynamics, hedged vs unhedged, best FX transfer providers.",
    color: "from-sky-50 to-white",
  },
  {
    href: "/global-investing/tax/w-8ben",
    label: "US Tax (W-8BEN)",
    desc: "How to claim the 15% treaty rate instead of 30% dividend withholding.",
    color: "from-amber-50 to-white",
  },
  {
    href: "/global-investing/tax/us-estate-tax",
    label: "US Estate Tax",
    desc: "The US$60k threshold that catches most Australian investors off guard.",
    color: "from-red-50 to-white",
  },
  {
    href: "/global-investing/tax/cgt-on-foreign-shares",
    label: "CGT on Foreign Shares",
    desc: "AUD cost-base rules, FX impact on gains, 50% CGT discount eligibility.",
    color: "from-amber-50 to-white",
  },
  {
    href: "/global-investing/guides/chess-vs-custodial-international",
    label: "CHESS vs Custodial",
    desc: "Own the shares directly vs beneficial interest — what it means in practice.",
    color: "from-violet-50 to-white",
  },
  {
    href: "/global-investing/guides/ibkr-australia-setup",
    label: "IBKR Setup Guide",
    desc: "Step-by-step: open Interactive Brokers from Australia, fund in AUD, buy US shares.",
    color: "from-emerald-50 to-white",
  },
  {
    href: "/global-investing/bonds",
    label: "Bonds",
    desc: "US Treasuries via IBKR plus AU-listed global bond ETFs (VBND, IAF).",
    color: "from-slate-50 to-white",
  },
  {
    href: "/global-investing/crypto",
    label: "Crypto",
    desc: "Global vs AUSTRAC-registered exchanges: KYC, tax, on-ramp comparisons.",
    color: "from-violet-50 to-white",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "How do Australian investors buy international shares?",
    a: "There are two main routes. The first is via AU-listed ETFs on the ASX — products like VGS or IVV hold global shares on your behalf and trade like any ASX share, so no foreign account is needed. The second is direct: open an account with an international broker (Interactive Brokers, Stake, CMC International) and buy shares listed on NYSE, NASDAQ, or other foreign exchanges. For most long-term investors, AU-listed ETFs are simpler and often cheaper once FX conversion fees and brokerage are factored in. Direct international shares make sense if you want a specific stock or prefer the stronger ownership rights of direct registration.",
  },
  {
    q: "Do I pay tax on foreign share dividends in Australia?",
    a: "Yes. Australian tax residents pay income tax on worldwide income, including foreign dividends. However, where foreign tax has already been withheld (for example, the 15% US withholding tax on dividends from US companies), you can claim a Foreign Income Tax Offset (FITO) against your Australian tax bill — so you're not taxed twice on the same income. Note that foreign dividends carry no franking credits. If you invest via AU-listed ETFs, the ETF's annual tax statement handles this attribution for you.",
  },
  {
    q: "Should I use hedged or unhedged international ETFs?",
    a: "Most long-term investors use unhedged. Over multi-decade periods, currency fluctuations tend to average out, and the AUD/foreign currency exposure actually provides diversification — when AUD weakens, your unhedged foreign holdings rise in AUD terms, cushioning domestic economic downturns. Hedging costs around 0.03–0.08% per year in higher fees and forward-contract roll costs. Hedged ETFs (like VGAD vs VGS) suit investors with a shorter horizon (under 5 years) or those who want pure equity-return exposure without currency noise. The decision should be based on your time horizon, not last quarter's FX movement.",
  },
  {
    q: "What is the US estate tax risk for Australians?",
    a: "The US federal estate tax applies to US-situs assets (primarily US-listed shares held directly) owned by non-US-residents at death. Non-resident aliens get only a US$60,000 exemption (compared to US$13.6M for US citizens and residents). Estates exceeding this threshold can face up to 40% federal estate tax on the excess. The Australia–US Estate Tax Treaty provides a unified credit that can substantially reduce liability, but it is not automatic and requires proper planning. The practical fix for many investors is to hold US-market exposure via AU-listed ETFs (like IVV) rather than directly — AU-domiciled ETFs are not US-situs assets and fall outside the US estate-tax net entirely.",
  },
  {
    q: "Is it better to buy international ETFs or individual shares directly?",
    a: "For most Australian investors, AU-listed international ETFs win on cost, simplicity, and tax efficiency. A product like IVV (S&P 500, 0.04% MER) gives you exposure to 500 US companies at a lower total cost than buying even a handful of US shares directly, once you account for FX conversion fees (0.40–0.70% on retail brokers), per-trade brokerage, and the administrative burden of W-8BEN renewals and US estate-tax exposure. Direct shares make sense if you have a specific investment thesis on a company, are a frequent trader who can justify IBKR&apos;s 0.002% FX spread, or want maximum ownership rights via direct registration.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function GlobalInvestingHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing" },
  ]);
  const faqLd = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <ArticleReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Global Investing</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                {UPDATED_LABEL}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
                Global investing{" "}
                <span className="text-amber-500">for Australians</span>
              </h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-3">
                The ASX represents about{" "}
                <strong className="text-slate-900">2% of world market capitalisation</strong>.
                Investing only in Australia means skipping 98% of global opportunities —
                and concentrating in financials, materials, and REITs that dominate the ASX 200.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                This hub covers both ways to access global markets from Australia: AU-listed ETFs
                (no foreign account needed) and direct international shares via overseas brokers.
                Plus the currency risks, tax obligations, and ownership differences that
                determine which approach suits your situation.
              </p>

              {/* Quick-start CTA grid */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <Link
                  href="/global-investing/etfs"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Compare global ETFs &rarr;
                </Link>
                <Link
                  href="/global-investing/shares/us"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Buy US shares directly &rarr;
                </Link>
                <Link
                  href="/global-investing/tax/w-8ben"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  W-8BEN &amp; dividend tax &rarr;
                </Link>
                <Link
                  href="/global-investing/guides/chess-vs-custodial-international"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  CHESS vs custodial &rarr;
                </Link>
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "~2%", label: "ASX share of world market cap", sub: "The other 98% is abroad" },
                { value: "30%", label: "ASX weight in financials", sub: "vs 17% in MSCI World" },
                { value: "0.04%", label: "Cheapest global ETF MER (IVV)", sub: "Lowest cost on the ASX" },
                { value: "US$60k", label: "US estate-tax threshold", sub: "For non-US residents" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xl md:text-2xl font-extrabold text-amber-600">{s.value}</div>
                  <div className="text-[0.65rem] font-bold text-slate-900 mt-0.5 leading-tight">{s.label}</div>
                  <div className="text-[0.6rem] text-slate-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Market composition ─────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Why go global</p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
              ASX vs global markets: the sector gap
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              An all-ASX portfolio is heavily weighted to banks, miners, and REITs —
              and almost completely misses global technology. The MSCI World Index
              shows what a globally diversified portfolio actually looks like.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm" aria-label="ASX vs global markets — sector weight comparison">
                <thead>
                  <tr className="bg-white border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-slate-600">Sector</th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-bold text-slate-600">ASX 200</th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-bold text-slate-600">MSCI World</th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-bold text-slate-600 hidden sm:table-cell">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {ASX_SECTORS.map((row, i) => {
                    const asxNum = parseFloat(row.asx);
                    const msciNum = parseFloat(row.msci);
                    const diff = msciNum - asxNum;
                    const diffLabel = diff > 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`;
                    const diffColor = diff > 5 ? "text-emerald-700" : diff < -5 ? "text-red-600" : "text-slate-500";
                    return (
                      <tr key={row.sector} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-4 py-3 font-medium text-slate-800 text-xs sm:text-sm">{row.sector}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs sm:text-sm text-slate-700">{row.asx}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs sm:text-sm text-slate-700">{row.msci}</td>
                        <td className={`px-4 py-3 text-right tabular-nums text-xs hidden sm:table-cell font-semibold ${diffColor}`}>
                          {diffLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[0.65rem] text-slate-500 mt-2">
              Approximate weights as of {CURRENT_YEAR}. Sources: ASX, MSCI. Weights shift over time.
            </p>
          </div>
        </div>
      </section>

      {/* ── Ways to invest globally ────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Your options</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Five ways to invest globally from Australia
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            Each method differs in ownership structure, cost, complexity, and tax treatment.
            The right choice depends on your amount, holding period, and whether you need
            specific stock exposure or broad diversification.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-xs md:text-sm" aria-label="Five ways to invest globally from Australia — method, cost and ownership comparison">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600">Method</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600 hidden md:table-cell">Examples</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600 hidden lg:table-cell">Ownership</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600">Cost</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600 hidden xl:table-cell">Key notes</th>
                </tr>
              </thead>
              <tbody>
                {GLOBAL_ACCESS_METHODS.map((row, i) => (
                  <tr key={row.method} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link href={row.href} className="hover:text-amber-700 transition-colors">
                        {row.method}
                      </Link>
                      <div className="text-[0.6rem] text-slate-500 font-normal mt-0.5 md:hidden">{row.examples}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{row.examples}</td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{row.ownership}</td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-[0.65rem]">{row.costRange}</td>
                    <td className="px-4 py-3 text-slate-600 leading-relaxed hidden xl:table-cell max-w-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Popular global ETFs ────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Track B — AU-listed</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Popular global ETFs available on the ASX
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            These five ETFs cover the most common approaches: broad developed-world exposure,
            US-only, tech-heavy, emerging markets, and currency-hedged. Each trades on the ASX
            and requires no foreign broker account.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {POPULAR_ETFS.map((etf) => (
              <div
                key={etf.ticker}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg mr-2 font-mono">
                      {etf.ticker}
                    </span>
                    {etf.hedged && (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-[0.6rem] font-bold rounded-lg">
                        AUD hedged
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-700 tabular-nums">{etf.mer} MER</span>
                </div>
                <p className="text-xs font-bold text-slate-900 mb-1">{etf.name}</p>
                <p className="text-[0.65rem] text-slate-500 mb-3 italic">{etf.index}</p>
                <p className="text-[0.65rem] text-slate-600 leading-relaxed mb-3">{etf.focus}</p>
                <div className="space-y-1">
                  <p className="text-[0.6rem] text-emerald-700 leading-snug">
                    <span className="font-bold">Pro: </span>{etf.pro}
                  </p>
                  <p className="text-[0.6rem] text-slate-500 leading-snug">
                    <span className="font-bold text-slate-600">Con: </span>{etf.con}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[0.65rem] text-slate-500 mt-4">
            MERs are approximate and subject to change. Check the relevant PDS before investing.{" "}
            <Link href="/global-investing/etfs" className="text-amber-700 hover:underline font-semibold">
              Full ETF comparison &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* ── Currency risk ──────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">FX & currency</p>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
                Currency risk: hedged vs unhedged
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                When you invest in foreign assets, you take on currency exposure. If you
                hold VGS (unhedged) and the AUD falls against the USD, your AUD-denominated
                return rises — and vice versa. In any given year, currency movements can
                add or subtract <strong className="text-slate-900">5–15%</strong> to your return
                independently of how the underlying shares performed.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The AUD and global equity markets are positively correlated: when global
                risk appetite is strong, both AUD and global equities tend to rise together.
                This means unhedged global exposure provides a useful hedge against
                Australian-specific economic downturns — when Australia struggles, AUD
                often falls, boosting the AUD value of foreign holdings.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                <strong className="text-slate-900">Hedged ETFs</strong> (like VGAD) use rolling
                currency forward contracts to neutralise the AUD/USD movement, giving you pure
                equity exposure. This costs an additional ~0.03–0.08% per year versus the unhedged
                equivalent and is most valuable for shorter investment horizons (under 5 years)
                or when you specifically want to remove FX noise from your returns.
              </p>
              <Link
                href="/global-investing/currency"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                Full currency & FX guide &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-xs font-bold text-slate-900 mb-1">Use unhedged (e.g. VGS) when:</p>
                <ul className="text-xs text-slate-600 space-y-1 leading-relaxed list-disc list-inside">
                  <li>Your investment horizon is 10+ years</li>
                  <li>You want natural AUD diversification</li>
                  <li>You&apos;re cost-conscious (lower MER)</li>
                  <li>You&apos;re comfortable with short-term FX noise</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <p className="text-xs font-bold text-slate-900 mb-1">Use hedged (e.g. VGAD) when:</p>
                <ul className="text-xs text-slate-600 space-y-1 leading-relaxed list-disc list-inside">
                  <li>Your horizon is under 5 years</li>
                  <li>You want pure equity-return exposure</li>
                  <li>You&apos;re drawing down in the near term</li>
                  <li>FX volatility causes you to make poor decisions</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-[0.65rem] text-slate-700 leading-relaxed">
                  <strong>Rule of thumb:</strong> VGS vs VGAD — the hedging fee is ~0.03% p.a.
                  Over 20 years, currency effects average out. Most long-term portfolios
                  use unhedged as the core.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tax for Australian investors ───────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Tax</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Tax rules for Australian global investors
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            Investing internationally adds layers of tax complexity that don&apos;t apply to
            ASX shares — foreign withholding tax, FITO credits, AUD cost-base calculations,
            and US estate-tax exposure for direct US shareholders.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Dividend withholding + FITO */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Dividends & FITO</p>
              <p className="text-sm font-bold text-slate-900 mb-2">Foreign dividend withholding + Australian tax</p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                US companies must withhold tax on dividends paid to foreign investors. Without
                a W-8BEN form, the default rate is <strong>30%</strong>. Under the
                Australia–US tax treaty, Australians who file a W-8BEN are taxed at
                <strong> 15%</strong>. This withheld tax is then credited against your
                Australian income-tax liability via the Foreign Income Tax Offset (FITO),
                so most investors are not double-taxed.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                The FITO offsets Australian tax up to the amount of foreign tax paid on
                that same income — any excess foreign tax is lost (not refunded and not
                carried forward). Keep records of withholding tax paid for your tax return.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Link href="/global-investing/tax/w-8ben" className="text-[0.65rem] font-bold text-amber-700 hover:underline">
                  W-8BEN guide &rarr;
                </Link>
                <Link href="/global-investing/tax/cgt-on-foreign-shares" className="text-[0.65rem] font-bold text-amber-700 hover:underline">
                  CGT on foreign shares &rarr;
                </Link>
              </div>
            </div>

            {/* US estate tax */}
            <div className="bg-white border border-red-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">High-risk item</p>
              <p className="text-sm font-bold text-slate-900 mb-2">US estate tax: the risk most Australians miss</p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                If you die holding more than <strong>US$60,000</strong> of US-situs assets
                (primarily direct US-listed shares) as a non-US resident, your estate may
                owe up to <strong>40% US federal estate tax</strong> on the excess. This
                applies to shares held via foreign brokers like IBKR, Stake, and
                CommSec International.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                The Australia–US Estate Tax Treaty provides a unified credit that can
                significantly mitigate this, but it requires proactive planning and is
                not automatic. The simplest way to eliminate this exposure entirely
                is to hold US-market exposure via <strong>AU-listed ETFs</strong>
                (like IVV or VGS) — AU-domiciled ETFs are not US-situs assets.
              </p>
              <Link href="/global-investing/tax/us-estate-tax" className="text-[0.65rem] font-bold text-red-700 hover:underline">
                US estate tax full explainer &rarr;
              </Link>
            </div>

            {/* CGT AUD cost base */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Capital gains</p>
              <p className="text-sm font-bold text-slate-900 mb-2">CGT and AUD cost-base calculation</p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Australian residents pay CGT on foreign share gains. The cost base is
                calculated in AUD using the exchange rate at acquisition; proceeds are
                calculated in AUD at the exchange rate on the disposal date. This means
                FX movements affect your AUD gain even if the share price in USD is flat.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                The 50% CGT discount applies if you hold foreign shares for 12+ months,
                just as it does for Australian shares. AU-listed ETFs (like VGS) make
                this simpler — the trust handles foreign currency internally, and the
                tax statement shows AUD-denominated distributions and capital gains.
              </p>
              <Link href="/global-investing/tax/cgt-on-foreign-shares" className="text-[0.65rem] font-bold text-amber-700 hover:underline">
                CGT on foreign shares: worked examples &rarr;
              </Link>
            </div>

            {/* US shares directly */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">US shares directly</p>
              <p className="text-sm font-bold text-slate-900 mb-2">Buying Apple, Microsoft & US stocks from Australia</p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Australian investors can buy US-listed shares via IBKR, Stake, CMC
                International, or SelfWealth International. You&apos;ll receive dividends
                net of 15% US withholding (after W-8BEN), but unlike ASX dividends
                there are <strong>no franking credits</strong> on foreign dividends.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Costs to consider: FX conversion (0.002% on IBKR vs 0.40–0.70% on retail
                brokers), per-trade brokerage ($0–$9.50), and the administrative burden
                of W-8BEN renewals every three years. For frequent traders, IBKR&apos;s low
                FX spread makes a material difference; for buy-and-hold investors, an
                AU-listed ETF often wins on total cost.
              </p>
              <Link href="/global-investing/shares/us" className="text-[0.65rem] font-bold text-amber-700 hover:underline">
                Compare US-share brokers &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHESS vs custodial ─────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Ownership model</p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
              CHESS vs custodial: who really owns your international shares?
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              When you buy shares on the ASX, CHESS (the Clearing House Electronic Subregister System)
              records you as the registered owner. For international shares, most Australian brokers
              use a custodial model where a nominee company holds the shares on your behalf.
              Understanding the difference matters most if a broker fails.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-3">CHESS-sponsored / Direct Registration</p>
                <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <li>
                    <strong className="text-slate-800">Ownership:</strong> Your name appears on the
                    company&apos;s share register (via DRS in the US). You are the registered holder.
                  </li>
                  <li>
                    <strong className="text-slate-800">Broker failure:</strong> If the broker fails, your
                    shares are protected — they&apos;re registered in your name, not the broker&apos;s.
                  </li>
                  <li>
                    <strong className="text-slate-800">Who offers it:</strong> Interactive Brokers (IBKR)
                    offers DRS transfer for US shares. CMC International also supports direct registration
                    for some markets.
                  </li>
                  <li>
                    <strong className="text-slate-800">US estate tax:</strong> Direct registration means
                    you directly own US-situs assets — US estate-tax exposure applies above US$60k.
                  </li>
                </ul>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-3">Custodial (nominee model)</p>
                <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <li>
                    <strong className="text-slate-800">Ownership:</strong> The broker or a nominee entity
                    holds shares in their name; you have a beneficial interest (a contractual claim).
                  </li>
                  <li>
                    <strong className="text-slate-800">Broker failure:</strong> Regulated custodians
                    must segregate client assets, but recovery takes time and may involve ASIC intervention.
                    US accounts may fall under SIPC protection (up to US$500k per customer).
                  </li>
                  <li>
                    <strong className="text-slate-800">Who uses it:</strong> Stake, SelfWealth International,
                    CommSec International, and most retail-focused brokers.
                  </li>
                  <li>
                    <strong className="text-slate-800">US estate tax:</strong> Even custodial holdings of
                    US-listed shares are likely US-situs assets — estate-tax exposure still applies.
                  </li>
                </ul>
              </div>
            </div>
            <Link
              href="/global-investing/guides/chess-vs-custodial-international"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
            >
              Full CHESS vs custodial guide for international shares &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Emerging markets ───────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Beyond developed markets</p>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
                Emerging markets: higher growth, higher risk
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Developed-world ETFs (VGS, IVV) exclude emerging markets entirely. Countries
                like China, India, Taiwan, South Korea, and Brazil represent a growing share
                of global GDP and corporate earnings — but carry additional risks not present
                in developed-market indices.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Most broad EM ETFs (like VGE) have a China weighting of 25–30% due to
                FTSE&apos;s and MSCI&apos;s inclusion methodology. Investors who want EM exposure
                but are concerned about China concentration can use single-country ETFs
                (NDIA for India, IEM ex-China alternatives) or underweight EM relative
                to the index weight.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Adding a small EM allocation (10–20% of your international equity sleeve)
                can improve long-run diversification, though EM underperformed developed
                markets significantly through 2010–2023 and is subject to political,
                currency, and liquidity risks not seen in developed markets.
              </p>
              <Link
                href="/global-investing/etfs"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                Compare EM and regional ETFs &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-xs font-bold text-slate-900 mb-3">Emerging-market ETFs on the ASX</p>
                <div className="space-y-2">
                  {[
                    { ticker: "VGE", desc: "FTSE EM All Cap — broad EM including China, India, Taiwan", mer: "0.48%" },
                    { ticker: "IEM", desc: "iShares MSCI EM — MSCI methodology, similar weights", mer: "0.69%" },
                    { ticker: "NDIA", desc: "BetaShares India Quality ETF — single country India", mer: "0.80%" },
                    { ticker: "IZZ", desc: "iShares China Large-Cap ETF — H-shares, Hong Kong listed", mer: "0.74%" },
                    { ticker: "IAA", desc: "iShares Asia 50 ETF — top 50 Asian companies ex-Japan", mer: "0.50%" },
                  ].map((etf) => (
                    <div key={etf.ticker} className="flex items-start gap-2">
                      <span className="shrink-0 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[0.6rem] font-bold rounded font-mono">
                        {etf.ticker}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.65rem] text-slate-700 leading-relaxed">{etf.desc}</p>
                      </div>
                      <span className="shrink-0 text-[0.6rem] text-slate-500 font-mono">{etf.mer}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Portfolio construction ─────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Portfolio construction</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            How to build a global portfolio from Australia
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            A simple, evidence-based approach used widely among Australian investors is the
            core-satellite model. The core provides broad, low-cost market exposure; satellites
            add tilts to specific countries, sectors, or themes.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {/* Three-fund portfolio */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-900 mb-1">Simple three-fund portfolio</p>
              <p className="text-[0.65rem] text-slate-500 mb-3">Bogleheads-style, low maintenance</p>
              <div className="space-y-2">
                {[
                  { pct: "40%", label: "VAS", desc: "Australian equities" },
                  { pct: "40%", label: "VGS", desc: "Global developed equities" },
                  { pct: "20%", label: "VBND", desc: "Global bonds (hedged)" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-700 w-8 shrink-0 tabular-nums">{item.pct}</span>
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[0.6rem] font-bold rounded font-mono">{item.label}</span>
                    <span className="text-[0.65rem] text-slate-600">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Core-satellite */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-900 mb-1">Core-satellite with tilts</p>
              <p className="text-[0.65rem] text-slate-500 mb-3">More control, slightly higher cost</p>
              <div className="space-y-2">
                {[
                  { pct: "35%", label: "VAS", desc: "Australian equities (core)" },
                  { pct: "35%", label: "VGS", desc: "Global developed (core)" },
                  { pct: "15%", label: "NDQ", desc: "Tech tilt (satellite)" },
                  { pct: "10%", label: "VGE", desc: "EM tilt (satellite)" },
                  { pct: "5%", label: "VBND", desc: "Bonds / defensive" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-700 w-8 shrink-0 tabular-nums">{item.pct}</span>
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[0.6rem] font-bold rounded font-mono">{item.label}</span>
                    <span className="text-[0.65rem] text-slate-600">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key principles */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-900 mb-3">Portfolio construction principles</p>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li><strong className="text-slate-800">Keep costs low.</strong> Every 0.1% saved in MER compounds over decades. VGS at 0.18% beats a managed fund at 1.2% by ~1% per year, risk-adjusted.</li>
                <li><strong className="text-slate-800">Diversify broadly.</strong> VGS gives ~1,500 stocks across 23 countries. You don&apos;t need to pick winners.</li>
                <li><strong className="text-slate-800">Rebalance annually.</strong> A once-yearly rebalance is sufficient for most long-term investors.</li>
                <li><strong className="text-slate-800">Home-country bias is real.</strong> Most Australian investors are still under-allocated to global equities relative to market weights.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Topic cards ────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Deep dives</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">
            Explore topics in depth
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
            {TOPIC_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className={`group block bg-gradient-to-br ${card.color} border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all`}
              >
                <p className="font-bold text-slate-900 text-sm mb-2 group-hover:text-amber-700">
                  {card.label}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-3xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">FAQ</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
            Common questions about global investing from Australia
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-semibold text-sm text-slate-900 hover:bg-slate-100 transition-colors">
                  <span>{faq.q}</span>
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">
                    &#8964;
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-1">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cross-link to inbound ───────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-700 mb-1">Going the other way?</p>
            <p className="font-bold text-slate-900 text-base mb-2">
              Foreign investors looking to invest in Australia
            </p>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              If you&apos;re a non-resident, visa holder, expat, or new migrant looking at the
              Australian market from overseas, our inbound hub covers FIRB property rules, DASP
              super, DTA withholding tax tables, and per-country guides for 14 countries.
            </p>
            <Link
              href="/foreign-investment"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
            >
              See investing in Australia from overseas &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ───────────────────────────────────────────── */}
      <section className="bg-slate-50 border-t border-slate-100 py-6">
        <div className="container-custom">
          <p className="text-[0.65rem] text-slate-500 leading-relaxed max-w-4xl">
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
