import Link from "next/link";
import type { Metadata } from "next";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  UPDATED_LABEL,
  SITE_URL,
} from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import Icon from "@/components/Icon";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Fixed Rate Home Loans in Australia: Complete Guide (${CURRENT_YEAR})`,
  description:
    "Fixed rate home loans in Australia explained — how they work, break costs, rate lock fees, split loan strategies, and when fixing beats variable.",
  alternates: { canonical: "/home-loans/fixed" },
  openGraph: {
    title: `Fixed Rate Home Loans Australia — Complete Guide (${CURRENT_YEAR})`,
    description:
      "Break costs, rate lock fees, split loans, RBA cycle risk, and two worked examples. Make an informed decision before you lock in.",
    url: `${SITE_URL}/home-loans/fixed`,
    images: [
      {
        url: "/api/og?title=Fixed+Rate+Home+Loans&subtitle=The+complete+Australian+guide&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
};

// ─── data ────────────────────────────────────────────────────────────────────

const COMPARISON_ROWS = [
  {
    feature: "Rate certainty",
    fixed: "Locked for 1–10 years — repayments never change during the fixed term",
    variable: "Moves with the RBA cash rate — can fall or rise at any time",
  },
  {
    feature: "Extra repayments",
    fixed: "Usually capped (e.g. $10,000–$20,000/yr) or completely prohibited",
    variable: "Unlimited extra repayments allowed on most loans",
  },
  {
    feature: "Break costs",
    fixed: "Potentially large if rates have fallen since you fixed (economic cost formula)",
    variable: "None — you can refinance or pay off the loan at any time",
  },
  {
    feature: "Offset account",
    fixed: "Rarely available; some lenders offer partial or capped offset on fixed portions",
    variable: "Full 100% offset accounts widely available",
  },
  {
    feature: "Redraw facility",
    fixed: "Usually not available during the fixed period",
    variable: "Generally available — access extra repayments as needed",
  },
  {
    feature: "Refinancing flexibility",
    fixed: "Restricted — break costs can make early exit expensive",
    variable: "High — switch lenders or products with minimal penalty",
  },
  {
    feature: "Typical rate premium",
    fixed: "Often 0.10–0.50% above comparable variable rates (market-dependent)",
    variable: "Benchmark rate; fixed is priced relative to this",
  },
];

const FAQ_ITEMS = [
  {
    q: "Can I make extra repayments on a fixed rate loan?",
    a: "Most lenders cap extra repayments on fixed rate loans at $10,000–$20,000 per year. Exceeding the cap may incur a fee or simply be refused. If paying down your loan faster is a priority, consider a split loan — keep 30–50% variable for uncapped extra repayments while fixing the rest for certainty.",
  },
  {
    q: "What happens when my fixed rate period ends?",
    a: "At expiry your loan rolls onto the lender's standard variable rate (the 'revert rate'), which is often higher than the discounted variable rate offered to new customers. You typically receive a notification 60–90 days before expiry. Use that window to refinance or negotiate a new rate — do not let it automatically revert without comparison-shopping.",
  },
  {
    q: "Is there a fee to lock in a fixed rate before settlement?",
    a: "Yes. Most lenders charge a rate lock fee — typically 0.15%–0.20% of the loan amount — to guarantee the quoted fixed rate for 60–90 days while your application is processed. On a $600,000 loan at 0.15%, that is $900. Without rate lock, the rate that applies is the one available on settlement day, which could be higher if rates rise during processing.",
  },
  {
    q: "How do I know if a fixed rate is right for me right now?",
    a: "Fixed rates tend to suit borrowers who: (a) need budget certainty and cannot absorb rate rises; (b) plan to stay in the property for the full fixed term without selling; and (c) believe rates will rise over the coming years. If the RBA has recently peaked and market consensus is for cuts, locking in at the peak can be expensive — you miss the cuts while the fixed rate stays the same. Speaking with a licensed mortgage broker will help you model the trade-offs for your specific situation.",
  },
  {
    q: "Can I refinance out of a fixed rate home loan?",
    a: "Yes, but you may face a break cost. If wholesale interest rates have fallen since you fixed, the lender's economic cost — and therefore your break cost — can be substantial (sometimes tens of thousands of dollars on a $500,000+ loan). If rates have risen since you fixed, the break cost is typically zero. Always request a written break cost estimate from your lender before deciding to refinance.",
  },
  {
    q: "What is the difference between a 3-year and a 5-year fixed rate?",
    a: "Longer fixed terms give you certainty for more years but carry more risk if you need to exit early (larger potential break costs) and if rates fall (you miss the savings for longer). Shorter terms (1–3 years) are more popular in Australia because they balance certainty with flexibility. The RBA cutting cycle historically plays out within 12–24 months of the cash-rate peak, meaning a 5-year fixed term entered at the peak could cost you in net interest for several years.",
  },
];

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Home Loans", url: absoluteUrl("/home-loans") },
  { name: "Fixed Rate Home Loans" },
]);

const faqLd = faqJsonLd(FAQ_ITEMS);

// ─── page ────────────────────────────────────────────────────────────────────

export default function FixedRateHomeLoanPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <article className="py-5 md:py-12">
        <div className="container-custom max-w-3xl">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <Link href="/home-loans" className="hover:text-slate-900">Home Loans</Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Fixed Rate</span>
          </nav>

          {/* Hero */}
          <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-4 leading-tight">
            Fixed Rate Home Loans in Australia
          </h1>
          <p className="text-sm md:text-lg text-slate-500 mb-1 leading-relaxed">
            Lock in your repayments for 1–10 years. Understand break costs, rate lock fees,
            split strategies, and whether fixing makes sense at this point in the RBA cycle.
          </p>
          <p className="text-xs text-slate-500 mb-6 md:mb-10">{UPDATED_LABEL}</p>

          {/* Key stats */}
          <div className="grid grid-cols-3 gap-3 mb-6 md:mb-10">
            {[
              { stat: "1–10 yrs", label: "typical fixed terms available" },
              { stat: "0.15–0.20%", label: "rate lock fee range" },
              { stat: "$0", label: "break cost if rates rise" },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 text-center"
              >
                <div className="text-lg md:text-2xl font-extrabold text-slate-900">
                  {item.stat}
                </div>
                <div className="text-[0.58rem] md:text-xs text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>

          {/* ── Section 1: What is a fixed rate? ─────────────────────────── */}
          <h2 className="text-base md:text-xl font-bold text-slate-900 mb-2 md:mb-3">
            What Is a Fixed Rate Home Loan?
          </h2>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3">
            A fixed rate home loan locks your interest rate — and therefore your minimum monthly
            repayment — for a set period. In Australia the most common terms are 1, 2, 3, and
            5 years, though some lenders offer up to 10 years. At the end of the fixed term
            the loan rolls onto the lender&apos;s variable rate (the &quot;revert rate&quot;) unless you
            refinance or fix again.
          </p>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-6 md:mb-10">
            During the fixed period, your rate does not move regardless of what the Reserve Bank
            of Australia (RBA) does to the cash rate. If rates rise, you benefit. If rates fall,
            you miss the savings — and exiting early can cost you significantly via break costs.
          </p>

          {/* ── Section 2: Fixed vs Variable comparison table ─────────────── */}
          <h2 className="text-base md:text-xl font-bold text-slate-900 mb-3">
            Fixed vs Variable: Side-by-Side
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 md:mb-10">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-2.5 md:p-4" />
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5">
                  <Icon name="lock" size={13} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">Fixed Rate</span>
                </div>
              </div>
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5">
                  <Icon name="trending-up" size={13} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">Variable Rate</span>
                </div>
              </div>
            </div>
            {COMPARISON_ROWS.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 border-b border-slate-100 last:border-b-0 ${
                  i % 2 === 0 ? "" : "bg-slate-50/50"
                }`}
              >
                <div className="p-2.5 md:p-4 flex items-start">
                  <span className="text-[0.62rem] md:text-xs font-bold text-slate-700">
                    {row.feature}
                  </span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.fixed}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.variable}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Section 3: Break costs explained ─────────────────────────── */}
          <h2 className="text-base md:text-xl font-bold text-slate-900 mb-2 md:mb-3">
            Break Costs Explained
          </h2>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3">
            A break cost (also called an early exit fee or economic cost) is charged when you
            exit a fixed rate loan before the term ends — whether by refinancing, selling the
            property, switching to variable, or making repayments above the allowed cap.
          </p>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3">
            The cost reflects the lender&apos;s loss from having to reinvest your funds at a lower
            rate than you originally agreed to pay. The <strong>economic cost formula</strong> is
            broadly:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 md:p-4 mb-3">
            <p className="text-[0.68rem] md:text-xs text-slate-700 font-mono leading-relaxed">
              Break Cost ≈ (Fixed Rate − Current Wholesale Rate) × Loan Balance × Remaining Years
            </p>
          </div>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3">
            The key insight: <strong>break costs only apply when rates have fallen since you fixed</strong>.
            If rates have risen, you owe nothing to exit — the lender can relend at a higher rate
            and suffers no loss.
          </p>

          {/* Break cost worked examples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 md:mb-10">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="check-circle" size={16} className="text-emerald-600 shrink-0" />
                <span className="text-xs md:text-sm font-bold text-emerald-900">Zero break cost</span>
              </div>
              <p className="text-[0.68rem] md:text-xs text-emerald-800 leading-relaxed mb-2">
                You fixed $400,000 at <strong>5.5%</strong>. Wholesale rates have since risen to
                6.5%. You want to exit early.
              </p>
              <p className="text-[0.68rem] md:text-xs text-emerald-800 leading-relaxed">
                The lender can relend your funds at 6.5% — a higher rate than you were paying.
                No economic loss to the lender. <strong>Break cost = $0</strong>.
              </p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="alert-triangle" size={16} className="text-rose-600 shrink-0" />
                <span className="text-xs md:text-sm font-bold text-rose-900">Significant break cost</span>
              </div>
              <p className="text-[0.68rem] md:text-xs text-rose-800 leading-relaxed mb-2">
                You fixed $400,000 at <strong>6.5%</strong>. Wholesale rates have since fallen to
                5.5%. Two years remain.
              </p>
              <p className="text-[0.68rem] md:text-xs text-rose-800 leading-relaxed">
                Rate differential: 1.0%. Indicative cost ≈ $400,000 × 1.0% × 2 = <strong>~$8,000</strong>.
                Actual cost may differ — always get a written quote from your lender.
              </p>
            </div>
          </div>

          {/* When break costs apply */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5 mb-6 md:mb-10">
            <h3 className="text-xs md:text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
              <Icon name="info" size={15} className="text-amber-600" />
              When Break Costs Apply
            </h3>
            <ul className="space-y-1.5 text-[0.68rem] md:text-xs text-amber-800">
              {[
                "Refinancing to another lender before the fixed term ends",
                "Selling your property and discharging the mortgage",
                "Switching from fixed to variable early",
                "Making extra repayments above your annual cap",
                "Paying off the loan in full ahead of schedule",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5 shrink-0">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Section 4: Rate lock fee ──────────────────────────────────── */}
          <h2 className="text-base md:text-xl font-bold text-slate-900 mb-2 md:mb-3">
            Rate Lock Fee: Lock In the Rate at Application
          </h2>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3">
            When you apply for a fixed rate loan, there is typically a gap of 30–90 days between
            your application and settlement. Without a rate lock, the fixed rate that applies is
            the one available on <em>settlement day</em> — not the one advertised when you applied.
            If rates rise in that window, you pay more.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-5 mb-3">
            <h3 className="text-xs md:text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Icon name="shield" size={15} className="text-blue-600" />
              Rate Lock in Practice
            </h3>
            <ul className="space-y-2 text-[0.68rem] md:text-xs text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 shrink-0 font-bold">Cost:</span>
                <span>Typically 0.15%–0.20% of the loan amount, paid upfront</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 shrink-0 font-bold">Duration:</span>
                <span>Locks the rate for 60–90 days (lender-specific)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 shrink-0 font-bold">Example:</span>
                <span>
                  On a $600,000 loan at 0.15% = $900 rate lock fee. If rates rise 0.25% before
                  settlement, you save ~$1,500/year — the fee pays for itself in months.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 shrink-0 font-bold">Non-refundable:</span>
                <span>
                  Generally non-refundable if you withdraw from the purchase — factor this into
                  your decision, especially for off-the-plan purchases with uncertain settlement dates.
                </span>
              </li>
            </ul>
          </div>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-6 md:mb-10">
            Rate lock is optional but worth considering if you are purchasing in a rising rate
            environment or your settlement date is uncertain (common for new builds or off-the-plan).
          </p>

          {/* ── Section 5: Split loan strategy ───────────────────────────── */}
          <h2 className="text-base md:text-xl font-bold text-slate-900 mb-2 md:mb-3">
            Split Loan Strategy: The Best of Both Worlds
          </h2>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3">
            A split loan divides your mortgage into two portions: one fixed, one variable. The
            most common split for owner-occupiers is <strong>50–70% fixed</strong> for repayment
            certainty and <strong>30–50% variable</strong> to retain access to an offset account,
            unlimited extra repayments, and refinancing flexibility.
          </p>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
              <span className="text-xs font-bold text-slate-700">Example: $600,000 split loan</span>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-3 px-4 py-2.5">
                <span className="text-[0.68rem] md:text-xs font-bold text-slate-500 col-span-1">Portion</span>
                <span className="text-[0.68rem] md:text-xs font-bold text-slate-500 col-span-1">Amount</span>
                <span className="text-[0.68rem] md:text-xs font-bold text-slate-500 col-span-1">Features</span>
              </div>
              <div className="grid grid-cols-3 px-4 py-2.5">
                <span className="text-[0.68rem] md:text-xs text-slate-700 font-medium">Fixed (60%)</span>
                <span className="text-[0.68rem] md:text-xs text-slate-600">$360,000</span>
                <span className="text-[0.68rem] md:text-xs text-slate-600">Locked rate, predictable repayments</span>
              </div>
              <div className="grid grid-cols-3 px-4 py-2.5 bg-slate-50/50">
                <span className="text-[0.68rem] md:text-xs text-slate-700 font-medium">Variable (40%)</span>
                <span className="text-[0.68rem] md:text-xs text-slate-600">$240,000</span>
                <span className="text-[0.68rem] md:text-xs text-slate-600">Offset account, unlimited extra repayments</span>
              </div>
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-2">
            The variable portion can hold an offset account — so any savings parked there reduce
            the interest charged on that portion. If you receive a bonus or windfall, you can
            deposit it straight into the offset without triggering break costs on the fixed portion.
          </p>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-6 md:mb-10">
            Splits can be adjusted at origination — discuss your options with a mortgage broker
            before settlement, as you generally cannot restructure easily once the loan is drawn.
          </p>

          {/* ── Section 6: When fixed beats variable ─────────────────────── */}
          <h2 className="text-base md:text-xl font-bold text-slate-900 mb-3">
            When Does a Fixed Rate Beat Variable?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 md:mb-10">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h3 className="text-xs md:text-sm font-bold text-emerald-900 mb-2 flex items-center gap-2">
                <Icon name="check-circle" size={16} className="text-emerald-600" />
                Fixed likely suits you if&hellip;
              </h3>
              <ul className="space-y-1.5 text-[0.68rem] md:text-xs text-emerald-800">
                {[
                  "You need budget certainty — tight household cash flow can't absorb rate rises",
                  "You plan to stay in the property for the full fixed term",
                  "You believe rates are more likely to rise than fall over the next 1–3 years",
                  "Fixed income / salary income with no room for repayment increases",
                  "You don't rely on an offset account and don't plan to make large extra repayments",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5 shrink-0">&#x2713;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <h3 className="text-xs md:text-sm font-bold text-rose-900 mb-2 flex items-center gap-2">
                <Icon name="x-circle" size={16} className="text-rose-600" />
                Variable likely suits you if&hellip;
              </h3>
              <ul className="space-y-1.5 text-[0.68rem] md:text-xs text-rose-800">
                {[
                  "You plan to sell the property within the next 2–3 years",
                  "You want to use an offset account to reduce interest",
                  "You expect a large lump-sum payment (bonus, inheritance, asset sale)",
                  "Rates are near a peak and cuts are likely in the medium term",
                  "You value flexibility and may want to refinance to a better deal",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-600 mt-0.5 shrink-0">&#x2715;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Section 7: RBA cycle context ─────────────────────────────── */}
          <h2 className="text-base md:text-xl font-bold text-slate-900 mb-2 md:mb-3">
            RBA Cycle Timing: Why Locking at the Peak Is Risky
          </h2>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3">
            Australia&apos;s cash rate has historically moved in cycles — rising sharply during
            inflationary periods before being cut as growth slows. In most modern cycles, the
            RBA has begun cutting within <strong>12–24 months of the peak</strong>.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5 mb-3">
            <h3 className="text-xs md:text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
              <Icon name="alert-triangle" size={15} className="text-amber-600" />
              The peak-fix trap
            </h3>
            <p className="text-[0.68rem] md:text-xs text-amber-800 leading-relaxed">
              If you fix a 5-year rate at the top of a rate cycle, you could be paying an
              above-market rate for 3–4 of those years as variable rates fall around you.
              A shorter 1–2 year fix near the peak lets you benefit sooner from any rate cuts
              without the large break cost exposure of a longer term.
            </p>
          </div>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-6 md:mb-10">
            No one can time the cycle perfectly. The practical approach is to fix a shorter term
            (1–2 years) if you believe rates are near a peak, and revisit your strategy at expiry.
            A mortgage broker can help you weigh current fixed vs variable pricing against your
            personal risk tolerance and holding horizon.
          </p>

          {/* ── Section 8: Worked examples ───────────────────────────────── */}
          <h2 className="text-base md:text-xl font-bold text-slate-900 mb-3">
            Worked Examples
          </h2>
          <div className="space-y-4 mb-6 md:mb-10">

            {/* Example 1 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2.5 flex items-center gap-2">
                <Icon name="home" size={14} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-900">
                  Example 1: Budget-conscious family fixing a 3-year rate
                </span>
              </div>
              <div className="p-4 space-y-2 text-[0.68rem] md:text-xs text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-800">Situation:</strong> The Nguyen family has a
                  $550,000 P&amp;I mortgage. Both parents are salaried (combined ~$150,000), with
                  two young children. Their repayment budget is tight — a 1% rate rise would
                  cost an extra $450/month, which would be difficult to absorb.
                </p>
                <p>
                  <strong className="text-slate-800">Decision:</strong> Fix 70% ($385,000) at
                  6.19% for 3 years; keep 30% ($165,000) on variable with an offset account.
                  Rate lock fee paid at application ($578).
                </p>
                <p>
                  <strong className="text-slate-800">Outcome:</strong> The fixed portion gives
                  predictable monthly repayments. Salary credits and savings park in the offset,
                  reducing interest on the variable portion. If rates fall in year 2, they
                  benefit partially through the variable split. At year 3 expiry, they reassess
                  and negotiate a new rate.
                </p>
              </div>
            </div>

            {/* Example 2 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-violet-50 border-b border-violet-100 px-4 py-2.5 flex items-center gap-2">
                <Icon name="trending-up" size={14} className="text-violet-600" />
                <span className="text-xs font-bold text-violet-900">
                  Example 2: Investor locking an interest-only (IO) period
                </span>
              </div>
              <div className="p-4 space-y-2 text-[0.68rem] md:text-xs text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-800">Situation:</strong> An investor holds a
                  $700,000 investment property with an IO loan. They want cost certainty for
                  their cash-flow modelling during a 5-year property hold period.
                </p>
                <p>
                  <strong className="text-slate-800">Decision:</strong> Fix the IO loan at
                  6.49% for 2 years, matching the expected sale timeline. The lower IO
                  repayment (interest-only, no principal) maximises rental cash flow. Break
                  cost risk is acceptable because the investor does not intend to sell before
                  the 2-year period ends.
                </p>
                <p>
                  <strong className="text-slate-800">Tax note:</strong> Interest on an investment
                  property is generally tax-deductible. The fixed rate provides predictable
                  deductions for the 2-year term. Speak with a tax adviser about your specific
                  deductibility position.
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 9: Rollover risk ──────────────────────────────────── */}
          <h2 className="text-base md:text-xl font-bold text-slate-900 mb-2 md:mb-3">
            Rollover Risk: What Happens at the End of Your Fixed Period?
          </h2>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3">
            When your fixed term expires, the loan automatically reverts to the lender&apos;s
            standard variable rate — commonly called the &quot;revert rate&quot; or &quot;go-to rate&quot;. This
            is almost always higher than the discounted rates advertised to new customers. Many
            borrowers see a rate jump of 0.5%–1.5% if they do nothing.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mb-3">
            <h3 className="text-xs md:text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Icon name="clock" size={15} className="text-slate-600" />
              The 60-day window: what to do before expiry
            </h3>
            <ol className="space-y-1.5 text-[0.68rem] md:text-xs text-slate-600 list-decimal list-inside">
              <li>Your lender notifies you 60–90 days before expiry — don&apos;t ignore this letter.</li>
              <li>Request a retention offer from your current lender (loyalty discount).</li>
              <li>Simultaneously compare refinancing options via a mortgage broker.</li>
              <li>Decide: fix again, switch to variable, split, or refinance to a new lender.</li>
              <li>Allow 30–45 days for a refinance to settle if switching lenders.</li>
            </ol>
          </div>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-6 md:mb-10">
            Proactive borrowers who shop around at expiry typically save more than those who
            let the loan roll automatically. The effort of comparison at this stage is far lower
            than mid-term, with no break cost risk.
          </p>

          {/* ── Section 10: FAQ accordions ───────────────────────────────── */}
          <h2 className="text-base md:text-xl font-bold text-slate-900 mb-3">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2 mb-6 md:mb-10">
            {FAQ_ITEMS.map((faq, i) => (
              <details key={i} className="bg-white border border-slate-200 rounded-lg group">
                <summary className="px-3.5 py-3 font-semibold text-xs md:text-sm text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">
                    &#x25BE;
                  </span>
                </summary>
                <p className="px-3.5 pb-3 text-xs md:text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>

          {/* ── NCCP disclaimer + CTA ─────────────────────────────────────── */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-5 mb-6 md:mb-10">
            <div className="flex items-start gap-3">
              <Icon name="user-check" size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs md:text-sm font-semibold text-blue-900 mb-1">
                  Get personalised advice from a licensed mortgage broker
                </p>
                <p className="text-[0.68rem] md:text-xs text-blue-800 leading-relaxed mb-3">
                  Fixed vs variable is a personal decision that depends on your income, budget
                  flexibility, property plans, and rate outlook. A licensed mortgage broker
                  can model the scenarios for your specific loan amount and help you find the
                  most competitive fixed rates across 20+ lenders.
                </p>
                <Link
                  href="/advisors/mortgage-brokers"
                  className="inline-flex items-center gap-1.5 text-[0.68rem] md:text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Find a verified mortgage broker
                  <Icon name="arrow-right" size={12} className="text-blue-600" />
                </Link>
              </div>
            </div>
          </div>

          {/* Related guides */}
          <div className="pt-6 border-t border-slate-200 mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Related Guides</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/advisor-guides/mortgage-broker-vs-bank"
                className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600"
              >
                Mortgage Broker vs Bank
              </Link>
              <Link
                href="/home-loans"
                className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600"
              >
                Home Loans Overview
              </Link>
              <Link
                href="/mortgage-calculator"
                className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600"
              >
                Mortgage Calculator
              </Link>
              <Link
                href="/advisors/mortgage-brokers"
                className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600"
              >
                Find a Mortgage Broker
              </Link>
            </div>
          </div>

          {/* Compliance footer */}
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-[0.58rem] md:text-xs text-slate-500 leading-relaxed">
            <p className="font-semibold text-slate-600 mb-1">General Advice Warning</p>
            <p>{GENERAL_ADVICE_WARNING}</p>
            <p className="mt-2">
              This guide is for informational purposes only. Interest rates, lender policies,
              and regulatory requirements change frequently. Always confirm current rates and
              terms directly with lenders or a licensed mortgage broker before making any
              decision. Mortgage broking in Australia is regulated under the National Consumer
              Credit Protection Act 2009 (NCCP). Credit licensing and responsible lending
              obligations apply.
            </p>
          </div>

        </div>
      </article>
    </>
  );
}
