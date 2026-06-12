import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Investment Property Loans Australia (${CURRENT_YEAR}) Guide | invest.com.au`,
  description: `Investment home loans: rate differentials vs owner-occupied, IO periods, APRA LVR caps, negative gearing, and debt recycling. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Investment Property Loans Australia (${CURRENT_YEAR}) Guide`,
    description:
      "Investor loan rates vs OO rates, IO vs P&I, APRA restrictions, negative gearing tax deductibility, LVR caps, offset contamination risk, cross-collateralisation, debt recycling, and SMSF lending.",
    url: `${SITE_URL}/home-loans/investment`,
    images: [{ url: `/api/og?title=Investment+Property+Loans+Guide`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/investment` },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const RATE_DIFFERENTIAL_ROWS = [
  { category: "Owner-occupier P&I (variable)", typical: "Reference rate", premium: "—", why: "Lowest-risk category for lenders and APRA capital" },
  { category: "Owner-occupier IO (variable)", typical: "+0.1–0.3%", premium: "Low", why: "Higher risk than P&I; no equity paydown during IO" },
  { category: "Investor P&I (variable)", typical: "+0.3–0.5%", premium: "Moderate", why: "Higher APRA capital weight; statistical default risk premium" },
  { category: "Investor IO (variable)", typical: "+0.5–0.8%", premium: "Highest", why: "APRA cap risk + IO risk stacked; historically most regulated tier" },
];

const IO_VS_PI_ROWS = [
  { feature: "Repayment type", io: "Interest only — no principal reduction", pi: "Principal + interest — builds equity each month" },
  { feature: "Monthly repayment", io: "Lower during IO period", pi: "Higher from day one" },
  { feature: "Loan balance", io: "Unchanged during IO period", pi: "Reduces from day one" },
  { feature: "Tax deductible interest", io: "Full interest deductible (investment use)", pi: "Full interest deductible (investment use)" },
  { feature: "Interest rate", io: "Typically 0.1–0.3% higher than P&I", pi: "Lower rate tier" },
  { feature: "APRA guidance", io: "Lenders manage IO book ≤30% of new flows", pi: "No APRA lending cap" },
  { feature: "IO period ends", io: "Reverts to P&I — repayments jump sharply", pi: "Consistent throughout loan term" },
  { feature: "Best suited to", io: "Negative-gearing cashflow strategy; short-term hold", pi: "Equity building; long-term hold" },
];

const BORROWING_CAPACITY_ROWS = [
  { factor: "Serviceability buffer", detail: "APRA requires lenders to assess ability to service at rate + 3% above the actual loan rate" },
  { factor: "Benchmark floor", detail: "Stressed at a minimum floor (historically 2%); actual rate + buffer must exceed floor" },
  { factor: "Existing debt", detail: "All existing mortgages, car loans and credit card limits counted at 7.5–8.5% stressed rate" },
  { factor: "Rental income shading", detail: "Most lenders count only 70–80% of gross rental income; some as low as 60%" },
  { factor: "Negative gearing tax benefit", detail: "Some lenders apply your marginal tax rate to reduce the net shortfall in their assessment" },
  { factor: "Credit card limits", detail: "Full credit card limit (not balance) is counted as debt — reduce or close unused cards before applying" },
];

