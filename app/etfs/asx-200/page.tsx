import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `ASX 200 ETFs Australia (${CURRENT_YEAR}) — VAS vs A200 vs IOZ vs STW`,
  description: `The complete guide to ASX 200 and Australian shares ETFs: VAS, A200, IOZ, STW, VHY, and MVW compared on MER, holdings, and franking credits. Concentration risk, returns history, and portfolio building. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `ASX 200 ETFs (${CURRENT_YEAR}) — The Cornerstone of Australian Portfolios`,
    description: "Low-cost, diversified exposure to Australia's largest listed companies. Compare the major ASX 200 and ASX 300 index ETFs and understand franking credits, concentration risk, and tax.",
    url: `${SITE_URL}/etfs/asx-200`,
    images: [{ url: `/api/og?title=${encodeURIComponent("ASX 200 ETFs — Invest.com.au")}&sub=${encodeURIComponent("VAS · A200 · IOZ · STW · Franking Credits · 2026")}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/etfs/asx-200` },
};

// ─── ETF comparison table ───────────────────────────────────────
const ASX_ETFS = [
  {
    ticker: "VAS",
    name: "Vanguard Australian Shares",
    provider: "Vanguard",
    index: "S&P/ASX 300",
    mer: "0.07%",
    holdings: "~300",
    note: "Most popular",
    highlight: true,
  },
  {
    ticker: "A200",
    name: "Betashares Australia 200",
    provider: "Betashares",
    index: "S&P/ASX 200",
    mer: "0.04%",
    holdings: "200",
    note: "Cheapest",
    highlight: false,
  },
  {
    ticker: "IOZ",
    name: "iShares Core S&P/ASX 200",
    provider: "BlackRock iShares",
    index: "S&P/ASX 200",
    mer: "0.05%",
    holdings: "200",
    note: "Middle ground",
    highlight: false,
  },
  {
    ticker: "STW",
    name: "SPDR S&P/ASX 200",
    provider: "State Street SPDR",
    index: "S&P/ASX 200",
    mer: "0.05%",
    holdings: "200",
    note: "Oldest ASX ETF (2001)",
    highlight: false,
  },
  {
    ticker: "VHY",
    name: "Vanguard Australian Shares High Yield",
    provider: "Vanguard",
    index: "FTSE ASFA High Dividend Yield",
    mer: "0.25%",
    holdings: "~70",
    note: "Income / dividend tilt",
    highlight: false,
  },
  {
    ticker: "MVW",
    name: "VanEck Australian Equal Weight",
    provider: "VanEck",
    index: "MVIS Australia Equal Weight",
    mer: "0.35%",
    holdings: "~80",
    note: "Equal-weighted (lower big-4 concentration)",
    highlight: false,
  },
];

// ─── Top 10 ASX 200 holdings (approximate weights) ──────────────
const TOP_HOLDINGS = [
  { name: "Commonwealth Bank (CBA)", sector: "Financials", weight: "~10%" },
  { name: "BHP Group (BHP)", sector: "Materials", weight: "~8%" },
  { name: "CSL (CSL)", sector: "Health Care", weight: "~5%" },
  { name: "National Australia Bank (NAB)", sector: "Financials", weight: "~5%" },
  { name: "Westpac (WBC)", sector: "Financials", weight: "~4%" },
  { name: "ANZ Group (ANZ)", sector: "Financials", weight: "~4%" },
  { name: "Macquarie Group (MQG)", sector: "Financials", weight: "~3%" },
  { name: "Wesfarmers (WES)", sector: "Consumer Staples", weight: "~3%" },
  { name: "Goodman Group (GMG)", sector: "Real Estate", weight: "~2.5%" },
  { name: "Telstra (TLS)", sector: "Communications", weight: "~2%" },
];

// ─── Editorial sections (body splits on blank line) ─────────────
const EDITORIAL = [
  {
    id: "index",
    heading: "What the ASX 200 (and ASX 300) actually tracks",
    body: `The S&P/ASX 200 measures the performance of the 200 largest companies listed on the Australian Securities Exchange, ranked by float-adjusted market capitalisation. It represents roughly 80% of the total value of the Australian share market, which is why it's treated as the benchmark for "the Australian market" in headlines and fund factsheets alike.

