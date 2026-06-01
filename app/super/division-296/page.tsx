import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Division 296 Super Tax Explained (${CURRENT_YEAR}) — The $3 Million Threshold`,
  description:
    "Division 296 is a proposed extra 15% tax on superannuation earnings for balances above $3 million — taking the effective rate to 30% on that portion. Understand the proportional calculation, the unrealised gains controversy, who is affected, and its legislative status.",
  openGraph: {
    title: `Division 296 Super Tax Explained (${CURRENT_YEAR}) — The $3M Threshold`,
    description:
      "A plain-English guide to the proposed Division 296 tax: how the extra 15% on earnings above $3 million works, why taxing unrealised gains is controversial, the lack of indexation, and how the tax would be paid.",
    url: `${SITE_URL}/super/division-296`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Division 296 Super Tax")}&sub=${encodeURIComponent("Extra 15% on earnings above $3 million · Proposed")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/super/division-296` },
};

/* ─── Key headline numbers for the callout strip ─────────────────── */
const KEY_NUMBERS = [
  {
    label: "Balance threshold",
    value: "$3 million",
    note: "Applies to earnings on the portion of your Total Super Balance above $3M. The threshold is not indexed to inflation.",
    tone: "amber",
  },
  {
    label: "Extra tax rate",
    value: "+15%",
    note: "On top of the existing 15% earnings tax — taking the effective rate to 30% on the portion above $3M.",
    tone: "rose",
  },
  {
    label: "People affected (initially)",
    value: "~80,000",
    note: "Estimated at around the top 0.5% of super members at introduction. Expected to grow over time without indexation.",
    tone: "slate",
  },
  {
    label: "Status",
    value: "Proposed",
    note: "Announced in the 2023 Federal Budget. Proposed start was 1 July 2025, but Senate negotiations delayed it — check the current status.",
    tone: "blue",
  },
] as const;

/* ─── The four-step proportional calculation method ──────────────── */
const CALCULATION_STEPS = [
  {
    step: "1",
    title: "Work out the proportion of your balance above $3M",
    body: "Take your Total Super Balance (TSB) at the end of the financial year. The taxable proportion is the part above $3 million divided by the whole balance: (TSB − $3M) ÷ TSB. A $4M balance gives a proportion of ($4M − $3M) ÷ $4M = 25%.",
    formula: "Proportion = (TSB − $3,000,000) ÷ TSB",
  },
  {
    step: "2",
    title: "Calculate your total super earnings for the year",
    body: "Earnings are the movement in your TSB across the year, adjusted for amounts you put in and took out. In broad terms: earnings = (closing TSB − opening TSB) + withdrawals − net contributions. Crucially, this captures growth in asset values — not just income — so it includes unrealised gains.",
    formula: "Earnings = (Closing TSB − Opening TSB) + Withdrawals − Net contributions",
  },
  {
    step: "3",
    title: "Apply the proportion to the earnings",
    body: "Multiply your total earnings by the proportion from Step 1. Only this share of your earnings — the part attributable to the balance above $3M — is subject to the additional tax. This is what makes the method proportional rather than a hard line at the $3M mark.",
    formula: "Taxable earnings = Earnings × Proportion",
  },
  {
    step: "4",
    title: "Apply the 15% Division 296 rate",
    body: "The Division 296 tax is 15% of the proportioned (taxable) earnings. This sits on top of the 15% your fund already pays on earnings in accumulation phase — so the combined headline rate on that portion is 30%.",
    formula: "Division 296 tax = 15% × Taxable earnings",
  },
] as const;

