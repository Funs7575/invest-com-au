import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best ETFs Australia (${CURRENT_YEAR}) — Complete ETF Guide & Comparison`,
  description: `Compare the best Australian ETFs by category: ASX 200, US exposure, dividends, international, bonds, and sector ETFs. MER fees, performance data, and expert analysis. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best ETFs Australia (${CURRENT_YEAR}) — ETF Hub`,
    description: "The complete guide to Australian ETFs. Compare ETFs by category, fee, performance, and provider.",
    url: `${SITE_URL}/etfs`,
    images: [{ url: `/api/og?title=${encodeURIComponent("ETF Hub — Invest.com.au")}&sub=${encodeURIComponent("Compare ETFs · MER Fees · Performance · 2026")}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/etfs` },
};

const ETF_CATEGORIES = [
  {
    title: "ASX 200 ETFs",
    description: "Track Australia's top 200 companies. The simplest way to own a diversified slice of the Australian stock market.",
    href: "/etfs/asx-200",
    icon: "🇦🇺",
    examples: "VAS, STW, A200, IOZ",
    color: "amber",
  },
  {
    title: "US Market ETFs",
    description: "Gain exposure to US shares — S&P 500, NASDAQ 100, and total US market — in Australian dollars.",
    href: "/etfs/us-exposure",
    icon: "🇺🇸",
    examples: "IVV, NDQ, QUS, VTS",
    color: "blue",
  },
  {
    title: "Dividend ETFs",
    description: "High-yield ETFs focused on income generation. Ideal for retirees and income-focused investors.",
    href: "/etfs/dividends",
    icon: "💰",
    examples: "VHY, HVST, SYI, ZYAU",
    color: "green",
  },
  {
    title: "International ETFs",
    description: "Diversify beyond Australia and the US with developed and emerging market exposure.",
    href: "/etfs/international",
    icon: "🌍",
    examples: "VGS, IWLD, VEU, FEMX",
    color: "purple",
  },
  {
    title: "Bond & Fixed Income ETFs",
    description: "Defensive portfolio building blocks. Government bonds, corporate bonds, and cash-equivalent ETFs.",
    href: "/etfs/bonds",
    icon: "📊",
    examples: "VAF, IAF, BOND, CRED",
    color: "slate",
  },
  {
    title: "Sector ETFs",
    description: "Targeted exposure to specific sectors: technology, healthcare, resources, financials, and more.",
    href: "/etfs/sectors",
    icon: "🏭",
    examples: "HACK, DRUG, OZR, QFN",
    color: "rose",
  },
];

const ETF_VS_PAIRS = [
  { a: "VAS", b: "A200", title: "VAS vs A200 — ASX 200 Index ETFs Compared" },
  { a: "VAS", b: "STW", title: "VAS vs STW — Vanguard vs SPDR ASX 200" },
  { a: "IVV", b: "VTS", title: "IVV vs VTS — S&P 500 vs Total US Market" },
  { a: "NDQ", b: "IVV", title: "NDQ vs IVV — NASDAQ 100 vs S&P 500" },
  { a: "VGS", b: "IWLD", title: "VGS vs IWLD — Global Developed Markets" },
  { a: "VHY", b: "HVST", title: "VHY vs HVST — Australian Dividend ETFs" },
];

const KEY_METRICS = [
  { label: "MER (Management Expense Ratio)", tip: "Annual fee charged by the ETF manager as a % of your investment. Lower is better — 0.07% vs 0.30% saves $230/year on a $100K investment." },
  { label: "Tracking Error", tip: "How closely the ETF follows its benchmark index. A low tracking error means the ETF is doing its job accurately." },
  { label: "AUM (Assets Under Management)", tip: "Larger AUM generally means better liquidity, tighter bid-ask spreads, and lower risk of fund closure. Look for ETFs with $500M+ AUM." },
  { label: "Distribution Yield", tip: "The annual income distributed to investors as a percentage of unit price. Includes dividends, franking credits (for Australian ETFs), and interest income." },
  { label: "Franking Credits", tip: "Australian companies pay corporate tax before distributing dividends — the tax already paid flows to investors as franking credits, which offset personal tax. Australian ETFs like VAS pass through significant franking." },
  { label: "Bid-Ask Spread", tip: "The difference between the price you can buy at and the price you can sell at. Tighter spreads (e.g. 0.01–0.05%) mean lower transaction costs, especially important for frequent traders." },
];

const EDITORIAL_SECTIONS = [
  {
    heading: "What is an ETF and how does it work?",
    body: `An Exchange Traded Fund (ETF) is a type of investment fund that is listed and traded on a stock exchange — just like an individual share. You buy and sell ETF units through your broker using a stock code (e.g. VAS, IVV, NDQ) during market hours.

Most ETFs are index funds — they aim to replicate the performance of a specific index like the ASX 200 or S&P 500 by holding all (or a representative sample) of the securities in that index. This 'passive' approach means costs are very low and returns closely match the market.