The S&P/ASX 300 extends the same idea to the top 300 companies, adding around 100 smaller and mid-cap names below the 200 cut-off. Both indices are market-capitalisation weighted — the bigger a company's market value, the larger its slice of the index — and both are reviewed and rebalanced quarterly (March, June, September, December) so the membership stays current as companies grow, shrink, list, or delist.

The defining feature of the Australian market is its sector skew. Financials (the big banks plus Macquarie) make up around 30% of the index, and Materials (miners like BHP, Rio Tinto, and Fortescue) account for roughly another 20%. Together those two sectors are about half the entire index — a very different shape to the technology-heavy US market. That concentration is the single most important thing to understand before you buy an ASX 200 ETF.`,
  },
  {
    id: "vas-a200-ioz",
    heading: "VAS vs A200 vs IOZ — the popular debate",
    body: `This is the question almost every new Australian investor asks, and the honest answer is that for most people the difference is marginal.

**VAS (Vanguard Australian Shares)** tracks the broader S&P/ASX 300, so it holds around 300 companies and captures a little more of the small- and mid-cap space. It's the most popular Australian ETF by a wide margin, with the deepest liquidity and the most recognised brand. Its MER is 0.07%.

**A200 (Betashares Australia 200)** is the cheapest of the three at 0.04% MER and tracks the S&P/ASX 200. On a $100,000 holding that's about $40 a year versus $70 for VAS — a real but small saving.

**IOZ (iShares Core S&P/ASX 200)** sits in the middle at 0.05% MER, also tracking the official S&P/ASX 200, backed by BlackRock's global indexing operation.

The performance gap between a 200-stock and a 300-stock Australian index is tiny because the extra 100 companies are small and barely move a market-cap-weighted index. What matters far more than picking the "best" ticker is choosing one and investing consistently. If you already hold one of them, switching to save a few basis points rarely makes sense once you factor in brokerage and potential capital gains tax on the sale. Consistency and low cost beat optimisation.`,
  },
  {
    id: "franking",
    heading: "The franking credits advantage",
    body: `Franking credits are the reason so many Australians overweight their home market, and they are genuinely valuable. Australian companies pay corporate tax (30%, or 25% for smaller base-rate entities) before they distribute dividends. The tax already paid is attached to the dividend as a franking credit, and an ASX 200 ETF passes those credits straight through to you in proportion to your holding.

Because the index is so heavily weighted towards the big banks and large miners — exactly the companies that pay big, fully-franked dividends — Australian shares ETFs carry a high level of franking. That means the "grossed-up" yield (the dividend plus the attached franking credit) is meaningfully higher than the cash yield you actually receive. A roughly 4% cash yield can gross up towards 5.5–6% once franking is included.

