import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Construction Loans Explained Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `Construction loans in Australia: progress drawdowns, the 5 build stages, eligibility, costs, key risks, and owner-builder restrictions. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Construction Loans Explained Australia (${CURRENT_YEAR})`,
    description: "How construction loans work: progress drawdowns, the 5 build stages, fixed-price contracts, eligibility, costs beyond the loan, and key risks.",
    url: `${SITE_URL}/home-loans/construction-loans`,
    images: [{ url: `/api/og?title=Construction+Loans+Explained`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/construction-loans` },
};

const HERO_STATS = [
  { label: "Funds released", value: "In 5 stages", sub: "Progress drawdowns" },
  { label: "Interest during build", value: "Draw-down only", sub: "Not the full loan amount" },
  { label: "Construction period", value: "12–24 months", sub: "Maximum before conversion" },
  { label: "Converts to", value: "Standard home loan", sub: "On practical completion" },
];

const COMPARISON_ROWS = [
  {
    feature: "Funds release",
    construction: "In stages (progress drawdowns)",
    standard: "Lump sum at settlement",
  },
  {
    feature: "Interest during build",
    construction: "Interest-only on drawn funds only",
    standard: "P&I on full amount from day 1",
  },
  {
    feature: "Repayments during build",
    construction: "Lower — interest-only on drawn amount",
    standard: "Full P&I from day 1",
  },
  {
    feature: "Flexibility",
    construction: "Adjusts to construction stages",
    standard: "No flexibility",
  },
  {
    feature: "Rate type",
    construction: "Usually variable (some fixed)",
    standard: "Variable or fixed available",
  },
  {
    feature: "Security",
    construction: "Land + house being built",
    standard: "Completed property",
  },
];

const BUILD_STAGES = [
  { stage: "Slab / base", work: "Foundation, slab poured", pct: "10–15%" },
  { stage: "Frame", work: "Walls and roof frame erected", pct: "20–25%" },
  { stage: "Lock-up", work: "Roof, external doors, windows", pct: "20–25%" },
  { stage: "Fixing / fit-out", work: "Internal fixtures, plastering, plumbing rough-in", pct: "25–30%" },
  { stage: "Completion / handover", work: "Practical completion, council sign-off", pct: "10–15%" },
];

const BEYOND_LOAN_COSTS = [
  { cost: "Council fees / development approval", typical: "$1,000–$5,000" },
  { cost: "Building permit", typical: "$1,000–$3,000" },
  { cost: "Engineering / plans / specs", typical: "$3,000–$15,000" },
  { cost: "Site costs (soil, slope, trees)", typical: "$5,000–$50,000+" },
  { cost: "Provisional sums overruns", typical: "10–20% budget contingency recommended" },
  { cost: "Progress inspection fees", typical: "$300–$500 each × 5 stages" },
];

const ELIGIBILITY_ITEMS = [
  {
    title: "Land titled in your name",
    desc: "The land must already be titled in your name, or land settlement must coincide with the construction loan start. Lenders will not advance funds against untitled land.",
  },
  {
    title: "Fixed-price building contract",
    desc: "Most lenders insist on a fixed-price contract with a licensed builder. This gives the lender certainty over the total construction cost and protects you from open-ended cost escalation.",
  },
  {
    title: "Licensed and insured builder",
    desc: "The lender will verify your builder holds a current builder's licence and holds adequate insurance, including public liability and home warranty (builder's warranty) insurance.",
  },
  {
    title: "Council-approved plans and building permit",
    desc: "Full council approval and a building permit must be in place before the first drawdown. Lenders will request copies of approved plans as part of the application.",
  },
  {
    title: "Deposit — land and construction",
    desc: "Typically 5–10% deposit on the land component and 5–10% of the construction cost. Requirements vary by lender and your overall LVR position.",
  },
];

const PROCESS_STEPS = [
  {
    step: 1,
    title: "Buy or own land",
    desc: "Construction loans require titled land. You can build on land you already own, or land and construction settlements can coincide if timed correctly.",
  },
  {
    step: 2,
    title: "Get building plans and council approval",
    desc: "Finalise architectural or design plans and obtain council development approval (DA) and a building permit before applying. Most lenders require approved plans at application.",
  },
  {
    step: 3,
    title: "Sign fixed-price contract with licensed builder",
    desc: "A fixed-price building contract locks in the total construction cost. Lenders require this to calculate the end-valuation and approve the loan amount.",
  },
  {
    step: 4,
    title: "Apply for construction loan",
    desc: "The lender orders an as-if-complete valuation — an estimate of what the finished property will be worth. Approval is based on this valuation, your deposit, and your serviceability.",
  },
  {
    step: 5,
    title: "Loan approved — first drawdown (slab stage)",
    desc: "Once approved and construction begins, you submit a progress claim after the slab is poured. The lender sends an inspector to verify work, then releases the first payment to your builder.",
  },
  {
    step: 6,
    title: "Progress drawdowns at each stage",
    desc: "Repeat the inspection and drawdown process at frame, lock-up, fixing, and completion stages. You only pay interest on the cumulative amount drawn — not the full loan balance.",
  },
  {
    step: 7,
    title: "Construction completes — loan converts",
    desc: "On practical completion, the construction loan converts to a standard principal and interest (or interest-only) home loan at the full approved amount.",
  },
  {
    step: 8,
    title: "Final inspection, certificate of occupancy, move in",
    desc: "A final building inspection confirms the home is complete. A certificate of occupancy (or occupancy permit) is issued, and you take possession of the property.",
  },
];

const RISK_CARDS = [
  {
    title: "Builder insolvency mid-construction",
    icon: "⚠️",
    desc: "If your builder becomes insolvent during construction, you may face significant delays and additional costs to find a replacement. Builder's warranty insurance (also called home warranty or domestic building insurance) is mandatory in most states and provides cover in this scenario — verify it is in place before signing your contract.",
  },
  {
    title: "Cost overruns on provisional sums",
    icon: "💸",
    desc: "Fixed-price contracts often include provisional sums (PS) for items where the exact cost is not yet known — site works, tiles, and joinery are common examples. These are not fixed. Actual costs frequently exceed the provisional estimate. Budget a 10–15% contingency on top of your contract price.",
  },
  {
    title: "Construction delays — interest period extends",
    icon: "📅",
    desc: "Most lenders cap the interest-only construction period at 12–24 months. Delays from weather, council approvals, or supply issues can push construction beyond this window, forcing a loan restructure or refinance before the home is finished.",
  },
  {
    title: "Untitled land settlement delays",
    icon: "📋",
    desc: "Some buyers purchase land in a new estate before it is titled. Titles can be delayed by 6–18 months beyond the original estimate. Your construction loan approval may lapse before the land even settles — check the expected title date carefully before committing.",
  },
  {
    title: "As-if-complete valuation shortfall",
    icon: "📉",
    desc: "Your lender values the completed home before approving the loan. If this as-if-complete valuation falls short of the actual build cost, the lender will only lend against their valuation. The shortfall comes out of your pocket — you may need additional savings to complete construction.",
  },
];

const FAQS = [
  {
    q: "Can I use a construction loan to build a duplex?",
    a: "Yes, construction loans can be used to build a duplex or dual-occupancy property. However, lender appetite for duplex construction is more selective than for a standard single dwelling. Some lenders treat a duplex as a residential construction loan; others classify it as a small development requiring a commercial or development finance product. The serviceability assessment, LVR cap, and required deposit may differ from a standard construction loan. A licensed mortgage broker experienced in construction finance can identify the most suitable lenders for a duplex build.",
  },
  {
    q: "What happens if my builder goes broke during construction?",
    a: "Builder insolvency during construction is the most serious risk in a construction loan. Builder's warranty insurance (called home warranty insurance, domestic building insurance, or residential building insurance depending on the state) provides cover if the builder dies, disappears, or becomes insolvent. This insurance is mandatory in most Australian states for residential building contracts above a certain value. Confirm the policy is current and adequate before construction begins. Your lender will also have processes for managing a claim and appointing a replacement builder, but costs and delays can be significant.",
  },
  {
    q: "Can I do some of the construction work myself?",
    a: "If you are not an owner-builder, you generally cannot do any of the construction work yourself — the lender requires all work to be completed by your licensed builder under the fixed-price contract. If you want to perform some work yourself (such as landscaping, painting, or fit-out after handover), this must be clearly excluded from the building contract and done after the final drawdown. Any work that forms part of the structural or approved build must be done by your licensed builder.",
  },
  {
    q: "Do I need a fixed-price contract to get a construction loan?",
    a: "Almost always yes. Most lenders will not approve a construction loan without a fixed-price building contract from a licensed builder. The fixed-price contract allows the lender to calculate the total construction cost, model the drawdown schedule, and confirm the loan amount against the as-if-complete valuation. A cost-plus contract (where you pay actual costs plus a margin) does not give the lender the certainty they require and will be declined by most mainstream lenders. Some specialist construction lenders may consider cost-plus on a case-by-case basis at stricter LVR limits.",
  },
  {
    q: "Can I use the First Home Owner Grant (FHOG) with a construction loan?",
    a: "Yes — the First Home Owner Grant (FHOG) is available on eligible new builds, and construction loans are the most common way to fund those builds. In most states, you are eligible for the FHOG when building a new home for the first time. The grant is typically paid at the slab stage (first drawdown), not at land settlement. FHOG amounts and eligibility criteria differ by state and territory and change periodically. Confirm the current FHOG amount and eligibility requirements with your state revenue office or a licensed mortgage broker before applying.",
  },
  {
    q: "What LVR do lenders require for construction loans?",
    a: "Most lenders approve construction loans up to 80% LVR (20% deposit across land and construction cost combined) without requiring lenders mortgage insurance (LMI). Some lenders will lend up to 90–95% LVR with LMI. The LVR is calculated against the lower of the total project cost (land + construction contract) or the as-if-complete valuation. If the lender's valuation of the completed home is lower than your actual costs, the effective LVR rises — this is why the valuation is a critical step in the approval process.",
  },
];

export default function ConstructionLoansPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Home Loans", url: absoluteUrl("/home-loans") },
    { name: "Construction Loans", url: absoluteUrl("/home-loans/construction-loans") },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white py-14">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-400 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Construction Loans</span>
          </nav>
          <div className="inline-block bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Construction Loans Explained
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mb-8">
            A construction loan (also called a building loan) funds the construction of a new home in stages — you only pay interest on the amount drawn, not the full loan. Here&apos;s how the 5 drawdown stages work, what you need to qualify, and the key risks to understand before you build.
          </p>
          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What is a construction loan */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What Is a Construction Loan?</h2>
          <p className="text-slate-600 mb-4">
            A construction loan is a specialised home loan used to fund the building of a new home. Unlike a standard home loan — where the lender advances the full purchase price at settlement — a construction loan releases funds in <strong>stages</strong> as construction progresses. These staged payments are called <strong>progress drawdowns</strong> or progressive drawdowns.
          </p>
          <p className="text-slate-600 mb-5">
            During the construction period, you only pay interest on the amount that has been drawn down. As each stage completes and more funds are released, your interest repayments gradually increase. Once construction is finished and the lender receives a certificate of practical completion, the loan converts to a standard principal and interest (or interest-only) home loan for the full approved amount.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-blue-900 mb-2">Why progress drawdowns matter</h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              On a $500,000 construction loan, you won&apos;t immediately owe interest on $500,000. After the first slab drawdown of ~$60,000, you pay interest on $60,000 only. By frame stage you might be at $160,000. This staged interest structure means your repayments are significantly lower during construction than on a fully drawn standard loan — which helps manage cash flow while you may also be paying rent.
            </p>
          </div>
        </div>
      </section>

      {/* Construction vs standard comparison */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Construction Loan vs Standard Home Loan</h2>
          <p className="text-sm text-slate-500 mb-6">The key structural differences between the two loan types.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Construction loan vs standard home loan comparison" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Feature</th>
                  <th scope="col" className="text-left px-5 py-3 text-blue-300">Construction loan</th>
                  <th scope="col" className="text-left px-5 py-3 text-slate-300">Standard home loan</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.feature}</td>
                    <td className="px-5 py-3 text-blue-700">{row.construction}</td>
                    <td className="px-5 py-3 text-slate-600">{row.standard}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* The 5 build stages */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">The 5 Construction Stages and Drawdowns</h2>
          <p className="text-sm text-slate-500 mb-6">
            Funds are released in 5 stages as construction progresses. Before each drawdown, your lender sends an independent inspector to verify that the stage is genuinely complete.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Construction stages and drawdown percentages" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Stage</th>
                  <th scope="col" className="text-left px-5 py-3">Work completed</th>
                  <th scope="col" className="text-left px-5 py-3">Typical % drawn</th>
                </tr>
              </thead>
              <tbody>
                {BUILD_STAGES.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-semibold text-slate-800">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold mr-2">
                        {i + 1}
                      </span>
                      {row.stage}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{row.work}</td>
                    <td className="px-5 py-3 font-semibold text-blue-700">{row.pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Drawdown percentages are indicative only and vary by lender and building contract. Your builder submits a progress claim at each stage — your lender verifies completion before releasing payment.
          </p>
        </div>
      </section>

      {/* Eligibility and requirements */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Eligibility and Requirements</h2>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
            {ELIGIBILITY_ITEMS.map((item) => (
              <div key={item.title} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Costs beyond the loan */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Costs Beyond the Loan</h2>
          <p className="text-sm text-slate-500 mb-6">
            The construction loan covers the builder&apos;s contract price — but there are significant costs outside the contract that borrowers frequently underestimate.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 max-w-3xl">
            <table aria-label="Construction costs beyond the loan" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Cost</th>
                  <th scope="col" className="text-left px-5 py-3">Typical amount</th>
                </tr>
              </thead>
              <tbody>
                {BEYOND_LOAN_COSTS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.cost}</td>
                    <td className="px-5 py-3 text-amber-700 font-semibold">{row.typical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-5 max-w-3xl">
            <h3 className="font-semibold text-amber-900 mb-2">Site costs — the most unpredictable item</h3>
            <p className="text-sm text-amber-800">
              Site costs cover the work needed to prepare your block for construction — soil testing, cut and fill for sloping blocks, tree removal, rock excavation, and retaining walls. On a flat, well-prepared block this may be $5,000–$10,000. On a steep or complex site it can exceed $50,000. Always get a soil test and site assessment before finalising your building contract.
            </p>
          </div>
        </div>
      </section>

      {/* Owner-builder */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Owner-Builder Construction Loans</h2>
          <p className="text-slate-600 mb-4">
            An owner-builder is a property owner who takes on the role of the builder themselves, rather than engaging a licensed building company under a fixed-price contract. Owner-builder construction loans exist — but are significantly more restricted than standard construction loans.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-5">
            <h3 className="font-bold text-amber-900 mb-2">Lender appetite is very limited</h3>
            <p className="text-amber-800 text-sm leading-relaxed">
              Most mainstream lenders will not lend to owner-builders at all. Those that do typically cap the loan at <strong>60% LVR</strong> and require the owner-builder to demonstrate significant, verifiable construction industry experience. The absence of a fixed-price contract from a licensed builder also means the lender has no reliable cost certainty for the drawdown schedule.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span>Owner-builder permits are issued by state building authorities and have their own requirements and caps on project value</li>
            <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span>Builder&apos;s warranty insurance is generally not available to owner-builders, creating a risk gap for future buyers</li>
            <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span>Owner-built homes can be harder to sell and refinance in future due to the lack of builder&apos;s warranty</li>
            <li className="flex items-start gap-2"><span className="text-slate-500 mt-0.5">•</span>Not recommended unless you have demonstrated, professional-level construction industry experience</li>
          </ul>
        </div>
      </section>

      {/* 8-step process */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">The Construction Loan Process — 8 Steps</h2>
          <p className="text-sm text-slate-500 mb-8">From land to loan conversion, here is how a typical construction loan progresses.</p>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
            {PROCESS_STEPS.map((step) => (
              <div key={step.step} className="bg-white rounded-xl border border-slate-200 p-6 flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key risks */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Risks to Understand</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {RISK_CARDS.map((r) => (
              <div key={r.title} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="text-2xl mb-3">{r.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{r.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50 bg-white">
                  {faq.q}
                  <span className="ml-3 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▼</span>
                </summary>
                <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed bg-white">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Speak with a Construction Loan Specialist</h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">
            Construction finance is more complex than a standard home loan. A licensed mortgage broker with construction loan experience can compare lenders, model your drawdown schedule, and guide you through the approval process at no cost to you.
          </p>
          <Link
            href="/advisors/mortgage-brokers"
            className="inline-block bg-slate-800 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-900 transition-colors"
          >
            Find a Licensed Mortgage Broker
          </Link>
        </div>
      </section>

      {/* Related links */}
      <section className="py-10 bg-white">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Explore More Home Loan Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Lenders Mortgage Insurance", href: "/home-loans/lmi" },
              { label: "Bridging Finance", href: "/home-loans/bridging-finance" },
              { label: "Refinancing Guide", href: "/home-loans/refinancing" },
              { label: "Variable vs Fixed Rate", href: "/home-loans/variable" },
              { label: "Fixed Rate Guide", href: "/home-loans/fixed" },
              { label: "Offset & Redraw", href: "/home-loans/offset-redraw" },
              { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance footer */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl text-xs text-slate-500 space-y-2">
          <p>
            <strong>Credit disclaimer:</strong> This information is general in nature and does not constitute credit advice. Credit assistance is provided by licensed credit providers. You should consider whether any credit product is appropriate for your circumstances before applying. invest.com.au is not licensed to provide credit assistance under the National Consumer Credit Protection Act 2009 (Cth). Consult a licensed mortgage broker or Australian Credit Licensee for advice specific to your situation.
          </p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
