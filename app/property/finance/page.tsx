import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Financing an Investment Property in Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `How to finance an investment property: investor rates, interest-only vs P&I, offset accounts, borrowing capacity, and debt recycling. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Financing an Investment Property in Australia (${CURRENT_YEAR})`,
    description:
      "Investor loan rates, deposit and equity strategies, IO vs P&I, offset contamination, APRA serviceability buffers, debt recycling, cross-collateralisation risks, and the role of a mortgage broker.",
    url: `${SITE_URL}/property/finance`,
    images: [{ url: `/api/og?title=Financing+an+Investment+Property`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/property/finance` },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const LOAN_COMPARISON_ROWS = [
  {
    feature: "Interest rate",
    investor: "Typically 0.3–0.8% higher than the owner-occupier equivalent",
    ownerOcc: "Lowest rate tier — lenders compete hardest here",
  },
  {
    feature: "Maximum LVR",
    investor: "Usually 80% without LMI; some lenders to 90% with LMI",
    ownerOcc: "Commonly 80% without LMI; up to 95% with LMI",
  },
  {
    feature: "Interest deductibility",
    investor: "Interest is generally tax-deductible (investment purpose)",
    ownerOcc: "Interest is not deductible (private residence)",
  },
  {
    feature: "Interest-only availability",
    investor: "Widely offered; popular for cash-flow and tax reasons",
    ownerOcc: "Available but discouraged by lenders and APRA guidance",
  },
  {
    feature: "APRA serviceability buffer",
    investor: "Assessed at roughly the loan rate + 3%",
    ownerOcc: "Assessed at roughly the loan rate + 3%",
  },
  {
    feature: "Regulatory treatment",
    investor: "Higher capital weight under APRA; subject to past lending speed limits",
    ownerOcc: "Lower-risk category for lenders and regulatory capital",
  },
];

const DEPOSIT_SCENARIOS = [
  {
    deposit: "20%+ deposit",
    lvr: "80% LVR or lower",
    lmi: "No LMI payable",
    note: "The standard target for investors. Avoids LMI, unlocks the best rate tiers, and leaves a buffer against price falls.",
  },
  {
    deposit: "10–12% deposit",
    lvr: "88–90% LVR",
    lmi: "LMI payable (higher investor premium)",
    note: "Possible with some lenders, but investor LMI is dearer than owner-occupier and the higher rate stacks on top. The case weakens quickly above 85% LVR.",
  },
  {
    deposit: "Equity release",
    lvr: "Up to 80% on the existing home",
    lmi: "No LMI if the home stays at or below 80% LVR",
    note: "Use accumulated equity in your owner-occupied home as the deposit via a separate top-up loan split, rather than fresh cash.",
  },
];

const LOAN_STRUCTURES = [
  {
    title: "Interest-only (IO)",
    box: "border-blue-200 bg-blue-50",
    heading: "text-blue-900",
    text: "text-blue-800",
    body: "You pay only the interest for a set period (commonly 1–5 years), so monthly repayments are lower and the deductible interest is maximised. This preserves cash flow and is common among investors running a negative-gearing strategy. The trade-off is the IO-to-P&I reversion shock: when the IO period ends, repayments are recalculated as principal and interest over the shorter remaining term and can jump 25–35%. APRA has previously limited lenders' new IO lending, so IO availability and extensions are not guaranteed.",
  },
  {
    title: "Principal & interest (P&I)",
    box: "border-green-200 bg-green-50",
    heading: "text-green-900",
    text: "text-green-800",
    body: "Each repayment reduces the loan balance as well as covering interest, so you build equity from day one and pay less total interest over the life of the loan. P&I usually carries a lower rate than IO and is the structure lenders prefer. The deductible interest declines over time as the balance falls — fine for a long-term hold, less suited to a pure cash-flow play.",
  },
  {
    title: "Offset accounts",
    box: "border-amber-200 bg-amber-50",
    heading: "text-amber-900",
    text: "text-amber-800",
    body: "An offset account is a transaction account linked to the loan; the balance reduces the interest charged each day while keeping the cash accessible. The catch for investors is tax contamination: parking personal cash in an investment loan's offset reduces the interest you actually pay, which reduces your deduction. As a rule, direct surplus cash to an offset against your non-deductible home loan first, not the investment loan.",
  },
  {
    title: "Split loans",
    box: "border-slate-200 bg-white",
    heading: "text-slate-900",
    text: "text-slate-600",
    body: "A split loan divides the balance into a fixed-rate portion and a variable-rate portion. The fixed part gives repayment certainty; the variable part keeps flexibility (extra repayments, offset, redraw). Investors often split to hedge interest-rate movements without locking the whole loan, but break costs still apply to the fixed portion if you repay or refinance it early.",
  },
];

const BORROWING_CAPACITY_ROWS = [
  {
    factor: "Serviceability buffer",
    detail:
      "APRA requires lenders to test your ability to repay at roughly the actual loan rate plus a 3% buffer — so a 6.5% loan is assessed near 9.5%.",
  },
  {
    factor: "Rental income shading",
    detail:
      "Lenders count only about 70–80% of gross rent (some as low as 60%) to allow for vacancy, management fees, and maintenance.",
  },
  {
    factor: "Existing debts",
    detail:
      "All existing mortgages, personal and car loans, and the full limit (not balance) of every credit card are counted as commitments at a stressed rate.",
  },
  {
    factor: "Multiple properties",
    detail:
      "Each additional property adds its full assessed loan repayment but only shaded rent, so capacity tightens with every property even when each is cash-flow neutral.",
  },
  {
    factor: "Debt-to-income (DTI) ratio",
    detail:
      "Many lenders flag or decline applications above a total debt of around 6× gross income; APRA monitors high-DTI lending closely.",
  },
  {
    factor: "Lender variation",
    detail:
      "Shade rates, DTI limits, and treatment of negative-gearing tax benefits differ by lender — assessed capacity for the same applicant can vary by $100k–$300k.",
  },
];

const COMMON_MISTAKES = [
  {
    title: "Cross-collateralising everything",
    desc: "Linking every property as combined security limits your ability to sell or refinance one without the lender's consent and can drag the whole portfolio down when one property falls in value.",
  },
  {
    title: "Parking cash in the wrong offset",
    desc: "Holding surplus cash in an investment loan's offset reduces deductible interest. Offset against the non-deductible home loan first.",
  },
  {
    title: "Choosing IO without an exit plan",
    desc: "Interest-only is a tool, not a default. Without a plan for the P&I reversion — or for a possible declined IO extension — the repayment jump can catch investors short.",
  },
  {
    title: "No cash buffer",
    desc: "Vacancies, repairs, and rate rises happen. Running an investment property with no liquidity buffer turns a manageable shortfall into a forced sale.",
  },
  {
    title: "Over-leveraging on optimistic growth",
    desc: "Building a portfolio on the assumption that values only rise leaves no margin for error. When prices fall, a highly geared portfolio can slide into negative equity.",
  },
];

const FAQS = [
  {
    q: "How much deposit do I need for an investment property?",
    a: "Most investors aim for a 20% deposit so the loan is at 80% LVR or below, which avoids lenders mortgage insurance (LMI) and unlocks the better rate tiers. A smaller deposit of around 10–12% is possible with some lenders, but you pay LMI on top — and the investor LMI premium is higher than the owner-occupier equivalent. Because the investor rate is already above the owner-occupier rate, borrowing above 85% LVR adds up quickly. Many investors instead use equity in an existing property as the deposit rather than fresh cash. This is general information only — a licensed mortgage broker can model the deposit and LVR options across lenders for your situation.",
  },
  {
    q: "Can I use my home equity to buy an investment property?",
    a: "Often, yes. If your owner-occupied home has grown in value, you may be able to access usable equity — typically up to 80% LVR on the home without triggering LMI — by adding a separate loan split secured against it. The released funds become the deposit (and often the stamp duty) for the investment purchase. Structured correctly as a standalone split rather than cross-collateralised, this keeps your loans independent, and the interest on the investment-purpose portion is generally tax-deductible under the ATO's purpose test. Confirm the structure with a registered tax agent and a licensed mortgage broker before proceeding. See our guide on accessing home equity for more.",
  },
  {
    q: "Should I choose interest-only or principal and interest for an investment loan?",
    a: "It depends on your strategy, not on a universal rule. Interest-only keeps repayments lower and maximises the deductible interest — useful if you are negatively gearing and want to preserve cash flow. Principal and interest reduces the balance from day one, builds equity faster, and usually carries a lower rate. Many investors run IO in the early years and move to P&I as rent rises, but they plan for the reversion shock when IO ends and repayments are recalculated over a shorter term. Both are general loan products; the right choice is personal. Speak to a licensed mortgage broker and a registered tax agent to model which suits you.",
  },
  {
    q: "Is the interest on an investment loan tax-deductible?",
    a: "Generally, yes — interest on a loan used to buy an income-producing investment property is tax-deductible. The key point is that the loan purpose determines deductibility, not what the loan is secured against. A loan secured by your home but used to buy an investment can be deductible; a loan secured by the investment but redrawn for private use can lose deductibility on that portion. Mixing purposes in one loan account, or redrawing for personal spending, can contaminate the deduction under the ATO's interest-tracing rules. This is general information, not tax advice — confirm deductibility with a registered tax agent for your circumstances.",
  },
  {
    q: "What is debt recycling?",
    a: "Debt recycling is a strategy that gradually converts non-deductible home loan debt into deductible investment debt. You make extra repayments on your owner-occupied (non-deductible) mortgage, then re-borrow those repaid funds through a separate investment loan split and invest them in an income-producing asset. Over time the non-deductible portion shrinks while the deductible investment debt grows, even though total debt stays roughly the same. It is powerful but complex: the deductibility turns on the ATO's purpose and tracing rules, and a structural error can void the deduction. It requires discipline and, ideally, advice from a registered tax agent. This guide is general information only and does not constitute tax or credit advice.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertyFinancePage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Property", item: `${SITE_URL}/property` },
      {
        "@type": "ListItem",
        position: 3,
        name: "Property Finance",
        item: `${SITE_URL}/property/finance`,
      },
    ],
  };
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

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

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-14">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-blue-200 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/property" className="hover:text-white transition-colors">Property</Link>
            <span>/</span>
            <span className="text-white">Property Finance</span>
          </nav>

          <div className="inline-block bg-blue-800 text-blue-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Financing an Investment Property in Australia
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mb-2">
            Financing an investment property is not the same as taking out a home loan. The rates
            are higher, the deposit and equity rules differ, the tax treatment changes everything,
            and the borrowing strategies that build a portfolio carry risks an owner-occupier never
            faces. {UPDATED_LABEL}.
          </p>
          <p className="text-sm text-blue-200 max-w-2xl mb-8">
            This guide covers investor rates and LVR caps, deposits and equity, loan structures, APRA
            serviceability, tax deductibility, debt recycling, using equity to build a portfolio, and
            the role of a mortgage broker — all general information, not credit advice.
          </p>

          {/* Key numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { stat: "0.3–0.8%", sub: "Investor rate loading vs owner-occupier" },
              { stat: "80% LVR", sub: "Typical investor cap without LMI" },
              { stat: "70–80%", sub: "Rental income counted by lenders" },
              { stat: "+3%", sub: "APRA serviceability buffer above the loan rate" },
            ].map((item) => (
              <div
                key={item.stat}
                className="bg-blue-800 rounded-xl p-4 border border-blue-700"
              >
                <p className="text-xl font-bold text-white mb-0.5">{item.stat}</p>
                <p className="text-xs text-blue-300">{item.sub}</p>
              </div>))}</div>
        </div>
      </div>

      {/* ── 1. Why investment finance is different ───────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Why Financing an Investment Property Is Different
          </h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            When you borrow to buy a home you live in, the lender competes hard for your business and
            the loan is straightforward: borrow, repay, build equity. An investment loan sits in a
            different risk and tax category, and that changes four things at once.
          </p>
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            {[
              {
                title: "Different rates",
                desc: "Investor loans carry a rate loading of roughly 0.3–0.8% over the owner-occupier equivalent, because APRA requires lenders to hold more capital against them and investors are statistically more likely to sell in a downturn.",
              },
              {
                title: "Different deposit requirements",
                desc: "Lenders prefer investors at 80% LVR or below. You can go higher with LMI, but investor LMI is dearer and the rate already starts higher — so a 20% deposit (or equity equivalent) is the practical target.",
              },
              {
                title: "Different tax treatment",
                desc: "Interest on an investment loan is generally tax-deductible, which flips the maths on offset accounts, redraw, and how aggressively you pay down the loan. The owner-occupier rulebook does not apply.",
              },
              {
                title: "Different borrowing strategies",
                desc: "Investors use interest-only structures, equity releases, and debt recycling to manage cash flow and tax — tools that come with reversion shocks, contamination traps, and leverage risk if used without a plan.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5"
              >
                <h3 className="font-semibold text-slate-900 text-sm mb-2">{card.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
              </div>))}</div>
          <p className="text-xs text-slate-500 italic">
            General information only. Rates, lender policies, and APRA guidance change over time.
            Consult a licensed mortgage broker for current, lender-specific information.
          </p>
        </div>
      </section>

      {/* ── 2. Investment loan vs owner-occupier table ───────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Investment Loan vs Owner-Occupier Loan</h2>
          <p className="text-sm text-slate-500 mb-6">
            How the two loan types compare across the features that matter most. Figures are
            indicative and vary by lender, LVR, and loan size.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Investment loan vs owner-occupier loan comparison" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Feature</th>
                  <th scope="col" className="text-left px-5 py-3">Investment loan</th>
                  <th scope="col" className="text-left px-5 py-3">Owner-occupier loan</th>
                </tr>
              </thead>
              <tbody>
                {LOAN_COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800 align-top w-44">{row.feature}</td>
                    <td className="px-5 py-3 text-blue-700 text-xs leading-relaxed align-top">
                      {row.investor}
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs leading-relaxed align-top">
                      {row.ownerOcc}
                    </td>
                  </tr>))}</tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Indicative ranges based on publicly available market data. Individual lender pricing and
            policy vary. General information only — not a credit recommendation.
          </p>
        </div>
      </section>

      {/* ── 3. Deposit and equity ────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Deposit and Equity: How Much You Need</h2>
          <p className="text-slate-600 mb-5 leading-relaxed">
            The conventional target is a 20% deposit so the loan sits at 80% LVR and you avoid
            lenders mortgage insurance. A smaller deposit of around 10–12% is possible with LMI, but
            the premium is higher for investors and stacks on top of an already higher rate.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
            <table aria-label="Deposit and equity requirements for investment loans" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700">Deposit</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700">Resulting LVR</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700">LMI</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {DEPOSIT_SCENARIOS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800 align-top">{row.deposit}</td>
                    <td className="px-5 py-3 text-slate-600 align-top">{row.lvr}</td>
                    <td className="px-5 py-3 text-slate-600 align-top">{row.lmi}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs leading-relaxed align-top">{row.note}</td>
                  </tr>))}</tbody>
            </table>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-3">Using equity in your existing home</h3>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Many investors never save a cash deposit at all. Instead they tap the equity that has
            built up in their owner-occupied home. If your home is worth more than you owe, the
            usable equity (typically up to 80% LVR on the home, without LMI) can be released as a
            separate <strong>top-up loan split</strong> or equity release and used as the deposit and
            stamp duty for the investment purchase.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5">
            <h4 className="font-semibold text-red-900 text-sm mb-2">Cross-collateralisation risk</h4>
            <p className="text-xs text-red-800 leading-relaxed">
              The risk to avoid is letting the lender take both properties as combined security
              (cross-collateralisation). It feels convenient, but it ties the two properties
              together: selling or refinancing one requires the lender&apos;s consent, and a fall in
              one property&apos;s value can reduce the borrowing supported by both. The safer
              structure is a standalone equity release split on the home that funds the deposit,
              leaving each loan independent.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/property/equity-access"
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              Accessing Home Equity &rarr;
            </Link>
            <Link
              href="/advisors/mortgage-brokers"
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              Find a Mortgage Broker &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. Loan structures ───────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Loan Structures for Investors</h2>
          <p className="text-sm text-slate-500 mb-6">
            The structure you choose shapes your cash flow, your tax position, and your flexibility.
            These are the four building blocks most investor loans are made from.
          </p>
          <div className="grid md:grid-cols-2 gap-5 max-w-5xl">
            {LOAN_STRUCTURES.map((s) => (
              <div key={s.title} className={`rounded-xl border p-5 ${s.box}`}>
                <h3 className={`font-bold text-sm mb-2 ${s.heading}`}>{s.title}</h3>
                <p className={`text-xs leading-relaxed ${s.text}`}>{s.body}</p>
              </div>))}</div>
        </div>
      </section>

      {/* ── 5. Borrowing capacity ────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Borrowing Capacity for Investors</h2>
          <p className="text-sm text-slate-500 mb-6">
            How much you can borrow as an investor is rarely what a simple repayment calculator
            suggests. Each of these factors shapes your assessed capacity.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
            <table aria-label="Borrowing capacity factors for property investors" className="w-full text-sm">
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
                  </tr>))}</tbody>
            </table>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 max-w-3xl">
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Why each extra property gets harder to finance
            </p>
            <p className="text-sm text-blue-800 leading-relaxed">
              Because lenders count the full assessed repayment of every existing loan but only a
              shaded portion of each property&apos;s rent, your assessed capacity tightens with every
              property you add — even when each one is broadly cash-flow neutral in reality. Combined
              with a debt-to-income ceiling of around 6&times; income at many lenders, this is why
              portfolio investors so often rely on a broker to find the lender whose serviceability
              model fits their position.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Tax deductibility ─────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Tax Deductibility of Investment Loan Interest
          </h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Interest on a loan used to buy an income-producing investment property is generally
            tax-deductible. The single most important principle is that the <strong>loan purpose
            determines deductibility — not what the loan is secured against</strong>. A loan secured
            by your home but used to buy an investment can be deductible; a loan secured by the
            investment but redrawn for a holiday is not deductible on that portion.
          </p>

          <div className="space-y-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Redraw vs offset for tax purposes</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The ATO treats redraw and offset differently. Redrawing repaid funds from an
                investment loan for private use is treated as a new borrowing for a private purpose
                and can contaminate the deductibility of the loan under interest-tracing rules. An
                offset account avoids this because the offset balance is legally separate from the
                loan — you can withdraw it without changing the loan&apos;s purpose. Keep purposes
                cleanly separated and get tax advice before mixing them.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="font-semibold text-amber-900 text-sm mb-2">
                Capitalising interest — Part IVA risk
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Some arrangements try to capitalise investment loan interest (letting it accrue while
                directing cash elsewhere) to amplify deductions. The ATO has applied the general
                anti-avoidance provisions in Part IVA to schemes whose dominant purpose is a tax
                benefit. This is high-risk territory and must not be attempted without specific
                advice from a registered tax agent.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 italic mb-4">
            Tax rules around interest deductibility are set by the ATO and may change with
            legislation. Always confirm deductibility with a registered tax agent for your specific
            circumstances.
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/tax/negative-gearing"
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              Negative Gearing Guide &rarr;
            </Link>
            <Link
              href="/advisors/tax-agents"
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              Find a Registered Tax Agent &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. Debt recycling ────────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Debt Recycling</h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Debt recycling converts non-deductible home loan debt into deductible investment debt over
            time. The logic: every dollar you pay off your home loan is then re-borrowed for
            investment purposes. The non-deductible balance shrinks while the deductible investment
            debt grows — total debt stays roughly the same, but the proportion that is tax-deductible
            climbs.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6">
            <div className="bg-slate-800 text-white px-5 py-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">How debt recycling works — step by step</p>
            </div>
            <ol className="p-5 space-y-3">
              {[
                "Make extra repayments on your owner-occupied (non-deductible) home loan to pay down a dedicated split.",
                "Re-borrow those repaid funds through a separate investment loan split secured against the same property.",
                "Invest the drawn funds in an income-producing asset — shares, managed funds, or an investment property deposit.",
                "The interest on the drawn amount is now deductible against your investment income.",
                "Repeat as further repayments accumulate, steadily shifting debt from non-deductible to deductible.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>{step}</li>
              ))}
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-amber-900 mb-2">Powerful, but complex — get advice first</p>
            <p className="text-sm text-amber-800 leading-relaxed">
              Debt recycling can be effective, but it demands discipline and ideally tax and financial
              advice. The deductibility turns on the ATO&apos;s purpose and tracing rules; drawing
              from the wrong account, mixing purposes, or poor documentation can void the deduction on
              the entire drawn amount. It is not suitable for everyone and should be implemented with
              a registered tax agent.{" "}
              <strong>This guide is general information only and does not constitute tax advice.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ── 8. Using equity to build a portfolio ─────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Using Equity to Build a Portfolio</h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            The classic portfolio playbook is to let one property&apos;s rising equity fund the
            deposit on the next. As property A grows in value, the investor releases equity (via a
            standalone split) and uses it as the deposit for property B, then repeats. Done carefully,
            it lets you grow without saving a fresh cash deposit each time.
          </p>
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <div className="bg-white border border-red-100 rounded-xl p-5">
              <h3 className="font-semibold text-red-900 text-sm mb-2">The risk of a highly geared portfolio</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Funding deposits from equity means borrowing against borrowing. A highly geared
                portfolio is sensitive to rate rises and rent gaps, and serviceability tightens with
                each property. The strategy quietly assumes values keep climbing.
              </p>
            </div>
            <div className="bg-white border border-red-100 rounded-xl p-5">
              <h3 className="font-semibold text-red-900 text-sm mb-2">What happens when values fall</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If prices fall, equity-funded deposits can leave you in negative equity — owing more
                than the properties are worth. Lenders may then revalue, reduce facility limits, or
                decline further releases, leaving the portfolio stuck at the worst possible time.
              </p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-blue-900 mb-1">Cash buffers are not optional</p>
            <p className="text-sm text-blue-800 leading-relaxed">
              The investors who survive a downturn are the ones holding a cash buffer — months of
              repayments set aside to cover vacancies, repairs, and rate rises across every property.
              An equity-built portfolio without a buffer is one bad quarter away from a forced sale.
              Stress-test the portfolio against higher rates and lower values before adding the next
              property.
            </p>
          </div>
        </div>
      </section>

      {/* ── 9. Lenders and products ──────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Lenders and Products</h2>
          <p className="text-slate-600 mb-5 leading-relaxed">
            Investor finance is not confined to the big four banks. The lending market spans three
            broad tiers, each with different appetite, pricing, and policy for investors.
          </p>
          <div className="space-y-4 mb-6">
            {[
              {
                title: "Major banks",
                desc: "The big four offer the widest investor product range and competitive rates for strong applicants, but apply conservative serviceability and tighter policy when their investor book is full.",
              },
              {
                title: "Second-tier lenders",
                desc: "Regional banks and mid-sized lenders often have more flexible servicing or niche policies (e.g. better treatment of trust income or multiple properties) and can be sharper on certain investor products.",
              },
              {
                title: "Non-bank lenders",
                desc: "Non-banks fund outside the deposit base and can serve borrowers the majors decline — useful for complex structures or higher DTI, usually at a higher rate to reflect the risk.",
              },
            ].map((tier) => (
              <div
                key={tier.title}
                className="flex items-start gap-4 bg-slate-50 border border-slate-200 rounded-xl p-5"
              >
                <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                  &bull;
                </span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-1">{tier.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{tier.desc}</p>
                </div>
              </div>))}</div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-blue-900 mb-1">Why investors so often use a broker</p>
            <p className="text-sm text-blue-800 leading-relaxed">
              Every lender loads investor rates and assesses serviceability differently, and the gap
              widens as your portfolio grows. A mortgage broker can compare investor products across
              30+ lenders and match your specific position — multiple properties, trust income,
              equity release — to the lender most likely to approve it on the best terms. The more
              complex the serviceability, the more valuable that comparison becomes.
            </p>
          </div>
        </div>
      </section>

      {/* ── 10. Fixed vs variable for investors ──────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Fixed vs Variable for Investors</h2>
          <p className="text-slate-600 mb-5 leading-relaxed">
            The fixed-versus-variable decision is the same trade-off investors and owner-occupiers
            both face — certainty against flexibility — but for investors it interacts with tax,
            offset strategy, and the timing of any planned sale.
          </p>
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Fixed rate</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Locks the rate and the repayment for a set term, which makes cash flow predictable —
                helpful when modelling a negatively geared position. The cost is flexibility: fixed
                loans usually limit extra repayments and offset, and breaking a fixed loan early
                triggers <strong>break costs</strong> that can be substantial when rates have fallen.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Variable rate</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Moves with the market, so repayments can rise or fall, but you keep full access to
                offset, redraw, and unlimited extra repayments. Variable suits investors who want to
                run an offset strategy or who may sell before a fixed term would expire.
              </p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-amber-900 mb-1">Watch the sale-timing interaction</p>
            <p className="text-sm text-amber-800 leading-relaxed">
              If you expect to sell within a few years, a fixed term that runs past the sale date can
              leave you paying break costs at settlement. Investors planning an exit often keep that
              portion variable, or split the loan so the fixed term aligns with the intended hold
              period.
            </p>
          </div>
        </div>
      </section>

      {/* ── 11. Common mistakes ──────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Common Mistakes to Avoid</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Most investor finance regrets trace back to the same handful of avoidable mistakes. Each
            one is structural — easy to prevent before settlement, expensive to unwind afterwards.
          </p>
          <div className="space-y-4">
            {COMMON_MISTAKES.map((m) => (
              <div
                key={m.title}
                className="flex items-start gap-4 bg-slate-50 border border-red-100 rounded-xl p-5"
              >
                <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold">
                  !
                </span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-1">{m.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{m.desc}</p>
                </div>
              </div>))}</div>
        </div>
      </section>

      {/* ── 12. The role of a mortgage broker ────────────────────────────── */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">The Role of a Mortgage Broker</h2>
          <p className="text-slate-600 mb-5 leading-relaxed">
            A mortgage broker is a credit professional who compares loans across a panel of lenders on
            your behalf. For investors the appeal is twofold: access and expertise.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mb-6">
            {[
              {
                title: "Access to 30+ lenders",
                desc: "Brokers compare investor products across a broad lender panel, including second-tier and non-bank lenders you might not approach directly.",
              },
              {
                title: "Serviceability expertise",
                desc: "Brokers understand the nuances of investor serviceability — shade rates, DTI ceilings, trust income — and which lender suits your position.",
              },
              {
                title: "Lender-paid, free to you",
                desc: "Under the NCCP framework, brokers are paid a commission by the lender, so their service is generally free to the borrower.",
              },
            ].map((card) => (
              <div key={card.title} className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-900 text-sm mb-2">{card.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
              </div>))}</div>
          <p className="text-slate-600 mb-5 leading-relaxed text-sm">
            <strong>When DIY vs a broker makes sense:</strong> if you have a single, simple
            investment loan at a comfortable LVR and a relationship with your existing bank, going
            direct can be straightforward. As soon as the picture gets complex — multiple properties,
            tightening serviceability, equity releases, trust or company structures — the
            cross-lender comparison a broker provides usually outweighs going it alone.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Find a Licensed Mortgage Broker</h3>
            <p className="text-sm text-slate-600 mb-4 max-w-xl mx-auto leading-relaxed">
              We can connect you with licensed mortgage brokers who compare investor loans across the
              market. This is a referral only — invest.com.au does not provide credit assistance.
            </p>
            <Link
              href="/advisors/mortgage-brokers"
              className="inline-block bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-800 transition-colors"
            >
              Browse Mortgage Brokers
            </Link>
          </div>
        </div>
      </section>

      {/* ── 13. FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50 bg-white">
                  {faq.q}
                  <span className="ml-3 flex-shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">
                    &#9660;
                  </span>
                </summary>
                <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed bg-white">{faq.a}</div>
              </details>))}</div>
        </div>
      </section>

      {/* ── 14. NCCP referral CTA ────────────────────────────────────────── */}
      <section className="py-12 bg-blue-50">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Speak to a Licensed Mortgage Broker</h2>
          <p className="text-slate-600 mb-2 max-w-xl mx-auto text-sm leading-relaxed">
            This guide is general information only and does not constitute credit assistance under the
            NCCP Act. A licensed mortgage broker can assess your borrowing capacity across the market,
            compare investor loan products, and explain your options.
          </p>
          <p className="text-xs text-slate-500 mb-6 max-w-xl mx-auto">
            Credit assistance is provided by Australian Credit Licensees. invest.com.au refers
            borrowers to licensed mortgage brokers only and may receive a referral fee. Speak to a
            licensed mortgage broker before making any borrowing decision.
          </p>
          <Link
            href="/advisors/mortgage-brokers"
            className="inline-block bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-800 transition-colors"
          >
            Find a Licensed Mortgage Broker
          </Link>
        </div>
      </section>

      {/* ── Related guides ───────────────────────────────────────────────── */}
      <section className="py-10 bg-white">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Related Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Investment Property Loans", href: "/home-loans/investment" },
              { label: "Accessing Home Equity", href: "/property/equity-access" },
              { label: "Negative Gearing Guide", href: "/tax/negative-gearing" },
              { label: "Property Depreciation", href: "/property/depreciation" },
              { label: "Positive Gearing", href: "/property/positive-gearing" },
              { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
              { label: "Find a Tax Agent", href: "/advisors/tax-agents" },
              { label: "Find a Buyer's Agent", href: "/property/buyer-agents" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                {l.label}
              </Link>))}</div>
        </div>
      </section>

      {/* ── 15. Compliance footer ────────────────────────────────────────── */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl text-xs text-slate-500 space-y-2">
          <p>
            <strong>Credit disclaimer:</strong> This guide is general information only and does not
            constitute credit assistance under the NCCP Act. Speak to a licensed mortgage broker
            before making any borrowing decisions. invest.com.au is not licensed to provide credit
            assistance under the National Consumer Credit Protection Act 2009 (Cth); this page is not
            credit advice, a credit recommendation, or an offer of credit. All rate ranges, LVR
            figures, and cost estimates are indicative only and vary by lender, loan size, borrower
            profile, and market conditions.
          </p>
          <p>
            <strong>Tax disclaimer:</strong> Tax information on this page is general in nature and
            does not constitute tax advice. Rules around interest deductibility, negative gearing, and
            debt recycling may change. Consult a registered tax agent (Tax Practitioners Board) for
            advice specific to your circumstances.
          </p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