Franking is most valuable to investors on lower marginal tax rates. For an SMSF in pension phase (0% tax) or a retiree below the tax-free threshold, surplus franking credits can come back as a cash refund from the ATO. For high-income earners the benefit is smaller because the credit only offsets tax they were going to pay anyway. Either way, international ETFs carry no franking — the underlying companies don't pay Australian corporate tax. Our <a-frank>franking credits guide</a-frank> works through the calculation in detail.`,
  },
  {
    id: "concentration",
    heading: "Concentration risk — the elephant in the index",
    body: `The flip side of high franking is high concentration. The ASX 200 is one of the most top-heavy major indices in the world: the ten largest holdings make up around 45% of the entire index, and the four big banks (CBA, NAB, WBC, ANZ) plus BHP dominate the top of the table.

When you buy a plain ASX 200 ETF, you are making a very large, implicit bet on Australian banks and a couple of big miners. If bank net interest margins compress, or if iron ore and other commodity prices fall, your "diversified" Australian ETF can underperform sharply — because a handful of names drive most of the return.

There are two common ways to manage this. The first is an equal-weight ETF such as **MVW (VanEck Australian Equal Weight)**, which holds roughly 80 of the larger ASX names at broadly equal weights, deliberately reducing the dominance of the big-four banks and BHP — at the cost of a higher 0.35% MER and a different risk profile (more mid-cap exposure). The second, and more common, approach is to pair your Australian ETF with a global ETF (such as VGS or IVV) so that your overall portfolio isn't a leveraged position on Australian financials and resources. Adding global exposure is the single most effective diversification step for an Australian portfolio.`,
  },
  {
    id: "returns",
    heading: "Returns history — income-heavy, growth-light",
    body: `Over long periods the ASX 200 has delivered roughly 9–10% per annum as a total return — that is, capital growth plus dividends reinvested — though any individual decade can sit well above or below that average.

The character of those returns is distinctive. A larger share comes from dividends than in most overseas markets, because Australian companies (banks especially) pay out a high proportion of their earnings rather than retaining it for reinvestment. The result is a lower-capital-growth, higher-income profile: you receive more of your return as cash distributions along the way, and rather less as share-price appreciation, compared with a growth-oriented market like the US.

That income tilt suits retirees and anyone who values regular, franked cash flow. It can feel like a drag for younger accumulators focused purely on long-run capital growth, which is another reason a globally diversified portfolio — blending the income profile of the ASX with the growth profile of global markets — is a sensible default for most investors.`,
  },
  {
    id: "200-vs-300",
    heading: "ASX 200 vs ASX 300 — does the extra 100 matter?",
    body: `VAS tracks the S&P/ASX 300 and therefore holds about 100 more small- and mid-cap companies than the ASX 200 funds (A200, IOZ, and STW). In theory that captures slightly more of the "small-cap premium" — the long-run tendency for smaller companies to outperform larger ones — and adds a marginal sliver of diversification.

In practice the difference is very small. Because both indices are market-cap weighted, those extra 100 companies are tiny relative to the giants at the top, so they make up only a few percent of VAS by weight and have almost no impact on the headline return. Historically the ASX 200 and ASX 300 have tracked each other extremely closely.

So the 200-versus-300 decision is genuinely minor. Choose VAS if you like the idea of owning the broadest slice of the Australian market in one ticker; choose A200, IOZ, or STW if you prefer the slightly lower fee or want to track the official S&P/ASX 200 benchmark exactly. None of these is a mistake.`,
  },
  {
    id: "portfolio",
    heading: "Building a portfolio with ASX ETFs",
    body: `Most Australian DIY portfolios are built around one or two broad ETFs, with an Australian shares ETF at the core.

The classic **two-fund portfolio** pairs an Australian shares ETF with a global shares ETF — for example VAS (Australia) plus VGS (global developed markets ex-Australia). A common starting allocation is something like 40% Australian / 60% global, though there is no single "right" split. The **three-fund portfolio** adds a bond or fixed-income ETF (such as VAF or VGB) for stability, with the bond weight typically rising as you approach or enter retirement.

The reason Australians tend to hold a larger slice of their home market than its ~2% share of global markets would suggest is home bias — and in Australia that bias is partly rational, because of franking credits, the absence of currency risk, and the convenience of receiving income in the currency you spend. The trade-off is exactly the concentration risk above: lean too hard into the ASX and you over-expose yourself to banks and miners. A deliberate Australia-plus-global split lets you keep most of the franking benefit while diluting the single-market risk.`,
  },
  {
    id: "tax",
    heading: "Tax treatment of ASX 200 ETF distributions",
    body: `Australian shares ETFs distribute income to unitholders, typically quarterly, and each distribution can be a mix of components: ordinary dividend income, attached franking credits, and realised capital gains passed through from the fund. After year-end the provider issues an AMMA (Attribution Managed Investment Trust Member Annual) statement that breaks the distribution into its components so you can complete your tax return correctly.

Many ASX ETFs offer a Distribution Reinvestment Plan (DRP), which automatically uses your cash distribution to buy additional units rather than paying out cash — useful for accumulators who want to compound without paying brokerage on each reinvestment.

When you eventually sell units you may realise a capital gain or loss. If you've held the units for more than 12 months, individuals and trusts generally qualify for the 50% CGT discount on the gain. This is general information only, not tax advice — your situation depends on your structure (personal name, company, trust, or SMSF) and marginal rate, so confirm the detail with a registered tax agent.`,
  },
  {
    id: "how-to-buy",
    heading: "How to buy an ASX 200 ETF",
    body: `ASX 200 ETFs trade on the ASX exactly like ordinary shares, so you buy them through any Australian broker — CommSec, Stake, Pearler, and SelfWealth are all popular choices, and the right one mostly comes down to brokerage and features.

Because these ETFs are ASX-listed, they settle through CHESS and you receive a Holder Identification Number (HIN), meaning the units are registered in your own name rather than held in a custodian's pooled account. Brokerage is generally in the $3–$10 range per trade depending on the platform, and the ASX sets a $500 minimum for an initial purchase of a given security (top-ups after that can be smaller). Place the order during market hours (10am–4pm Sydney time), choose a limit order if you want to control the price, and the units appear in your holdings once the trade settles.`,
  },
];

