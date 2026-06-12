import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Growth Investing Australia — ASX Strategy, Metrics & Portfolio Building (${CURRENT_YEAR})`,
  description:
    "Complete guide to growth investing on the ASX — revenue metrics, PEG ratios, ASX tech stocks, growth vs value, rate sensitivity, and portfolio building.",
  alternates: { canonical: `${SITE_URL}/invest/growth-investing` },
  openGraph: {
    title: `Growth Investing Australia — ASX Strategy, Metrics & Portfolio Building (${CURRENT_YEAR})`,
    description:
      "Complete guide to growth investing on the ASX — revenue metrics, PEG ratios, ASX tech stocks, growth vs value, rate sensitivity, and portfolio building.",
    url: `${SITE_URL}/invest/growth-investing`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Growth Investing Australia")}&sub=${encodeURIComponent("High-Growth Stocks · ETFs · Strategy · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const faqItems = [
  {
    q: "Is growth investing riskier than value investing?",
    a: "Growth investing typically carries higher volatility than value investing. Growth stocks are priced for an optimistic future — any disappointment (missed revenue targets, slowing growth, rising interest rates) can cause sharp price declines. Value stocks tend to have a built-in margin of safety from their lower starting valuations. That said, risk is not inherent to the style: a concentrated bet on a single growth stock is riskier than a diversified basket of quality growth businesses. Over long horizons (10+ years), growth strategies have delivered strong absolute returns, particularly in US technology, though with significantly more volatility along the way.",
  },
  {
    q: "Can I find growth stocks on the ASX?",
    a: "Yes, though the ASX is less tech-heavy than US markets. The ASX is roughly 30% resources and materials and only about 3% technology by index weight. However, there are genuine high-quality growth businesses listed domestically: WiseTech Global (WTC), TechOne (TNE), Xero (XRO), REA Group (REA), Pro Medicus (PME), and Altium (ALU) are among the most widely studied. Many of the best Australian growth opportunities sit in small and mid caps, where analyst coverage is thinner and mispricing persists longer. Global growth exposure via ETFs (NDQ, VGT) is the most practical complement for Australian investors who want broader technology exposure.",
  },
  {
    q: "What's a good PEG ratio for growth stocks?",
    a: "The PEG ratio (P/E divided by earnings growth rate) is a quick-and-dirty way to compare valuations across growth names. A PEG below 1 is commonly described as undervalued relative to growth; below 2 is often considered acceptable for high-quality growth businesses. However, PEG has limitations: it uses trailing or near-term earnings growth, which can be distorted for early-stage companies with minimal or negative earnings. For pre-profit companies, price-to-sales (P/S) relative to revenue growth rate is often more useful than P/E-based PEG. Always pair PEG with qualitative assessment of the durability of the growth.",
  },
  {
    q: "How do I research ASX growth companies?",
    a: "Start with the annual report (ASX company announcements) to understand the business model and management commentary on growth drivers. Focus on revenue growth rate (consistent 20%+ is the threshold most growth investors target), gross margins (high margins indicate pricing power and scalability), and net revenue retention for subscription businesses (110%+ means existing customers expand their spend). Check the total addressable market (TAM) claims critically — management always presents the largest plausible TAM. Useful ASX-specific resources include Strawman.com for retail investor analysis, Intelligent Investor, Morningstar, and company presentations on the ASX announcements platform.",
  },
  {
    q: "Should I put growth stocks in super?",
    a: "High-growth stocks are particularly tax-efficient inside superannuation. In accumulation phase, capital gains are taxed at 15% (or 10% with the 12-month CGT discount), compared to your marginal rate (up to 45% plus Medicare) outside super. In pension phase, gains are tax-free. Since growth stocks typically pay minimal dividends (foregoing franking credit benefits), the main tax advantage in super is CGT deferral and the reduced rate. The catch: super has contribution caps and access restrictions — you can't access the gains until preservation age. Use super for long-duration growth positions you are comfortable holding for decades.",
  },
  {
    q: "What's the difference between growth ETFs and growth stocks?",
    a: "Growth ETFs (like NDQ, which tracks the Nasdaq 100) give diversified exposure to dozens or hundreds of growth companies in a single ASX-listed fund. Individual growth stocks concentrate your exposure to one business — with the potential for much higher returns if you pick correctly, but also the risk of a single bad result wiping 30-50% of that position's value overnight. For most investors, ETFs provide a sensible growth core: lower cost, instant diversification, no stock-picking required. Individual ASX growth stocks work best as a satellite allocation (20-40% of the growth sleeve) once you have done the research and can stomach single-stock volatility.",
  },
];

export default function GrowthInvestingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Growth Investing" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Growth Investing Australia — ASX Strategy, Metrics & Portfolio Building (${CURRENT_YEAR})`,
    url: absoluteUrl("/invest/growth-investing"),
    dateModified: UPDATED_LABEL,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faq = faqJsonLd(faqItems);

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
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
        />
      )}

      {/* Hero — dark slate */}
      <section className="relative bg-slate-900 overflow-hidden py-10 md:py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200 font-medium">Growth Investing</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
              High-Growth Framework
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
              ASX &amp; Global
            </span>
          </div>

          <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Growth Investing on the ASX
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
            Growth investing means paying a premium today for companies expected to expand their earnings and revenue far faster than the broader market. This guide covers the key metrics, the ASX growth landscape, how rate sensitivity affects your portfolio, and how to build a growth allocation that can compound over a decade or more.
          </p>

          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(
              [
                { value: "20%+", label: "Revenue growth rate threshold most growth investors target annually" },
                { value: "~3%", label: "ASX technology sector weight — far below US markets" },
                { value: "<2", label: "PEG ratio considered acceptable for high-quality growth stocks" },
                { value: "5–15 yrs", label: "Typical time horizon to let compounding work in growth strategies" },
              ] as { value: string; label: string }[]
            ).map((s) => (
              <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: What is growth investing */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What Is Growth Investing?</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Growth investing is the practice of buying shares in companies expected to grow their earnings and revenue <strong>significantly faster than the broader market</strong> — and being willing to pay a premium valuation today in exchange for that future compounding. Where value investors hunt for businesses that are cheap relative to current fundamentals, growth investors focus on where the business will be in five or ten years.
            </p>
            <p>
              The core trade-off: a growth investor is comfortable holding a stock at 50x earnings because they believe those earnings will grow 30–40% per year for the next decade, making today&apos;s price look cheap in hindsight. The risk is that the growth does not materialise — or that the market&apos;s willingness to pay that premium evaporates (known as multiple compression).
            </p>
            <h3>How growth investing differs from other styles</h3>
            <p>
              Growth investors are generally less focused on dividends — a company reinvesting all its profits into expansion to capture market share will not pay dividends, and that is usually seen as a positive signal. The emphasis is on <strong>total addressable market (TAM)</strong>, competitive moat, revenue growth rate, gross margin expansion, and earnings per share (EPS) growth. Headline P/E ratios are often very high — and that is accepted as long as the underlying growth justifies the valuation.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Key metrics table */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Key Growth Investing Metrics</h2>
          <p className="text-slate-500 text-sm mb-6">Five metrics growth investors use to screen and assess high-growth companies.</p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse" aria-label="Key growth investing metrics">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Metric</th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Growth investor&apos;s lens</th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Typical growth range</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    metric: "Revenue growth",
                    lens: "YoY expansion — the primary signal of business momentum",
                    range: "20%+ annually",
                  },
                  {
                    metric: "P/E ratio",
                    lens: "Accepted at high levels if growth rate justifies the multiple",
                    range: "30–100x+",
                  },
                  {
                    metric: "PEG ratio",
                    lens: "P/E divided by growth rate; below 1 suggests undervalued relative to growth",
                    range: "<2 preferred",
                  },
                  {
                    metric: "Gross margin",
                    lens: "Indicates pricing power and scalability of the business model",
                    range: "50%+ (software/SaaS)",
                  },
                  {
                    metric: "Net Revenue Retention",
                    lens: "Expansion revenue within existing customers — a moat signal for SaaS",
                    range: "110%+ (SaaS ideal)",
                  },
                ].map((r, i) => (
                  <tr key={r.metric} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-4 font-bold text-amber-700 border-b border-slate-100">{r.metric}</td>
                    <td className="py-3 px-4 text-slate-700 border-b border-slate-100">{r.lens}</td>
                    <td className="py-3 px-4 text-slate-600 border-b border-slate-100">{r.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            No single metric is definitive. Metrics must be interpreted together alongside the business model, competitive dynamics, and management track record.
          </p>
        </div>
      </section>

      {/* Section 3: ASX growth landscape */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Growth Investing on the ASX — The Landscape</h2>

          <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 mb-8">
            <h3 className="font-bold text-amber-900 mb-4">Why the ASX is different from the Nasdaq</h3>
            <div className="space-y-4">
              {[
                {
                  title: "Technology-light by index weight",
                  body: "The ASX 200 is approximately 30% resources and materials and only about 3% technology — a stark contrast to the S&P 500 (~30% tech) or Nasdaq 100 (~55% tech). Pure-play growth investors often supplement domestic holdings with global ETFs to access the broader technology opportunity set.",
                },
                {
                  title: "ASX tech names that attract growth premiums",
                  body: "Despite the thin weighting, several ASX-listed businesses trade at genuine growth multiples: WiseTech Global (WTC) in logistics software, TechOne (TNE) in enterprise SaaS, Xero (XRO) in cloud accounting, REA Group (REA) in property platforms, and Pro Medicus (PME) in medical imaging AI. These names consistently trade at 50–100x earnings, reflecting the market's growth expectations.",
                },
                {
                  title: "Small and mid cap: where most Australian growth sits",
                  body: "The deeper growth opportunity on the ASX is in smaller companies — micro and small caps with $50m–$1bn market capitalisation. Analyst coverage is thinner, institutional ownership is lower, and mispricing can persist longer. The risk is liquidity, execution risk, and higher failure rates.",
                },
                {
                  title: "Global growth via ETFs",
                  body: "Australian investors can access broad global growth through ASX-listed ETFs: NDQ (BetaShares Nasdaq 100, 0.48% MER), QUS (BetaShares S&P 500 Quality, 0.40%), and VGT (Vanguard US Information Technology, USD-listed). These complement domestic ASX growth names with exposure to US mega-cap technology.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">{item.title}</p>
                    <p className="text-sm text-amber-800 mt-0.5 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ASX growth ETF quick reference */}
          <h3 className="text-lg font-bold text-slate-900 mb-3">ASX-Listed Growth ETFs — Quick Reference</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse" aria-label="ASX-listed growth ETFs quick reference">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="text-left py-2.5 px-4 font-semibold text-slate-700 border-b border-slate-200">ETF Code</th>
                  <th scope="col" className="text-left py-2.5 px-4 font-semibold text-slate-700 border-b border-slate-200">Index / Focus</th>
                  <th scope="col" className="text-left py-2.5 px-4 font-semibold text-slate-700 border-b border-slate-200">Manager</th>
                  <th scope="col" className="text-left py-2.5 px-4 font-semibold text-slate-700 border-b border-slate-200">Use case</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "NDQ", index: "Nasdaq 100", manager: "BetaShares", use: "Core US mega-cap tech exposure" },
                  { code: "QUS", index: "S&P 500 Quality", manager: "BetaShares", use: "Quality-screened US large cap growth" },
                  { code: "DHHF", index: "Diversified (100% equity)", manager: "BetaShares", use: "All-in-one global growth tilt" },
                  { code: "VDHG", index: "Diversified (90% equity)", manager: "Vanguard", use: "High-growth diversified fund" },
                  { code: "VGT", index: "US Information Technology", manager: "Vanguard (USD)", use: "Pure-play US IT sector" },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-4 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-2.5 px-4 text-slate-700 border-b border-slate-100">{r.index}</td>
                    <td className="py-2.5 px-4 text-slate-500 border-b border-slate-100">{r.manager}</td>
                    <td className="py-2.5 px-4 text-slate-600 border-b border-slate-100">{r.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">MERs and product details change — verify current fees on the issuer&apos;s website before investing.</p>
        </div>
      </section>

      {/* Section 4: Growth vs Value comparison */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Growth vs Value Investing</h2>
          <p className="text-slate-500 text-sm mb-6">Two distinct philosophies — how they compare across seven key dimensions.</p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse" aria-label="Growth vs value investing comparison">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200 w-1/3">Dimension</th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-amber-700 border-b border-slate-200">Growth</th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">Value</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    dim: "Valuation approach",
                    growth: "Future earnings potential — pays premium for growth",
                    value: "Current asset/earnings discount — buys below intrinsic value",
                  },
                  {
                    dim: "Dividend income",
                    growth: "Minimal — profits reinvested for expansion",
                    value: "Often higher dividend yield from mature businesses",
                  },
                  {
                    dim: "Time horizon",
                    growth: "5–15 years to allow compounding to materialise",
                    value: "1–5 years typically for mean reversion",
                  },
                  {
                    dim: "Volatility",
                    growth: "Higher — priced for optimism; misses punished severely",
                    value: "Lower — margin of safety provides downside buffer",
                  },
                  {
                    dim: "Interest rate sensitivity",
                    growth: "Higher — rising rates increase DCF discount rate, compressing multiples",
                    value: "Lower — near-term cash flows less exposed to rate movements",
                  },
                  {
                    dim: "Key risk",
                    growth: "Overvaluation; growth fails to materialise or slows",
                    value: "Value trap — cheap for a good reason (structural decline)",
                  },
                  {
                    dim: "Famous proponents",
                    growth: "Cathie Wood (ARK Invest), Baillie Gifford, Philip Fisher",
                    value: "Warren Buffett, Benjamin Graham, Howard Marks",
                  },
                ].map((r, i) => (
                  <tr key={r.dim} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-4 font-semibold text-slate-700 border-b border-slate-100">{r.dim}</td>
                    <td className="py-3 px-4 text-amber-800 border-b border-slate-100">{r.growth}</td>
                    <td className="py-3 px-4 text-slate-600 border-b border-slate-100">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 5: The growth trap */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">The Growth Trap — What Can Go Wrong</h2>
          <p className="text-slate-500 text-sm mb-6">The four most common ways growth investing destroys capital.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[
              {
                title: "Multiple compression",
                body: "Even when a company grows earnings as expected, the P/E ratio the market is willing to pay can contract sharply. A stock growing 30% per year but re-rated from 60x to 30x earnings falls 50% in price despite fundamental success. Multiple compression typically hits hardest when interest rates rise or investor sentiment shifts from optimism to caution.",
              },
              {
                title: "Competition erodes the moat",
                body: "Early growth stories attract competitors. A software company growing 40% annually can see that growth halve as a better-funded rival enters the market or a large platform bundles a competing feature for free. The TAM the company was addressing suddenly becomes contested. Moat durability is a harder question than TAM size.",
              },
              {
                title: "Accounting red flags",
                body: "High-growth companies can manipulate revenue recognition timing, capitalise expenses that should be expensed, or use adjusted metrics (non-GAAP EBITDA, ARR, NRR) that flatter the business. Watch for large gaps between reported GAAP profit and non-GAAP 'adjusted earnings', aggressive accounts receivable growth, and customer acquisition cost disclosures that disappear from filings.",
              },
              {
                title: "Black swan result",
                body: "A single quarterly miss against guidance can erase 30–50% of a high-multiple growth stock's value in a single session. Growth stocks are priced for perfection — there is no margin of safety in the valuation when you buy at 80x earnings. One bad result or a guidance downgrade triggers a rapid and severe re-rating that is very difficult to recover from psychologically.",
              },
            ].map((trap) => (
              <div key={trap.title} className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h3 className="font-bold text-red-800 mb-2">{trap.title}</h3>
                <p className="text-sm text-red-700 leading-relaxed">{trap.body}</p>
              </div>
            ))}
          </div>

          {/* Rate sensitivity callout */}
          <div className="bg-slate-800 rounded-xl p-6 text-white">
            <h3 className="font-bold text-amber-400 mb-2">Rate sensitivity: the DCF math</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Growth stocks are <strong className="text-white">long-duration assets</strong> — the bulk of their intrinsic value sits in earnings 5–15 years in the future. In a Discounted Cash Flow model, rising bond yields directly increase the discount rate applied to those future earnings. A shift from 2% to 4% risk-free rates can justify a 30–40% reduction in fair value for a company with most of its cash flows in the out-years. This is why the 2022 rate-hiking cycle hit Nasdaq-listed growth stocks so severely. The same math applies to ASX growth names.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: How to build a growth portfolio */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 6</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">How to Build a Growth Portfolio in Australia</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-extrabold text-sm flex items-center justify-center shrink-0">60</span>
                <h3 className="font-bold text-slate-900">Core (60–70%): Global growth ETFs</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                The foundation of a growth portfolio should be diversified global exposure. ASX-listed ETFs like NDQ (Nasdaq 100) or DHHF/VDHG (diversified high-growth allocations) provide broad access to hundreds of growth businesses at low cost, removing stock-picking risk from the bulk of your portfolio.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-500">
                <li className="flex gap-2"><span className="text-amber-500 font-bold mt-0.5">→</span>NDQ — Nasdaq 100 (heavy US tech)</li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold mt-0.5">→</span>DHHF — 100% global equity, growth tilt</li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold mt-0.5">→</span>QUS — S&P 500 quality screen</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-extrabold text-sm flex items-center justify-center shrink-0">35</span>
                <h3 className="font-bold text-slate-900">Satellite (30–40%): Individual ASX growth stocks</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                Use the satellite sleeve for high-conviction ASX growth names where you have done the research. Keep position sizes disciplined — 2–5% per stock is a common guide for managing single-stock risk. Focus on businesses with durable competitive moats, not just high revenue growth.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-500">
                <li className="flex gap-2"><span className="text-slate-500 font-bold mt-0.5">→</span>WTC, TNE, XRO, REA, PME (examples only)</li>
                <li className="flex gap-2"><span className="text-slate-500 font-bold mt-0.5">→</span>2–5% max per position</li>
                <li className="flex gap-2"><span className="text-slate-500 font-bold mt-0.5">→</span>No single stock &gt; 10% of total portfolio</li>
              </ul>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-4">Entry discipline: dollar-cost averaging into volatile names</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  step: "1",
                  title: "Set a target size",
                  body: "Decide the full intended position size before buying. For a 3% target, plan to build it over 3–6 months rather than all at once.",
                },
                {
                  step: "2",
                  title: "Buy in tranches",
                  body: "Purchase 1–1.5% initially. Add on pullbacks or after earnings confirmation — not just because the stock is moving up.",
                },
                {
                  step: "3",
                  title: "Review the thesis annually",
                  body: "Growth investing requires monitoring. If revenue growth decelerates materially or the competitive picture changes, the original thesis may no longer hold.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5">{item.step}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-sm text-slate-500 mt-1">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Tax considerations */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 7</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Tax Considerations for Growth Investors</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Low dividends = tax deferral",
                body: "Growth companies typically pay minimal or no dividends. With no dividend income to declare each year, your tax liability is deferred until you sell. This is a structural tax advantage compared to income-oriented strategies where you pay tax annually on dividends received.",
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                title: "50% CGT discount after 12 months",
                body: "Hold a growth stock for more than 12 months before selling and you qualify for the 50% CGT discount (for individual investors). A $100,000 gain becomes a $50,000 taxable gain — roughly halving your effective tax rate on the profit. This reward for patient holding aligns well with growth investing's longer time horizons.",
              },
              {
                icon: (
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "Growth stocks in super",
                body: "Holding high-growth stocks inside superannuation amplifies the tax advantage further. In accumulation phase, CGT is taxed at 15% (10% with the 12-month discount), versus your marginal rate outside super (up to 47%). In pension phase, gains are completely tax-free. Since growth stocks produce most of their return as capital gain rather than franked income, super is the ideal wrapper.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">FAQ</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <details key={item.q} className="group bg-white border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors">
                  {item.q}
                  <svg
                    className="w-4 h-4 text-slate-500 shrink-0 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related guides */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Explore Related Investment Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Value Investing",
                href: "/invest/value-investing",
                desc: "Buy $1 of business value for 50 cents — intrinsic value, margin of safety, and ASX value traps.",
              },
              {
                title: "Dividend Investing",
                href: "/invest/dividend-investing",
                desc: "High-yield ASX stocks, franking credits, DRPs, and SMSF dividend strategies.",
              },
              {
                title: "Index Funds",
                href: "/invest/index-funds",
                desc: "Passive ASX and global index funds — the alternative to active stock picking.",
              },
              {
                title: "Managed Funds",
                href: "/invest/managed-funds",
                desc: "Actively managed Australian funds and how to evaluate manager performance.",
              },
            ].map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-200 hover:shadow-md transition-all"
              >
                <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{guide.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{guide.desc}</p>
                <span className="inline-flex items-center text-amber-600 text-sm font-semibold mt-2">Read guide →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Build a Growth Portfolio with Expert Guidance</h2>
              <p className="text-sm text-slate-500">
                A financial planner can help you construct a growth-oriented portfolio suited to your risk tolerance, time horizon, and super strategy — and ensure you are not over-exposed to single growth names.
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

      {/* Compliance footer */}
      <section className="py-8 bg-slate-50 border-t border-slate-100">
        <div className="container-custom max-w-4xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
