import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Retirement Income Strategy — Super Drawdown, Age Pension & More (${CURRENT_YEAR}) | invest.com.au`,
  description: `How to structure retirement income in Australia: account-based pension drawdown rules, Age Pension integration, sequencing risk, the bucket strategy, tax strategies, and Centrelink optimisation. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Retirement Income Strategy (${CURRENT_YEAR})`,
    description: "Super drawdown, Age Pension, annuities, sequencing risk, bucket strategy, and tax tips for Australian retirees.",
    url: `${SITE_URL}/retirement/retirement-income`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Retirement Income Strategy")}&sub=${encodeURIComponent("ABP · Age Pension · Sequencing Risk · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/retirement/retirement-income` },
};

const INCOME_SOURCES = [
  { source: "Age Pension", amount: "Up to $1,171/fortnight (single)", tax: "Tax-free", reliability: "Government guaranteed" },
  { source: "Account-based pension (super)", amount: "Variable draws", tax: "Tax-free over 60", reliability: "Investment-dependent" },
  { source: "Annuity (lifetime)", amount: "Fixed regular payments", tax: "Partly assessable", reliability: "Guaranteed" },
  { source: "Investment portfolio (outside super)", amount: "Dividends, interest", tax: "Marginal rate", reliability: "Investment-dependent" },
  { source: "Rental income", amount: "Net rent", tax: "Marginal rate", reliability: "Property-dependent" },
  { source: "Part-time work", amount: "Wages", tax: "Work Bonus exempts $300/fortnight", reliability: "Active income" },
];

const DRAWDOWN_TABLE = [
  { age: "Under 65", min: "4%" },
  { age: "65–74", min: "5%" },
  { age: "75–79", min: "6%" },
  { age: "80–84", min: "7%" },
  { age: "85–89", min: "9%" },
  { age: "90–94", min: "11%" },
  { age: "95+", min: "14%" },
];

const BUCKET_STRATEGY = [
  {
    bucket: "Bucket 1",
    timeframe: "0–2 years",
    assets: "Cash / term deposits",
    amount: "$80K–$120K",
    purpose: "Immediate living expenses — not subject to market movements",
    bg: "bg-blue-50",
    border: "border-blue-200",
    label: "text-blue-700",
  },
  {
    bucket: "Bucket 2",
    timeframe: "2–10 years",
    assets: "Bonds, diversified income funds",
    amount: "3–8 years of expenses",
    purpose: "Medium-term income buffer — refills Bucket 1 annually",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "text-amber-700",
  },
  {
    bucket: "Bucket 3",
    timeframe: "10+ years",
    assets: "Growth assets — shares, property",
    amount: "Remainder of portfolio",
    purpose: "Long-term growth engine — replenishes Bucket 2 in good years",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "text-emerald-700",
  },
];

const TAX_STRATEGIES = [
  {
    strategy: "Tax-free super income from age 60",
    detail: "All super income payments and lump sums are tax-free once you are aged 60+ and have met a condition of release (retired, TTR, or age 65). No need to declare on your tax return.",
  },
  {
    strategy: "Low-rate threshold for non-super income",
    detail: "If you are not working, investment income from outside super (dividends, interest) up to $18,200 is tax-free. Above that, your marginal rate applies.",
  },
  {
    strategy: "Seniors and Pensioners Tax Offset (SAPTO)",
    detail: "Taxpayers eligible for the Age Pension receive SAPTO: $2,230 (single) or $1,602 each for a couple. Combined with the standard tax-free threshold this extends effective tax-free income to approximately $32,000 for a single senior.",
  },
  {
    strategy: "Franking credit refunds",
    detail: "Retirees with low taxable income can receive excess franking credits (30% company tax already paid) as a cash refund. This makes Australian dividend shares particularly tax-efficient for portfolios held outside super.",
  },
];