// ─── FAQ (uses faqJsonLd from schema-markup; items shaped {q, a}) ─
const FAQS = [
  {
    q: "What is the best ASX 200 ETF?",
    a: "There is no single best ASX 200 ETF — the leading options are close enough that consistency matters more than the choice. VAS (Vanguard) is the most popular and tracks the broader ASX 300 at a 0.07% MER. A200 (Betashares) is the cheapest at 0.04%. IOZ (iShares) is a 0.05% middle ground tracking the official ASX 200. For most long-term investors all three deliver near-identical results, so pick one, keep costs low, and invest regularly rather than chasing the lowest fee.",
  },
  {
    q: "What is the difference between VAS and A200?",
    a: "VAS tracks the S&P/ASX 300 (around 300 companies, including some small caps) at a 0.07% MER, while A200 tracks the S&P/ASX 200 (the top 200 companies) at a cheaper 0.04% MER. In practice their performance is very similar because the extra 100 small companies in VAS barely move a market-cap-weighted index. The decision usually comes down to whether you prefer A200's lower fee or VAS's broader holdings and deeper liquidity.",
  },
  {
    q: "Do ASX 200 ETFs pay franking credits?",
    a: "Yes. ASX 200 ETFs pass through the franking credits attached to dividends from their underlying companies. Because the index is dominated by big banks and large miners that pay fully-franked dividends, Australian shares ETFs carry a high level of franking, so the grossed-up yield (dividend plus franking credit) is meaningfully higher than the cash yield. Franking is especially valuable for SMSFs in pension phase and low-income investors, who can receive surplus credits as a cash refund.",
  },
  {
    q: "Is the ASX 200 too concentrated in banks and miners?",
    a: "The ASX 200 is highly concentrated — the top 10 holdings are roughly 45% of the index, and the four big banks plus BHP dominate. Buying a plain ASX 200 ETF is therefore a large implicit bet on Australian financials and resources. You can manage this by using an equal-weight ETF such as MVW, which reduces big-four-bank dominance, or, more commonly, by pairing your Australian ETF with a global ETF (such as VGS or IVV) so your overall portfolio is genuinely diversified.",
  },
  {
    q: "Should I buy an ASX 200 or ASX 300 ETF?",
    a: "The difference is minor. An ASX 300 ETF like VAS adds about 100 more small- and mid-cap companies for marginally more diversification and a slightly larger small-cap exposure, but because both indices are market-cap weighted those extra companies have little effect on returns. ASX 200 funds (A200, IOZ, STW) track the official benchmark and can be slightly cheaper. Either is a sound core holding — choose based on fee preference and whether you want the broadest possible Australian exposure.",
  },
];

