import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `How Much Super Do You Need to Retire in Australia? (${CURRENT_YEAR} Guide) | invest.com.au`,
  description: `ASFA Retirement Standard June 2025, the 4% rule, Age Pension interaction, super benchmarks by age, and three worked examples. Calculate your retirement number. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `How Much Super Do You Need to Retire? (${CURRENT_YEAR})`,
    description:
      "ASFA benchmarks, the 4% rule, Age Pension supplement, super by age, and three worked examples for Australian retirees.",
    url: absoluteUrl("/retirement/how-much-do-you-need"),
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("How Much Super to Retire?")}&sub=${encodeURIComponent("ASFA · 4% Rule · Age Pension · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: absoluteUrl("/retirement/how-much-do-you-need") },
};

/* ─── Data constants ────────────────────────────────────────────────────────── */

const ASFA_BENCHMARKS = [
  {
    lifestyle: "Modest — single",
    annual: "$33,134",
    super: "~$100K (Age Pension covers most)",
    notes: "Basic activities; annual domestic holiday; older car; limited eating out",
  },
  {
    lifestyle: "Modest — couple",
    annual: "$44,818",
    super: "~$100K (Age Pension covers most)",
    notes: "Similar to modest single but with joint household economies",
  },
  {
    lifestyle: "Comfortable — single",
    annual: "$51,278",
    super: "~$595,000",
    notes: "Private health; annual overseas trip; renovations; newer car; eating out regularly",
  },
  {
    lifestyle: "Comfortable — couple",
    annual: "$72,148",
    super: "~$690,000",
    notes: "Overseas travel; leisure; eating out; private health; home maintenance",
  },
];

const WITHDRAWAL_EXAMPLES = [
  { balance: "$1,000,000", at4pct: "$40,000/yr", at5pct: "$50,000/yr", note: "Modest comfortable for a couple" },
  { balance: "$1,500,000", at4pct: "$60,000/yr", at5pct: "$75,000/yr", note: "Comfortable single or modest couple" },
  { balance: "$2,000,000", at4pct: "$80,000/yr", at5pct: "$100,000/yr", note: "Comfortable couple with significant travel" },
  { balance: "$2,500,000", at4pct: "$100,000/yr", at5pct: "$125,000/yr", note: "High lifestyle — travel, luxury, gifting" },
];

const KEY_VARIABLES = [
  {
    variable: "Retirement age",
    impact: "High",
    detail:
      "Retiring at 55 vs 67 creates a 12-year gap requiring an extra ~$720K in spending power (at $60K/yr). Earlier retirement means more years of drawdown, less super accumulated, and no Age Pension access until 67.",
  },
  {
    variable: "Life expectancy",
    impact: "High",
    detail:
      "Plan to age 90 as a minimum. At 65, a healthy non-smoker has a 25% chance of living past 92 (male) or 95 (female). Running out of money at 88 is a bad outcome — model to 95 to be safe.",
  },
  {
    variable: "Homeowner status",
    impact: "High",
    detail:
      "All ASFA benchmarks assume home ownership. Renters need an extra $15,000–$25,000/yr for housing costs, and potentially an extra $300K–$500K in super to fund it. Renters also face a stricter assets test free area ($268,500 vs $301,750 for homeowners in 2025–26).",
  },
  {
    variable: "Desired lifestyle",
    impact: "High",
    detail:
      "Overseas travel adds $10,000–$30,000/yr. A boat, caravan, or beach house adds significant capital and running costs. Your actual number may be 30–50% above or below ASFA benchmarks depending on lifestyle choices.",
  },
  {
    variable: "Healthcare costs",
    impact: "Medium-High",
    detail:
      "Out-of-pocket medical costs accelerate after 75. Hearing aids, dental, specialists, in-home care, and eventual aged care are underestimated by most retirees. Grattan Institute data suggests retirees underestimate lifetime health costs by $50,000–$100,000+.",
  },
  {
    variable: "Investment returns",
    impact: "Medium",
    detail:
      "The difference between 5% and 7% nominal returns on a $700K balance over 20 years is more than $1M. Asset allocation in the transition-to-retirement phase significantly affects outcomes. Don't park everything in cash at 60.",
  },
];

const SUPER_GROWTH_TABLE = [
  { age: 30, balance: "$60,000", at67: "$756,000", note: "37 years of compounding at 7% nominal" },
  { age: 35, balance: "$100,000", at67: "$841,000", note: "32 years of compounding at 7% nominal" },
  { age: 40, balance: "$150,000", at67: "$750,000", note: "27 years of compounding at 7% nominal" },
  { age: 45, balance: "$220,000", at67: "$591,000", note: "22 years of compounding at 7% nominal" },
  { age: 50, balance: "$300,000", at67: "$484,000", note: "17 years of compounding at 7% nominal" },
];

const BENCHMARKS_BY_AGE = [
  { age: "30", target: "$60,000+", status: "foundation", note: "SG contributions building; compounding does most work from here" },
  { age: "40", target: "$150,000+", status: "on-track", note: "On track for comfortable retirement with ongoing contributions" },
  { age: "50", target: "$300,000+", status: "mid", note: "Catch-up contributions viable; 15 years of accumulation remain" },
  { age: "55", target: "$450,000+", status: "late", note: "Approaching preservation age (60); review strategy now" },
  { age: "60", target: "$500,000+", status: "final", note: "Super now accessible; transition-to-retirement planning critical" },
  { age: "67", target: "$595K (single) / $690K (couple)+", status: "retire", note: "ASFA comfortable benchmark at retirement age" },
];

const CATCHUP_OPTIONS = [
  {
    option: "Concessional catch-up contributions",
    detail:
      "If your super balance is under $500,000, you can carry forward unused concessional (before-tax) contribution cap amounts for up to 5 years and contribute more in a later year. The annual concessional cap is $30,000 (2025–26).",
    impact: "Up to $150,000 extra over 5 years",
  },
  {
    option: "Salary sacrifice",
    detail:
      "Diverting pre-tax salary into super is taxed at 15% vs your marginal rate (potentially 32.5%+). On a $120,000 salary, sacrificing $20,000/yr saves ~$3,500 in tax while fast-tracking your super by $17,000/yr after tax.",
    impact: "Significant: both boosts super and reduces tax",
  },
  {
    option: "Lifestyle adjustment",
    detail:
      "Reducing annual spending by $10,000 and redirecting to super adds $150,000–$200,000 to retirement savings over 15 years including compound growth. Small, consistent changes compound dramatically.",
    impact: "$150,000–$200,000 over 15 years",
  },
  {
    option: "Delay retirement by 2–3 years",
    detail:
      "Retiring at 69 instead of 67 adds 2 more years of contributions, 2 fewer years of drawdown, and 2 extra years of compound growth. This can add $100,000–$200,000 to your retirement balance while reducing total drawdown years.",
    impact: "High: adds capital and reduces drawdown years",
  },
  {
    option: "Part-time bridge employment",
    detail:
      "Working part-time (even 2–3 days/week) from 60–65 lets you delay touching super while covering living expenses. Work Bonus rules allow pensioners to earn up to $300/fortnight without Age Pension reduction. Earnings also count for SG contributions.",
    impact: "Significant: delays drawdown by 3–5 years",
  },
];

const FAQS = [
  {
    q: "What is the ASFA Retirement Standard?",
    a: "The Association of Superannuation Funds of Australia (ASFA) publishes quarterly retirement expenditure benchmarks. The June 2025 figures are: comfortable couple $72,148/yr needing ~$690,000 in super; comfortable single $51,278/yr needing ~$595,000; modest couple $44,818/yr; modest single $33,134/yr. These benchmarks assume you own your home outright and are aged 67. They are a useful starting point — your actual number may be higher (overseas travel, high medical costs, renting) or lower (frugal lifestyle, downsizer).",
  },
  {
    q: "Does the 4% rule work for Australians?",
    a: "The 4% rule (Bengen rule, 1994) says you can withdraw 4% of your portfolio in year one and adjust for inflation with a low risk of running out over 30 years. For Australians: (1) The Age Pension reduces the amount you need to draw from super, making 4% more conservative than it sounds. (2) Australian minimum drawdown requirements (4–14% depending on age) roughly align. (3) Vanguard's research suggests 5% may be sustainable when Age Pension is accounted for. Use 4% as a conservative floor and 5% as an optimistic ceiling, with your actual drawdown guided by a financial planner's modelling.",
  },
  {
    q: "How much does the Age Pension reduce the super I need?",
    a: "Significantly. The full Age Pension is worth $29,754/yr (single) or $44,855/yr (couple combined, 2025–26). Even a part-pension of $15,000/yr reduces the super you need by $375,000 under the 4% rule (because you no longer need $15,000/yr from super). A homeowner couple with $600,000 in super would receive approximately $10,000–$15,000/yr in part-pension even after the assets test taper — reducing their effective required drawdown rate to around 3% of the ASFA comfortable benchmark.",
  },
  {
    q: "What is the spending smile curve in retirement?",
    a: "Research by David Blanchett (Morningstar) found that retirement spending doesn't follow a straight line. Early retirement (65–74) tends to be the most expensive: travel, home renovation, new hobbies, helping adult children. Spending then dips in the 'go-slow' years (75–84) as activity reduces. It rises again in later life (85+) as healthcare and aged care costs increase. This 'smile curve' means front-loading spending capacity into your 60s and early 70s is rational — but you still need reserves for the healthcare phase.",
  },
  {
    q: "What's different for couples vs singles?",
    a: "Couples have higher combined costs but benefit from economies of scale — a comfortable couple ($72,148/yr) doesn't cost twice a comfortable single ($51,278/yr). The super needed reflects this: couples need $690,000 vs $595,000 for a single despite higher annual spend. Couples also have a larger Age Pension assets test free area, can split contributions for tax efficiency, and have the buffer of two sets of super balances. The main risk for couples is the financial impact when one partner dies — a surviving partner loses one Age Pension and may face significantly increased costs.",
  },
  {
    q: "What if I want to retire early — before 60?",
    a: "Super is not accessible until age 60 (preservation age). If you retire at 55, you need 5+ years of income from outside super (shares, property, savings) before you can access your super, plus another 7 years before you're eligible for the Age Pension at 67. FIRE (Financial Independence, Retire Early) aspirants targeting age 55 typically need $1.5M–$2.5M in total assets depending on lifestyle, with a meaningful portion held outside super for the years before preservation age. The 4% rule needs extending to a 35–40 year horizon if retiring at 55.",
  },
];

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function HowMuchRetirementPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "How Much Do You Need to Retire?" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      {/* ── Hero ── */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/retirement" className="hover:text-slate-900">Retirement</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">How Much Do You Need?</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            How much super do you need to retire in Australia?
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-4">
            ASFA comfortable benchmarks, the 4% safe withdrawal rate, how the Age Pension reduces the
            super you need, and three worked examples. Most Australians need less than they think —
            once the Age Pension is modelled correctly.
          </p>
          {/* Key stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Comfortable couple", value: "$690K", sub: "ASFA Jun 2025" },
              { label: "Comfortable single", value: "$595K", sub: "ASFA Jun 2025" },
              { label: "4% rule: $1.5M →", value: "$60K/yr", sub: "Before Age Pension" },
              { label: "Age Pension (couple)", value: "$44,855", sub: "Full rate, 2025–26" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                <p className="text-xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* ── ASFA Benchmarks ── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            ASFA Retirement Standard (June 2025)
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Updated quarterly. Assumes home owned outright at retirement age 67. Renters need substantially
            more — add $300,000–$500,000 to cover housing costs.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
            <table className="w-full text-sm" aria-label="ASFA Retirement Standard benchmarks by lifestyle">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Lifestyle</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Annual spend</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Super needed</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">What it covers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ASFA_BENCHMARKS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.lifestyle}</td>
                    <td className="px-3 py-3 text-amber-700 font-bold">{row.annual}</td>
                    <td className="px-3 py-3 text-slate-700">{row.super}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            ASFA benchmarks updated quarterly at asfa.asn.au. The &quot;super needed&quot; figures assume
            homeownership and partial Age Pension access where applicable. Verify latest figures directly.
          </p>
        </div>
      </section>

      {/* ── 4% Rule ── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            The 4% safe withdrawal rate — and why Australians can often do better
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            The 4% rule (William Bengen, 1994) says: withdraw 4% of your portfolio in year one, then
            adjust for inflation each year. Over 30 years of US market data, portfolios rarely ran dry.
            For Australians, this is often a <em>conservative</em> floor — because the Age Pension
            reduces how much you need to pull from super.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-5">
            <table className="w-full text-sm" aria-label="Safe withdrawal rate examples by starting super balance">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Starting balance</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">At 4% (conservative)</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">At 5% (with Age Pension)</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {WITHDRAWAL_EXAMPLES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{row.balance}</td>
                    <td className="px-3 py-3 text-emerald-700 font-semibold">{row.at4pct}</td>
                    <td className="px-3 py-3 text-blue-700 font-semibold">{row.at5pct}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-bold text-slate-900 mb-2 text-sm">Why 5% may be sustainable for Australians</p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Vanguard research on Australian retirees found that once Age Pension payments are modelled
              into the drawdown plan, a 5% initial withdrawal rate from super is sustainable for most
              retirees — because the Age Pension naturally increases as super depletes. A homeowner couple
              with $690,000 in super drawing 5% ($34,500/yr) plus receiving even a partial Age Pension
              of $15,000/yr achieves the ASFA comfortable standard. As super falls over time, Age Pension
              entitlement rises — creating a natural longevity buffer that US-centric models ignore.
            </p>
          </div>
        </div>
      </section>

      {/* ── Age Pension Supplement ── */}
      <section className="py-10 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            The Age Pension: Australia&apos;s built-in retirement buffer
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed mb-5">
            The Age Pension is available from age 67 and is subject to assets and income tests. Even
            a <em>partial</em> pension dramatically changes the equation — because every dollar of Age
            Pension is a dollar you don&apos;t need to pull from your super.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            {[
              {
                balance: "~$300K (couple)",
                pension: "Near full pension",
                value: "~$44,855/yr",
                note: "Almost all ASFA modest couple covered by Age Pension alone",
              },
              {
                balance: "~$500K (couple)",
                pension: "Substantial part-pension",
                value: "~$20,000–$35,000/yr",
                note: "Super only needs to top up $10,000–$25,000/yr to ASFA comfortable",
              },
              {
                balance: "~$690K (couple)",
                pension: "Small part-pension",
                value: "~$5,000–$15,000/yr",
                note: "Still worth modelling — reduces effective drawdown rate below 4%",
              },
            ].map((row, i) => (
              <div key={i} className="rounded-xl border border-amber-200 bg-white p-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Super balance</p>
                <p className="text-base font-extrabold text-slate-900 mb-1">{row.balance}</p>
                <p className="text-sm font-semibold text-slate-700 mb-0.5">{row.pension}</p>
                <p className="text-sm font-bold text-emerald-700 mb-2">{row.value}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{row.note}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-300 bg-amber-100 p-4">
            <p className="text-sm text-slate-800 leading-relaxed">
              <strong>Key insight:</strong> The assets test taper rate is $3 per $1,000 of assets above
              the threshold. For a homeowner couple, the lower threshold in 2025–26 is $470,000. At
              $690,000 in assets, the taper reduces pension by $660/fortnight — but they still receive
              around $550/fortnight ($14,300/yr). This isn&apos;t something to &quot;optimise away&quot; by
              spending down super before retirement; it&apos;s a floor that protects longevity.
            </p>
          </div>
        </div>
      </section>

      {/* ── Spending Smile ── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            The retirement spending smile: plan for three phases
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Retirement spending isn&apos;t a flat line. Research by David Blanchett (Morningstar) found that
            real spending follows a &quot;smile&quot; — higher early, lower in the middle years, then rising
            again with healthcare costs.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
                Phase 1: Go-Go (65–74)
              </p>
              <p className="text-sm font-bold text-slate-900 mb-2">Spending: HIGH</p>
              <ul className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                <li>Overseas and domestic travel while healthy and mobile</li>
                <li>Home renovations; new car; leisure activities</li>
                <li>Helping adult children with deposits, weddings</li>
                <li>Hobbies, dining out, sport, entertainment</li>
                <li>Often 10–20% above ASFA benchmark</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Phase 2: Slow-Go (75–84)
              </p>
              <p className="text-sm font-bold text-slate-900 mb-2">Spending: LOWER</p>
              <ul className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                <li>Activity levels reduce naturally</li>
                <li>Less travel; more local experiences</li>
                <li>Major purchases mostly complete</li>
                <li>Age Pension typically increasing as super depletes</li>
                <li>Often 5–15% below ASFA benchmark in real terms</li>
              </ul>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
                Phase 3: No-Go (85+)
              </p>
              <p className="text-sm font-bold text-slate-900 mb-2">Spending: RISING</p>
              <ul className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                <li>Healthcare costs escalate: specialists, dental, hearing</li>
                <li>In-home care or aged care facility costs</li>
                <li>Medication; mobility aids; home modifications</li>
                <li>Aged care co-contributions can exceed $50,000/yr</li>
                <li>This phase is the key longevity planning risk</li>
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-5 bg-white">
            <p className="font-bold text-slate-900 mb-2 text-sm">
              Practical implication: don&apos;t wait to spend
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              The spending smile means front-loading discretionary spending in your 60s and early 70s is
              rational, not reckless. The traveller at 67 who waits until 80 to spend often finds health
              prevents it. Balancing early enjoyment against healthcare reserves in later life is the art
              of retirement planning — a good adviser builds both into the model.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Variables ── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Key variables that change your retirement number
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            ASFA benchmarks are averages. Your personal number depends on these factors.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm" aria-label="Key variables that affect how much retirement savings you need">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Variable</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Impact</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Why it matters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {KEY_VARIABLES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 align-top">{row.variable}</td>
                    <td className="px-3 py-3 align-top">
                      <span
                        className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                          row.impact === "High"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {row.impact}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed align-top">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Super Growth Projection ── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            The super shortfall calculator: what you&apos;ll have at 67
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            If you stopped contributing today and just let compounding run at 7% nominal, here&apos;s what
            your current balance would grow to at age 67. Add ongoing SG contributions and salary
            sacrifice to get your real projected balance.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
            <table className="w-full text-sm" aria-label="Superannuation balance projection to age 67 by current age">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Age now</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Benchmark balance today</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">At age 67 (compounding only)</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {SUPER_GROWTH_TABLE.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{row.age}</td>
                    <td className="px-3 py-3 text-slate-700 font-semibold">{row.balance}</td>
                    <td className="px-3 py-3 text-emerald-700 font-bold">{row.at67}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 leading-relaxed">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            Assumes 7% nominal annual return on existing balance only; no further contributions modelled.
            Super Guarantee contributions (11.5% in 2025–26, rising to 12%) will add significantly to
            these projections. Use the{" "}
            <Link href="/retirement-calculator" className="text-amber-700 hover:underline font-semibold">
              retirement calculator
            </Link>{" "}
            for a full projection including contributions.
          </p>
        </div>
      </section>

      {/* ── The Enough Framework ── */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            The &quot;enough&quot; framework: four steps to your number
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Rather than anchoring to a single benchmark, work through these four steps to arrive at
            a personalised retirement figure.
          </p>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Estimate your annual retirement spend",
                body: "Start with your current after-tax income and remove work-related costs (commuting, work wardrobe, lunches). Add back planned retirement spending (travel, hobbies, dining). ASFA benchmarks are a starting point, but track your actual spending for 3 months first. Most pre-retirees find their real number is 10–20% different from ASFA in either direction.",
                color: "bg-blue-50 border-blue-200",
              },
              {
                step: "2",
                title: "Subtract your likely Age Pension",
                body: "Use the Services Australia retirement estimator (servicesaustralia.gov.au) or ask a financial planner to model your entitlement at different asset levels. Even $10,000–$15,000/yr in part-pension is $250,000–$375,000 in equivalent super capital under the 4% rule. Do not ignore this.",
                color: "bg-emerald-50 border-emerald-200",
              },
              {
                step: "3",
                title: "Apply the 4–5% withdrawal rate",
                body: "Divide your net annual income requirement (after Age Pension) by 0.04 for a conservative figure, or 0.05 if you are comfortable relying on Age Pension supplementing over time. Example: need $60,000/yr, expect $15,000 Age Pension → net need $45,000/yr ÷ 0.04 = $1,125,000. At 5%: $45,000 ÷ 0.05 = $900,000.",
                color: "bg-amber-50 border-amber-200",
              },
              {
                step: "4",
                title: "Account for access timing (super is locked until 60)",
                body: "If you plan to retire before 60, you cannot access super — you need other assets to bridge the gap. Calculate the number of pre-60 years and multiply by annual spend for the minimum outside-super bridge fund. From 60–67, super is accessible but Age Pension is not — factor in a higher drawdown rate for these 7 years.",
                color: "bg-purple-50 border-purple-200",
              },
            ].map((item) => (
              <div key={item.step} className={`rounded-xl border p-5 ${item.color}`}>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-1">{item.title}</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Super Benchmarks by Age ── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Super balance benchmarks by age
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            These are rough ballparks for an individual targeting a comfortable retirement. ATO data
            shows median super balances are typically well below these targets — which is why catch-up
            contributions and employer SG are important.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENCHMARKS_BY_AGE.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Age {item.age}</p>
                <p className="text-lg font-extrabold text-slate-900 mb-1">{item.target}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.note}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Benchmarks are indicative for a single individual targeting ASFA comfortable retirement.
            Couples should assess combined balances. ATO average super balances at 2023: age 35 ($42K),
            age 45 ($130K), age 55 ($220K) — well below these targets, which is why active saving matters.
          </p>
        </div>
      </section>

      {/* ── Worked Examples ── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Three worked examples
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            All examples are illustrative only. Individual circumstances, tax, and Centrelink rules vary.
          </p>
          <div className="space-y-5">

            {/* Example 1 */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="font-extrabold text-emerald-800 text-base">Example 1</span>
                <span className="text-sm text-slate-700 font-semibold">— James &amp; Priya, 42 years old, on track</span>
                <span className="ml-auto text-xs font-bold bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded-full">On track</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-3">
                <div className="space-y-1 text-xs text-slate-700">
                  <p><strong>Combined super today:</strong> $320,000</p>
                  <p><strong>Combined income:</strong> $200,000/yr</p>
                  <p><strong>Target retirement age:</strong> 67</p>
                  <p><strong>Lifestyle goal:</strong> ASFA comfortable couple</p>
                  <p><strong>Homeowners:</strong> Yes</p>
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  <p><strong>SG contributions (11.5%):</strong> ~$23,000/yr combined</p>
                  <p><strong>Projected at 67 (7% nominal):</strong> ~$1.85M</p>
                  <p><strong>ASFA comfortable target:</strong> $690,000</p>
                  <p><strong>Expected part-pension:</strong> Minimal (high assets)</p>
                  <p><strong>Verdict:</strong> Significantly ahead of minimum benchmark</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed border-t border-emerald-200 pt-3">
                With $1.85M projected and the ASFA comfortable benchmark at $690K, James and Priya are well
                ahead. At 4% drawdown they have $74,000/yr — more than the $72,148 comfortable couple
                benchmark. Key risks: divorce, job loss, high inflation, or caring for parents. A financial
                planner review at 55 would be worthwhile to optimise the final push.
              </p>
            </div>

            {/* Example 2 */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="font-extrabold text-amber-800 text-base">Example 2</span>
                <span className="text-sm text-slate-700 font-semibold">— Sandra, 52, single, behind target</span>
                <span className="ml-auto text-xs font-bold bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full">Action needed</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-3">
                <div className="space-y-1 text-xs text-slate-700">
                  <p><strong>Super today:</strong> $180,000</p>
                  <p><strong>Income:</strong> $90,000/yr</p>
                  <p><strong>Target retirement age:</strong> 67</p>
                  <p><strong>Lifestyle goal:</strong> ASFA comfortable single</p>
                  <p><strong>Homeowner:</strong> Yes</p>
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  <p><strong>SG contributions (11.5%):</strong> ~$10,350/yr</p>
                  <p><strong>Projected at 67 (contributions + growth):</strong> ~$530,000</p>
                  <p><strong>ASFA comfortable target:</strong> $595,000</p>
                  <p><strong>Expected part-pension:</strong> ~$10,000–$15,000/yr</p>
                  <p><strong>Verdict:</strong> Shortfall of ~$65,000; bridgeable with action</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed border-t border-amber-200 pt-3">
                Sandra is $65,000 short of the ASFA comfortable target, but the gap is manageable. Options:
                (1) salary sacrifice $10,000/yr for 15 years adds ~$285,000 at 7% — more than bridging the
                gap; (2) rely on the part-pension ($10,000–$15,000/yr) reducing her drawdown need from
                $51,278 to ~$37,000/yr, which a $530K balance at 7% ($37,100 = $530K × 7%) actually funds
                indefinitely; (3) retire at 68 instead of 67 for one more year of compounding. Seek advice now
                to lock in a salary sacrifice strategy.
              </p>
            </div>

            {/* Example 3 */}
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="font-extrabold text-purple-800 text-base">Example 3</span>
                <span className="text-sm text-slate-700 font-semibold">— Wei, 35, FIRE aspirant, targeting age 55</span>
                <span className="ml-auto text-xs font-bold bg-purple-200 text-purple-800 px-2.5 py-1 rounded-full">Early retirement</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-3">
                <div className="space-y-1 text-xs text-slate-700">
                  <p><strong>Super today:</strong> $95,000</p>
                  <p><strong>Shares / ETFs (outside super):</strong> $150,000</p>
                  <p><strong>Income:</strong> $140,000/yr</p>
                  <p><strong>Target retirement age:</strong> 55</p>
                  <p><strong>Lifestyle goal:</strong> $60,000/yr real spending</p>
                  <p><strong>Homeowner:</strong> No (renting)</p>
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  <p><strong>Total assets target (4% rule):</strong> $1,500,000</p>
                  <p><strong>Super locked until age 60:</strong> 5-year bridge needed</p>
                  <p><strong>5-year bridge needed (outside super):</strong> $300,000+</p>
                  <p><strong>No Age Pension until 67:</strong> 12-year gap</p>
                  <p><strong>Verdict:</strong> Achievable by 55 with high savings rate and 20 years</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed border-t border-purple-200 pt-3">
                Wei&apos;s FIRE plan requires $1.5M total by 55, of which at least $300,000 must be outside
                super for the 5-year bridge before preservation age. Between 55–60 he draws from shares/ETFs
                at 4% ($6,000/yr from $150K — not enough alone) so he needs to build the outside-super pool
                significantly. From 60–67 he can access super. From 67, a small Age Pension may supplement
                income even if assets remain substantial (depends on balance at that point). The critical risk
                is healthcare cost inflation over a 40-year retirement horizon — Wei&apos;s plan should budget
                for a medical contingency reserve of at least $150,000.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What to do if behind ── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            What to do if you&apos;re behind
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            The majority of Australians are below the super benchmarks for their age. Here are the most
            effective levers — ranked by typical impact.
          </p>
          <div className="space-y-3">
            {CATCHUP_OPTIONS.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <p className="font-bold text-slate-900">{item.option}</p>
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full shrink-0">
                    {item.impact}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Couples vs Singles ── */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Couples vs singles: the retirement capital difference
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-extrabold text-slate-900 mb-3">Couples</p>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li><strong>Combined ASFA comfortable:</strong> $72,148/yr (less than 2× single)</li>
                <li><strong>Economies of scale:</strong> Housing, utilities, insurance, and food costs are shared — a couple&apos;s joint spend is ~40% more than a single, not 100% more</li>
                <li><strong>Super target:</strong> ~$690,000 combined (ASFA), but both partners should contribute to ensure balance equity</li>
                <li><strong>Age Pension:</strong> Higher combined entitlement ($44,855/yr full rate); larger assets test free area</li>
                <li><strong>Key risk:</strong> Loss of a partner — surviving partner loses one Age Pension, faces higher per-person costs</li>
                <li><strong>Contribution split:</strong> Equalise balances via contributions splitting to optimise assets test and estate</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-extrabold text-slate-900 mb-3">Singles</p>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li><strong>ASFA comfortable:</strong> $51,278/yr — lower than couple but per-person higher due to no economies</li>
                <li><strong>No cost-sharing:</strong> Housing, utilities, and insurance fall entirely on one income — requiring a higher retirement capital per person than in a couple</li>
                <li><strong>Super target:</strong> ~$595,000 (ASFA) — but this is the gross target; the Age Pension supplement reduces drawdown needs</li>
                <li><strong>Age Pension:</strong> $29,754/yr full rate (single) — a significant buffer that reduces super drawdown required</li>
                <li><strong>Key risk:</strong> Renting — if no home ownership, the required super balloons to $900K–$1.1M to cover rent</li>
                <li><strong>Buffer importance:</strong> No partner as safety net means emergency reserves are more critical</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related guides ── */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/retirement/age-pension", label: "Age Pension guide" },
              { href: "/retirement/retirement-income", label: "Retirement income strategy" },
              { href: "/retirement/pension-phase", label: "Account-based pension" },
              { href: "/retirement/deeming-rates", label: "Deeming rates explained" },
              { href: "/retirement/annuities", label: "Annuities for income" },
              { href: "/retirement-calculator", label: "Retirement calculator" },
              { href: "/super", label: "Super hub" },
              { href: "/retirement", label: "Retirement hub" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance footer ── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} ASFA benchmarks, Age Pension
            rates, assets test thresholds, deeming rates, concessional contribution caps, and super access
            rules change regularly — always verify current figures at asfa.asn.au, ato.gov.au, and
            servicesaustralia.gov.au. Worked examples are illustrative only and do not reflect individual
            circumstances. This page is general information; it is not financial, tax, or legal advice.
            Your retirement number depends on your specific circumstances, goals, health, family obligations,
            and tax situation. Consult a licensed financial adviser for a personalised retirement projection.
          </p>
        </div>
      </section>
    </div>
  );
}
