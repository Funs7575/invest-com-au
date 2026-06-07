import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Redundancy Payout: How It's Taxed & What to Do (${CURRENT_YEAR}) | Invest.com.au`,
  description:
    "A redundancy payout is often the biggest lump sum you'll receive. Understand the genuine redundancy tax-free threshold, ETP tax, unused leave, the super opportunity and what to do with the money first.",
  alternates: { canonical: `${SITE_URL}/lump-sum-investing/redundancy` },
  openGraph: {
    title: "Redundancy Payout: How It's Taxed & What to Do With the Money",
    description:
      "Genuine vs non-genuine redundancy, the tax-free threshold, ETP caps, the super top-up and the cash buffer that comes first.",
    url: `${SITE_URL}/lump-sum-investing/redundancy`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Investing Redundancy Pay Australia")}&sub=${encodeURIComponent("ETP Tax · Super · Where to Invest · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

// ─── Data (plain strings — apostrophes/quotes stored as plain chars) ───

const PAYMENT_COMPONENTS: { title: string; text: string; tax: string }[] = [
  {
    title: "Genuine redundancy tax-free amount",
    text: "A capped portion of a genuine redundancy payment that is completely tax-free. The cap scales with your years of service.",
    tax: "Tax-free up to the limit",
  },
  {
    title: "Employment Termination Payment (ETP)",
    text: "Any redundancy amount above the tax-free limit, plus other termination amounts like a gratuity or payment in lieu of notice.",
    tax: "Concessional rates up to the ETP cap, then top marginal rate",
  },
  {
    title: "Unused annual leave",
    text: "Accrued annual leave that is paid out on termination. Shown separately on your income statement.",
    tax: "Concessional — capped at 32% for a genuine redundancy",
  },
  {
    title: "Unused long service leave",
    text: "Accrued long service leave paid out on termination. Pre-1993 accruals can attract an even lower rate.",
    tax: "Concessional — capped at 32% for a genuine redundancy",
  },
  {
    title: "Salary, wages and bonuses owing",
    text: "Ordinary pay for work already done, plus any contractual bonus or commission owed up to your finish date.",
    tax: "Taxed as normal income at your marginal rate",
  },
];

const PAYOUT_OPTIONS: { option: string; bestFor: string; watchOut: string }[] = [
  {
    option: "Emergency buffer (cash / HISA)",
    bestFor: "The job-search period — 3 to 6 months (or more) of living costs kept liquid",
    watchOut: "Returns are low, but capital certainty is the whole point while you are out of work",
  },
  {
    option: "High-interest debt reduction",
    bestFor: "Credit cards and personal loans charging 15-22% — a guaranteed, risk-free return",
    watchOut: "Don't clear an offsettable mortgage at the expense of your cash buffer",
  },
  {
    option: "Super contribution",
    bestFor: "Reducing the tax on a big income year if you don't need the money before preservation age",
    watchOut: "Locked until preservation age — never lock up cash you may need while job-hunting",
  },
  {
    option: "Invest in ETFs / shares",
    bestFor: "Surplus you won't touch for 7+ years, after the buffer and debt are handled",
    watchOut: "Don't invest money you may need within 5 years — market timing risk is real",
  },
  {
    option: "Mortgage offset account",
    bestFor: "Owner-occupiers — keeps the cash accessible while saving non-deductible interest",
    watchOut: "Confirm it is a genuine offset, not a redraw, so the funds stay available",
  },
  {
    option: "Education / retraining",
    bestFor: "Reskilling for a faster or higher-paid return to work",
    watchOut: "Treat it as an investment in earning capacity, not a consolation purchase",
  },
];

const FIRST_STEPS: { step: string; text: string }[] = [
  {
    step: "Top up the emergency fund",
    text: "Aim for 3-6 months of household running costs in cash — and lean towards the higher end, because being unemployed is exactly when you can't rely on income to refill it.",
  },
  {
    step: "Clear high-interest debt",
    text: "Paying off a 20% credit card is a guaranteed 20% return with zero risk. Do this before any market investment.",
  },
  {
    step: "Ring-fence the job-search cash",
    text: "Keep enough liquid to cover the realistic time to your next role at similar seniority — often longer than people expect.",
  },
  {
    step: "Don't rush to invest",
    text: "The market will still be there in three months. Park surplus in a high-interest savings account while you make a plan with a clear head.",
  },
];

const STEP_BY_STEP: { step: string; text: string }[] = [
  {
    step: "Understand your payment components",
    text: "Get the payment breakdown in writing and identify the tax-free amount, the ETP, unused leave and ordinary pay. Each line is taxed differently.",
  },
  {
    step: "Set aside the tax",
    text: "A large ETP can push your taxable income into a higher bracket. Estimate the tax and quarantine it in cash so you are not caught short at lodgement.",
  },
  {
    step: "Build the emergency fund",
    text: "Fill the cash buffer to 3-6 months of expenses before anything else. This is your runway while you find the next role.",
  },
  {
    step: "Pay down high-interest debt",
    text: "Knock out credit cards and personal loans. The interest saved is a guaranteed return that beats most investments.",
  },
  {
    step: "Assess the super opportunity",
    text: "If you don't need the money before preservation age, a concessional contribution can cut the tax on a spiked income year — mind the caps.",
  },
  {
    step: "Invest the surplus for the long term",
    text: "Only what is left after the buffer, debt and any super top-up. Use a diversified, low-cost portfolio and a 7+ year horizon.",
  },
  {
    step: "Seek advice for large amounts",
    text: "For sizeable payouts, a tax agent and a financial planner usually pay for themselves several times over.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How much of my redundancy payment is tax-free?",
    a: "For a genuine redundancy in 2024-25, a base amount of $12,524 plus $6,264 for each completed year of service is tax-free. For example, 10 completed years gives $12,524 + ($6,264 x 10) = $75,164 tax-free. Any amount above that limit is treated as an employment termination payment (ETP) and taxed concessionally up to the ETP cap.",
  },
  {
    q: "How is an Employment Termination Payment taxed?",
    a: "The taxable component of an ETP — the part above the genuine redundancy tax-free limit — is taxed at concessional rates up to the ETP cap ($245,000 for 2024-25). If you are under preservation age the rate is 30% plus the Medicare levy; at or over preservation age it is 15% plus Medicare. Anything above the cap is taxed at the top marginal rate.",
  },
  {
    q: "Should I put my redundancy payout into super?",
    a: "It can be a smart way to reduce tax in a high-income year, because concessional contributions are taxed at 15% inside super rather than your marginal rate. But the concessional cap is $30,000 (including any salary sacrifice already made) and the non-concessional cap is $120,000 — exceeding them triggers extra tax. Critically, super is locked until preservation age, so never contribute money you might need while you are job-hunting.",
  },
  {
    q: "Will my redundancy payment affect my Centrelink payments?",
    a: "It can. Centrelink applies an income maintenance period — a waiting period roughly equal to the period your redundancy and leave payments are taken to cover — before payments like JobSeeker start. During that period the payout is treated as income. Check your specific situation with Centrelink before assuming you'll qualify for benefits straight away.",
  },
  {
    q: "What should I do with my redundancy money first?",
    a: "First, set aside the tax you'll owe. Then top up your emergency fund to 3-6 months of expenses, pay off high-interest debt like credit cards, and keep enough cash for the job-search period. Only invest the surplus once those foundations are in place — and never rush a large decision while you are stressed.",
  },
];

export default function RedundancyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Lump Sum Investing", url: absoluteUrl("/lump-sum-investing") },
    { name: "Redundancy", url: absoluteUrl("/lump-sum-investing/redundancy") },
  ]);
  const faqSchema = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="bg-white min-h-screen">
        {/* ─── Hero ─────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <Link href="/lump-sum-investing" className="hover:text-white">
                Lump Sum Investing
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Redundancy</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Redundancy Payout: How It&apos;s Taxed and What to Do With the Money ({CURRENT_YEAR}{" "}
              Guide)
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-4">
              A redundancy payout is often the largest single lump sum a person ever receives — and
              how it&apos;s taxed and what you do with it matters enormously. The most important
              first distinction is between a <strong className="text-white">genuine</strong> and a{" "}
              <strong className="text-white">non-genuine</strong> redundancy, because only a genuine
              redundancy unlocks the generous tax-free threshold.
            </p>
            <p className="text-xs text-slate-400">{UPDATED_LABEL}</p>
          </div>
        </section>

        {/* ─── Why it matters ───────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              Why a redundancy payout deserves careful handling
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              A payout is rarely &quot;clean&quot; money: it&apos;s a bundle of components, each with
              its own tax treatment, arriving in a year when your income may also be unusually high
              or about to drop to nothing. Get the sequence right and the money buys breathing room,
              kills expensive debt and can even cut your tax bill. Get it wrong and you can hand a
              chunk back to the ATO, lock cash away when you need it most, or panic-invest at the
              worst possible moment. This guide covers how each part is taxed, the genuine versus
              non-genuine distinction, what to do with the money first, the super and Centrelink
              angles, and a step-by-step plan.
            </p>
          </div>
        </section>

        {/* ─── Components of a redundancy payment ───────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              The components of a redundancy payment
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6 max-w-3xl">
              A &quot;redundancy payout&quot; is almost never a single number. It&apos;s made up of
              several parts, and each one is taxed differently — which is why your take-home is far
              less than the headline figure.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm" aria-label="Redundancy payment components and how each is taxed">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">Component</th>
                    <th scope="col" className="px-4 py-3 font-bold">What it is</th>
                    <th scope="col" className="px-4 py-3 font-bold">How it&apos;s taxed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PAYMENT_COMPONENTS.map((c) => (
                    <tr key={c.title} className="align-top">
                      <td className="px-4 py-3 font-semibold text-slate-900">{c.title}</td>
                      <td className="px-4 py-3 text-slate-600 leading-relaxed">{c.text}</td>
                      <td className="px-4 py-3 text-slate-600 leading-relaxed">{c.tax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── Genuine redundancy tax-free threshold ────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              The genuine redundancy tax-free threshold (2024-25)
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              The headline concession for a genuine redundancy is a tax-free amount that grows with
              your length of service. For the 2024-25 year it is:
            </p>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 mb-4">
              <p className="text-base font-bold text-emerald-900 mb-1">
                Base amount $12,524 + $6,264 per completed year of service
              </p>
              <p className="text-sm text-emerald-800 leading-relaxed">
                Everything up to this limit is completely tax-free. Anything above it is treated as
                an employment termination payment (ETP) and taxed concessionally (see below).
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Worked example — 10 years of service</h3>
              <ul className="text-sm text-slate-700 leading-relaxed space-y-1">
                <li>Base amount: <strong>$12,524</strong></li>
                <li>Service component: $6,264 x 10 years = <strong>$62,640</strong></li>
                <li>
                  Tax-free limit: $12,524 + $62,640 = <strong>$75,164 tax-free</strong>
                </li>
              </ul>
              <p className="text-sm text-slate-700 leading-relaxed mt-3">
                If this person received a $95,000 genuine redundancy payment, the first $75,164 is
                tax-free and the remaining $19,836 is taxed as an ETP at concessional rates.
              </p>
            </div>
          </div>
        </section>

        {/* ─── ETP taxation ─────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              How an Employment Termination Payment (ETP) is taxed
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              The taxable component of an ETP — broadly, the redundancy amount above the genuine
              redundancy tax-free limit, plus other eligible termination payments — gets concessional
              treatment, but only up to a cap.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-900 mb-1">Under preservation age</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The taxable component is taxed at <strong>30% plus the Medicare levy</strong> up to
                  the ETP cap.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-900 mb-1">At or over preservation age</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The taxable component is taxed at <strong>15% plus the Medicare levy</strong> up to
                  the ETP cap.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-sm text-amber-900 leading-relaxed">
                <strong>The ETP cap is $245,000 for 2024-25.</strong> The concessional rates above
                apply only up to this cap. Any taxable ETP amount above the cap is taxed at the{" "}
                <strong>top marginal rate</strong> (plus Medicare). For most redundancies the cap is
                never reached, but for senior, long-tenured or highly paid roles it can bite — which
                is one reason large payouts warrant tailored tax advice.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Genuine vs non-genuine ───────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              Genuine vs non-genuine redundancy — and why it matters
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6 max-w-3xl">
              The tax-free threshold only applies to a <em>genuine</em> redundancy. If your departure
              is classed as non-genuine, the whole payment is taxed far less generously — so this
              distinction can swing your outcome by tens of thousands of dollars.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-2">Genuine redundancy</h3>
                <ul className="text-sm text-emerald-800 leading-relaxed space-y-1.5 list-disc pl-5">
                  <li>Your position is genuinely abolished and not filled by someone else.</li>
                  <li>You are dismissed before reaching age 65 (or earlier compulsory retirement age).</li>
                  <li>The payment is at arm&apos;s length (no special deal because you are related to the employer).</li>
                  <li>There is no arrangement to re-hire you after termination.</li>
                </ul>
                <p className="text-xs text-emerald-700 mt-3 font-semibold">
                  Result: the tax-free threshold applies.
                </p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
                <h3 className="font-extrabold text-rose-900 mb-2">Non-genuine redundancy</h3>
                <ul className="text-sm text-rose-800 leading-relaxed space-y-1.5 list-disc pl-5">
                  <li>You resign voluntarily.</li>
                  <li>Your fixed-term contract simply ends.</li>
                  <li>You retire or leave at or after age 65.</li>
                  <li>You are dismissed for reasons unrelated to your role being abolished.</li>
                </ul>
                <p className="text-xs text-rose-700 mt-3 font-semibold">
                  Result: no tax-free threshold — taxed as an ETP or ordinary income.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mt-6 max-w-3xl">
              Because the classification drives the tax, it&apos;s worth confirming how your payment
              is treated <em>before</em> you sign any deed of release — ideally with a tax agent.
            </p>
          </div>
        </section>

        {/* ─── Unused leave taxation ────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              How unused leave is taxed
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              Unused annual leave and unused long service leave paid out on termination are not taxed
              like ordinary salary. Where the payout is part of a genuine redundancy, these amounts
              attract a <strong>concessional flat rate capped at 32%</strong> — typically lower than
              the marginal rate a higher earner would otherwise pay on the same money.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              These amounts are shown <strong>separately</strong> on your income statement / payment
              summary from your ordinary wages and from the ETP, and long service leave accrued
              before certain historical dates can be taxed even more favourably. The practical
              takeaway: don&apos;t assume your leave payout is taxed at your normal marginal rate —
              for a genuine redundancy it usually isn&apos;t, and that changes how much net cash
              actually lands in your account.
            </p>
          </div>
        </section>

        {/* ─── What to do FIRST ─────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              What to do first — before you invest a cent
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6 max-w-3xl">
              The single most common — and most expensive — redundancy mistake is rushing the money
              into the market. Before any investment decision, work through these foundations in
              order.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIRST_STEPS.map((s, i) => (
                <div key={s.step} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">{s.step}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{s.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Options for the payout (table) ───────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              Where the payout can go
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6 max-w-3xl">
              Most redundancy payouts end up split across several of these. The right mix depends on
              your debts, how long your job search might take, and your time horizon.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm" aria-label="Where a redundancy payout can go — investment options, best use and watch-outs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">Option</th>
                    <th scope="col" className="px-4 py-3 font-bold">Best for</th>
                    <th scope="col" className="px-4 py-3 font-bold">Watch out for</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PAYOUT_OPTIONS.map((o) => (
                    <tr key={o.option} className="align-top">
                      <td className="px-4 py-3 font-semibold text-slate-900">{o.option}</td>
                      <td className="px-4 py-3 text-slate-600 leading-relaxed">{o.bestFor}</td>
                      <td className="px-4 py-3 text-slate-600 leading-relaxed">{o.watchOut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── Super contribution strategy ──────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              The super contribution strategy
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              A redundancy often lands in a year of high taxable income, which makes super
              attractive: concessional contributions are taxed at just 15% inside super instead of
              your marginal rate, and a personal contribution can be claimed as a tax deduction. Used
              well, this can meaningfully reduce the tax on the payout.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 mb-4">
              <ul className="text-sm text-slate-700 leading-relaxed space-y-2">
                <li>
                  <strong>Concessional cap — $30,000:</strong> this includes employer contributions
                  and any salary sacrifice you have already made this year, so be careful not to
                  exceed it. Unused cap from prior years may be available via carry-forward if your
                  total super balance is low enough.
                </li>
                <li>
                  <strong>Non-concessional cap — $120,000:</strong> after-tax contributions sit under
                  a separate, larger cap (with bring-forward rules for larger amounts).
                </li>
                <li>
                  <strong>The deduction:</strong> a personal deductible contribution reduces your
                  assessable income — but you must lodge a valid notice of intent with your fund.
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <p className="text-sm text-rose-900 leading-relaxed">
                <strong>The catch:</strong> super is locked until you reach preservation age. If you
                are out of work, do not lock up money you may need to live on while you find your
                next role. Super is for surplus you genuinely won&apos;t touch — not your job-search
                runway.
              </p>
            </div>
            <Link href="/super/contributions" className="mt-4 inline-block text-sm font-bold text-slate-900 hover:underline">
              Super contribution rules &rarr;
            </Link>
          </div>
        </section>

        {/* ─── Investing the surplus ────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              Investing the surplus
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              Only the money left over <em>after</em> your emergency fund, high-interest debt and
              job-search cash buffer should be considered for investing. Once you are at that point,
              the usual principles apply: a diversified, low-cost portfolio — broad-market ETFs are a
              common starting point — held for the long term.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              A key decision is whether to invest the lump sum all at once or to spread it out via
              dollar-cost averaging. Historically, investing a lump sum sooner tends to win on
              average because markets rise more often than they fall, but staggering entries can
              reduce regret and smooth the ride if markets are volatile or you are anxious about
              timing.
            </p>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 mb-4">
              <p className="text-sm text-amber-900 leading-relaxed">
                <strong>The 5-year rule of thumb:</strong> money you might need within five years
                generally shouldn&apos;t be in growth assets. A market downturn just as you need to
                sell — which is far more likely while you are between jobs — can turn a paper dip
                into a permanent loss.
              </p>
            </div>
            <Link href="/invest/lump-sum-vs-dca" className="inline-block text-sm font-bold text-slate-900 hover:underline">
              Lump sum vs dollar-cost averaging &rarr;
            </Link>
          </div>
        </section>

        {/* ─── Centrelink implications ──────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              Centrelink and the income maintenance period
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              A redundancy payout can affect your eligibility for payments like JobSeeker. Centrelink
              applies an <strong>income maintenance period</strong> — a waiting period based on the
              size of your payout — during which your redundancy and leave payments are treated as
              ongoing income rather than a one-off lump sum.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              In practical terms, if your payout is taken to cover, say, several months of pay, you
              may not be able to claim certain benefits until that period has elapsed. This catches a
              lot of people who assume support will start the moment their job ends.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Check your specific circumstances with Centrelink (Services Australia) before relying
              on any benefit, and factor any waiting period into how long your cash buffer needs to
              last.
            </p>
          </div>
        </section>

        {/* ─── Tax planning ─────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              Tax planning for the spike year
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              The year you receive a large ETP, your taxable income can spike — potentially pushing
              part of your income into a higher marginal bracket. A few levers can soften the blow:
            </p>
            <ul className="text-sm text-slate-700 leading-relaxed space-y-2 mb-3 list-disc pl-5">
              <li>
                <strong>Deductible super contributions</strong> to reduce assessable income in the
                same year (within the caps).
              </li>
              <li>
                <strong>Timing of other income</strong> — where you have any control, deferring
                discretionary income out of the spike year can help.
              </li>
              <li>
                <strong>Bringing forward deductions</strong> — prepaying deductible expenses or
                making deductible donations in the high-income year.
              </li>
            </ul>
            <p className="text-sm text-slate-700 leading-relaxed">
              For a large payout, the tax saved from getting this right usually dwarfs the cost of an
              hour with a tax agent. Treat professional tax advice as part of the payout, not an
              optional extra.
            </p>
          </div>
        </section>

        {/* ─── Emotional / behavioural ──────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              Don&apos;t let stress drive the decision
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              Redundancy is one of life&apos;s more stressful events, and money decisions made under
              stress tend to be poor ones. Two opposite traps are common: panic — fire-selling
              assets or grabbing the first job at any pay — and the splurge — treating the payout as
              a bonus and spending it before the reality of being unemployed sets in.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              The antidote is time and a plan. Park the money somewhere safe, give yourself a few
              weeks before any big financial move, and write down a simple plan covering tax, buffer,
              debt and the longer term. A financial plan during a transition is less about maximising
              returns and more about avoiding an irreversible mistake while you are not at your best.
            </p>
          </div>
        </section>

        {/* ─── Step-by-step ─────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              The step-by-step plan
            </h2>
            <ol className="space-y-4">
              {STEP_BY_STEP.map((s, i) => (
                <li key={s.step} className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">{s.step}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── FAQ ──────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <summary className="cursor-pointer font-bold text-slate-900 list-none flex items-center justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─── General advice warning ───────────────────────── */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
          </div>
        </section>

        {/* ─── Related links ────────────────────────────────── */}
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/lump-sum-investing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                All lump sum guides &rarr;
              </Link>
              <Link href="/invest/lump-sum-vs-dca" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Lump sum vs DCA &rarr;
              </Link>
              <Link href="/lump-sum-investing/inheritance" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Investing an inheritance &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