export default function ASX200ETFPage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "ETFs", item: `${SITE_URL}/etfs` },
      { "@type": "ListItem", position: 3, name: "ASX 200 ETFs", item: `${SITE_URL}/etfs/asx-200` },
    ],
  };

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/etfs" className="hover:text-slate-900">ETFs</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">ASX 200 ETFs</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              ASX 200 ETFs &middot; {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              ASX 200 ETFs{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
              ASX 200 ETFs are the cornerstone of most Australian portfolios &mdash; a low-cost,
              diversified way to own Australia&apos;s 200 (or 300) largest listed companies in a
              single trade, with high franking credits passed straight through to you. We compare
              the major Australian shares ETFs &mdash; VAS, A200, IOZ, STW, VHY, and MVW &mdash; and
              explain franking, concentration risk, returns, and how to build a portfolio around them.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href="#comparison" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors">
                Compare ETFs &rarr;
              </Link>
              <Link href="/dividends/franking-credits" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200">
                Franking Credits &rarr;
              </Link>
              <Link href="#concentration" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200">
                Concentration Risk &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Cheapest MER</p>
              <p className="text-xl font-black text-amber-700">0.04% p.a.</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">A200 (Betashares) &mdash; about $40 a year on a $100,000 holding.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Top 10 Concentration</p>
              <p className="text-xl font-black text-slate-900">~45%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Share of the index held in just its ten largest companies &mdash; banks and miners dominate.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Long-Run Total Return</p>
              <p className="text-xl font-black text-slate-900">~9&ndash;10% p.a.</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Including reinvested dividends over long periods &mdash; income-heavy by global standards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What the index tracks ────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="The Index"
            title="What the ASX 200 (and ASX 300) tracks"
            sub="Market-cap weighted, rebalanced quarterly, and dominated by two sectors."
          />
          <div className="mt-6 text-sm text-slate-600 leading-relaxed space-y-3">
            {EDITORIAL[0]!.body.split("\n\n").map((para, i) => (
              <p key={i} className="whitespace-pre-line">{para}</p>
            ))}
          </div>
          {/* Sector skew callout */}
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-sm font-bold text-slate-900">Financials</p>
                <p className="text-lg font-black text-amber-700">~30%</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">The big four banks plus Macquarie &mdash; the largest sector in the index.</p>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-sm font-bold text-slate-900">Materials</p>
                <p className="text-lg font-black text-amber-700">~20%</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">Miners such as BHP, Rio Tinto, and Fortescue &mdash; the second-largest sector.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ETF comparison table ─────────────────────────────────────── */}
      <section id="comparison" className="py-10 md:py-14 bg-slate-50 border-y border-slate-200 scroll-mt-20">
        <div className="container-custom">
          <SectionHeading
            eyebrow="ETF Comparison"
            title="Australian shares ETFs compared"
            sub="The major ASX 200 and ASX 300 index ETFs, plus an income tilt and an equal-weight option. MERs are approximate &mdash; verify with the provider before investing."
          />
          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Ticker</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Index</th>
                  <th className="px-4 py-3 font-semibold">MER</th>
                  <th className="px-4 py-3 font-semibold">Holdings</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ASX_ETFS.map((etf) => (
                  <tr key={etf.ticker} className={etf.highlight ? "bg-amber-50/60" : "hover:bg-slate-50/60"}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-black text-slate-900">{etf.ticker}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-medium">{etf.name}</span>
                      <span className="block text-xs text-slate-400">{etf.provider}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{etf.index}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-slate-900">{etf.mer}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{etf.holdings}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${etf.highlight ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-600"}`}>
                        {etf.note}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            VAS, A200, IOZ, and STW are the four core broad-market options. VHY adds a dividend/income
            tilt at a higher fee, and MVW is equal-weighted to cut the dominance of the big-four banks.
            All trade on the ASX and settle via CHESS.
          </p>
        </div>
      </section>

      {/* ── VAS vs A200 vs IOZ debate ────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="The Popular Debate"
            title="VAS vs A200 vs IOZ"
            sub="The question every new investor asks &mdash; and why the answer matters less than you think."
          />
          <div className="mt-6 text-sm text-slate-600 leading-relaxed space-y-3">
            {EDITORIAL[1]!.body.split("\n\n").map((para, i) => (
              <p key={i} className="whitespace-pre-line">{renderInline(para)}</p>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">Bottom line:</span> consistency beats optimisation. Pick one
              broad ASX ETF, keep costs low, and invest regularly &mdash; switching to save a few basis
              points rarely survives brokerage and capital gains tax. See our{" "}
              <Link href="/etfs/vs/vas-vs-a200" className="font-semibold underline hover:text-amber-700">VAS vs A200</Link>{" "}
              head-to-head for the detailed breakdown.
            </p>
          </div>
        </div>
      </section>

      {/* ── Franking credits ─────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Tax Advantage"
            title="The franking credits advantage"
            sub="Why Australians overweight their home market &mdash; and who benefits most."
          />
          <div className="mt-6 text-sm text-slate-600 leading-relaxed space-y-3">
            {EDITORIAL[2]!.body.split("\n\n").map((para, i) => (
              <p key={i} className="whitespace-pre-line">{renderInline(para)}</p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Concentration risk + top holdings ────────────────────────── */}
      <section id="concentration" className="py-10 md:py-12 scroll-mt-20">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Know the Risk"
            title="Concentration risk &mdash; the elephant in the index"
            sub="The top 10 holdings are roughly 45% of the ASX 200. Here's what that looks like."
          />
          <div className="mt-6 text-sm text-slate-600 leading-relaxed space-y-3">
            {EDITORIAL[3]!.body.split("\n\n").map((para, i) => (
              <p key={i} className="whitespace-pre-line">{renderInline(para)}</p>
            ))}
          </div>

          {/* Top 10 holdings table */}
          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Approximate top 10 holdings of the S&amp;P/ASX 200 and their index weights</caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Sector</th>
                  <th className="px-4 py-3 font-semibold text-right">Approx. weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TOP_HOLDINGS.map((h, i) => (
                  <tr key={h.name} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{h.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{h.sector}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">{h.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">
            Weights are indicative and shift with markets and quarterly rebalancing. Note how many of
            the top names are banks &mdash; this is why pairing an ASX ETF with a global ETF such as{" "}
            VGS or IVV is the most effective diversification step for an Australian portfolio.
          </p>
        </div>
      </section>

      {/* ── Returns history ──────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Performance"
            title="Returns history &mdash; income-heavy, growth-light"
            sub="What roughly 9&ndash;10% per annum has historically been made of."
          />
          <div className="mt-6 text-sm text-slate-600 leading-relaxed space-y-3">
            {EDITORIAL[4]!.body.split("\n\n").map((para, i) => (
              <p key={i} className="whitespace-pre-line">{renderInline(para)}</p>
            ))}
          </div>
        </div>
      </section>

      {/* ── ASX 200 vs ASX 300 ───────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="200 or 300?"
            title="ASX 200 vs ASX 300"
            sub="VAS holds ~100 more small caps than the 200 funds. In practice the gap is tiny."
          />
          <div className="mt-6 text-sm text-slate-600 leading-relaxed space-y-3">
            {EDITORIAL[5]!.body.split("\n\n").map((para, i) => (
              <p key={i} className="whitespace-pre-line">{renderInline(para)}</p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Building a portfolio ─────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Portfolio Construction"
            title="Building a portfolio with ASX ETFs"
            sub="The classic two-fund and three-fund approaches &mdash; and the home-bias trade-off."
          />
          <div className="mt-6 text-sm text-slate-600 leading-relaxed space-y-3">
            {EDITORIAL[6]!.body.split("\n\n").map((para, i) => (
              <p key={i} className="whitespace-pre-line">{renderInline(para)}</p>
            ))}
          </div>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Two-fund portfolio</p>
              <p className="text-sm font-semibold text-slate-900 mb-1">VAS + VGS</p>
              <p className="text-xs text-slate-600 leading-relaxed">Australian shares plus global developed markets &mdash; the simplest broadly diversified equity portfolio.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Three-fund portfolio</p>
              <p className="text-sm font-semibold text-slate-900 mb-1">VAS + VGS + bonds</p>
              <p className="text-xs text-slate-600 leading-relaxed">Adds a fixed-income ETF for stability, with the bond weight rising as you approach retirement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tax + How to buy (two-column editorial) ──────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <div className="space-y-12">
            <div>
              <SectionHeading
                eyebrow="Tax"
                title="Tax treatment of distributions"
                sub="AMMA statements, the DRP option, and CGT on sale."
              />
              <div className="mt-6 text-sm text-slate-600 leading-relaxed space-y-3">
                {EDITORIAL[7]!.body.split("\n\n").map((para, i) => (
                  <p key={i} className="whitespace-pre-line">{renderInline(para)}</p>
                ))}
              </div>
            </div>
            <div>
              <SectionHeading
                eyebrow="Getting Started"
                title="How to buy an ASX 200 ETF"
                sub="Any Australian broker, settled via CHESS, with a HIN in your own name."
              />
              <div className="mt-6 text-sm text-slate-600 leading-relaxed space-y-3">
                {EDITORIAL[8]!.body.split("\n\n").map((para, i) => (
                  <p key={i} className="whitespace-pre-line">{renderInline(para)}</p>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {["CommSec", "Stake", "Pearler", "SelfWealth"].map((b) => (
                  <span key={b} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold">{b}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="ASX 200 ETF questions" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">&#9662;</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related ──────────────────────────────────────────────────── */}
      <section className="py-8">
        <div className="container-custom">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Related pages</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/etfs" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">ETF Hub &rarr;</Link>
            <Link href="/etfs/us-exposure" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">US Market ETFs &rarr;</Link>
            <Link href="/etfs/international" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">International ETFs &rarr;</Link>
            <Link href="/etfs/dividends" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">Dividend ETFs &rarr;</Link>
            <Link href="/dividends/franking-credits" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">Franking Credits &rarr;</Link>
            <Link href="/etfs/vs/vas-vs-a200" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">VAS vs A200 &rarr;</Link>
            <Link href="/best/etfs" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">Best ETF Brokers &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} ETF data, MERs, index weights, and yields shown are approximate and
            may not reflect current figures. Always verify the MER, holdings, and distribution detail
            directly with the ETF provider, and confirm tax outcomes with a registered tax agent, before
            investing.
          </p>
        </div>
      </section>
    </div>
  );
}

// Lightweight inline renderer for **bold** and a single <a-frank> link token
// in editorial copy. Avoids dangerouslySetInnerHTML on data arrays.
function renderInline(text: string): React.ReactNode {
  // Split on the franking-link sentinel first so we can emit a real <Link>.
  const linkParts = text.split(/<a-frank>(.*?)<\/a-frank>/);
  return linkParts.map((chunk, idx) => {
    // Odd indices are the captured link label.
    if (idx % 2 === 1) {
      return (
        <Link key={`l-${idx}`} href="/dividends/franking-credits" className="text-amber-700 font-semibold underline hover:text-amber-800">
          {chunk}
        </Link>
      );
    }
    return <span key={`t-${idx}`}>{renderBold(chunk)}</span>;
  });
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : <span key={i}>{part}</span>,
  );
}
