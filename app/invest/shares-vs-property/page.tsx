import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Have Australian shares or property performed better historically?",
    a: "Over 30 years, Australian shares (ASX 200) have delivered approximately 9.7% p.a. total return including dividends reinvested, compared with Sydney residential property at roughly 7.2% p.a. capital-only growth (pre-leverage). However, when leverage is factored in, the comparison shifts dramatically. A property investor with a $100,000 deposit buying a $500,000 property at 7.2% annual growth earns $36,000 in year one on $100,000 equity — a 36% return on invested capital. An unlevered $100,000 in shares at 9.7% earns $9,700. The comparison is almost always leverage vs no-leverage, not asset class vs asset class.",
  },
  {
    q: "Can I invest in both shares and property?",
    a: "Yes, and most financially sophisticated Australians do. Owning a primary residence (property) and a separately managed share portfolio is one of the most common wealth-building combinations. Many property investors also hold ETFs in a brokerage account or via super, giving them liquidity and diversification that a single investment property cannot provide. Property via listed REITs (real estate investment trusts) like Goodman Group (GMG) or Scentre Group allows exposure to commercial property through a share portfolio without the minimum entry, leverage, and management requirements of direct property.",
  },
  {
    q: "Is the leverage from property worth the risk?",
    a: "It depends on your income stability, interest rate buffer, and concentration tolerance. Property leverage is structurally different from share margin loans: banks do not issue margin calls on residential mortgages (they only act if you stop making repayments), so you are not forced to sell in a downturn. However, leverage amplifies losses just as it amplifies gains. A $500,000 property falling 20% loses $100,000 — which wipes out the entire $100,000 deposit. Investors who stretched to 95% LVR in peak markets (2021–22) faced negative equity positions. The leverage is powerful but the single-asset concentration and interest rate exposure require genuine financial buffers.",
  },
  {
    q: "What are the tax advantages of shares vs property?",
    a: "Both asset classes get the 50% CGT discount after 12 months of ownership. Shares have a unique advantage in franking credits: dividends from Australian companies carry a tax credit for the 30% corporate tax already paid — an effective bonus yield of 1–2% for many investors. Property has two unique tax tools: (1) depreciation deductions (Div 40 plant/equipment and Div 43 building allowance) that reduce taxable rental income without a cash outflow — not available for shares; and (2) the main residence CGT exemption, which shelters all gains on your primary home from tax entirely. Super strongly favours shares due to the 15% tax rate in accumulation and 0% in pension phase — direct property in SMSF is complex and cost-intensive.",
  },
  {
    q: "Can I get property exposure through shares?",
    a: "Yes, through listed real estate investment trusts (A-REITs) and property ETFs. ASX-listed REITs such as Goodman Group, Scentre Group, Dexus, and Charter Hall give exposure to commercial, industrial, and retail property with ASX liquidity — buy and sell in seconds, no stamp duty, no minimum deposit beyond a single share price. The Vanguard Australian Property Securities Index ETF (VAP) and similar funds hold a diversified basket of A-REITs. The trade-off: listed REITs correlate more with equities during market stress (they sold off sharply in 2020), whereas direct property prices are less correlated due to illiquidity and infrequent valuation.",
  },
];

const COMPARISON_ROWS = [
  { aspect: "Minimum investment", shares: "$500 (broker) to $1 (micro-invest)", property: "$50K–$200K deposit + stamp duty" },
  { aspect: "Liquidity", shares: "High — sell in seconds on ASX", property: "Low — weeks to months to sell" },
  { aspect: "Leverage available", shares: "Up to 60–70% (margin loan)", property: "80–95% LVR (residential mortgage)" },
  { aspect: "Leverage risk", shares: "Margin call risk — forced sale at low", property: "No margin call — only default trigger" },
  { aspect: "Ongoing costs", shares: "0.04%–0.3% MER (ETFs); zero management", property: "Rates, insurance, maintenance: ~1–1.5% p.a." },
  { aspect: "Transaction costs", shares: "$0–$20 brokerage per trade", property: "$50K–$100K+ (stamp duty + agent fees)" },
  { aspect: "Tax: income", shares: "Dividends + franking credits", property: "Rent (fully taxable at marginal rate)" },
  { aspect: "Tax: CGT", shares: "50% discount after 12 months", property: "50% discount; PPOR fully exempt" },
  { aspect: "Tax deductions", shares: "Interest on loan, management fees", property: "Interest, rates, depreciation, repairs" },
  { aspect: "Diversification", shares: "Instant with ETFs ($500 = 300 stocks)", property: "Difficult — single concentrated asset" },
  { aspect: "Management time", shares: "Minimal with ETFs", property: "Tenants, maintenance, compliance, agents" },
  { aspect: "Emotional volatility", shares: "Daily price visibility — harder to hold", property: "Invisible volatility — easier to hold" },
];