When you buy one unit of VAS (Vanguard Australian Shares ETF), you gain proportional ownership of ~300 Australian companies. The fund receives all dividends paid by those companies and distributes them to unitholders regularly (typically quarterly or semi-annually).

**How ETFs differ from managed funds:**
Managed funds also hold portfolios of assets, but they don't trade on an exchange — you buy and sell directly with the fund manager, usually once per day at the end-of-day NAV price. ETFs trade continuously during market hours at market prices, giving you immediate liquidity and price transparency.`,
  },
  {
    heading: "How to choose the right ETF",
    body: `The right ETF depends on your investment goals, existing portfolio, and time horizon. A practical framework:

**Step 1 — Decide your asset allocation:** What percentage do you want in Australian shares, international shares, bonds, and other assets? This is the most important decision — ETF selection within each category matters less than getting the overall mix right.

**Step 2 — Choose your index:** For Australian shares, the ASX 200 (top 200 companies) is the standard. For international, the MSCI World (developed markets) or MSCI ACWI (all countries) are common benchmarks. For US-specific exposure, the S&P 500 is the classic choice.

**Step 3 — Compare MERs:** Within a category, favour lower-cost ETFs unless there's a specific reason to pay more. On a $200,000 portfolio, the difference between 0.07% and 0.30% MER is $460/year — compounded over decades this is significant.

**Step 4 — Check AUM and liquidity:** ETFs with under $100M AUM have closure risk and often wider bid-ask spreads. Stick to ETFs with $500M+ for core holdings.

**Step 5 — Understand the currency exposure:** Unhedged international ETFs (most of them) mean your returns are affected by AUD/USD exchange rate movements. Currency-hedged ETFs (marked 'HEDGED' or 'H100' etc.) remove this exposure but add a small cost.`,
  },
  {
    heading: "ETFs vs shares: what's right for you?",
    body: `Individual shares and ETFs serve different purposes and the best portfolios often include both.

**Why ETFs:**
- Instant diversification — one ETF gives you 200–500+ companies
- Low cost — MERs of 0.03–0.30% vs higher costs for active funds
- No single-company risk — if one company in the ETF collapses, the impact is small
- Simple to understand and manage
- Ideal for the core of a portfolio

**Why individual shares:**
- No ongoing MER fee on your holdings once purchased
- Control over exactly what you own
- Tax harvesting at the individual security level
- Overweight specific sectors or companies you have conviction in
- Franking credit optimisation for some investors

**The practical approach for most Australians:**
Use ETFs for the broad market exposure (ASX 200, global developed markets) and individual shares for specific positions where you have insight or conviction. A '90/10' approach — 90% ETFs, 10% individual stocks — is a rational starting point.`,
  },
  {
    heading: "Franking credits and ETFs — how it works",
    body: `Franking credits are one of the most valuable features of Australian equity ETFs for domestic investors. Here's how they work:

Australian companies pay corporate tax (30% or 25% for base rate entities) before distributing dividends. The tax already paid creates 'franking credits' that are attached to dividends. For ETF investors, these credits flow through to you in proportion to your holdings.

**Example:** VAS (Vanguard Australian Shares ETF) invests in ~300 ASX companies. When those companies pay dividends, VAS collects the dividends plus attached franking credits and passes them through to unitholders.

When you lodge your tax return, franking credits offset your tax payable. For a taxpayer in the 32.5% bracket receiving $1,000 in dividends with $300 in attached franking credits: the grossed-up dividend is $1,300 (taxable), tax at 32.5% = $422.50, minus $300 franking credit offset = net tax of $122.50.

For retirees with total income below the tax-free threshold, franking credits can result in a cash refund from the ATO — a significant benefit of Australian equity ETFs for low-income investors.

International ETFs (VGS, IVV, NDQ) don't carry franking credits as the underlying companies are foreign and don't pay Australian corporate tax.`,
  },
];