const FAQS = [
  {
    q: "What is the minimum I must draw from my super in retirement?",
    a: "Account-based pension holders must draw at least the age-based minimum percentage of their 1 July opening balance each year. The standard minimums are: under 65 (4%), 65–74 (5%), 75–79 (6%), 80–84 (7%), 85–89 (9%), 90–94 (11%), 95+ (14%). There is no maximum (except TTR pensions are capped at 10%). Failing to take the minimum can cause the pension to lose its concessional tax status for that year. COVID-era 50% reductions ended in 2023–24.",
  },
  {
    q: "How do I manage the risk of outliving my money?",
    a: "Longevity risk is the primary retirement planning challenge. Key strategies include: (1) keeping a diversified growth allocation in your portfolio so it continues compounding; (2) delaying large discretionary spending in the early years when the portfolio is most vulnerable to sequencing risk; (3) considering a lifetime annuity for a portion of your income to guarantee a floor regardless of how long you live; (4) modelling your Age Pension entitlement — as super depletes, the Age Pension typically increases, providing a natural longevity buffer; (5) working with a financial planner to run longevity scenarios to age 90+ or 95.",
  },
  {
    q: "Is an account-based pension better than an annuity for income?",
    a: "They serve different purposes. An account-based pension (ABP) retains investment upside, allows flexible drawdown, and can be left to beneficiaries — but the income varies with investment performance. A lifetime annuity provides a guaranteed income for life regardless of markets but is illiquid, inflexible, and you lose access to the capital. Many retirees use a combination: enough in a lifetime annuity to cover essential living costs (rent, food, utilities) with the ABP used for discretionary spending and growth. The optimal split depends on your other income sources, health, estate goals, and risk tolerance.",
  },
  {
    q: "How does the Age Pension interact with my super drawdown strategy?",
    a: "Super drawdown and the Age Pension interact through both the assets test and income test (deeming). As you draw down your super balance, your assessable assets fall, which may increase your Age Pension entitlement — partially replacing the income you lose from a smaller account balance. This creates a natural longevity buffer: the lower your super, the more Age Pension you receive. Centrelink strategies include spouse equalisation (splitting balances to optimise the joint assets test position) and preserving pre-2015 account-based pension grandfathering (which uses actual income rather than deeming rates).",
  },
  {
    q: "What is sequencing risk and how can I protect against it?",
    a: "Sequencing risk is the danger that poor investment returns early in retirement permanently impair your portfolio. A -30% market fall in year one when you have $1M and are drawing $50K/year leaves just $650K — requiring a 46% gain just to recover. The same crash in year 15 is far less damaging because your balance is smaller and fewer withdrawal years remain. Protections include: (1) the bucket strategy — holding 2 years of cash so you never sell growth assets during a crash; (2) variable drawdown — reducing withdrawals in bad market years; (3) delaying full pension commencement to preserve super while other income covers initial years; (4) maintaining a meaningful cash or short-duration bond buffer.",
  },
  {
    q: "When should I draw down super vs keep it invested?",
    a: "The general principle is to let super compound as long as possible (zero tax on earnings in pension phase), while using Age Pension and outside-super income first. However, a few factors complicate this: (1) super balances above the assets test threshold reduce your Age Pension dollar-for-dollar via the taper — drawing down super may increase your Age Pension entitlement; (2) if you die with large super balances, death benefits paid to non-dependants (e.g. adult children) can attract up to 17% tax on the taxable component; (3) minimum drawdown requirements force progressively larger withdrawals after 75. A retirement income projection prepared by a financial adviser will model the optimal drawdown order for your specific situation.",
  },
];