/* ─── Long-form explainer sections ───────────────────────────────── */
const SECTIONS = [
  {
    id: "what-it-is",
    heading: "What Division 296 actually is",
    body: "Division 296 is a proposed measure to apply an additional 15% tax on a portion of the earnings of individuals whose Total Super Balance (TSB) exceeds $3 million at the end of a financial year.\n\nIt does not replace the existing tax on super. Earnings inside an accumulation-phase super fund are already taxed at 15%. Division 296 adds a further 15% — but only on the share of earnings attributable to the balance above $3 million. The practical effect is that the headline tax rate on that slice of earnings roughly doubles, from 15% to 30%.\n\nIt is important to be precise about what is taxed. Division 296 does not tax your balance, and it does not tax the first $3 million. It taxes a proportion of your earnings for the year — and that proportion is determined by how far your balance sits above $3 million. Someone with $3.1 million has a very small proportion taxed; someone with $10 million has a much larger proportion taxed.",
  },
  {
    id: "legislative-status",
    heading: "Legislative status — proposed, not settled",
    body: "Division 296 was announced in the 2023 Federal Budget as a measure to reduce the tax concessions on very large super balances. The Government proposed a start date of 1 July 2025.\n\nHowever, the measure faced significant negotiation in the Senate and did not pass on its original timetable. As a proposed (legislation-pending) measure, its final form — including the start date, the design of the earnings calculation, and the treatment of unrealised gains — may change before it becomes law, or may be amended as part of Senate negotiations.\n\nBecause the position has been moving, you should treat any specific start date with caution and check the current status with the ATO, Treasury, or a licensed adviser before acting. This page describes the mechanism as proposed; it is not a statement that the tax is in force, nor a prediction of its final shape. Where this guide refers to a 1 July 2025 start, that reflects the originally announced date, which may have shifted.",
  },
  {
    id: "how-it-works",
    heading: "How the tax works on the portion above $3M",
    body: "The design is deliberately proportional rather than a cliff. If Division 296 simply taxed everyone above $3 million on all of their earnings, a person who crept just over the line would face a large jump in tax. Instead, the rules tax only the share of earnings that corresponds to the balance above $3M.\n\nThe extra 15% is applied to that proportioned amount, and it stacks on top of the 15% earnings tax the fund already pays in accumulation phase. So the portion of earnings above the threshold is effectively taxed at around 30%, while the portion attributable to the first $3 million continues to be taxed at the existing concessional rates.\n\nThe calculation is run on an annual basis, using your TSB at 30 June. Because the proportion is recalculated each year as your balance moves, the share of your earnings that is taxable can rise or fall from one year to the next.",
  },
  {
    id: "who-is-affected",
    heading: "Who is affected — and why that grows over time",
    body: "At introduction, the measure was estimated to affect roughly 80,000 Australians — around the top 0.5% of super members by balance. On its face this is a tax aimed at a small number of very large balances.\n\nThe more significant long-term issue is that the $3 million threshold is not indexed to inflation. Most thresholds in the super system — such as the transfer balance cap — are indexed so that they keep pace with rising balances and prices. A fixed $3 million threshold means that, as wages, asset prices, and super balances grow over the decades, more people will be drawn above the line. This is the classic problem of bracket creep applied to super.\n\nThe effect compounds for younger people. A 30-year-old today on a strong contribution and investment trajectory could realistically reach a $3 million balance by retirement in tomorrow's dollars — even though that sum will buy far less in 35 years than it does now. So a measure framed as affecting only the wealthiest few today could, without indexation, reach a much broader slice of future retirees.",
  },
  {
    id: "smsf-impact",
    heading: "Why SMSFs are most exposed",
    body: "Self-managed super funds (SMSFs) are disproportionately affected because they are far more likely to hold large, lumpy, illiquid assets — most notably direct property, and in some cases a single business premises or farm.\n\nThe core problem is liquidity. Because Division 296 taxes earnings including unrealised gains (see below), an SMSF can be assessed on a paper increase in the value of a property it has no intention of selling. If the fund does not hold enough cash to meet the resulting tax bill, the trustees may be forced to sell or partially sell an asset, take on debt, or make additional contributions (subject to the contribution caps) simply to fund a tax on a gain they have not realised.\n\nValuations also become critical. Because the tax depends on the year-end value of fund assets, SMSF trustees holding property or unlisted assets will need robust, defensible annual valuations — a higher compliance burden than for a fund holding only listed shares with a transparent market price.",
  },
  {
    id: "how-paid",
    heading: "How the tax is assessed and paid",
    body: "Division 296 is assessed at the individual level, not inside the fund. After the end of the financial year, the ATO calculates the liability using data already reported by super funds and issues the individual with a Division 296 assessment notice.\n\nYou would then have a choice about how to pay. You can pay the assessment personally, from money outside super, or you can elect to have the amount released from one of your super funds to cover it. This release mechanism is similar to the way Division 293 tax can be paid — the individual receives the bill, and can choose to draw on their super to meet it.\n\nWhere a person holds balances across multiple funds, they can generally nominate which fund releases the money. SMSF members will need to ensure the fund has the liquidity to make any release they elect.",
  },
  {
    id: "planning",
    heading: "Planning considerations (general, not advice)",
    body: "Several themes commonly come up in commentary about how people might think differently about super if Division 296 proceeds. These are general observations, not recommendations — your situation needs personal advice from a licensed adviser, because the right answer depends on your age, your balance, the assets you hold, your spouse's position, and rules that are still being finalised.\n\nThe $3 million figure starts to behave like a soft cap. For balances approaching it, the marginal value of holding additional wealth inside super (versus in a structure outside super) changes, because earnings above the line attract the extra tax. Some commentary discusses whether very large balances are better held partly outside super, or whether future contributions are better directed elsewhere once the threshold is in sight. Importantly, $3 million is not a hard ceiling on what you can hold in super — it is the point above which the additional tax on earnings begins to apply.\n\nEqualising balances between spouses is frequently raised. Two people each holding $3 million have two separate thresholds — $6 million of combined balance before the tax bites — whereas the same $6 million concentrated in one person's account would see a large portion exposed. For example, a couple with $4M and $2M has $1M exposed in the larger account; the same $6M split evenly at $3M each would have nothing above either threshold. Contribution splitting (moving up to 85% of a year's concessional contributions to a spouse) and spouse contributions are the usual tools discussed for evening balances out over time.\n\nWithdrawing or not topping up beyond the threshold is another theme for those who have already met their retirement needs and are past preservation age. And it is worth keeping perspective: even with Division 296, super's 15% accumulation rate and 0% pension-phase rate on the first tranche of retirement savings remain very concessional compared with marginal income tax rates outside super, which reach 47% including the Medicare levy. For the overwhelming majority of people — who will never approach $3 million — super remains a highly tax-effective place to save, and nothing about Division 296 changes that.",
  },
  {
    id: "criticism",
    heading: "Criticism and the public debate",
    body: "Division 296 has been one of the most contested super measures in recent memory. The arguments fall on both sides.\n\nIn favour: supporters argue that super is meant to fund a dignified retirement, not to be an open-ended, lightly taxed estate-planning vehicle. They point out that the tax concessions on very large balances cost the Budget a great deal and flow overwhelmingly to people who do not need government support in retirement. On this view, trimming the concession on balances above $3 million is a fairness measure that still leaves super heavily concessional.\n\nAgainst: critics focus on three things. First, taxing unrealised gains is close to unprecedented in the Australian tax system, which generally taxes gains only when an asset is sold — raising concerns about taxing income that does not exist as cash. Second, the absence of indexation means the measure will quietly capture far more people over time. Third, the practical consequences — particularly the risk of forced asset sales in SMSFs holding property or farms — are seen as disproportionate. Industry bodies and parts of the political spectrum have argued for indexation, a realised-gains-only design, or both.\n\nA balanced reading is that the policy intent (reducing concessions on the largest balances) attracts broad sympathy, while the specific design choices — unrealised gains and no indexation — are where most of the genuine controversy lies.",
  },
] as const;