const STRUCTURES = [
  {
    title: "Individual name",
    pros: "Simplest structure; access to 50% CGT discount (assets held 12+ months); negative gearing losses offset personal income.",
    cons: "Asset protection is limited — creditors can reach personal assets; income split is not possible.",
  },
  {
    title: "Company / discretionary trust",
    pros: "Asset protection; income splitting flexibility (trust); no CGT discount at company tax rate, but trust distributions to individuals qualify.",
    cons: "Complexity; setup and ongoing accounting cost; lenders often apply haircuts to trust income in serviceability assessment.",
  },
  {
    title: "Self-Managed Super Fund (SMSF)",
    pros: "15% tax on rental income in accumulation phase; 0% tax in pension phase; CGT discount applies on assets held 12+ months.",
    cons: "Limited recourse borrowing arrangement (LRBA) required; very restricted loan LVR (typically 70–80%); cannot live in the property; higher compliance cost; major bank retreat from SMSF lending since 2018.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Get pre-approval",
    desc: "A licensed mortgage broker assesses your borrowing capacity across multiple lenders. Pre-approval confirms your budget range, identifies likely LVR, and puts you in a stronger negotiating position when making offers. Pre-approval is typically valid for 3 months.",
  },
  {
    step: "2",
    title: "Find your property",
    desc: "Identify the investment property and conduct due diligence: building and pest inspection, strata report (if applicable), rental yield research, vacancy rate data, and suburb growth trends. Pre-approval does not guarantee formal approval — the lender must also approve the property.",
  },
  {
    step: "3",
    title: "Formal approval",
    desc: "Submit the signed contract of sale to the lender. The lender orders an independent valuation. If the valuation supports the purchase price and your financial position is unchanged, formal approval is issued — typically within 1–2 weeks. Approval may include conditions (e.g. minimum rent required).",
  },
  {
    step: "4",
    title: "Loan documents and settlement",
    desc: "Sign the loan documents prepared by the lender's solicitor. Coordinate settlement with the vendor's and your conveyancer. Typical investor settlement timeline is 30–90 days from contract signing. Funds are drawn down on settlement day and the mortgage is registered against the title.",
  },
];