const ETF_FAQS = [
  {
    question: "What is the cheapest ETF in Australia?",
    answer: "Betashares A200 (A200) has one of the lowest MERs among ASX 200 ETFs at 0.04% per year. Vanguard Australian Shares ETF (VAS) is 0.07%. For US exposure, iShares S&P 500 (IVV) is 0.04%. For global developed markets, IWLD is 0.09%. Cheapest doesn't always mean best — also consider AUM, tracking error, and distribution yield.",
  },
  {
    question: "How much money do I need to start investing in ETFs?",
    answer: "You can start with as little as the price of one unit — typically $50–$150 for many popular ETFs. However, brokerage fees (e.g. $5–$10 per trade) mean it's more cost-effective to invest larger amounts. A $500–$1,000 minimum per trade keeps brokerage below 1% of your investment. Some platforms like Pearler allow automated regular investments with low brokerage.",
  },
  {
    question: "Are ETFs better than managed funds?",
    answer: "For most investors, index ETFs are better than actively managed funds over the long term. Multiple studies (SPIVA Australia Scorecard) show 80%+ of active fund managers underperform their benchmark index over 10 years after fees. ETFs are also cheaper, more tax-efficient, and more flexible (intraday trading). Active management may add value in specific niches like small caps or emerging markets.",
  },
  {
    question: "What is the difference between VAS and A200?",
    answer: "Both VAS (Vanguard) and A200 (Betashares) track the Australian share market but use different indices. VAS tracks the S&P/ASX 300 (top 300 companies) while A200 tracks the Solactive Australia 200 Index (top 200). A200 has a slightly lower MER (0.04% vs 0.07%). In practice, their performance is very similar. Our VAS vs A200 comparison page gives a detailed breakdown.",
  },
  {
    question: "Do ETFs pay dividends in Australia?",
    answer: "Yes. Most Australian ETFs distribute income (dividends, interest) to unitholders quarterly or semi-annually. Australian equity ETFs like VAS and A200 also pass through franking credits attached to dividends from ASX-listed companies. International ETFs (IVV, VGS) pay distributions but don't carry franking credits as the underlying companies aren't subject to Australian corporate tax.",
  },
  {
    question: "Are ETF distributions automatically reinvested?",
    answer: "Most ASX-listed ETFs do not have automatic distribution reinvestment plans (DRPs) the way individual shares do. Distributions are paid as cash to your trading account. You can then manually reinvest by purchasing more units. Some platforms (like Pearler) offer automated reinvestment features. If your ETF is held inside super through a managed account, reinvestment may be automatic.",
  },
];

export default function ETFHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETF Hub" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ETF_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">ETFs</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              ETF Hub · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Best ETFs in Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
              Compare Australian ETFs by category, MER, performance, and income yield. Our independent
              analysis covers ASX 200, US market, dividend, international, bond, and sector ETFs —
              plus head-to-head ETF comparisons.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href="/etfs/asx-200" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors">
                ASX 200 ETFs →
              </Link>
              <Link href="/etfs/us-exposure" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200">
                US Market ETFs →
              </Link>
              <Link href="/etfs/dividends" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200">
                Dividend ETFs →
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
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">ETFs on ASX</p>
              <p className="text-xl font-black text-amber-700">340+</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Exchange-traded funds available on the ASX, covering equities, bonds, commodities, and alternatives.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Lowest MER Available</p>
              <p className="text-xl font-black text-slate-900">0.04% p.a.</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">The cheapest ETFs (A200, IVV) charge just $40/year on a $100,000 investment.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Total ASX ETF AUM</p>
              <p className="text-xl font-black text-slate-900">$235B+</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Assets under management in Australian ETFs, growing at 25%+ annually as investors shift to low-cost index funds.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ETF Categories ───────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Browse by Category"
            title="Explore ETFs by Type"
            sub="Find the right ETF for your investment goals — from broad market index funds to targeted sector and income strategies."
          />
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ETF_CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group block bg-white border border-slate-200 rounded-2xl p-6 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h2 className="text-base font-bold text-slate-900 group-hover:text-amber-700 mb-2 transition-colors">
                  {cat.title}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{cat.description}</p>
                <p className="text-xs text-slate-400 font-mono">e.g. {cat.examples}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:text-amber-700">
                  Compare ETFs <span className="text-base leading-none">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── ETF vs Comparisons ──────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Head-to-Head"
            title="ETF vs ETF Comparisons"
            sub="Side-by-side comparisons of popular ETF pairs — MER, performance, distributions, and which suits which investor."
          />
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ETF_VS_PAIRS.map((pair) => (
              <Link
                key={`${pair.a}-${pair.b}`}
                href={`/etfs/vs/${pair.a.toLowerCase()}-vs-${pair.b.toLowerCase()}`}
                className="group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{pair.a}</span>
                  <span className="text-slate-400 text-xs">vs</span>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{pair.b}</span>
                </div>
                <span className="text-xs text-slate-600 group-hover:text-slate-800 leading-tight">{pair.title.split(" — ")[1]}</span>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-center">
            <Link href="/versus" className="text-sm text-amber-600 hover:text-amber-700 font-semibold">
              Browse all ETF comparisons →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Key Metrics ─────────────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Investor Education"
            title="Key ETF Metrics Explained"
            sub="Understand the numbers that matter when comparing ETFs."
          />
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {KEY_METRICS.map((m) => (
              <div key={m.label} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-2">{m.label}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{m.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Editorial Sections ───────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="ETF Guide" title="Everything You Need to Know About ETFs" />
          <div className="mt-8 space-y-10">
            {EDITORIAL_SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="mb-3 last:mb-0 whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs ────────────────────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Frequently Asked Questions" />
          <div className="mt-6 divide-y divide-slate-200">
            {ETF_FAQS.map((faq) => (
              <details key={faq.question} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Ready to invest in ETFs?</h2>
          <p className="text-sm text-slate-300 mb-6">
            Compare brokers that offer low brokerage on ASX-listed ETFs — many charge under $10 per trade.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/best/etfs"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
            >
              Best ETF Brokers →
            </Link>
            <Link
              href="/best/beginners"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Best for Beginners →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ──────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
