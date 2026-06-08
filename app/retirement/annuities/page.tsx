import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Annuities in Australia — Lifetime, Term & How They Work (${CURRENT_YEAR}) | invest.com.au`,
  description: `Australian annuities: guaranteed income, Age Pension interaction, ABP vs annuity comparison, and when partial annuitisation makes sense. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Annuities in Australia (${CURRENT_YEAR}) — Guaranteed Income Explained`,
    description: "Lifetime vs term annuities: how they work, Age Pension assets test treatment, Challenger pricing, ABP comparison, taxation, and partial annuitisation.",
    url: `${SITE_URL}/retirement/annuities`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Annuities in Australia")}&sub=${encodeURIComponent("Lifetime · Term · Age Pension · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/retirement/annuities` },
};

const ANNUITY_TYPES = [
  {
    type: "Lifetime annuity",
    providers: "Challenger, Allianz",
    keyFeatures:
      "Guaranteed income payments for the rest of your life, regardless of how long you live. Can include a reversionary pension for a surviving spouse and optional capital protection periods.",
    risks:
      "Inflation risk if not CPI-indexed; irrevocable once purchased — you lose access to the lump sum; insurer solvency risk (APRA-regulated and generally low).",
    centrelink:
      "Complying lifetime income streams: only 60% of the purchase price is assessed as an asset for the first 5 years (then 30%), and 60% of gross income is assessed — more favourable than an ABP.",
  },
  {
    type: "Fixed-term annuity",
    providers: "Challenger, Allianz",
    keyFeatures:
      "Guaranteed income for a chosen term of 1–25 years. Capital is typically returned (or a residual value paid) at the end of the term. Useful for bridging a specific gap (e.g. to Age Pension age).",
    risks:
      "If you outlive the term the income stops; fixed income erodes in real terms without indexation; early withdrawal penalties usually apply.",
    centrelink:
      "Partially exempt: purchase price minus an annual deductible amount is assessed as an asset, reducing progressively over the term as each payment is received.",
  },
  {
    type: "Variable annuity",
    providers: "Limited in Australia",
    keyFeatures:
      "Income payments linked to underlying investment performance. Not widely available in Australia; a small number of products with guaranteed minimum withdrawal benefits (GMWBs) have existed but taken up has been modest.",
    risks:
      "Income is not guaranteed — can fall in bad markets; often carry complex fee structures; product availability is limited and has contracted since 2010.",
    centrelink:
      "Treatment varies by product; check with Services Australia. Generally treated closer to an account-based pension than a lifetime income stream.",
  },
  {
    type: "CPI-indexed annuity",
    providers: "Challenger, Allianz",
    keyFeatures:
      "A lifetime or term annuity where payments rise each year in line with CPI inflation. Preserves the purchasing power of your income over a long retirement. The initial payment rate is lower to fund future increases.",
    risks:
      "Lower starting income compared with a non-indexed annuity of the same size; if inflation is low or negative the indexation benefit is limited; still irrevocable.",
    centrelink:
      "Same 60%/30% complying lifetime income stream treatment as a non-indexed lifetime annuity; indexed income payments gradually increase the income test amount each year.",
  },
];