const FAQS = [
  {
    q: "Can I use equity in my home for an investment property deposit?",
    a: "Yes — if your owner-occupied home has grown in value, you may be able to access equity by refinancing or adding a loan split secured against it. Most lenders allow equity release up to 80% LVR on the owner-occupied property without lenders mortgage insurance. The released funds become the deposit (and often stamp duty) for your investment loan. The interest on the investment-purpose portion of that equity release is generally tax deductible, subject to the ATO purpose test. Always seek advice from a registered tax agent and licensed mortgage broker before structuring this way.",
  },
  {
    q: "Should I choose interest-only or principal and interest for an investment loan?",
    a: "The right choice depends on your strategy. Interest-only loans produce lower repayments and higher deductible interest — useful if you are negatively gearing and want to maximise the tax deduction against your income. Principal and interest reduces your loan balance from day one, building equity faster and carrying a lower interest rate. Many investors use IO in the early years and switch to P&I as rental income increases. Seek advice from a licensed mortgage broker and registered tax agent to model which suits your circumstances — both loan types are general products; the optimal choice is personal.",
  },
  {
    q: "How does negative gearing affect my borrowing capacity?",
    a: "Lenders assess borrowing capacity at a serviceability stress rate of actual rate plus 3%. Rental income is shaded at 70–80% of gross rent. The net shortfall (costs minus income) reduces your assessed capacity. Some lenders apply a tax benefit (at your marginal rate) to offset the shortfall, which slightly improves your capacity. In practice, holding a negatively geared investment property usually reduces your capacity for a subsequent loan by the stressed net shortfall amount. A mortgage broker can show you how different lenders treat this and which gives the best assessed capacity for your situation.",
  },
  {
    q: "What LVR can I borrow at for an investment property?",
    a: "Most mainstream lenders cap investor loans at 80% LVR without lenders mortgage insurance (LMI). Some lenders will go to 90% LVR with LMI, but investor LMI premiums are higher than owner-occupier. APRA's macroprudential oversight means lenders actively manage their investor lending proportion, so availability of high-LVR investor products varies by lender and market conditions. Borrowing above 80% LVR as an investor increases your interest rate, LMI premium, and repayments — the business case weakens quickly above 85% LVR unless rental yield is very high.",
  },
  {
    q: "Can I hold an investment property in my SMSF?",
    a: "Yes, but the rules are strict. SMSF residential property must be at arm's length — you, your family, and related parties cannot occupy it. The SMSF must use a limited recourse borrowing arrangement (LRBA) compliant with SIS Act requirements, which means the lender's recourse is limited to the specific property, not the broader fund. Major banks largely exited SMSF lending in 2018–2019; specialist non-bank lenders remain. Maximum LVR is typically 70–80%, rates are higher than standard investment loans, and set-up costs (legal, trustee, LRBA documentation) are significant. Speak to a licensed SMSF adviser and a licensed mortgage broker specialising in SMSF lending before proceeding.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestmentLoanPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Home Loans", url: `${SITE_URL}/home-loans` },
    { name: "Investment Property Loans", url: `${SITE_URL}/home-loans/investment` },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-14">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-blue-200 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Investment Property Loans</span>
          </nav>

          <div className="inline-block bg-blue-800 text-blue-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Investment Property Loans in Australia
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mb-2">
            Investment loans differ from owner-occupier mortgages in ways that matter: higher rates, stricter LVR caps, interest-only
            options, and tax rules that can work for or against you depending on loan structure. {UPDATED_LABEL}.
          </p>
          <p className="text-sm text-blue-200 max-w-2xl mb-8">
            This guide covers rate differentials, IO vs P&amp;I, APRA restrictions, borrowing capacity, negative gearing, debt
            recycling, cross-collateralisation risks, and how to choose a holding structure — all general information, not credit
            advice.
          </p>

          {/* Key numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { stat: "0.3–0.8%", sub: "Rate premium: investor IO vs OO P&I" },
              { stat: "80% LVR", sub: "Typical investor cap without LMI" },
              { stat: "1–5 yrs", sub: "Interest-only period length" },
              { stat: "+3%", sub: "APRA serviceability buffer above actual rate" },
            ].map((item) => (
              <div key={item.stat} className="bg-blue-800 rounded-xl p-4 border border-blue-700">
                <p className="text-xl font-bold text-white mb-0.5">{item.stat}</p>
                <p className="text-xs text-blue-300">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 1. What makes investor loans different ────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How Investment Loans Differ from Owner-Occupier Loans</h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Lenders and regulators treat investment mortgages as a separate risk category from owner-occupier loans. Three structural
            differences drive most of the practical implications for investors:
          </p>
          <div className="grid md:grid-cols-3 gap-5 mb-6">
            {[
              {
                title: "Higher capital weight under APRA",
                desc: "APRA's prudential standard APS 112 requires banks to hold more regulatory capital against investor loans than equivalent owner-occupier loans. That capital cost is passed through to borrowers as a rate premium of 0.3–0.8% depending on loan type.",
              },
              {
                title: "Higher statistical default risk",
                desc: "In economic downturns, investors are statistically more likely to exit (sell) a property they cannot service than owner-occupiers, who face homelessness. Lenders price this risk into their credit assessment and rate setting.",
              },
              {
                title: "APRA macroprudential oversight",
                desc: "APRA has twice imposed speed limits on investor lending growth (2014 and 2017) when it judged systemic risk was building. These restrictions constrain lender appetite and product availability, particularly for IO investor loans.",
              },
            ].map((card) => (
              <div key={card.title} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-900 text-sm mb-2">{card.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 italic">
            General information only. Rates, policies, and APRA guidance change over time. Consult a licensed mortgage broker for
            current lender-specific information.
          </p>
        </div>
      </section>

      {/* ── 2. Rate differential table ────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Investor Rate Premiums vs Owner-Occupier Rates</h2>
          <p className="text-sm text-slate-500 mb-6">
            Indicative rate tiers relative to a standard owner-occupier P&amp;I variable loan. Actual rates vary by lender, LVR, and
            loan size.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Investor rate premiums vs owner-occupier rates" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Loan category</th>
                  <th scope="col" className="text-left px-5 py-3">Typical premium</th>
                  <th scope="col" className="text-left px-5 py-3">Risk level</th>
                  <th scope="col" className="text-left px-5 py-3">Why lenders charge more</th>
                </tr>
              </thead>
              <tbody>
                {RATE_DIFFERENTIAL_ROWS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.category}</td>
                    <td className="px-5 py-3 font-semibold text-blue-700">{row.typical}</td>
                    <td className="px-5 py-3 text-slate-600">{row.premium}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{row.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Figures are indicative ranges based on publicly available market data. Individual lender pricing varies. General
            information only — not a credit recommendation.
          </p>
        </div>
      </section>

      {/* ── 3. Interest-only loans ────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Interest-Only (IO) Loans for Investors</h2>

          {/* IO vs P&I table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-8">
            <table aria-label="Interest-only vs principal and interest for investors" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700 w-40">Feature</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-blue-700">Interest Only (IO)</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700">Principal & Interest (P&I)</th>
                </tr>
              </thead>
              <tbody>
                {IO_VS_PI_ROWS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.feature}</td>
                    <td className="px-5 py-3 text-slate-600">{row.io}</td>
                    <td className="px-5 py-3 text-slate-600">{row.pi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* IO reversion risk callout */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-3xl">
            <h3 className="font-bold text-amber-900 mb-2">IO Reversion Shock — the risk most investors underestimate</h3>
            <p className="text-amber-800 text-sm leading-relaxed mb-3">
              When the IO period ends (typically after 1–5 years), the loan reverts to principal and interest calculated over the
              remaining term. If you took a 30-year loan with a 5-year IO period, P&amp;I repayments are calculated over the remaining
              25 years — not 30. On a $600,000 loan at 6.5%, this can increase monthly repayments by 25–35%.
            </p>
            <p className="text-amber-800 text-sm leading-relaxed">
              Investors relying on continued IO availability should note that lenders can decline an IO extension at rollover — and
              often do if the LVR has deteriorated or the borrower&apos;s circumstances have changed. Model the P&amp;I repayment
              before committing to IO to confirm serviceability at reversion.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. LVR requirements ───────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">LVR Requirements for Investment Loans</h2>
          <p className="text-slate-600 mb-5 leading-relaxed">
            Loan-to-value ratio (LVR) caps differ materially for investors compared with owner-occupiers. Most mainstream lenders cap
            investor loans at <strong>80% LVR</strong> without lenders mortgage insurance (LMI). Some lenders permit 90% LVR for
            investors with LMI, but:
          </p>
          <ul className="space-y-3 mb-6">
            {[
              "Investor LMI premiums are higher than equivalent owner-occupier premiums at the same LVR.",
              "The investor rate is already above the owner-occupier rate — adding LMI further increases cost of funds.",
              "Lenders routinely tighten investor LVR caps during periods of APRA macroprudential tightening; availability of 90% LVR investor products has fluctuated since 2014.",
              "High LVR investor loans leave less buffer against property price falls — if values decline 10%, an investor at 90% LVR quickly moves into negative equity.",
            ].map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                  {i + 1}
                </span>
                {point}
              </li>
            ))}
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-blue-900 mb-1">APRA investor lending history</p>
            <p className="text-sm text-blue-800 leading-relaxed">
              APRA introduced a 10% annual growth cap on investor credit in late 2014, then a 30% cap on new IO lending in 2017. Both
              restrictions have since been removed (2018–2019), but lenders remain aware that APRA can re-impose limits if investor
              credit growth is judged to pose systemic risk. This structural uncertainty is part of why lenders price investor loans
              higher and manage their IO book conservatively.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. Offset accounts ────────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Offset Accounts on Investment Loans</h2>
          <p className="text-slate-600 mb-5 leading-relaxed">
            Most variable rate investment loans include a linked offset account. Funds held in the offset reduce the daily interest
            calculation — if you have a $500,000 loan and $80,000 in offset, you pay interest only on $420,000. This is financially
            beneficial, but creates a tax complication for investors.
          </p>

          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="font-semibold text-red-900 text-sm mb-2">Offset contamination risk</h3>
              <p className="text-xs text-red-800 leading-relaxed">
                If you negatively gear and are maximising your interest deduction, a fully offset investment loan is
                self-defeating: you reduce the interest charged, which reduces your tax deduction. The ATO&apos;s deductibility
                rule follows the interest actually charged — there is no deduction for interest you did not pay.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <h3 className="font-semibold text-green-900 text-sm mb-2">Partial offset &amp; strategic use</h3>
              <p className="text-xs text-green-800 leading-relaxed">
                Some investors hold cash in a separate account linked to their owner-occupied loan offset (maximising
                non-deductible interest reduction) and let the investment loan run at full balance. Others use partial
                offset only up to a level where the net interest saving outweighs the loss of deduction. The right
                approach depends on your marginal tax rate.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-2">Redraw vs offset for tax purposes</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              The ATO treats redraw and offset differently for deductibility purposes. Funds drawn back from an investment loan via
              redraw for personal use can contaminate the deductibility of the entire loan — the ATO&apos;s <em>interest tracing</em>{" "}
              rules require you to apportion interest when loan proceeds are used for mixed purposes. An offset account avoids
              this risk because offset funds are legally separate from the loan account and can be withdrawn without affecting the
              loan&apos;s purpose. Obtain tax advice before mixing purposes in any loan account.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Negative vs positive gearing ──────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Negative Gearing, Positive Gearing, and Tax Deductibility</h2>
          <p className="text-slate-600 mb-5 leading-relaxed">
            A property is <strong>negatively geared</strong> when total annual costs (interest, rates, insurance, property management,
            depreciation) exceed rental income. The net shortfall is deductible against your other assessable income (e.g. salary),
            reducing your overall tax bill for that year. A property is <strong>positively geared</strong> when rental income exceeds
            costs — you pay tax on the net surplus at your marginal rate.
          </p>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
            <div className="bg-slate-800 text-white px-5 py-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Deductible vs non-deductible investor costs</p>
            </div>
            <div className="p-5">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-green-700 text-xs uppercase tracking-wide mb-2">Generally deductible</p>
                  <ul className="space-y-1 text-slate-600 text-xs">
                    <li>Loan interest (investment-purpose portion)</li>
                    <li>Property management fees and letting fees</li>
                    <li>Council rates and land tax</li>
                    <li>Building and landlord insurance premiums</li>
                    <li>Repairs and maintenance (not capital improvements)</li>
                    <li>Depreciation on building and plant/equipment (Div 43 / Div 40)</li>
                    <li>Accountant fees for investment income returns</li>
                    <li>Advertising for tenants</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-red-700 text-xs uppercase tracking-wide mb-2">Generally NOT deductible</p>
                  <ul className="space-y-1 text-slate-600 text-xs">
                    <li>Capital improvements (but may give future CGT cost-base benefit)</li>
                    <li>Borrowing costs over $100 (spread over 5 years or loan term)</li>
                    <li>Loan principal repayments</li>
                    <li>Personal use expenses for any periods of private use</li>
                    <li>Stamp duty on purchase (adds to CGT cost base)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 italic mb-4">
            Tax rules around negative gearing are set by the ATO and may change with legislation. Always confirm deductibility with a
            registered tax agent for your specific circumstances.
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link href="/negative-gearing" className="text-blue-600 text-sm font-medium hover:underline">
              Negative Gearing Full Guide →
            </Link>
            <Link href="/positive-gearing" className="text-blue-600 text-sm font-medium hover:underline">
              Positive Gearing Guide →
            </Link>
            <Link href="/advisors/tax-agents" className="text-blue-600 text-sm font-medium hover:underline">
              Find a Registered Tax Agent →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. Borrowing capacity ─────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Borrowing Capacity for Investors</h2>
          <p className="text-sm text-slate-500 mb-6">
            APRA&apos;s serviceability rules apply to investor applications in ways that often surprise first-time investors. Here is
            how each factor affects your assessed capacity.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
            <table aria-label="Borrowing capacity factors for investors" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Factor</th>
                  <th scope="col" className="text-left px-5 py-3">How lenders apply it</th>
                </tr>
              </thead>
              <tbody>
                {BORROWING_CAPACITY_ROWS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800 align-top w-56">{row.factor}</td>
                    <td className="px-5 py-3 text-slate-600 text-xs leading-relaxed">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 max-w-3xl">
            <p className="text-sm font-semibold text-blue-900 mb-1">Why the same income supports different borrowing amounts across lenders</p>
            <p className="text-sm text-blue-800 leading-relaxed">
              Lenders apply different rental income shade rates (60–80%), different stressed rates for existing debts, and different
              treatment of negative gearing tax offsets. The variation in assessed capacity across lenders for the same investor
              application can be $100,000–$300,000. A licensed mortgage broker can model your capacity across lenders before you apply
              — this is one of the most valuable services they provide to investors.
            </p>
          </div>
        </div>
      </section>

      {/* ── 8. Cross-collateralisation ────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Cross-Collateralisation Risks</h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Cross-collateralisation (cross-col) occurs when a lender takes security over two or more properties simultaneously to
            support your borrowing. Lenders sometimes offer this as a way to access equity without a separate refinance — but it
            creates structural risks that many investors do not discover until they try to sell one property.
          </p>

          <div className="space-y-4 mb-6">
            {[
              {
                title: "What happens when one property falls in value",
                desc: "If lenders hold both properties as combined security, a fall in the value of property A reduces the collateral pool. The lender may require additional equity or reduce the facility limit on the combined loan — even if property B has not changed in value.",
              },
              {
                title: "Selling one property requires lender consent",
                desc: "You cannot sell a cross-collateralised property without the lender's approval and a release of that property from the security pool. If the remaining security is insufficient to support the outstanding loan, the lender can refuse release or require you to pay down the loan before releasing.",
              },
              {
                title: "Refinancing becomes complex",
                desc: "Moving one cross-collateralised property to a different lender requires fully discharging or restructuring the entire security arrangement. This can trigger break costs, discharge fees, and LMI recalculation — costs that would not arise with standalone loans.",
              },
            ].map((risk) => (
              <div key={risk.title} className="flex items-start gap-4 bg-white border border-red-100 rounded-xl p-5">
                <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold">
                  !
                </span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-1">{risk.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{risk.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-green-900 mb-1">The alternative: standalone loans</p>
            <p className="text-sm text-green-800 leading-relaxed">
              Most mortgage brokers recommend structuring each investment property on a standalone loan secured only against that
              property. Accessing equity from property A for a deposit on property B is done via a separate loan split or refinance of
              property A — not by linking the two loans. This preserves your ability to sell, refinance, or restructure each property
              independently.
            </p>
          </div>
        </div>
      </section>

      {/* ── 9. Debt recycling ─────────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Debt Recycling</h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Debt recycling is a strategy that converts non-deductible home loan debt (your owner-occupied mortgage) into deductible
            investment debt. The logic: every dollar you pay off your home loan is then re-borrowed for investment purposes. The
            original non-deductible debt decreases while the deductible investment debt increases — the total debt stays roughly the
            same, but the proportion that is tax-deductible grows.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6">
            <div className="bg-slate-800 text-white px-5 py-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">How debt recycling works — step by step</p>
            </div>
            <ol className="p-5 space-y-3">
              {[
                "Make extra repayments on your owner-occupied (non-deductible) home loan to build up redraw or pay down the split.",
                "Draw those repaid funds back out via a separate investment loan split on the same property (or a separate investment loan facility).",
                "Invest the drawn funds in an income-producing asset — shares, managed funds, or an investment property deposit.",
                "The interest on the drawn amount is now deductible against your investment income.",
                "Repeat as additional repayments accumulate on the owner-occupier loan.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-amber-900 mb-2">Debt recycling requires licensed tax advice</p>
            <p className="text-sm text-amber-800 leading-relaxed">
              The deductibility of interest under a debt recycling arrangement turns on the ATO&apos;s purpose and tracing rules.
              Structural errors — drawing from the wrong loan account, mixing purposes, or incorrect documentation — can void the
              deduction on the entire drawn amount. This strategy is not suitable for everyone and must be implemented with guidance
              from a registered tax agent or tax adviser with specific expertise in this area.{" "}
              <strong>This guide is general information only and does not constitute tax advice.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ── 10. Choosing a structure ──────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Choosing a Holding Structure</h2>
          <p className="text-sm text-slate-500 mb-6">
            The structure in which you hold an investment property affects tax, asset protection, borrowing capacity, and estate
            planning. General overview only — seek advice from an accountant and licensed mortgage broker.
          </p>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mb-6">
            {STRUCTURES.map((s) => (
              <div key={s.title} className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900 text-sm mb-3">{s.title}</h3>
                <div className="mb-3">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Advantages</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.pros}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Considerations</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.cons}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 max-w-3xl">
            <p className="text-sm font-semibold text-blue-900 mb-1">Structure affects borrowing capacity</p>
            <p className="text-sm text-blue-800 leading-relaxed">
              Lenders assess serviceability differently depending on the borrowing entity. SMSF loans carry higher rates and lower
              maximum LVR. Trusts require lenders to count income distributions carefully and may be assessed less favourably than
              personal income. Structure decisions made for tax or estate planning can constrain your finance options — discuss with
              both an accountant and a licensed mortgage broker before committing to a structure.
            </p>
          </div>
        </div>
      </section>

      {/* ── 11. Step-by-step process ──────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">The Investment Property Loan Process</h2>
          <p className="text-sm text-slate-500 mb-6">Four stages from initial assessment to settlement.</p>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="w-9 h-9 bg-blue-700 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-1">{s.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12. FAQ ───────────────────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-100 bg-white">
                  {faq.q}
                  <span className="ml-3 flex-shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▼</span>
                </summary>
                <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed bg-white">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 13. NCCP referral CTA ─────────────────────────────────────────── */}
      <section className="py-12 bg-blue-50">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Speak to a Licensed Mortgage Broker</h2>
          <p className="text-slate-600 mb-2 max-w-xl mx-auto text-sm leading-relaxed">
            This guide is general information only and does not constitute credit assistance under the NCCP Act. A licensed mortgage
            broker can assess your specific borrowing capacity across 30+ lenders, compare investor loan products, and guide you
            through the application process — at no cost to you.
          </p>
          <p className="text-xs text-slate-500 mb-6 max-w-xl mx-auto">
            Credit assistance is provided by Australian Credit Licensees. invest.com.au refers borrowers to licensed mortgage brokers
            only. Speak to a licensed mortgage broker before making any borrowing decision.
          </p>
          <Link
            href="/advisors/mortgage-brokers"
            className="inline-block bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-800 transition-colors"
          >
            Find a Licensed Mortgage Broker
          </Link>
        </div>
      </section>

      {/* ── Related guides ────────────────────────────────────────────────── */}
      <section className="py-10 bg-white">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Related Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Negative Gearing Guide", href: "/negative-gearing" },
              { label: "Positive Gearing Guide", href: "/positive-gearing" },
              { label: "Interest-Only Home Loans", href: "/home-loans/interest-only" },
              { label: "Offset & Redraw Explained", href: "/home-loans/offset-redraw" },
              { label: "Lenders Mortgage Insurance", href: "/home-loans/lmi" },
              { label: "Home Loan Refinancing", href: "/home-loans/refinancing" },
              { label: "Fixed Rate Home Loans", href: "/home-loans/fixed" },
              { label: "Variable Rate Home Loans", href: "/home-loans/variable" },
              { label: "Compare Home Loans", href: "/home-loans/compare" },
              { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
              { label: "Find a Tax Agent", href: "/advisors/tax-agents" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 14. Compliance footer ─────────────────────────────────────────── */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl text-xs text-slate-500 space-y-2">
          <p>
            <strong>Credit disclaimer:</strong> invest.com.au is not licensed to provide credit assistance under the National
            Consumer Credit Protection Act 2009 (Cth). This page is general information only and does not constitute credit advice,
            a credit recommendation, or an offer of credit. All rate ranges, LVR figures, and cost estimates are indicative only and
            vary by lender, loan size, borrower profile, and market conditions. Consult a licensed mortgage broker or Australian
            Credit Licensee before making any borrowing decisions.
          </p>
          <p>
            <strong>Tax disclaimer:</strong> Tax information on this page is general in nature and does not constitute tax advice.
            Tax rules around interest deductibility, negative gearing, debt recycling, and holding structures may change. Consult a
            registered tax agent (Tax Practitioners Board) for advice specific to your circumstances.
          </p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