export default function RetirementIncomePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Retirement Income Strategy" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/retirement" className="hover:text-slate-900">Retirement</Link><span>/</span>
            <span className="text-slate-900 font-medium">Retirement Income Strategy</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Retirement income strategy: structuring your drawdown
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Turning a super balance into reliable lifetime income involves far more than simply
            withdrawing money. Sequencing risk, Centrelink optimisation, tax efficiency, and
            longevity planning all interact. This guide covers the key strategies Australian retirees
            use to make their money last.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* The retirement income challenge */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">The retirement income challenge</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Accumulation is simple: contribute, invest, and let compounding do the work. Decumulation —
            turning savings into income — is harder. A retiree at 65 today can expect to live 20–25
            more years on average; prudent planning targets 30+ years. That means balancing six
            competing forces at once.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              { label: "Spending rate", desc: "Draw too much and you erode capital; draw too little and you leave money unspent that could have funded a better retirement." },
              { label: "Investment risk", desc: "Growth assets are needed to sustain a long retirement, but volatility can permanently impair a portfolio via sequencing risk." },
              { label: "Tax efficiency", desc: "Super income is tax-free from age 60, but outside-super assets may attract marginal rates, franking considerations, and CGT." },
              { label: "Centrelink optimisation", desc: "Asset and income tests determine Age Pension entitlement. Drawdown strategy directly affects how much Age Pension you receive." },
              { label: "Longevity risk", desc: "The risk of outliving your money. At 65, there is a reasonable chance one member of a couple lives past 90." },
              { label: "Estate goals", desc: "Some retirees want to preserve capital for beneficiaries; others are comfortable drawing the portfolio to zero. The right strategy differs." },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4 bg-white">
                <p className="font-bold text-slate-900 text-sm mb-1">{item.label}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
            <p className="font-bold text-slate-900 mb-2">The 4% rule — and its Australian caveats</p>
            <p className="text-sm text-slate-700 leading-relaxed">
              The &quot;safe withdrawal rate&quot; research (Bengen, 1994) found that withdrawing 4% of your
              initial portfolio in year one, then adjusting for inflation annually, gave a high probability
              of surviving a 30-year retirement across US historical data. For Australian retirees: (1) the
              Age Pension provides a longevity buffer that US retirees lack, meaning the effective draw from
              super can be lower; (2) Australian market data suggests a slightly more conservative 3.5–4%
              starting rate is prudent; (3) minimum drawdown requirements (4–14% depending on age) can
              exceed 4% in later years regardless of market conditions.
            </p>
          </div>
        </div>
      </section>

      {/* Income sources */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Income sources — the layered approach</h2>
          <p className="text-sm text-slate-500 mb-5">Most retirees draw from several sources simultaneously. The mix determines your overall tax rate and Centrelink position.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Source</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Amount</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Tax treatment</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Reliability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {INCOME_SOURCES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-sm">{row.source}</td>
                    <td className="px-3 py-3 text-xs text-slate-700">{row.amount}</td>
                    <td className="px-3 py-3 text-xs text-emerald-700 font-semibold">{row.tax}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{row.reliability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Age Pension rate as at March 2026. Subject to annual indexation. Verify current rates at servicesaustralia.gov.au.</p>
        </div>
      </section>

      {/* ABP drawdown rules */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Account-based pension minimum drawdown rates</h2>
          <p className="text-sm text-slate-500 mb-5">
            Applied to your 1 July opening account balance each year. The minimums increase with age —
            designed to draw the account down progressively over retirement.
          </p>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Age</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Minimum % per year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {DRAWDOWN_TABLE.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.age}</td>
                      <td className="px-4 py-3 text-slate-700 font-mono">{row.min}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <p className="font-bold text-slate-900 text-sm mb-1">No maximum drawdown</p>
                <p className="text-xs text-slate-600 leading-relaxed">Standard account-based pensions have no upper limit on withdrawals (only the transfer balance cap limits what you can hold in pension phase). TTR pensions are capped at 10% per year.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <p className="font-bold text-slate-900 text-sm mb-1">Zero tax on earnings</p>
                <p className="text-xs text-slate-600 leading-relaxed">Once your super is in pension phase and you are aged 60+, all investment earnings (including capital gains) are tax-free. This is the most powerful tax concession available to Australian retirees.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <p className="font-bold text-slate-900 text-sm mb-1">COVID-era reductions have ended</p>
                <p className="text-xs text-slate-600 leading-relaxed">The temporary 50% minimum drawdown reduction (2019–20 to 2022–23) has ended. Standard rates apply from the 2023–24 financial year onwards.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sequencing risk */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Sequencing risk — why timing matters</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            A market crash early in retirement is far more damaging than one later. This is
            sequencing risk — the sequence of returns matters just as much as the average return.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="font-bold text-red-900 mb-2 text-sm">Crash in year 1 (worst case)</p>
              <ul className="text-xs text-red-800 space-y-1 leading-relaxed">
                <li>Starting balance: $1,000,000</li>
                <li>-30% market fall: $700,000</li>
                <li>$50K withdrawal: $650,000</li>
                <li>Needs 46% gain just to recover to $1M</li>
                <li>Future withdrawals compound the damage</li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-bold text-emerald-900 mb-2 text-sm">Same crash in year 15 (far less damaging)</p>
              <ul className="text-xs text-emerald-800 space-y-1 leading-relaxed">
                <li>Balance after 15 years of drawdown: smaller</li>
                <li>Fewer remaining withdrawal years</li>
                <li>Less capital at risk</li>
                <li>Recovery has fewer years of compounding to undo</li>
                <li>Portfolio survives with same probability</li>
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
            <p className="font-bold text-slate-900 mb-2 text-sm">Strategies to reduce sequencing risk</p>
            <ul className="text-xs text-slate-700 space-y-2 leading-relaxed">
              <li><strong>Cash/bond buffer:</strong> Hold 1–3 years of living expenses in cash so you never need to sell growth assets at depressed prices.</li>
              <li><strong>Variable drawdown:</strong> In bad market years, draw only the minimum; supplement from a cash buffer. In good years, restore the buffer.</li>
              <li><strong>Delay full pension commencement:</strong> If you can cover early retirement expenses from other sources (part-time work, savings outside super), deferring super drawdown reduces early-year exposure.</li>
              <li><strong>Gradual transition:</strong> Maintain some growth allocation throughout — the goal is to reduce sequencing exposure in years 1–5, not eliminate growth entirely.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Bucket strategy */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">The bucket strategy</h2>
          <p className="text-sm text-slate-500 mb-6">
            Popularised in Australia as a practical way to manage sequencing risk while keeping long-term
            growth invested. Mentally (and sometimes physically) divide your portfolio into three buckets.
          </p>
          <div className="space-y-4 mb-5">
            {BUCKET_STRATEGY.map((b, i) => (
              <div key={i} className={`rounded-xl border p-5 ${b.bg} ${b.border}`}>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className={`font-extrabold text-sm ${b.label}`}>{b.bucket}</span>
                  <span className="text-xs text-slate-500 font-semibold">{b.timeframe}</span>
                  <span className="text-xs text-slate-700 font-mono border border-slate-300 rounded px-2 py-0.5 bg-white">{b.assets}</span>
                  <span className={`text-xs font-bold ${b.label} ml-auto`}>{b.amount}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{b.purpose}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-white">
            <p className="font-bold text-slate-900 text-sm mb-1">How the buckets refill</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Each year, top up Bucket 1 from Bucket 2 to restore the 2-year cash buffer. In years
              when growth assets performed well, replenish Bucket 2 from Bucket 3. In bear market years,
              leave Bucket 3 untouched and draw from the buffer instead. This prevents forced selling at
              market lows — the core sequencing risk mitigation.
            </p>
          </div>
        </div>
      </section>

      {/* Centrelink optimisation */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Centrelink optimisation strategies</h2>
          <div className="space-y-4">
            {[
              {
                title: "Manage super balance relative to assets test thresholds",
                body: "Drawing down super reduces assessable assets under the assets test, potentially increasing Age Pension entitlement. The pension reduces at $3 per $1,000 of assets above the lower threshold. For a homeowner couple, the cut-off is around $1.04M — balances below this attract at least a part-pension.",
              },
              {
                title: "Spouse equalisation",
                body: "The assets test applies to a couple's combined assets, but each person's super is assessed separately for income test (deeming) purposes. Equalising super balances between spouses can improve the joint income test position, particularly when one partner has a much larger balance. Contributions splitting and re-contribution strategies are commonly used.",
              },
              {
                title: "Lifetime annuity income test treatment",
                body: "A complying lifetime annuity has special income test rules: the purchase price is deducted and spread over your life expectancy, reducing the assessed income. In some situations this produces a more favourable Centrelink outcome than an account-based pension of the same value, particularly for larger balances where deeming produces high assessed income.",
              },
              {
                title: "Preserve pre-2015 account-based pension grandfathering",
                body: "Account-based pensions started before 1 January 2015 and continuously held since are assessed under the old income test (actual income received, not deemed). This grandfathered treatment can be significantly better for retirees drawing the minimum — do not close or rollover a pre-2015 ABP without understanding what you will lose.",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-5 bg-white">
                <p className="font-bold text-slate-900 mb-1 text-sm">{item.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tax strategies */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Tax strategies in retirement</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TAX_STRATEGIES.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-5 bg-white">
                <p className="font-bold text-slate-900 mb-2 text-sm">{item.strategy}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key callout */}
      <section className="py-8 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <span className="text-2xl shrink-0" aria-hidden>💡</span>
            <div>
              <p className="font-bold text-slate-900 mb-1">The two risks most retirees underestimate</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Almost everyone fears running out of money in retirement. But research consistently shows
                that retirees also significantly underestimate the <em>other</em> risk: dying with excess
                and having underspent in their healthy years. A well-structured retirement income plan
                addresses both — using longevity protection (Age Pension, annuities) to guard against
                running out, while giving permission to spend confidently in the earlier, more active years
                of retirement when spending capacity is highest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/retirement/pension-phase", label: "Account-based pension" },
              { href: "/retirement/how-much-do-you-need", label: "How much do I need?" },
              { href: "/retirement/age-pension", label: "Age Pension guide" },
              { href: "/retirement/annuities", label: "Annuities for income" },
              { href: "/retirement/deeming-rates", label: "Deeming rates explained" },
              { href: "/retirement", label: "Retirement hub" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Age Pension rates, assets test thresholds, deeming rates, and super minimum drawdown rules change regularly — verify current figures at ato.gov.au and servicesaustralia.gov.au. This page is general information only; it is not financial advice. Retirement income strategies depend heavily on individual circumstances. Consult a licensed financial adviser for personalised retirement income modelling.
          </p>
        </div>
      </section>
    </div>
  );
}