const HISTORICAL_RETURNS = [
  { asset: "ASX 200 (total return, dividends reinvested)", annualReturn: "~9.7% p.a.", period: "30 years", note: "Capital + franked dividends" },
  { asset: "Sydney residential (capital growth only)", annualReturn: "~7.2% p.a.", period: "30 years", note: "Pre-leverage, no rent" },
  { asset: "Melbourne residential (capital growth only)", annualReturn: "~6.8% p.a.", period: "30 years", note: "Pre-leverage, no rent" },
  { asset: "Sydney residential (total return, rent + growth)", annualReturn: "~8.5% p.a.", period: "30 years", note: "Ungeared, gross rent yield ~3%" },
  { asset: "ASX 200 (capital only, no dividends)", annualReturn: "~5.5% p.a.", period: "30 years", note: "Dividends are significant" },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Shares vs Property — The Australian Comparison (${CURRENT_YEAR})`,
  description: `Shares vs property: historical returns, leverage, tax, liquidity and costs compared with Australian data. The complete guide for ${CURRENT_YEAR}. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Shares vs Property Australia (${CURRENT_YEAR}) — Full Comparison`,
    description: "Historical returns, leverage, tax treatment, liquidity, and transaction costs compared. Which is better for Australian investors?",
    url: `${SITE_URL}/invest/shares-vs-property`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Shares vs Property Australia")}&sub=${encodeURIComponent("Returns · Leverage · Tax · Liquidity · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/invest/shares-vs-property` },
};

