import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Value Investing Australia — ASX Strategy, Metrics & Margin of Safety (${CURRENT_YEAR})`,
  description:
    "Complete guide to value investing on the ASX — intrinsic value, P/E and P/B ratios, margin of safety, value traps, and how franking credits affect Australian value analysis.",
  alternates: { canonical: `${SITE_URL}/invest/value-investing` },
  openGraph: {
    title: `Value Investing Australia — ASX Strategy, Metrics & Margin of Safety (${CURRENT_YEAR})`,
    description:
      "Complete guide to value investing on the ASX — intrinsic value, P/E and P/B ratios, margin of safety, value traps, and how franking credits affect Australian value analysis.",
    url: `${SITE_URL}/invest/value-investing`,
  },
};

const faqItems = [
  {
    q: "Does value investing work on the ASX?",
    a: "Value investing has historically generated positive returns on the ASX over long periods, though with periods of underperformance (notably during the 2010s growth boom). The ASX's concentration in financials, resources, and utilities suits some value criteria (P/B for banks, FCF for mature miners) but makes growth-oriented value analysis harder. Academic evidence supports value as a factor, though it requires patience — most studies show 5–10 year horizons.",
  },
  {
    q: "What P/E ratio indicates a value stock?",
    a: "A P/E below the market average suggests potential value, but the threshold varies by sector. A P/E of 10x might be fair for a cyclical miner at peak earnings, while a 15x P/E for a stable consumer staples company could be excellent value. Always compare within the same sector and adjust for growth prospects and quality. There is no single magic P/E number.",
  },
  {
    q: "What is a value trap?",
    a: "A value trap is a stock that appears cheap by metrics but continues to fall (or stagnates) because the business fundamentals are deteriorating. Classic examples: a newspaper company with a low P/E because earnings are structurally declining, or a miner with low P/B whose assets are in a permanent demand slump. The key question for any cheap stock: why is it cheap, and is the cheapness temporary or permanent?",
  },
  {
    q: "How do franking credits affect value analysis on the ASX?",
    a: "Franking credits significantly enhance the true yield of Australian dividend stocks. A 5% fully franked dividend is equivalent to a 7.14% grossed-up yield (for a 30% tax-rate investor). This makes high-yield ASX stocks with full franking more attractive than the headline yield implies, and should be factored into any comparison with unfrankable assets. It also partly explains why ASX dividend stocks sometimes trade at lower yields than international equivalents.",
  },
  {
    q: "What ASX stocks are traditionally considered value plays?",
    a: "Traditionally value-oriented sectors on the ASX include major banks (ANZ, WBC, NAB, CBA — though CBA has re-rated significantly), resources (BHP, RIO at low points in the commodity cycle), infrastructure utilities (APA, Transurban), retail staples (Woolworths, Coles), and insurance (IAG, Suncorp). Note: sectors go in and out of value status based on price cycles, not just fundamentals.",
  },
  {
    q: "How is value investing different from just buying cheap stocks?",
    a: "Value investing requires analyzing the intrinsic value of a business, not just buying anything that looks statistically cheap. The discipline involves: (1) understanding the business model and its durability, (2) calculating a reasonable intrinsic value estimate, (3) requiring a margin of safety below that estimate, and (4) having conviction to hold through volatility. Buying cheap without these steps often leads to value traps.",
  },
];

export default function ValueInvestingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Value Investing" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Value Investing Australia — ASX Strategy, Metrics & Margin of Safety (${CURRENT_YEAR})`,
    url: absoluteUrl("/invest/value-investing"),
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
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200 font-medium">Value Investing</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
              Graham &amp; Buffett Framework
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
              ASX-Focused
            </span>
          </div>

          <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Value Investing on the ASX
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
            Buy $1 of business value for 50 cents — the core discipline of value investing. This guide covers intrinsic value methods, key valuation metrics, margin of safety, and the unique challenges of applying value frameworks to Australia&apos;s resource and financial-heavy market.
          </p>

          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(
              [
                { value: "50¢", label: "Core principle: buy $1 of value for 50 cents" },
                { value: "20–30%", label: "Margin of safety below intrinsic value" },
                { value: "3–5+ yrs", label: "Minimum time horizon for value strategies" },
                { value: "~60%", label: "ASX weighting in resources & financials — complicates value analysis" },
              ] as { value: string; label: string }[]
            ).map((s) => (
              <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: What is value investing */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What Is Value Investing?</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Value investing is the practice of buying stocks that trade below their <strong>intrinsic (fair) value</strong> — the price a rational buyer would pay for the entire business based on its underlying economics. The strategy was formalised by Benjamin Graham in <em>Security Analysis</em> (1934) and <em>The Intelligent Investor</em> (1949), and later popularised by Warren Buffett, Charlie Munger, and a generation of value-oriented fund managers.
            </p>
            <p>
              The core insight is that markets are occasionally irrational — driven by fear, greed, and short-term thinking. Patient investors who can correctly estimate intrinsic value, and wait for a sufficient discount to that estimate, can generate above-average long-run returns.
            </p>
            <h3>The core skill: distinguishing cheap from undervalued</h3>
            <p>
              Not every cheap stock is a value stock. A business with a low price-to-earnings ratio might be cheap because its earnings are in structural decline — not because the market has temporarily mispriced it. Distinguishing genuine undervaluation from a <strong>value trap</strong> (a stock that keeps falling because the fundamentals are deteriorating) is the central skill that separates successful value investors from those who simply buy whatever looks statistically cheap.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Key valuation metrics */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Key Valuation Metrics</h2>
          <p className="text-slate-500 text-sm mb-6">Five ratios value investors use to identify potentially undervalued ASX stocks.</p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Metric</th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Formula</th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">Value investor&apos;s target</th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">ASX context</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    metric: "P/E ratio",
                    formula: "Price ÷ Earnings/share",
                    target: "Below sector average or <15x",
                    context: "ASX avg ~16–18x; banks/resources vary widely",
                  },
                  {
                    metric: "P/B ratio",
                    formula: "Price ÷ Book value/share",
                    target: "Below 1.5x for asset-heavy; 2–3x for capital-light",
                    context: "Banks often trade near book value",
                  },
                  {
                    metric: "EV/EBITDA",
                    formula: "Enterprise value ÷ EBITDA",
                    target: "<8–10x typically",
                    context: "Useful for resources and industrials",
                  },
                  {
                    metric: "Free cash flow yield",
                    formula: "FCF/share ÷ Price",
                    target: ">5% indicates potential value",
                    context: "ASX miners: volatile FCF across commodity cycles",
                  },
                  {
                    metric: "Dividend yield",
                    formula: "DPS ÷ Price",
                    target: "Higher yield can signal undervaluation",
                    context: "AU average ~4.5%, boosted further by franking credits",
                  },
                ].map((r, i) => (
                  <tr key={r.metric} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-4 font-bold text-amber-700 border-b border-slate-100">{r.metric}</td>
                    <td className="py-3 px-4 text-slate-700 border-b border-slate-100">{r.formula}</td>
                    <td className="py-3 px-4 text-slate-600 border-b border-slate-100">{r.target}</td>
                    <td className="py-3 px-4 text-slate-500 border-b border-slate-100">{r.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            No single metric determines value. Ratios must be interpreted in context of the business, sector, and growth prospects.
          </p>
        </div>
      </section>

      {/* Section 3: Intrinsic value and margin of safety */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Intrinsic Value &amp; Margin of Safety</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-3">Intrinsic Value Methods</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Discounted Cash Flow (DCF)</p>
                  <p className="text-sm text-slate-500 mt-1">Project future free cash flows and discount them back to present value using an appropriate discount rate. Highly sensitive to assumptions — small changes in growth rate or discount rate produce large valuation swings.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Asset-Based Valuation</p>
                  <p className="text-sm text-slate-500 mt-1">Value the company based on net assets (book value, adjusted for realistic asset values). Most appropriate for asset-heavy businesses: banks, property, mining.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Earnings Power Value (EPV)</p>
                  <p className="text-sm text-slate-500 mt-1">Capitalise normalised (sustainable) earnings at an appropriate multiple without assuming growth. Conservative and less dependent on uncertain long-range forecasts.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-3">Margin of Safety — Graham&apos;s Core Concept</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Benjamin Graham taught that investors should only buy when the market price is <strong>20–30% or more below their intrinsic value estimate</strong>. This &quot;margin of safety&quot; performs two functions: it compensates for errors in your analysis, and it provides downside protection if the business underperforms expectations.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">Example</p>
                <p className="text-sm text-amber-700">You estimate a company is worth $10.00/share. A 30% margin of safety means you only buy at or below $7.00/share — giving yourself room to be wrong.</p>
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">On the ASX</p>
                <p className="text-sm text-slate-500">Intrinsic value is harder to calculate for resource companies (commodity price uncertainty makes cash flow projections unreliable). More tractable for consumer staples, banks with stable ROE, and infrastructure with contracted revenues.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Value vs Growth */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Value vs Growth Investing</h2>
          <p className="text-slate-500 text-sm mb-6">Two distinct philosophies with different risk profiles and ASX fit.</p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200 w-1/3">Dimension</th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-amber-700 border-b border-slate-200">Value</th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">Growth</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    dim: "Focus",
                    value: "Current price vs fundamentals",
                    growth: "Future earnings potential",
                  },
                  {
                    dim: "P/E multiple",
                    value: "Low — buy cheap",
                    growth: "High — pay for future growth",
                  },
                  {
                    dim: "Time horizon",
                    value: "Patient, 3–5+ years",
                    growth: "Often shorter, momentum-driven",
                  },
                  {
                    dim: "Dividend preference",
                    value: "Often high yield",
                    growth: "Usually low/no dividend (earnings reinvested)",
                  },
                  {
                    dim: "Primary risk",
                    value: "Value trap — cheap for a reason",
                    growth: "Multiple compression — growth disappoints",
                  },
                  {
                    dim: "ASX fit",
                    value: "Banks, resources, staples, utilities",
                    growth: "Tech, healthcare, small-cap growth",
                  },
                ].map((r, i) => (
                  <tr key={r.dim} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-3 px-4 font-semibold text-slate-700 border-b border-slate-100">{r.dim}</td>
                    <td className="py-3 px-4 text-amber-800 border-b border-slate-100">{r.value}</td>
                    <td className="py-3 px-4 text-slate-600 border-b border-slate-100">{r.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 5: ASX challenges — amber card */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Value Investing on the ASX — Unique Challenges</h2>

          <div className="bg-amber-50 border border-amber-300 rounded-xl p-6">
            <h3 className="font-bold text-amber-900 mb-4">What makes the ASX different from US markets</h3>
            <div className="space-y-4">
              {[
                {
                  title: "Resource and financial-heavy index",
                  body: "The ASX 200 is dominated by financials (~30%) and materials/resources (~20%). Both sectors have earnings that swing with interest rate cycles and commodity prices — making book value and earnings harder to normalise than consumer or technology businesses.",
                },
                {
                  title: "Limited high-quality consumer/technology stocks",
                  body: "The US S&P 500 has hundreds of wide-moat consumer and technology companies. The ASX has far fewer — meaning value frameworks built on consumer brand moats or recurring software revenue are harder to apply locally.",
                },
                {
                  title: "Franking credits change the effective yield calculation",
                  body: "A 6% unfranked dividend is not equivalent to a 6% fully franked dividend for an Australian tax-resident investor. The grossed-up yield on a fully franked 6% dividend is 8.57% (at a 30% tax rate). Factor franking into any yield-based value assessment.",
                },
                {
                  title: "Small cap value is historically richer",
                  body: "Most of the historical value premium on the ASX has been concentrated in smaller companies — mid and small caps — where analyst coverage is thinner and mispricing persists longer. Large-cap ASX stocks are heavily analysed and harder to find at a genuine margin of safety.",
                },
                {
                  title: "LICs running value strategies",
                  body: "Several Australian Listed Investment Companies (LICs) explicitly run value strategies: AFIC (Australian Foundation Investment Company), Argo Investments (ARG), and WAM Capital (WAM). These provide access to value-oriented portfolios in a listed, liquid format with franked dividends.",
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
        </div>
      </section>

      {/* Section 6: Value traps — red warning cards */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 6</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Common Value Traps to Avoid</h2>
          <p className="text-slate-500 text-sm mb-6">The most expensive mistakes value investors make on the ASX.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Cheap for a reason",
                body: "Earnings in structural decline — disrupted industries, single-customer risk, or a product that is being replaced by a superior alternative. A low P/E means nothing if the E is heading toward zero. Ask: why is this cheap? If you cannot answer convincingly, do not buy.",
              },
              {
                title: "Balance sheet quality ignored",
                body: "Price-to-book is meaningless if the assets are impaired or off-balance-sheet liabilities exist. Intangible assets, goodwill from past acquisitions, and deferred tax assets can all inflate book value. A mining company with stranded assets is not cheap at 0.8x book — it may be overvalued.",
              },
              {
                title: "Cyclical mistake",
                body: "Buying at peak earnings and treating them as sustainable. A miner reporting record profits at the top of the commodity cycle has a deceptively low P/E. Normalise earnings across a full cycle before judging whether a cyclical company is genuinely cheap.",
              },
              {
                title: "Ignoring capital allocation",
                body: "A cheap stock stays cheap — or gets cheaper — if management destroys value through poor acquisitions, excessive debt, or capital-light returns being reinvested at low rates. Always check the company's historical return on equity and reinvestment track record before buying on price alone.",
              },
            ].map((trap) => (
              <div key={trap.title} className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h3 className="font-bold text-red-800 mb-2">{trap.title}</h3>
                <p className="text-sm text-red-700 leading-relaxed">{trap.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">FAQ</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <details key={item.q} className="group bg-white border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors">
                  {item.q}
                  <svg
                    className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform"
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
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Explore Related Investment Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
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
              {
                title: "Bonds & Fixed Income",
                href: "/invest/bonds",
                desc: "Government bonds, bond ETFs, corporate bonds, and private credit for Australian investors.",
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
      <section className="py-14 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Apply Value Principles with Expert Guidance</h2>
              <p className="text-sm text-slate-500">
                A financial planner can help you assess individual ASX stocks, build a diversified value-oriented portfolio, and ensure your strategy aligns with your tax position and time horizon.
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