/* ─── Division 296 vs Division 293 comparison rows ───────────────── */
const VS_293 = [
  {
    label: "What it taxes",
    d296: "Earnings — the growth in your super, including unrealised gains, on the portion of your balance above $3M",
    d293: "Contributions — your concessional (before-tax) super contributions",
  },
  {
    label: "Who it targets",
    d296: "Individuals with a Total Super Balance above $3 million",
    d293: "Individuals with income (plus concessional contributions) above $250,000",
  },
  {
    label: "Extra rate",
    d296: "+15% on proportioned earnings (≈30% effective on that portion)",
    d293: "+15% on concessional contributions (30% rather than 15%)",
  },
  {
    label: "When assessed",
    d296: "Annually, based on your TSB at 30 June and the year's earnings",
    d293: "Annually, based on income and contributions for the year",
  },
  {
    label: "How it is paid",
    d296: "ATO assessment to the individual; pay personally or release from super",
    d293: "ATO assessment to the individual; pay personally or release from super",
  },
  {
    label: "Status",
    d296: "Proposed (legislation pending) — originally announced to start 1 July 2025",
    d293: "In force — an established part of the super tax system",
  },
] as const;

/* ─── FAQ — five questions (also feeds FAQPage JSON-LD) ──────────── */
const FAQS = [
  {
    q: "What is the Division 296 super tax?",
    a: "Division 296 is a proposed additional 15% tax on a portion of the earnings of individuals whose Total Super Balance exceeds $3 million at the end of a financial year. It adds to the existing 15% tax on super earnings, taking the effective rate to about 30% — but only on the share of earnings attributable to the balance above $3 million. It does not tax your balance and it does not tax the first $3 million.",
  },
  {
    q: "Does Division 296 tax unrealised gains?",
    a: "Yes — as proposed, Division 296 measures earnings as the movement in your Total Super Balance over the year (adjusted for contributions and withdrawals), which includes unrealised capital gains. That means you could be taxed on a paper increase in the value of an asset you have not sold. This is the most criticised feature of the measure and is especially significant for SMSFs holding property or other illiquid assets, which can owe tax on gains they have not converted to cash.",
  },
  {
    q: "Is the $3 million threshold indexed to inflation?",
    a: "No. As proposed, the $3 million threshold is a fixed figure and is not indexed to inflation, unlike several other super thresholds such as the transfer balance cap. Because balances and prices rise over time, a fixed threshold means more people will be drawn above it in future years — a form of bracket creep. A 30-year-old on a strong super trajectory today could plausibly exceed $3 million by retirement in future dollars. The lack of indexation has been a central point of criticism, and some proposals have called for it to be indexed.",
  },
  {
    q: "How is Division 296 tax calculated?",
    a: "It is calculated proportionally in four steps. First, work out the proportion of your balance above $3M: (Total Super Balance − $3M) ÷ Total Super Balance. Second, calculate your total super earnings for the year (broadly, the change in your balance adjusted for contributions and withdrawals). Third, multiply earnings by the proportion to get the taxable earnings. Fourth, apply 15% to that figure. For example, a $4 million balance gives a 25% proportion; $400,000 of earnings × 25% = $100,000 taxable; 15% × $100,000 = $15,000 of Division 296 tax.",
  },
  {
    q: "When does Division 296 start?",
    a: "Division 296 was announced in the 2023 Federal Budget with a proposed start date of 1 July 2025. However, it faced Senate negotiation and delays and did not pass on that original timetable. As a proposed measure, the start date may have shifted and the design may change before it becomes law. Always check the current status with the ATO, Treasury, or a licensed financial adviser before making decisions based on it.",
  },
] as const;