export default function SharesVsPropertyPage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Investing", url: absoluteUrl("/invest") },
    { name: "Shares vs Property", url: absoluteUrl("/invest/shares-vs-property") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Investing</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Shares vs Property</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">Australian data</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Shares vs Property: The Australian Comparison ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              Australia&rsquo;s great investing debate. Shares have historically outperformed on a like-for-like basis — but most property investors use leverage, which changes the equation entirely. Here is the full picture.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "ASX 200 30-yr total return (p.a.)", value: "~9.7%" },
                { label: "Sydney property 30-yr capital return (p.a.)", value: "~7.2%" },
                { label: "Leverage effect: $100K deposit → $500K asset", value: "5×" },
                { label: "ETF brokerage vs property stamp duty", value: "$15 vs $25K+" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Historical returns */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Historical returns: the Australian data</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Long-run data comparing Australian shares and residential property — using like-for-like (ungeared) capital and total return figures.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold">Asset</th>
                    <th className="px-4 py-3 text-left font-extrabold text-amber-300">Annual return (p.a.)</th>
                    <th className="px-4 py-3 text-left font-extrabold">Period</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-300">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {HISTORICAL_RETURNS.map((r, i) => (
                    <tr key={r.asset} className={i % 2 === 0 ? "" : "bg-slate-50"}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.asset}</td>
                      <td className="px-4 py-3 font-extrabold text-amber-700">{r.annualReturn}</td>
                      <td className="px-4 py-3 text-slate-700">{r.period}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>The most important caveat:</strong> Property returns are almost always quoted as ungeared (no debt). Share returns are almost always quoted as ungeared too. But 90% of property investors use a mortgage — which is 4–5× leverage — while most share investors do not use margin loans. Comparing ungeared property to ungeared shares is fair. Comparing geared property to ungeared shares is comparing two fundamentally different risk profiles. See the leverage section below.
              </p>
            </div>
          </div>
        </section>

        {/* Head-to-head table */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Head-to-head: key differences</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold">Factor</th>
                    <th className="px-4 py-3 text-left font-extrabold text-amber-300">Shares</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-200">Property</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON_ROWS.map((r, i) => (
                    <tr key={r.aspect} className={i % 2 === 0 ? "" : "bg-slate-50"}>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.aspect}</td>
                      <td className="px-4 py-3 text-slate-700">{r.shares}</td>
                      <td className="px-4 py-3 text-slate-700">{r.property}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Shares advantages */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Advantages of shares</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Fractional ownership from $500",
                  desc: "An ASX broker account lets you buy a diversified global ETF with as little as $500. Micro-investing apps go lower. Property requires a $50,000–$200,000 deposit before you can settle — creating a years-long savings barrier for most Australians.",
                  badge: "Low entry",
                },
                {
                  title: "Instant liquidity",
                  desc: "Shares on the ASX settle in two business days and can be sold in seconds during market hours. Property takes 30–90 days to sell from decision to settlement, assuming you find a buyer. In a financial emergency, share liquidity is a powerful advantage.",
                  badge: "Flexibility",
                },
                {
                  title: "Automatic diversification via ETFs",
                  desc: "A single ETF like VDHG or DHHF holds thousands of underlying companies across Australia, the US, Europe, and emerging markets. An investment property is a single asset on a single street in a single suburb — entirely undiversified.",
                  badge: "Diversification",
                },
                {
                  title: "Near-zero transaction costs",
                  desc: "ASX brokerage is $0–$20 per trade. No stamp duty. No conveyancing. On a $100,000 investment, brokerage is 0.015%. The equivalent property purchase in Victoria incurs stamp duty of ~$5,500 on a $500,000 property — a 5.5% headwind before the asset has moved at all.",
                  badge: "Low friction",
                },
                {
                  title: "Franking credits",
                  desc: "Australian dividends from most ASX-listed companies carry imputation credits representing the 30% corporate tax already paid. A $1,000 fully franked dividend comes with $428 in franking credits — directly offsetting personal tax. There is no equivalent for rental income.",
                  badge: "Tax advantage",
                },
                {
                  title: "Zero ongoing management",
                  desc: "An ETF portfolio requires no tenant management, no maintenance calls, no council rates, no insurance, no depreciation schedules, and no property managers. Index ETFs are genuinely passive — set up an autoinvest and review annually.",
                  badge: "Passive",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">{item.badge}</span>
                  <h3 className="font-extrabold text-slate-900 mt-3 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Property advantages */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Advantages of property</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Leverage without margin calls",
                  desc: "Residential mortgages offer 80–95% LVR — up to 5× leverage — without the margin call risk of share margin loans. Banks do not force-sell your property during market downturns unless you stop making repayments. This lets you ride out price falls without forced selling.",
                  badge: "Structural advantage",
                },
                {
                  title: "Rental income offsets costs",
                  desc: "A tenant pays rent which partially or fully covers mortgage interest, rates, insurance, and maintenance. Gross rental yields in Australian capitals typically range from 3–5%, reducing the net cash cost of holding the asset.",
                  badge: "Income",
                },
                {
                  title: "Depreciation deductions",
                  desc: "New property investors can claim Division 40 (plant and equipment: appliances, carpets, blinds) and Division 43 (building allowance: 2.5% of construction cost p.a.). These are non-cash tax deductions that reduce taxable rental income. There is no equivalent deduction for share portfolios.",
                  badge: "Tax deduction",
                },
                {
                  title: "Tangible, familiar asset",
                  desc: "Property is something you can see, inspect, and improve. Many investors find it easier to commit to a large property purchase than an equivalent share investment, because the asset feels real and comprehensible. Behavioural factors matter — an investment you hold for 30 years beats a theoretically superior one you abandon.",
                  badge: "Behavioural",
                },
                {
                  title: "Forced savings discipline",
                  desc: "A mortgage is compulsory savings — you build equity with every repayment whether or not you feel like investing that month. Many Australians accumulate more wealth through enforced mortgage repayments than they would through voluntary share investing, simply because the habit is structural rather than discretionary.",
                  badge: "Discipline",
                },
                {
                  title: "Main residence CGT exemption",
                  desc: "Your primary home is exempt from CGT on sale, regardless of the gain. A Sydney home bought for $600,000 and sold for $1,500,000 creates a $900,000 untaxed gain. The six-year rule can extend this exemption to an investment property formerly used as a PPOR. No equivalent exemption exists for shares.",
                  badge: "CGT-free",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{item.badge}</span>
                  <h3 className="font-extrabold text-slate-900 mt-3 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The leverage factor */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">The leverage factor: why the numbers mislead</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              The most common mistake in the shares-vs-property debate is comparing the return percentage of geared property against ungeared shares. Here is what the actual dollar amounts look like.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-extrabold text-slate-900 mb-4">Scenario: $100,000 to invest</h3>
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-extrabold text-amber-900 text-sm mb-2">Option A: $100K into ASX 200 ETF (ungeared)</p>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>Investment: $100,000</li>
                      <li>Annual return at 9.7% total: <strong>$9,700</strong></li>
                      <li>After 10 years (compounded): ~$253,000</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-slate-300 bg-white p-4">
                    <p className="font-extrabold text-slate-900 text-sm mb-2">Option B: $100K deposit → $500K property (80% LVR)</p>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>Property value: $500,000</li>
                      <li>Annual growth at 7.2%: <strong>$36,000</strong></li>
                      <li>Return on your $100K equity: <strong>36%</strong></li>
                      <li>After 10 years (property value): ~$1,002,000</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                <h3 className="font-extrabold text-blue-900 mb-4">What this illustrates</h3>
                <p className="text-sm text-blue-900 leading-relaxed mb-4">
                  Even at a <em>lower</em> percentage return (7.2% vs 9.7%), geared property produces nearly 4× the absolute dollar return in year one because the leveraged asset base is 5× larger.
                </p>
                <p className="text-sm text-blue-900 leading-relaxed mb-4">
                  But Option B also carries $400,000 in debt, interest costs (at 6% p.a. that is $24,000/year), vacancy risk, maintenance costs, and total concentration in one asset on one street.
                </p>
                <p className="text-sm text-blue-900 leading-relaxed font-semibold">
                  The 5× leverage is the variable that matters — not which asset class nominally outperforms.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                <strong>Fair comparison:</strong> If you applied equivalent leverage to shares (borrowing $400,000 on a margin loan to hold $500,000 of ETFs), the returns at 9.7% p.a. would be $48,500/year on the $500,000 — significantly higher than the property. But margin loan rates are higher than mortgage rates, margin calls can force selling at the worst time, and most investors will not tolerate the visible daily volatility of a leveraged share portfolio. The structural differences in how each leverage product works are as important as the asset returns themselves.
              </p>
            </div>
          </div>
        </section>

        {/* Tax comparison */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Tax treatment compared</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-extrabold text-slate-900 mb-4">Shares: tax treatment</h3>
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                    <p className="font-bold text-emerald-900 mb-1">50% CGT discount (12+ months)</p>
                    <p className="text-slate-700">Same as property. Sell after 12 months and only half the capital gain is added to your assessable income.</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                    <p className="font-bold text-emerald-900 mb-1">Franking credits on dividends</p>
                    <p className="text-slate-700">A $700 fully franked dividend from a 30% tax-rate company comes with $300 in franking credits — reducing your tax bill by $300. For low-income earners, excess credits are refunded as cash.</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                    <p className="font-bold text-emerald-900 mb-1">Super is highly tax-efficient for shares</p>
                    <p className="text-slate-700">Shares inside super are taxed at 15% (accumulation) or 0% (pension phase). Franking credits generate cash refunds inside zero-tax super funds — a structural advantage that doesn&apos;t translate well to direct property.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-bold text-slate-900 mb-1">Negative gearing (shares)</p>
                    <p className="text-slate-700">Borrowing to buy shares (via margin loan or investment loan) and incurring net losses is deductible — the same mechanism as property negative gearing. Less commonly used due to lower LVR limits and margin call risk.</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 mb-4">Property: tax treatment</h3>
                <div className="space-y-3">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
                    <p className="font-bold text-blue-900 mb-1">Main residence CGT exemption</p>
                    <p className="text-slate-700">Your primary home is fully exempt from CGT. The six-year rule extends this to a former home rented out for up to 6 years. No equivalent exemption applies to shares — even if they were your primary savings vehicle.</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
                    <p className="font-bold text-blue-900 mb-1">Depreciation deductions (Div 40 + Div 43)</p>
                    <p className="text-slate-700">Non-cash deductions reduce taxable rental income. On a new property, depreciation can create a paper loss that offsets wage income — no cash required, no share market equivalent.</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
                    <p className="font-bold text-blue-900 mb-1">Negative gearing (property)</p>
                    <p className="text-slate-700">Net rental loss (after interest, rates, depreciation, management) is deductible at your marginal rate. At 47% marginal rate, the ATO effectively pays $0.47 of every dollar of investment loss — reducing the net holding cost significantly.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-bold text-slate-900 mb-1">Land tax and stamp duty</p>
                    <p className="text-slate-700">Property carries unavoidable state taxes: stamp duty on purchase (up to ~5% of price) and land tax on investment properties above the state threshold (annual, progressive). These have no share market equivalent and meaningfully reduce net returns.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Liquidity risk */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Liquidity: the underrated risk factor</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Liquidity risk is not just an inconvenience — for investors who need capital in an emergency, it can be the difference between weathering a crisis and being forced into a distressed sale.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-3">Shares: sell in seconds</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>ASX market hours: 10am–4pm AEST, Monday–Friday</li>
                  <li>Settlement: T+2 (funds in account within 2 business days)</li>
                  <li>No buyer negotiation, no agent, no marketing period</li>
                  <li>Partial sales possible — sell exactly how much you need</li>
                  <li>Emergency access in days, not months</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Property: weeks to months</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>Typical selling timeline: 30–90+ days to settlement</li>
                  <li>Agent engagement, marketing campaign, open homes required</li>
                  <li>Buyer negotiation and contract cooling-off periods</li>
                  <li>Cannot sell part of a property — it is all or nothing</li>
                  <li>Distressed sales attract discounts of 5–15% or more</li>
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-900">
                <strong>Emergency fund implication:</strong> If your investment property is your primary wealth vehicle and you face sudden unemployment, medical costs, or a business loss, you cannot access your equity quickly. Property investors without a liquid buffer (3–6 months expenses in cash or shares) can find themselves forced to sell the property in unfavourable conditions — negating years of capital growth.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                <strong>The practical implication:</strong> Many financial advisers recommend against having 90%+ of investable wealth in illiquid property with no liquid reserves. A share portfolio alongside a mortgage provides the liquidity buffer that a property-only investor lacks.
              </p>
            </div>
          </div>
        </section>

        {/* Risk factors */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Risk factors for each asset class</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-extrabold text-slate-900 mb-4">Shares: primary risks</h3>
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-bold text-slate-900 mb-1">Market volatility</p>
                    <p className="text-slate-700">The ASX 200 dropped 37% in the GFC (2008–09) and 34% in the initial COVID crash (Feb–Mar 2020). Price is visible daily. Investors who panic-sell in downturns lock in losses and miss the recovery. Behavioural risk is the dominant risk for share investors.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-bold text-slate-900 mb-1">Individual company failure</p>
                    <p className="text-slate-700">A single stock can go to zero (Centro, ABC Learning, MFS). This risk is almost entirely eliminated by holding a diversified index ETF, but concentrated single-stock portfolios carry existential risk.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-bold text-slate-900 mb-1">Margin call risk (leveraged only)</p>
                    <p className="text-slate-700">Margin loans can trigger forced selling at market lows if the LVR breaches the lender&apos;s threshold. This is a real risk that magnified losses for leveraged investors in 2008 and 2020.</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 mb-4">Property: primary risks</h3>
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-bold text-slate-900 mb-1">Vacancy risk</p>
                    <p className="text-slate-700">An untenanted property generates no rental income while costs (mortgage, rates, insurance) continue. Even 4 weeks of vacancy in a year reduces a 4% gross yield to 3.1%. Extended vacancy in oversupplied markets can significantly damage returns.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-bold text-slate-900 mb-1">Interest rate rises</p>
                    <p className="text-slate-700">RBA rate rises in 2022–23 increased mortgage repayments by $1,000–$2,000/month on a $700,000 variable loan. Investors relying on rental income to cover their mortgage faced sudden cash flow pressure. Property is highly interest-rate sensitive.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-bold text-slate-900 mb-1">Concentrated single-asset risk</p>
                    <p className="text-slate-700">A single investment property is a 100% bet on one house in one suburb in one city. Localised factors — rezoning, infrastructure changes, population decline, flood or fire risk — can impair the specific property&apos;s value even when the broader market rises.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <p className="font-bold text-slate-900 mb-1">Maintenance and capital works</p>
                    <p className="text-slate-700">Major unexpected repairs (roof, plumbing, structural) are capital expenses not always recoverable through rent. Older properties in particular can absorb significant capital — an expense that does not appear in headline return figures.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Portfolio allocation */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Portfolio allocation: most Australians are already property-heavy</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Before deciding how much to allocate to investment property vs shares, Australian investors need to account for their primary residence — a large, undiversified, illiquid, leveraged property position most households already hold.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  A Sydney homeowner with a $1,200,000 home and a $700,000 mortgage has approximately $500,000 in gross equity — all concentrated in a single property. Their total wealth exposure is predominantly real estate before any investment decisions are made.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Adding a second investment property doubles down on the same asset class, the same interest rate sensitivity, the same geographic concentration, and the same illiquidity — at a point where their balance sheet is already property-dominated.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Building a share portfolio alongside the primary residence — particularly via ETFs in a brokerage account or through maximising concessional super contributions — adds genuine diversification: different asset class, different income stream, different tax treatment, full liquidity.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-4">Common allocation approaches</h3>
                <div className="space-y-3 text-sm">
                  {[
                    {
                      approach: "PPOR + share portfolio",
                      desc: "Primary residence for shelter + CGT exemption; liquid ETF portfolio for diversification and growth. Most common among high-income professionals.",
                      tag: "Balanced",
                    },
                    {
                      approach: "PPOR + investment property + shares",
                      desc: "Larger capital base; property for leverage + depreciation; shares for liquidity. Requires strong income to service two mortgages.",
                      tag: "Growth-focused",
                    },
                    {
                      approach: "Rentvesting + share portfolio",
                      desc: "Rent in desired location; invest in shares and/or property elsewhere. Avoids geographic mismatch between where you want to live and where investment fundamentals are strongest.",
                      tag: "Flexible",
                    },
                    {
                      approach: "PPOR + maximised super",
                      desc: "Home ownership for shelter; concessional super contributions at 15% tax for long-run compounding. Simple, low-maintenance, highly tax-efficient.",
                      tag: "Conservative",
                    },
                  ].map((item) => (
                    <div key={item.approach} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-900">{item.approach}</p>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">{item.tag}</span>
                      </div>
                      <p className="text-slate-600">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Verdict */}
        <section className="py-12 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-amber-900 mb-6">Verdict: there is no universal winner</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-amber-900 leading-relaxed mb-4">
                  On an ungeared, like-for-like basis, Australian shares have slightly outperformed residential property over 30 years. Add leverage, and property wins in absolute dollar terms on the same initial capital — but at the cost of concentration, illiquidity, and interest rate risk.
                </p>
                <p className="text-sm text-amber-900 leading-relaxed mb-4">
                  The honest answer is that the &ldquo;better&rdquo; investment depends entirely on your individual situation: how much capital you have, your income stability, your tax bracket, how much leverage you can service, your time horizon, and your psychological tolerance for different types of risk.
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">
                  Most of Australia&rsquo;s wealth-building success stories — those who became genuinely financially independent — held both. They owned a home, built equity, and simultaneously invested in shares (often via super) over decades. The debate frames a false binary where both asset classes serve different roles in a complete portfolio.
                </p>
              </div>
              <div className="rounded-xl border border-amber-300 bg-white p-5">
                <h3 className="font-extrabold text-amber-900 mb-4">Which suits your situation?</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Limited capital (under $50K)", rec: "Shares — start immediately", color: "text-amber-700" },
                    { label: "Stable high income, long horizon", rec: "Both — leverage property + ETF portfolio", color: "text-emerald-700" },
                    { label: "Liquidity is critical", rec: "Shares — sell in days not months", color: "text-amber-700" },
                    { label: "Already own PPOR, want diversification", rec: "Shares — balance the property exposure", color: "text-amber-700" },
                    { label: "High marginal rate, want tax deductions", rec: "Property — depreciation + negative gearing", color: "text-slate-700" },
                    { label: "Investing through super", rec: "Shares — franking credits + 15% tax rate", color: "text-amber-700" },
                    { label: "Can&rsquo;t tolerate daily volatility", rec: "Property — invisible price volatility", color: "text-slate-700" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-start gap-3 border-b border-amber-100 pb-2">
                      <span className="text-slate-700">{item.label}</span>
                      <span className={`font-bold shrink-0 text-right ${item.color}`}>{item.rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-2">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 text-sm hover:bg-slate-100 transition-colors">
                    {item.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">&#9660;</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest/index-funds" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Index funds guide &#8594;
              </Link>
              <Link href="/invest/lump-sum-vs-dca" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Lump sum vs DCA &#8594;
              </Link>
              <Link href="/brokers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Compare brokers &#8594;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