const ABP_VS_ANNUITY = [
  {
    dimension: "Income certainty",
    abp: "No guarantee — depends on investment returns and balance remaining",
    annuity: "Guaranteed for life (or fixed term) regardless of markets",
  },
  {
    dimension: "Flexibility",
    abp: "Draw any amount above the minimum; lump-sum access at any time",
    annuity: "Payments fixed at commencement; no lump-sum access once purchased",
  },
  {
    dimension: "Investment risk",
    abp: "Borne by you — good returns grow balance; poor returns shrink it",
    annuity: "Borne by the insurer — your income is guaranteed regardless",
  },
  {
    dimension: "Longevity risk",
    abp: "High — balance may deplete if you live longer than expected",
    annuity: "Eliminated — income continues for life with a lifetime annuity",
  },
  {
    dimension: "Estate planning",
    abp: "Remaining balance passes to beneficiaries (with possible tax)",
    annuity: "Single-life annuity has no residual; add reversionary pension or capital guarantee to protect estate",
  },
  {
    dimension: "Age Pension assets test",
    abp: "100% of account balance assessed as an asset",
    annuity: "Only 60% of purchase price assessed (first 5 years), then 30% — significantly more favourable",
  },
  {
    dimension: "Age Pension income test",
    abp: "Deemed at lower/upper deeming rates on full balance",
    annuity: "60% of gross annuity income assessed — often lower than deeming on an equivalent ABP",
  },
  {
    dimension: "Inflation protection",
    abp: "Investment returns generally keep pace with or exceed inflation over time",
    annuity: "Fixed payments erode in real terms unless you choose a CPI-indexed annuity (at a lower initial rate)",
  },
];

const FAQS = [
  {
    q: "Are annuities a good idea in Australia?",
    a: "Annuities suit retirees who prioritise income certainty over flexibility. They are particularly valuable if you are concerned about longevity risk (outliving your money), if you have limited other guaranteed income, or if converting part of your super to an annuity would restore Age Pension entitlements via the favourable 60% assets test treatment. They are less suited to retirees who need liquidity, have significant estate planning goals, or can comfortably cover essential expenses from other guaranteed sources (such as Age Pension). Most financial planners do not recommend annuitising your entire super — a partial approach typically works better.",
  },
  {
    q: "How does an annuity affect my Age Pension?",
    a: "Complying lifetime income streams receive favourable Centrelink treatment: only 60% of the purchase price is counted as an asset (versus 100% for an account-based pension), and only 60% of your gross annuity payments are counted in the income test. This is significantly better than the 100% assets test treatment that applies to an ABP of the same value. For retirees near the assets test threshold, converting a portion of an ABP into a lifetime annuity can restore a part-Age Pension — potentially worth thousands of dollars per year. The exact impact depends on your total assets, relationship status, and current entitlement — model this with a financial adviser before purchasing.",
  },
  {
    q: "Can I buy an annuity from my superannuation?",
    a: "Yes. You can purchase an annuity directly from your superannuation account, provided you have met a condition of release (typically retired after reaching preservation age, or aged 65). The funds are transferred from your super fund to the annuity provider (such as Challenger or Allianz), and the annuity then pays you a regular income. Some industry super funds also offer their own pooled lifetime income stream products (such as ART Lifetime Pension or QSuper Lifetime), which function similarly to commercial annuities but are operated within the fund.",
  },
  {
    q: "What happens to my annuity when I die?",
    a: "For a single-life lifetime annuity without death benefit options, payments simply cease — there is no residual paid to your estate. This pooling of longevity risk is how insurers can guarantee income for those who live a very long time. To protect your estate, you can add: a reversionary pension (your spouse continues receiving the same income), a capital protection guarantee (if you die before a set period, the estate receives the unpaid balance), or a capital payment guarantee (a minimum number of payments guaranteed regardless of when you die). Each option reduces your initial payment rate. Term annuities typically return the capital balance at the end of the term, or pay a residual if you die during the term depending on the product terms.",
  },
  {
    q: "Are annuity payments taxed in Australia?",
    a: "Annuity income is generally assessable income and must be declared on your tax return. However, a deductible amount applies — this is calculated as the purchase price divided by your life expectancy at the time of purchase (or the term, for a term annuity). The deductible amount reduces the taxable portion each year, reflecting the return of your own capital. If your annuity is purchased with post-tax money (i.e. outside of super) the deductible amount is higher. If purchased with superannuation money, the entire payment is typically tax-free if you are aged 60 or over. Under age 60, a 15% tax offset applies to the taxable super component.",
  },
];

