import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Super Pension Phase Guide Australia (${CURRENT_YEAR}) — Tax-Free Retirement Earnings`,
  description:
    "Super pension phase: $1.9M transfer balance cap, account-based pension drawdown, 0% earnings tax, TTR vs retirement phase, death benefits. Updated 2026.",
  alternates: { canonical: `${SITE_URL}/super/pension-phase` },
  openGraph: {
    title: `Super Pension Phase Guide Australia (${CURRENT_YEAR})`,
    description:
      "How the super pension phase works: 0% tax on earnings, $1.9M transfer balance cap, account-based pension minimum drawdowns, and retirement income rules.",
    url: `${SITE_URL}/super/pension-phase`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Super Pension Phase 2026")}&sub=${encodeURIComponent("Transfer Balance Cap · 0% Earnings Tax · ABP Drawdown Rules")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const DRAWDOWN_RATES = [
  { ageRange: "Under 65", minRate: "4%" },
  { ageRange: "65–74", minRate: "5%" },
  { ageRange: "75–79", minRate: "6%" },
  { ageRange: "80–84", minRate: "7%" },
  { ageRange: "85–89", minRate: "9%" },
  { ageRange: "90–94", minRate: "11%" },
  { ageRange: "95+", minRate: "14%" },
];

const PRESERVATION_AGES = [
  { dob: "Before 1 July 1960", preservationAge: "55" },
  { dob: "1 July 1960 – 30 June 1961", preservationAge: "56" },
  { dob: "1 July 1961 – 30 June 1962", preservationAge: "57" },
  { dob: "1 July 1962 – 30 June 1963", preservationAge: "58" },
  { dob: "1 July 1963 – 30 June 1964", preservationAge: "59" },
  { dob: "1 July 1964 or later", preservationAge: "60" },
];

const FAQS = [
  {
    q: "What is the $1.9 million transfer balance cap and what happens if I exceed it?",
    a: "The transfer balance cap (TBC) is the maximum amount you can transfer from your super accumulation account into the tax-free pension phase. For 2024-25, the general TBC is $1.9 million (indexed to CPI in $100,000 increments). If you exceed your personal TBC, the ATO issues an excess transfer balance determination and you must commute the excess back to accumulation phase or cash it out. You also pay excess transfer balance tax on the notional earnings on the excess amount. This is a permanent cap — once you have used all your cap space, it does not reset.",
  },
  {
    q: "What is the minimum I must withdraw from an account-based pension each year?",
    a: "The minimum annual drawdown depends on your age and account balance at 1 July each year (or at commencement if starting mid-year, pro-rated). At age 55-64 you must withdraw at least 4% of your balance; 65-74 the minimum rises to 5%; 75-79 it is 6%; 80-84 it is 7%; 85-89 it is 9%; 90-94 it is 11%; and 95+ it is 14%. There is no maximum — you can draw as much as you like. Note: temporary COVID-19 halved minimums applied until 30 June 2024 but are no longer in effect from FY2024-25 onwards.",
  },
  {
    q: "Are all super pension payments tax-free once I turn 60?",
    a: "Yes — if your super is in a taxed fund (the vast majority of Australian super funds), all pension payments made to you once you are aged 60 or over are completely tax-free, including no Medicare levy. The payments are not even included in your assessable income, so they do not affect your Medicare levy surcharge, HELP repayments, or Centrelink income tests for some entitlements. Untaxed funds (some government pensions) apply different rules.",
  },
  {
    q: "What is the difference between a reversionary and a binding death benefit nomination?",
    a: "A reversionary nomination automatically converts your account-based pension into a pension for your surviving spouse or eligible dependant upon your death — the pension continues paying to them without needing to be commuted and re-established. A binding death benefit nomination (BDBN) directs the trustee to pay the benefit as a lump sum (or pension) to specific beneficiaries — the trustee has no discretion. A non-binding nomination guides but does not bind the trustee. Reversionary pensions are generally best for surviving spouses who want ongoing income; BDBNs are useful for directing benefits to non-dependants (who will face tax on the taxable component). Both types must be updated regularly — BDBNs typically expire after 3 years unless your fund has lapsing-free BDBNs.",
  },
  {
    q: "Can I still make super contributions after I move to pension phase?",
    a: "Yes, depending on your age. Under 67: no work test required — you can contribute freely. Ages 67-74: the work test applies — you must work at least 40 hours in any 30-consecutive-day period in the financial year to make personal contributions (employer SG contributions are exempt from the work test). Age 75 and over: only employer SG and salary sacrifice contributions are permitted; personal contributions are not. Moving part of your super to pension phase does not stop you from contributing to your remaining accumulation account, and any contributions go into the accumulation side (not directly into the pension account).",
  },
  {
    q: "How does an account-based pension affect the Age Pension income test?",
    a: "Account-based pensions started on or after 1 January 2015 are assessed under deeming rules for the Age Pension income test. Centrelink deems you to earn a set rate on your total financial assets (including your ABP balance), regardless of your actual drawdown. For 2024-25, the lower deeming rate is 0.25% on the first $62,600 (singles) / $103,800 (couples) and 2.25% above that threshold. Your deemed income from the ABP counts toward the income test even if you draw less. See the income test guide at /retirement/income-test for full details including the assets test.",
  },
];

export default function PensionPhasePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Super", url: absoluteUrl("/super") },
    { name: "Pension Phase", url: absoluteUrl("/super/pension-phase") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/super" className="hover:text-white">Super</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Pension Phase</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1 rounded-full">0% Earnings Tax</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">$1.9M TBC</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Super Pension Phase &mdash; The Complete Retirement Tax Guide
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Once you retire and move super into pension phase, investment earnings become tax-free on up
              to $1.9 million. This guide explains the transfer balance cap, account-based pension drawdown
              rules, tax treatment at age 60+, and retirement income strategies.
            </p>
          </div>
        </section>

        {/* ── Key Stats ────────────────────────────────────────────────── */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "0%", l: "Earnings tax in pension phase", sub: "vs 15% in accumulation" },
                { v: "$1.9M", l: "Transfer balance cap", sub: "Indexed, 2024-25 general cap" },
                { v: "4%", l: "Minimum drawdown at 55-64", sub: "Rises with age to 14% at 95+" },
                { v: "Tax-free", l: "Payments from age 60", sub: "No Medicare levy, no income tax" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── What is pension phase ─────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is the superannuation pension phase?</h2>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700">
              <p>
                Super has two phases: <strong>accumulation phase</strong> (while you are working and building
                your balance) and <strong>pension phase</strong> (when you have retired and are drawing an
                income stream from your super). The distinction matters enormously for tax.
              </p>
              <p>
                In accumulation phase, your super fund pays 15% tax on investment earnings and 10% on
                long-term capital gains (assets held more than 12 months). In pension phase, both rates
                drop to <strong>0%</strong> — investment earnings are completely exempt from tax on up
                to $1.9 million held in pension phase.
              </p>
              <p>
                To move super into pension phase you must have met a <em>condition of release</em> —
                typically retiring after reaching preservation age, turning 65, or a terminal medical
                condition. You then establish an account-based pension (ABP) by rolling money from
                your accumulation account into a pension account at your fund. This transfer is counted
                against the transfer balance cap.
              </p>
            </div>
          </div>
        </section>

        {/* ── Accumulation vs Pension Phase comparison ──────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Accumulation vs pension phase: tax comparison</h2>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Accumulation vs pension phase tax comparison">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Tax item</th>
                    <th scope="col" className="px-5 py-4 text-center font-bold text-xs uppercase tracking-wide text-amber-300">Accumulation phase</th>
                    <th scope="col" className="px-5 py-4 text-center font-bold text-xs uppercase tracking-wide text-emerald-300">Pension phase</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { item: "Investment earnings tax", accum: "15%", pension: "0%" },
                    { item: "Capital gains tax (assets > 12 months)", accum: "10%", pension: "0%" },
                    { item: "Capital gains tax (assets < 12 months)", accum: "15%", pension: "0%" },
                    { item: "Contributions tax (concessional)", accum: "15%", pension: "Not applicable (no contributions to pension accounts)" },
                    { item: "Pension payments to member aged 60+", accum: "N/A", pension: "Tax-free (not assessable income)" },
                    { item: "Pension payments under 60 (taxable component)", accum: "N/A", pension: "Marginal rate minus 15% offset" },
                    { item: "Death benefits to non-dependant (taxable component)", accum: "17% (incl. Medicare)", pension: "17% (incl. Medicare)" },
                  ].map((row, i) => (
                    <tr key={row.item} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-5 py-3.5 text-slate-700 text-xs font-semibold">{row.item}</td>
                      <td className="px-5 py-3.5 text-center text-xs text-amber-800 font-bold border-l border-amber-100">{row.accum}</td>
                      <td className="px-5 py-3.5 text-center text-xs text-emerald-800 font-bold border-l border-emerald-100">{row.pension}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              The 0% earnings tax in pension phase applies only to balances up to the transfer balance cap. Any
              excess above your personal cap must remain in accumulation phase, where 15% earnings tax continues to apply.
            </p>
          </div>
        </section>

        {/* ── Transfer Balance Cap ──────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Transfer balance cap: the $1.9M limit explained</h2>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-6">
              <p className="text-sm font-bold text-blue-800 mb-1">Indexed and permanent</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                The general transfer balance cap is $1.9 million for 2024&ndash;25 and 2025&ndash;26. It is
                indexed in $100,000 increments when the CPI triggers an increase. Your personal TBC depends
                on when you started your first retirement-phase pension &mdash; if you used some cap before
                indexation occurred, your personal cap is proportionally increased.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "How the TBC works",
                  badge: "Core rule",
                  body: "Every time you move money from accumulation into pension phase (a credit), the ATO records it against your personal transfer balance account. Every time you commute money back to accumulation or take a lump sum (a debit), it reduces the recorded balance. Your total credits cannot exceed your personal cap at any time. The cap applies once in a lifetime — there is no annual reset.",
                },
                {
                  title: "What counts as a TBC credit",
                  badge: "Credits",
                  body: "Starting a new account-based pension; receiving a death benefit reversionary pension (counted 12 months after the deceased member's death); a structured settlement contribution converted to retirement phase. Investment returns inside your pension account do not add to your TBC balance — the cap applies to the starting balance only, not growth.",
                },
                {
                  title: "What counts as a TBC debit",
                  badge: "Debits",
                  body: "Commuting (rolling back) a pension to accumulation; taking a partial commutation as a lump sum; a pension ceasing because the account balance runs to zero; a pension ceasing on the death of the member. Withdrawals as regular pension payments do not reduce your TBC balance — only commutations do.",
                },
                {
                  title: "Exceeding the cap",
                  badge: "Consequences",
                  body: "If your transfer balance exceeds your personal TBC, the ATO issues an excess transfer balance determination. You must commute the excess back to accumulation (or cash it out) within 60 days. On top of that, you pay excess transfer balance tax — currently calculated at the shortfall interest charge (SIC) rate, applied to the amount and period of excess. The tax is designed to recover the benefit of the earnings exemption you enjoyed while the excess was in pension phase.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Account-Based Pension drawdown ────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Account-based pension (ABP): minimum drawdown rules</h2>
            <p className="text-sm text-slate-600 mb-6">
              An account-based pension is the most common retirement income stream in Australia. There is
              no maximum withdrawal — you can take as much as you like. However, the government requires
              a minimum annual pension payment to ensure super is used for retirement income rather than
              estate accumulation.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
              <table className="w-full text-sm" aria-label="Account-based pension minimum drawdown rates">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Age</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-emerald-300">Minimum annual drawdown</th>
                  </tr>
                </thead>
                <tbody>
                  {DRAWDOWN_RATES.map((row, i) => (
                    <tr key={row.ageRange} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs">{row.ageRange}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-emerald-800 border-l border-emerald-100">{row.minRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
              <p className="text-sm font-bold text-amber-800 mb-1">COVID-19 temporary reduction: now ended</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                From FY2020&ndash;21 through FY2023&ndash;24, the government halved minimum drawdown rates as
                a COVID-19 relief measure. These temporary reductions ended on 30 June 2024. From
                FY2024&ndash;25 onwards, the standard rates in the table above apply in full. If you were
                drawing at the halved rate, your minimum payment has now doubled back to normal.
              </p>
            </div>
            <div className="space-y-3">
              {[
                {
                  title: "How the minimum is calculated",
                  body: "The minimum is applied to your account balance at 1 July each year. If you start a new pension part-way through the financial year, the minimum for that year is calculated on the opening balance and pro-rated by the number of days remaining in the financial year. Your fund will usually calculate and advise the minimum at commencement and each 1 July.",
                },
                {
                  title: "What happens if you do not draw the minimum",
                  body: "If you fail to draw the required minimum in any financial year, your pension technically ceases to be a complying income stream and loses its pension phase tax status for that year. In practice, the ATO can treat the account as having ceased to be a pension during that year, which could result in back-tax on earnings. Most funds have processes to automatically pay the minimum if you have not drawn enough by late June.",
                },
                {
                  title: "Strategy: drawing the minimum to maximise tax-free compounding",
                  body: "Since earnings inside the pension phase account are 0% tax-free, every dollar left invested inside the account grows more efficiently than in a personally-held investment. Drawing the minimum preserves as much capital as possible inside the tax-free environment. The trade-off is estate planning: money still in super when you die passes under the superannuation death benefit rules, not your will.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-extrabold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Preservation ages ─────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Preservation ages: when you can access super</h2>
            <p className="text-sm text-slate-600 mb-6">
              Super is &ldquo;preserved&rdquo; &mdash; it cannot be accessed before your preservation age, except
              in limited compassionate grounds cases. Preservation age depends on your date of birth.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
              <table className="w-full text-sm" aria-label="Super preservation ages by date of birth">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Date of birth</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-amber-300">Preservation age</th>
                  </tr>
                </thead>
                <tbody>
                  {PRESERVATION_AGES.map((row, i) => (
                    <tr key={row.dob} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-5 py-3.5 text-slate-700 text-xs">{row.dob}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-amber-800 border-l border-amber-100">{row.preservationAge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-extrabold text-slate-900 mb-2">Preservation age vs access to pension phase</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Reaching preservation age does not automatically move you to pension phase — it only means
                you can <em>access</em> your super under certain conditions. To start drawing a
                retirement-phase pension (with 0% earnings tax), you must have also met a condition of
                release: retired on or after preservation age, turned 65, or met another condition such
                as terminal illness. Reaching preservation age alone only qualifies you for a{" "}
                <Link href="/super/transition-to-retirement" className="underline text-blue-700 hover:text-blue-800">
                  transition to retirement (TTR) pension
                </Link>
                , which is taxed differently.
              </p>
            </div>
          </div>
        </section>

        {/* ── TTR vs Pension Phase ──────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              TTR pension vs retirement-phase pension
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {[
                {
                  label: "Transition to Retirement (TTR)",
                  color: "bg-amber-50 border-amber-200",
                  badgeColor: "bg-amber-100 text-amber-800",
                  items: [
                    "Requires preservation age only (no need to retire)",
                    "15% tax on investment earnings (same as accumulation)",
                    "Maximum 10% annual drawdown",
                    "Non-commutable — no lump-sum withdrawals",
                    "Does not count against transfer balance cap",
                    "Converts to retirement phase on full retirement or turning 65",
                  ],
                },
                {
                  label: "Retirement Phase (ABP)",
                  color: "bg-emerald-50 border-emerald-200",
                  badgeColor: "bg-emerald-100 text-emerald-800",
                  items: [
                    "Requires meeting a full condition of release (retired, 65+, etc.)",
                    "0% tax on investment earnings and capital gains",
                    "No maximum drawdown — full commutation allowed",
                    "Counts against the $1.9M transfer balance cap",
                    "Payments tax-free from age 60 onwards",
                    "Reversionary pension can pass to surviving spouse tax-free",
                  ],
                },
              ].map((col) => (
                <div key={col.label} className={`rounded-xl border p-5 ${col.color}`}>
                  <div className={`inline-block text-xs font-bold px-2 py-1 rounded-full mb-3 ${col.badgeColor}`}>{col.label}</div>
                  <ul className="space-y-2">
                    {col.items.map((item) => (
                      <li key={item} className="text-sm flex gap-2 text-slate-700">
                        <span className="flex-shrink-0 mt-0.5 font-bold">&bull;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600">
              Full guide:{" "}
              <Link href="/super/transition-to-retirement" className="underline text-blue-700 hover:text-blue-800 font-semibold">
                Transition to Retirement (TTR) pensions &rarr;
              </Link>
            </p>
          </div>
        </section>

        {/* ── Age 60 tax treatment ──────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What changes at age 60?</h2>
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 mb-6">
              <p className="text-sm font-bold text-emerald-800 mb-1">Complete tax exemption on super payments</p>
              <p className="text-sm text-emerald-700 leading-relaxed">
                From the day you turn 60, pension payments received from a taxed super fund are completely
                tax-free. They are not included in your assessable income, you do not pay Medicare levy
                on them, and they do not appear anywhere on your tax return.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "Payments from a taxed fund (most Australians)",
                  badge: "Age 60+",
                  color: "border-emerald-200 bg-emerald-50",
                  badgeColor: "bg-emerald-100 text-emerald-800",
                  body: "Both the taxable and tax-free components of your pension payments become tax-free once you are 60+. You can receive any amount from your pension account — $50,000, $200,000, or more per year — and pay zero income tax, zero Medicare levy on those payments. This makes retiring at 60 (or drawing pension payments from 60 while keeping part in accumulation) highly tax-efficient.",
                },
                {
                  title: "Payments before age 60",
                  badge: "Below 60",
                  color: "border-amber-200 bg-amber-50",
                  badgeColor: "bg-amber-100 text-amber-800",
                  body: "If you access super pension payments before 60 (possible after preservation age if fully retired), the taxable (taxed element) component is included in your assessable income but you receive a 15% tax offset to partially compensate. The tax-free component (from after-tax contributions) is always tax-free at any age. In practice, most people using pension phase are 60+ and receive payments entirely tax-free.",
                },
                {
                  title: "Age Pension eligibility age",
                  badge: "Age 67",
                  color: "border-blue-200 bg-blue-50",
                  badgeColor: "bg-blue-100 text-blue-800",
                  body: "The government Age Pension qualifying age is 67 for anyone born on or after 1 January 1957. Super pension payments drawn from age 60 are separate from the Age Pension — you can draw super tax-free from 60 while waiting until 67 for the Age Pension to kick in. Having an ABP may reduce your Age Pension entitlement under the income and assets tests.",
                },
                {
                  title: "Working after 60: contributions still count",
                  badge: "Age 60-74",
                  color: "border-slate-200 bg-slate-50",
                  badgeColor: "bg-slate-100 text-slate-700",
                  body: "If you retire at 60 and later return to work, you can continue contributing to your super accumulation account. Employer SG contributions are always payable. For personal contributions, the work test (40 hours in 30 consecutive days) applies from age 67 to 74. From age 75, only employer contributions are permitted. Contributions go into your accumulation account — they do not directly increase the pension account (which would count against the TBC).",
                },
              ].map((item) => (
                <div key={item.title} className={`rounded-xl border p-5 ${item.color}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${item.badgeColor}`}>{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Death benefit nominations ─────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Death benefit nominations and pension reversions</h2>
            <p className="text-sm text-slate-600 mb-6">
              Super does not automatically form part of your estate — it is paid under the super fund&apos;s
              trust deed and applicable legislation. A valid nomination tells the trustee who to pay your
              super to. Three main options exist:
            </p>
            <div className="space-y-4 mb-6">
              {[
                {
                  title: "Reversionary pension nomination",
                  badge: "Pension continues to spouse",
                  badgeColor: "bg-emerald-100 text-emerald-800",
                  body: "A reversionary nomination means your account-based pension automatically continues to pay to your nominated dependant (usually your spouse) after your death without the fund needing to commute and re-establish the pension. The reversionary pension is a TBC credit for the surviving spouse, counted 12 months after the member's death. This gives the surviving spouse time to manage their own TBC without an immediate excess. Pension payments to a surviving spouse aged 60+ remain tax-free.",
                },
                {
                  title: "Binding death benefit nomination (BDBN)",
                  badge: "Legally binding",
                  badgeColor: "bg-blue-100 text-blue-800",
                  body: "A BDBN legally requires the trustee to pay the benefit to the nominated person(s) or to your estate in the proportions you specify. The trustee has no discretion. BDBNs typically expire every 3 years (unless your fund has non-lapsing BDBNs — check your PDS). You can direct benefits to any eligible dependant (spouse, child under 18, financial dependant, or person in interdependency relationship) or to your legal personal representative (estate). Non-dependants (e.g., adult independent children) receive lump sums but pay 17% tax on the taxable component.",
                },
                {
                  title: "Non-binding nomination",
                  badge: "Guides the trustee",
                  badgeColor: "bg-amber-100 text-amber-800",
                  body: "A non-binding nomination expresses your wishes but does not bind the trustee. The trustee must consider your nomination but may pay differently if circumstances have changed. This gives the fund flexibility — which can be a benefit (the trustee can use discretion if your family situation has changed) or a risk (if the trustee is in doubt, the benefit may go somewhere you did not intend). Most default super accounts use non-binding nominations.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${item.badgeColor}`}>{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Re-contribution strategy ──────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Re-contribution strategy: reduce estate tax</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">General information only &mdash; seek personal advice</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                The re-contribution strategy involves withdrawing money from your super (as a lump sum or
                pension payment) and then re-contributing it as a <em>non-concessional contribution</em>.
                The goal is to convert the taxable component of your super into a tax-free component.
              </p>
            </div>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Why the taxable / tax-free split matters",
                  body: "Super benefits have two components: the tax-free component (from after-tax non-concessional contributions and certain rollovers) and the taxable component (from concessional contributions and fund earnings). When super is paid to a non-dependant beneficiary (such as an adult child who is financially independent), the taxable component is taxed at 17% (15% + 2% Medicare levy). The tax-free component passes tax-free. By reducing the taxable component through re-contribution, you reduce the eventual estate tax.",
                },
                {
                  step: "2",
                  title: "How to execute the strategy",
                  body: "Withdraw an amount from your super as a tax-free pension payment (if aged 60+). Re-contribute the same amount as a non-concessional contribution to your super fund. The withdrawal reduces the taxable component; the non-concessional re-contribution creates a new tax-free component. Over time, repeated re-contributions shift the balance from taxable to tax-free. The non-concessional cap ($120,000/year, or up to $360,000 using the 3-year bring-forward rule) limits how quickly you can execute this.",
                },
                {
                  step: "3",
                  title: "Constraints and considerations",
                  body: "The non-concessional cap and your total super balance (TSB) limit the pace. If your TSB is $1.9M or more, no non-concessional contributions are permitted. The strategy is most valuable when you have a significant taxable component and adult non-dependant beneficiaries. If all beneficiaries are dependants (spouse, young children), they receive benefits tax-free regardless of component split — making the strategy less urgent. This is a complex area that requires personal financial advice.",
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center">{s.step}</div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ABP and Age Pension / SAPTO ───────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Pension phase and the Age Pension</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Income test: deeming for post-2015 ABPs</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Account-based pensions opened on or after 1 January 2015 are assessed under Centrelink&apos;s
                  deeming rules. Centrelink assumes your ABP earns at the lower deeming rate (0.25% on the
                  first $62,600 for singles, $103,800 for couples) and the upper rate (2.25%) above that
                  threshold, regardless of your actual drawdown or investment return. The deemed income is
                  added to your other income to determine your Age Pension entitlement.
                </p>
                <p className="mt-3 text-sm">
                  <Link href="/retirement/income-test" className="underline text-blue-700 hover:text-blue-800 font-semibold">
                    Full income test guide &rarr;
                  </Link>
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Assets test: ABP balance counts in full</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your account-based pension balance is also assessed under the assets test at full face
                  value. It is not discounted or treated differently from other financial assets for the
                  assets test. As your ABP balance reduces over time through drawdowns and investment
                  returns, the assessed asset value declines, potentially increasing your Age Pension
                  entitlement over time. The assets test threshold for a couple (homeowner) in 2025&ndash;26
                  is $470,000, with the pension reducing $3 per $1,000 above the threshold.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="font-extrabold text-blue-900 mb-2">Seniors and Pensioners Tax Offset (SAPTO)</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                Australian residents who receive a pension or allowance from Centrelink or the Department
                of Veterans&apos; Affairs may be entitled to SAPTO, which can eliminate all income tax
                for those with income below about $32,279 (singles) or $28,974 (each for couples) per year.
                SAPTO is not relevant to pension phase super payments (which are already tax-free from age
                60+), but it does apply to other income you may receive alongside your ABP — such as
                employment income, investment income from outside super, or interest. SAPTO can be
                transferred to a spouse if not fully used.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQs ─────────────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white mb-1">Plan your pension phase with professional advice</h2>
              <p className="text-slate-500 text-sm">
                A licensed financial adviser can model your transfer balance cap, drawdown strategy,
                and age pension interactions — and structure death benefit nominations to minimise estate tax.
              </p>
            </div>
            <div className="flex gap-3 shrink-0 flex-wrap">
              <Link
                href="/compare/super"
                className="px-5 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
              >
                Compare Super Funds
              </Link>
              <Link
                href="/advisors/financial-planners"
                className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
              >
                Find a Financial Planner
              </Link>
            </div>
          </div>
        </section>

        {/* ── Related pages ────────────────────────────────────────────── */}
        <section className="py-8 bg-white border-t border-slate-100">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Related guides</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/super" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Super hub &rarr;
              </Link>
              <Link href="/super/transition-to-retirement" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Transition to retirement (TTR) &rarr;
              </Link>
              <Link href="/super/contributions" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Super contributions guide &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ── Compliance disclaimer ─────────────────────────────────────── */}
        <section className="py-6 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">General advice warning</p>
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