export default function Division296Page() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Super", item: `${SITE_URL}/super` },
      { "@type": "ListItem", position: 3, name: "Division 296 Tax" },
    ],
  };

  const faqSchema = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  const toneClasses: Record<string, { border: string; label: string; value: string }> = {
    amber: { border: "border-amber-200", label: "text-amber-800", value: "text-amber-700" },
    rose: { border: "border-rose-200", label: "text-rose-800", value: "text-rose-700" },
    slate: { border: "border-slate-200", label: "text-slate-600", value: "text-slate-700" },
    blue: { border: "border-blue-200", label: "text-blue-800", value: "text-blue-700" },
  };

  return (
    <div className="bg-white min-h-screen">
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

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/super" className="hover:text-slate-900">Super</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Division 296 Tax</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              Proposed legislation &middot; {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Division 296 Super Tax —{" "}
              <span className="text-amber-600">the extra 15% on balances above $3 million</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Division 296 is a proposed additional 15% tax on superannuation earnings for individuals
              with a total super balance above $3 million. It effectively doubles the tax rate on the
              portion above $3M &mdash; from 15% to 30%. Here&apos;s how the proportional calculation
              works, why taxing unrealised gains is so contested, and what its legislative status is.
            </p>
          </div>
        </div>
      </section>

      {/* ── Status banner ────────────────────────────────────────────── */}
      <section className="py-5 bg-amber-50 border-b border-amber-100">
        <div className="container-custom">
          <div className="flex items-start gap-3 max-w-3xl">
            <span className="text-amber-600 text-lg leading-none mt-0.5" aria-hidden="true">&#9888;</span>
            <p className="text-xs md:text-sm text-amber-900 leading-relaxed">
              <strong>Status: proposed, not settled.</strong> Division 296 was announced in the 2023
              Federal Budget with a proposed start of 1&nbsp;July&nbsp;2025, but it faced Senate
              negotiation and delays and did not pass on that timetable. The start date may have shifted
              and the design may change before it becomes law. Treat the figures below as the
              <em> proposed</em> mechanism and check the current status with the ATO, Treasury, or a
              licensed adviser before acting.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Numbers ──────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {KEY_NUMBERS.map((item) => {
              const t = toneClasses[item.tone] ?? toneClasses.slate!;
              return (
                <div key={item.label} className={`bg-white rounded-2xl border ${t.border} p-5`}>
                  <p className={`text-xs font-bold ${t.label} uppercase tracking-wide mb-1`}>{item.label}</p>
                  <p className={`text-xl font-black ${t.value}`}>{item.value}</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">The mechanism</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-3">
            How the extra 15% is applied
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-8">
            Division 296 does not tax your balance, and it does not tax the first $3 million. It applies
            an extra 15% to a <strong>proportion</strong> of your earnings &mdash; the share attributable
            to the part of your total super balance that sits above $3 million. Because the existing 15%
            earnings tax still applies, the combined headline rate on that portion is about 30%.
          </p>

          {/* Four-step calculation */}
          <ol className="space-y-5">
            {CALCULATION_STEPS.map((step) => (
              <li key={step.step} className="flex gap-4">
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-600 text-slate-900 font-black text-sm flex items-center justify-center">
                  {step.step}
                </span>
                <div className="flex-1">
                  <h3 className="text-base font-extrabold text-slate-900 mb-1.5">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-2">{step.body}</p>
                  <p className="inline-block bg-slate-900 text-amber-200 font-mono text-xs px-3 py-1.5 rounded-lg">
                    {step.formula}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Worked example ───────────────────────────────────────────── */}
      <section className="py-10 bg-amber-50 border-y border-amber-100">
        <div className="container-custom max-w-2xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Worked example</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-5">
            A $4 million balance, step by step
          </h2>
          <div className="bg-white rounded-2xl border border-amber-200 p-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">
              Scenario: TSB grows from $3.6M to $4M over the year, with $0 net contributions
            </p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Total super balance at start of year</span>
                <span className="font-bold text-slate-900">$3,600,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Total super balance at end of year</span>
                <span className="font-bold text-slate-900">$4,000,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Net contributions / withdrawals</span>
                <span className="font-bold text-slate-900">$0</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Earnings for the year ($4M &minus; $3.6M)</span>
                <span className="font-bold text-slate-900">$400,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Proportion above $3M (($4M &minus; $3M) &divide; $4M)</span>
                <span className="font-bold text-amber-700">25%</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-600">Taxable earnings ($400,000 &times; 25%)</span>
                <span className="font-bold text-amber-700">$100,000</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1">
                <span className="text-slate-900">Division 296 tax (15% &times; $100,000)</span>
                <span className="text-rose-700">$15,000</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              Illustrative only, using the proposed proportional method. The $15,000 is in addition to
              the 15% earnings tax the fund already pays in accumulation phase. Actual outcomes depend on
              the final legislated rules, your specific balances, and your contributions and withdrawals.
            </p>
          </div>
        </div>
      </section>

      {/* ── Unrealised gains callout ─────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 md:p-8">
            <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-2">
              The most contested feature
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-3">
              Division 296 taxes unrealised gains
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              The earnings figure Division 296 uses is the movement in your total super balance across
              the year. That captures the <strong>change in the value of your assets</strong> &mdash; not
              just the income (rent, dividends, interest) they produce. So it includes
              <strong> unrealised capital gains</strong>: paper gains on assets you have not sold.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              This means you could owe tax on a gain you have not actually banked. It is the single most
              criticised aspect of the measure, because almost everywhere else in Australian tax, capital
              gains are taxed only when an asset is sold and the gain is <em>realised</em>.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mb-0">
              <strong>Example:</strong> an SMSF owns a commercial property that rises in value from
              $2.5M to $3.2M over the year. That $700,000 paper gain counts as earnings &mdash; and a
              proportion of it can be taxed under Division 296 &mdash; even though the fund has not sold
              the property and has received no extra cash. If the fund holds little cash, the trustees
              may have to find the money elsewhere or sell part of the asset to pay the bill.
            </p>
          </div>
        </div>
      </section>

      {/* ── Long-form sections ───────────────────────────────────────── */}
      <section className="py-4 md:py-8">
        <div className="container-custom max-w-3xl">
          <div className="space-y-10">
            {SECTIONS.map((section) => (
              <div key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-3">{section.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {section.body.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Common misconceptions ────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Clearing it up</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-6">
            Common misconceptions about Division 296
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-rose-700 mb-1">
                Myth: &quot;All my super earnings get taxed an extra 15% once I hit $3M.&quot;
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Only the <em>proportion</em> of earnings attributable to the balance above $3M is taxed.
                At $3.3M, just about 9% of your earnings are in scope; the rest stay on the existing rates.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-rose-700 mb-1">
                Myth: &quot;Division 296 taxes my $3 million balance.&quot;
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                It taxes <em>earnings</em> for the year, not the balance itself. In a year where your
                balance does not grow, there are no earnings to tax &mdash; regardless of how large the
                balance is.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold text-rose-700 mb-1">
                Myth: &quot;It&apos;s law, so I need to act now.&quot;
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                It is proposed, not settled. The start date may have shifted from the originally announced
                1&nbsp;July&nbsp;2025, and the design may change. Confirm the current status before making
                irreversible decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Division 296 vs Division 293 ─────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Don&apos;t confuse them</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
            Division 296 vs Division 293
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Both measures add an extra 15% tax, which is why they are often mixed up. But they target
            completely different things: Division 293 taxes <strong>contributions</strong> for high
            earners, while Division 296 taxes <strong>earnings</strong> for very large balances.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide w-40">Feature</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-amber-300">Division 296 (proposed)</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-blue-300">Division 293 (in force)</th>
                </tr>
              </thead>
              <tbody>
                {VS_293.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs">{row.label}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-amber-100 text-xs leading-relaxed">{row.d296}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-blue-100 text-xs leading-relaxed">{row.d293}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Questions</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-6">
            Division 296 frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3" aria-hidden="true">&#8964;</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related super topics ─────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">Related super guides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Super Hub", href: "/super", badge: "Compare & contribute" },
              { label: "Contributions", href: "/super/contributions", badge: "Caps & salary sacrifice" },
              { label: "SMSF Hub", href: "/smsf", badge: "Self-managed super" },
              { label: "Consolidation", href: "/super/consolidation", badge: "Find lost super" },
              { label: "Compare Super", href: "/compare/super", badge: "Fees & returns" },
              { label: "Find a Planner", href: "/advisors/financial-planners", badge: "Get advice" },
            ].map(({ label, href, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-sm transition-all"
              >
                <span className="text-sm font-semibold text-slate-900">{label}</span>
                <span className="text-xs text-slate-500">{badge}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">Large balance? Talk to a specialist.</h2>
            <p className="text-slate-400 text-sm">
              Division 296 planning &mdash; especially for SMSFs holding property &mdash; is genuinely
              complex. A licensed financial planner can model your position against the proposed rules.
            </p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link
              href="/advisors/financial-planners"
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Find a Financial Planner
            </Link>
            <Link
              href="/smsf"
              className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Explore the SMSF Hub
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">
            Division 296 is proposed legislation and was not in force at the time of writing. Its design
            and start date may change. This page is general information only, current as at {UPDATED_LABEL.replace("Updated ", "")}.
            {" "}
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