export default function RetirementAnnuitiesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Annuities" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/retirement" className="hover:text-slate-900">Retirement</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Annuities</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Annuities in Australia: guaranteed income for life or fixed term
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            An annuity converts a lump sum into a guaranteed income stream — for the rest of your life or
            for a fixed period. You trade flexibility for certainty: once purchased, you cannot access the
            lump sum, but your income is guaranteed regardless of markets or how long you live.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* What is an annuity */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How annuities work</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            When you purchase an annuity, you pay a lump sum to an insurer (such as Challenger or Allianz).
            The insurer invests that capital — predominantly in government bonds and other fixed-income assets —
            and uses the returns, plus longevity pooling across all its policyholders, to fund guaranteed
            regular payments back to you.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 text-center">
              <p className="text-2xl font-extrabold text-slate-900 mb-1">1</p>
              <p className="font-bold text-slate-900 text-sm mb-1">Pay the lump sum</p>
              <p className="text-xs text-slate-600 leading-relaxed">Transfer from your super account or after-tax savings to the annuity provider.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 text-center">
              <p className="text-2xl font-extrabold text-slate-900 mb-1">2</p>
              <p className="font-bold text-slate-900 text-sm mb-1">Insurer invests the capital</p>
              <p className="text-xs text-slate-600 leading-relaxed">The insurer invests in bonds and fixed-income assets to fund your guaranteed income stream.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 text-center">
              <p className="text-2xl font-extrabold text-slate-900 mb-1">3</p>
              <p className="font-bold text-slate-900 text-sm mb-1">Receive guaranteed income</p>
              <p className="text-xs text-slate-600 leading-relaxed">Regular payments — monthly, quarterly, or annually — continue for life or the chosen term.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5 bg-white mb-4">
            <p className="font-bold text-slate-900 mb-3 text-sm">What determines your payment rate?</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  factor: "Your age at commencement",
                  detail: "Older means shorter expected payment period — higher initial income per dollar invested. A 75-year-old receives substantially more than a 65-year-old for the same lump sum.",
                },
                {
                  factor: "Prevailing interest rates (bond yields)",
                  detail: "Annuity pricing moves with long-term bond yields. Higher rates in 2023–25 improved annuity payment rates significantly compared to the low-rate era of 2015–2021.",
                },
                {
                  factor: "Indexation choice",
                  detail: "Choosing CPI-indexation means payments rise with inflation each year — but your starting payment is lower than a non-indexed annuity to fund those future increases.",
                },
                {
                  factor: "Death benefit and reversionary options",
                  detail: "Adding a reversionary pension (spouse continues income after your death), a capital guarantee, or a death benefit period all reduce the initial payment rate.",
                },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border border-slate-100 p-3 bg-slate-50">
                  <p className="font-semibold text-slate-900 text-xs mb-1">{item.factor}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Types of annuities table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Types of annuities in Australia</h2>
          <p className="text-sm text-slate-500 mb-5">
            Four main product categories are available to Australian retirees. Lifetime and fixed-term
            annuities dominate the market; variable annuities have limited availability.
          </p>
          <div className="space-y-4">
            {ANNUITY_TYPES.map((a, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm font-bold text-white">{a.type}</p>
                  <p className="text-xs text-slate-400 font-semibold">{a.providers}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-3 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Key features</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{a.keyFeatures}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Key risks</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{a.risks}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Centrelink treatment</p>
                    <p className="text-xs text-emerald-800 leading-relaxed">{a.centrelink}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABP vs Annuity comparison */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Account-based pension vs lifetime annuity
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            The two most common retirement income vehicles. Each has distinct advantages —
            most retirees benefit from holding both.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="Account-based pension vs lifetime annuity comparison">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide w-1/4">Feature</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Account-based pension (ABP)</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Lifetime annuity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ABP_VS_ANNUITY.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs align-top">{row.dimension}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 leading-relaxed align-top">{row.abp}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 leading-relaxed align-top">{row.annuity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Age Pension interaction — key insight */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Age Pension interaction — the 60% advantage
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            The single most important financial planning consideration for many annuity purchasers is
            how Centrelink treats complying lifetime income streams compared with account-based pensions.
          </p>
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <div className="rounded-xl border border-slate-200 p-5 bg-white">
              <p className="font-bold text-slate-900 mb-3 text-sm">Assets test treatment</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-slate-500 w-28 shrink-0">ABP:</span>
                  <p className="text-xs text-slate-700">100% of account balance assessed at all times.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-emerald-700 w-28 shrink-0">Lifetime annuity:</span>
                  <p className="text-xs text-slate-700">60% of purchase price assessed in years 1–5; 30% thereafter. Effectively exempts 40%–70% of the capital base.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-5 bg-white">
              <p className="font-bold text-slate-900 mb-3 text-sm">Income test treatment</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-slate-500 w-28 shrink-0">ABP:</span>
                  <p className="text-xs text-slate-700">Deemed at lower/upper deeming rates on 100% of balance (currently 0.25% / 2.25%).</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-emerald-700 w-28 shrink-0">Lifetime annuity:</span>
                  <p className="text-xs text-slate-700">60% of gross annual payments assessed — often lower than deeming on an equivalent ABP balance.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-bold text-slate-900 mb-2 text-sm">Worked example: $300,000 converted from ABP to lifetime annuity</p>
            <p className="text-xs text-slate-700 leading-relaxed mb-2">
              Under the assets test, that $300,000 in an ABP is assessed at $300,000.
              In a complying lifetime annuity, only $180,000 is assessed (60%) in the first 5 years,
              dropping to $90,000 (30%) after year 5.
            </p>
            <p className="text-xs text-slate-700 leading-relaxed">
              The $120,000 reduction in assessed assets (in years 1–5) reduces the assets test taper
              by $360 per fortnight — or roughly $9,360 per year in restored Age Pension entitlement.
              After year 5, the $210,000 reduction would generate up to $16,380/year in additional pension.
              These amounts are illustrative; your actual outcome depends on total assets, relationship
              status, and current entitlements.
            </p>
          </div>
        </div>
      </section>

      {/* Challenger pricing example */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Pricing illustration: $200,000 lump sum at age 65</h2>
          <p className="text-sm text-slate-500 mb-5">
            The following figures are illustrative only — actual rates depend on the product,
            interest rate environment, and options chosen at time of purchase. Use provider
            calculators (Challenger, Allianz) or consult a financial adviser for a current quote.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-5">
            <table className="w-full text-sm" aria-label="Annuity pricing illustration for $200,000 lump sum at age 65">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Product option</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Approx. annual income</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Approx. monthly income</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900 text-xs">Non-indexed, no death benefit</td>
                  <td className="px-4 py-3 text-xs text-slate-700 font-mono">~$13,000–$14,000</td>
                  <td className="px-4 py-3 text-xs text-slate-700 font-mono">~$1,080–$1,170</td>
                  <td className="px-4 py-3 text-xs text-slate-600">Highest initial payment; income fixed in dollar terms for life</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900 text-xs">CPI-indexed, no death benefit</td>
                  <td className="px-4 py-3 text-xs text-slate-700 font-mono">~$9,500–$10,500</td>
                  <td className="px-4 py-3 text-xs text-slate-700 font-mono">~$790–$875</td>
                  <td className="px-4 py-3 text-xs text-slate-600">Lower start; income rises with inflation each year — better over long retirement</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900 text-xs">Non-indexed, 10-year capital guarantee</td>
                  <td className="px-4 py-3 text-xs text-slate-700 font-mono">~$12,000–$13,000</td>
                  <td className="px-4 py-3 text-xs text-slate-700 font-mono">~$1,000–$1,080</td>
                  <td className="px-4 py-3 text-xs text-slate-600">Estate receives unpaid payments if you die within 10 years</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900 text-xs">Non-indexed, reversionary to spouse</td>
                  <td className="px-4 py-3 text-xs text-slate-700 font-mono">~$11,500–$12,500</td>
                  <td className="px-4 py-3 text-xs text-slate-700 font-mono">~$960–$1,040</td>
                  <td className="px-4 py-3 text-xs text-slate-600">Spouse continues receiving full income after your death</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            Rates are indicative for a 65-year-old purchasing in a moderate interest rate environment. Actual
            annuity rates fluctuate with bond yields — obtain current quotes directly from providers or an
            accredited financial adviser.
          </p>
        </div>
      </section>

      {/* When annuities make sense */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">When annuities make sense — and when they don&apos;t</h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-bold text-emerald-900 mb-3 text-sm">Annuities typically suit you if:</p>
              <ul className="space-y-2 text-xs text-emerald-800 leading-relaxed">
                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5 font-bold">+</span><span><strong>Longevity concern:</strong> you want a guaranteed floor so you cannot outlive your essential income, even to age 95 or 100.</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5 font-bold">+</span><span><strong>Age Pension optimisation:</strong> converting an ABP to an annuity would restore significant Age Pension entitlements via the 60% assets test treatment.</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5 font-bold">+</span><span><strong>Low risk tolerance:</strong> you find market volatility distressing and want your base income to be immune from sharemarket falls.</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5 font-bold">+</span><span><strong>Behavioural peace of mind:</strong> knowing a guaranteed amount arrives regardless of conditions allows you to spend more freely from other sources.</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5 font-bold">+</span><span><strong>Supplementing Age Pension:</strong> you want to top up a small Age Pension with a guaranteed private income so essential expenses are always covered.</span></li>
              </ul>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="font-bold text-red-900 mb-3 text-sm">Annuities are less suitable if:</p>
              <ul className="space-y-2 text-xs text-red-800 leading-relaxed">
                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5 font-bold">-</span><span><strong>Flexibility is critical:</strong> you may need lump-sum access for medical costs, aged care, home renovations, or family assistance.</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5 font-bold">-</span><span><strong>Poor health:</strong> if your life expectancy is significantly below average, you may receive fewer payments than the cost of the annuity.</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5 font-bold">-</span><span><strong>Significant estate goals:</strong> you want most of your super to pass to children or other beneficiaries — an unprotected lifetime annuity leaves nothing.</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5 font-bold">-</span><span><strong>Fixed income erodes:</strong> if you buy a non-indexed annuity today, that same dollar amount in 20 years will purchase considerably less due to inflation.</span></li>
                <li className="flex items-start gap-2"><span className="shrink-0 mt-0.5 font-bold">-</span><span><strong>Opportunity cost:</strong> strong long-term investment returns from a growth-oriented ABP may outperform annuity payouts over a 25-year horizon.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Taxation */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How annuity income is taxed</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Annuity taxation depends on whether the annuity was purchased with superannuation money
            (a &quot;super income stream&quot;) or after-tax personal savings (a &quot;non-super annuity&quot;).
          </p>
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <div className="rounded-xl border border-slate-200 p-5 bg-white">
              <p className="font-bold text-slate-900 mb-3 text-sm">Purchased with super (aged 60+)</p>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                All payments are tax-free once you are aged 60 or over and have met a condition of release.
                No deductible amount calculation is required for the tax return. The payments are still
                assessable for Centrelink income test purposes (at 60%).
              </p>
              <p className="text-xs text-slate-500">Under age 60: the taxable super component is taxed at marginal rates less a 15% tax offset.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5 bg-white">
              <p className="font-bold text-slate-900 mb-3 text-sm">Purchased with after-tax money</p>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                Each payment has two components: a taxable portion and a tax-free return-of-capital portion
                called the &quot;deductible amount.&quot; The deductible amount is calculated as:
              </p>
              <div className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-mono text-emerald-300">
                Deductible amount = Purchase price ÷ Life expectancy at commencement
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Example: $200,000 purchase at age 65 (life expectancy ~20 years) = $10,000/year deductible.
                If annual payment is $13,000, only $3,000 is taxable income.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Low income tax offset and SAPTO:</strong> Most retirees with only annuity income
              and Age Pension will have low taxable income. The Seniors and Pensioners Tax Offset (SAPTO)
              further reduces tax payable — a single senior can have up to approximately $32,279 in
              taxable income before paying any tax. Even a non-super annuity with a moderate taxable
              component will generally fall within this threshold. Verify with the ATO or a tax adviser.
            </p>
          </div>
        </div>
      </section>

      {/* Industry super lifetime income streams */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Super fund lifetime income streams
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Several large industry super funds now offer their own pooled longevity products — an alternative
            to purchasing a commercial annuity from an insurer.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            {[
              {
                name: "ART Lifetime Pension",
                fund: "Australian Retirement Trust",
                how: "A pooled, member-funded product where payments are backed by a pool of similarly-aged members rather than an insurer balance sheet. Income is not legally guaranteed to the same degree as an APRA-regulated annuity but is designed to be sustainable.",
                key: "Centrelink treatment: complying lifetime income stream rules apply (60% assets and income test). Returns pool investment performance — income can vary slightly year to year.",
              },
              {
                name: "QSuper Lifetime",
                fund: "Now part of Australian Retirement Trust",
                how: "One of Australia&apos;s original pooled longevity products. Similar pooled structure — members share longevity risk collectively, reducing individual exposure.",
                key: "Not available to new members as of 2022 following the QSuper–SunSuper merger into ART. Existing holders retain their product.",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-5 bg-white">
                <p className="font-bold text-slate-900 text-sm mb-0.5">{item.name}</p>
                <p className="text-xs text-slate-500 mb-3">{item.fund}</p>
                <p className="text-xs text-slate-700 leading-relaxed mb-2">{item.how}</p>
                <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">{item.key}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <p className="font-bold text-slate-900 text-sm mb-1">Commercial annuity vs fund lifetime income stream</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Commercial annuities (Challenger, Allianz) are legally guaranteed by APRA-regulated insurers
              and backed by capital reserves — your income cannot be reduced. Fund products are pooled and
              member-funded; payments are designed to be stable but may vary slightly with pool performance
              and mortality experience. Both receive the same favourable Centrelink treatment as complying
              lifetime income streams. The right choice depends on which fund you are already with and
              whether you value the simplicity of staying in one fund versus the contractual guarantee
              of a standalone insurer.
            </p>
          </div>
        </div>
      </section>

      {/* Partial annuitisation */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Partial annuitisation: the hybrid approach</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            The majority of financial planners do not recommend putting all of your super into an annuity.
            The most widely used approach is partial annuitisation — using a portion of your super to
            purchase an annuity that covers essential living costs, while leaving the remainder in an
            account-based pension for flexibility and growth.
          </p>
          <div className="rounded-xl border border-slate-200 p-5 bg-white mb-4">
            <p className="font-bold text-slate-900 mb-4 text-sm">How a 70/30 split might work — illustrative only</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                <p className="font-bold text-slate-900 text-xs mb-1">Super balance: $600,000</p>
                <p className="text-xs text-slate-600 leading-relaxed">Total retirement savings available to structure.</p>
              </div>
              <div className="rounded-lg border border-emerald-200 p-4 bg-emerald-50">
                <p className="font-bold text-emerald-900 text-xs mb-1">30% ($180K) → Lifetime annuity</p>
                <p className="text-xs text-emerald-800 leading-relaxed">Generates ~$11,000–$12,000/year guaranteed. Combined with Age Pension, covers rent/food/utilities — the non-negotiable base.</p>
              </div>
              <div className="rounded-lg border border-blue-200 p-4 bg-blue-50">
                <p className="font-bold text-blue-900 text-xs mb-1">70% ($420K) → ABP</p>
                <p className="text-xs text-blue-800 leading-relaxed">Retains full investment flexibility and capital access for discretionary spending, travel, health expenses, and estate goals.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <p className="font-bold text-slate-900 text-sm mb-1">Why the hybrid works</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              The annuity layer removes the anxiety of market risk for essential expenses — you know
              the bills are covered no matter what. This psychological certainty allows you to invest
              the ABP portion more aggressively (more growth assets) because you are not relying on
              it for daily living. Research on retirement behaviour consistently finds that retirees
              with a guaranteed income floor spend more freely from their flexible assets — achieving
              a better retirement outcome than either an all-ABP or all-annuity structure.
            </p>
          </div>
        </div>
      </section>

      {/* Steps to buy */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Steps to buy an annuity in Australia</h2>
          <div className="space-y-3">
            {[
              {
                step: "1",
                title: "Get quotes from providers",
                body: "Use the online calculators from Challenger (challenger.com.au) and Allianz Retire+ to get indicative payment rates for your age and lump sum. Quotes are free and take a few minutes — try several scenarios (indexed vs non-indexed, with and without death benefit).",
              },
              {
                step: "2",
                title: "Compare features carefully",
                body: "Don&apos;t compare only on payment rate. Check: indexation terms, death benefit structure, reversionary pension options, cooling-off period, minimum investment amount, and whether the product is a complying lifetime income stream for Centrelink purposes.",
              },
              {
                step: "3",
                title: "Engage a licensed financial adviser for a Statement of Advice",
                body: "Purchasing an annuity is an irreversible decision. A licensed financial adviser is required to provide a Statement of Advice (SoA) for personal advice on whether an annuity is suitable for your situation. The SoA will model the Centrelink impact, tax implications, and compare the annuity with alternatives including ABP continuation.",
              },
              {
                step: "4",
                title: "Purchase via super or after-tax money",
                body: "If purchasing via super, your fund will transfer the lump sum directly to the annuity provider. For after-tax money, you fund the purchase personally. Confirm with your super fund whether a rollover form or fund-specific process is required — some funds have their own annuity application pathways.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-slate-200 p-4 bg-white">
                <div className="shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm">
                  {item.step}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
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
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Adviser note */}
      <section className="py-8 border-b border-slate-100 bg-blue-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-extrabold text-sm">
              i
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-1 text-sm">Annuity purchase requires a Statement of Advice</p>
              <p className="text-xs text-slate-700 leading-relaxed">
                Under Australian law, a licensed financial adviser must provide a Statement of Advice (SoA)
                before recommending a specific annuity product as personal advice. This is not a formality —
                annuity purchase is irreversible, and the SoA process ensures your full financial position,
                Centrelink situation, health, estate goals, and risk tolerance are properly considered before
                you commit. The general information on this page is not a substitute for that advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Compare annuities with a licensed financial planner"
        subheading="Annuity rates, guarantees, and income options are complex. A licensed financial planner can model whether a fixed, variable, or lifetime annuity suits your retirement income strategy."
        intent={{ need: "retirement", context: ["annuities", "retirement_income"] }}
        source="retirement_annuities"
        ctaLabel="Find a retirement income specialist"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related guides */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/retirement/annuities-vs-abp", label: "Annuity vs ABP deep dive" },
              { href: "/retirement/retirement-income", label: "Retirement income strategy" },
              { href: "/retirement/age-pension", label: "Age Pension guide" },
              { href: "/retirement/age-pension-assets-test", label: "Assets test thresholds" },
              { href: "/retirement/pension-phase", label: "Account-based pension" },
              { href: "/retirement/deeming-rates", label: "Deeming rates explained" },
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

      {/* General advice warning */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Annuity rates change with
            interest rates and insurer pricing — rates quoted on this page are illustrative only; obtain
            current quotes from providers. Centrelink assessment rules change — verify current treatment
            at servicesaustralia.gov.au. Life expectancy figures used for deductible amount calculations
            are published by the ATO. Provider names (Challenger, Allianz, ART) are listed for illustrative
            context and do not constitute a recommendation of any specific product or provider. This page
            is general information only and is not financial advice. An annuity purchase is an irreversible
            decision that should only be made after receiving a Statement of Advice from a licensed
            financial adviser who has reviewed your full personal circumstances.
          </p>
        </div>
      </section>
    </div>
  );
}
