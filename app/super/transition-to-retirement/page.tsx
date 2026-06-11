import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Transition to Retirement (TTR) Pension Guide Australia (${CURRENT_YEAR}) — Strategy, Tax & Rules`,
  description:
    "Transition to retirement (TTR) pensions: TTR tax strategy, 4–10% drawdown, preservation age, and when to convert to retirement phase. Updated 2026.",
  alternates: { canonical: `${SITE_URL}/super/transition-to-retirement` },
  openGraph: {
    title: `Transition to Retirement (TTR) Pension Guide Australia (${CURRENT_YEAR})`,
    description:
      "How TTR pensions work: income boost and tax minimisation strategies, 4–10% drawdown, preservation age, 15% earnings tax, and converting to retirement phase.",
    url: `${SITE_URL}/super/transition-to-retirement`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Transition to Retirement Pension")}&sub=${encodeURIComponent("TTR Strategy · Tax Savings · Drawdown Rules · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const PRESERVATION_AGES = [
  { dob: "Before 1 July 1960", age: "55" },
  { dob: "1 July 1960 – 30 June 1961", age: "56" },
  { dob: "1 July 1961 – 30 June 1962", age: "57" },
  { dob: "1 July 1962 – 30 June 1963", age: "58" },
  { dob: "1 July 1963 – 30 June 1964", age: "59" },
  { dob: "1 July 1964 or later", age: "60" },
];

const FAQS = [
  {
    q: "Who is eligible for a transition to retirement pension?",
    a: "You must have reached your preservation age — which is 60 for anyone born on or after 1 July 1964, covering most Australians still in the workforce in 2026. You must still be in the workforce; once you permanently retire you move to a full retirement-phase pension, not a TTR. You can only access super as a non-commutable income stream under TTR, meaning no lump-sum withdrawals are permitted until you meet a full condition of release.",
  },
  {
    q: "Is TTR income tax-free at age 60?",
    a: "Yes — pension payments received from a TTR account in a taxed super fund are completely tax-free once you are aged 60 or over. They are not included in your assessable income, so you pay no income tax and no Medicare levy on them. Note that this applies to the pension payments themselves. The investment earnings inside your TTR account are still taxed at 15% (not 0%), which is different from a retirement-phase pension where earnings are tax-free.",
  },
  {
    q: "Can I still make super contributions while on a TTR pension?",
    a: "Yes. You can continue making concessional contributions — salary sacrifice, employer SG, and personal deductible contributions — up to the $30,000 annual concessional cap while receiving TTR pension payments. This is the foundation of the salary sacrifice + TTR tax strategy: you sacrifice more income into super while drawing tax-free pension payments to replace your take-home pay. Non-concessional contributions of up to $120,000 per year are also permitted (subject to total super balance limits).",
  },
  {
    q: "What is the maximum I can draw from a TTR pension?",
    a: "You must draw between 4% and 10% of your TTR account balance each year. The balance is measured at 1 July (or your commencement date if you start mid-year, with the minimum pro-rated). There is no maximum above 10% — you cannot draw more than 10% while the account is in TTR phase. Payments can be made monthly, quarterly, half-yearly, or annually. You cannot make lump-sum withdrawals; all payments must be regular income stream payments.",
  },
  {
    q: "Should I convert my TTR to a retirement phase pension?",
    a: "Yes, as soon as you meet a condition of release — typically retiring after age 60 or turning 65. Converting to a retirement-phase account-based pension switches investment earnings from 15% tax to 0% tax, and removes the 10% drawdown cap and the non-commutable restriction so you can take lump sums. You will also become subject to the $1.9M transfer balance cap at conversion. Notify your fund in writing once you retire; the conversion is straightforward but should not be delayed because every day in TTR phase means 15% earnings tax rather than 0%.",
  },
];

export default function TransitionToRetirementPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Super", url: absoluteUrl("/super") },
    { name: "Transition to Retirement", url: absoluteUrl("/super/transition-to-retirement") },
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
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/super" className="hover:text-white">Super</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Transition to Retirement</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">Age 60+ Strategy</span>
              <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">2025–26 Rules</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Transition to Retirement (TTR) Pension &mdash; The Complete Guide
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Once you reach 60 and are still working, you can access super as a non-commutable income stream.
              Combined with salary sacrifice, a TTR pension can legally reduce your tax while maintaining
              your take-home pay &mdash; or ease you into part-time work without a pay cut.
            </p>
          </div>
        </section>

        {/* ── Key Stats ────────────────────────────────────────────────── */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "60", l: "Preservation age", sub: "For those born on or after 1 July 1964" },
                { v: "4–10%", l: "Annual drawdown range", sub: "Minimum 4%, maximum 10% of balance" },
                { v: "15%", l: "Earnings tax in TTR", sub: "Same as accumulation — not 0% like retirement phase" },
                { v: "Tax-free", l: "Pension payments age 60+", sub: "From a taxed fund — no income tax, no Medicare" },
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

        {/* ── What is TTR ──────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              What is a transition to retirement (TTR) income stream?
            </h2>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700">
              <p>
                A transition to retirement pension is a type of superannuation income stream you can start once
                you reach preservation age and are still working. Unlike a full retirement-phase account-based
                pension, a TTR does not require you to have permanently retired &mdash; the entire point is that
                you can access your super while continuing to work, transitioning gradually into retirement.
              </p>
              <p>
                TTR pensions are <strong>non-commutable</strong>. You cannot take lump-sum withdrawals from
                them &mdash; all withdrawals must be taken as regular income stream payments. You are restricted
                to drawing between <strong>4% and 10%</strong> of your account balance each financial year.
                These limits exist to prevent super from being used as a tax-free savings account while
                people remain fully employed.
              </p>
              <p>
                Critically, since 1 July 2017, investment earnings inside a TTR account are taxed at{" "}
                <strong>15%</strong> &mdash; the same rate as the accumulation phase. They are not tax-free
                like earnings in a full retirement-phase pension. The tax benefit of TTR now comes primarily
                from the salary sacrifice strategy on the contributions side, not from investment earnings.
              </p>
              <p>
                When you fully retire (or turn 65, which is a condition of release regardless of employment
                status), your TTR pension can be converted to a standard account-based pension (retirement
                phase). At that point, earnings inside the account become tax-free, lump-sum withdrawals
                become permitted, and the balance counts against your $1.9M transfer balance cap.
              </p>
            </div>
          </div>
        </section>

        {/* ── Two TTR Strategies ───────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              The two TTR strategies
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              There are two distinct ways to use a TTR pension. The right strategy depends on your income,
              super balance, and whether you want to ease into retirement or maximise your tax position
              while continuing to work full time.
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <span className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-800 mb-3">
                  Strategy 1
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mb-2">Income boost — ease into retirement</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Reduce your working hours (go part-time) and use your TTR pension to top up the income
                  you lose from working less. This suits pre-retirees who want to wind down gradually
                  without taking a significant pay cut.
                </p>
                <ul className="space-y-2">
                  {[
                    "Reduce hours from 5 days to 3–4 days per week",
                    "Draw TTR pension to replace the lost salary",
                    "Net income stays similar; lifestyle improves",
                    "TTR pension payments are tax-free at age 60+",
                    "Continue receiving employer SG contributions",
                  ].map((item) => (
                    <li key={item} className="text-sm flex gap-2 text-slate-700">
                      <span className="flex-shrink-0 mt-0.5 text-blue-600 font-bold">&#10003;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <span className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 mb-3">
                  Strategy 2
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mb-2">Tax minimisation — keep working, save tax</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Continue working full time. Salary sacrifice the maximum concessional amount into super,
                  then replace the lost take-home pay by drawing from your TTR pension. The net saving
                  can be significant for those in the 32.5% or 37% tax bracket.
                </p>
                <ul className="space-y-2">
                  {[
                    "Salary sacrifice to the $30,000 concessional cap",
                    "Super fund pays 15% contributions tax (vs your 32.5–39%)",
                    "Draw TTR pension to replace lost take-home pay",
                    "Pension income is tax-free at age 60+ — no income tax",
                    "Net tax saving of thousands of dollars per year",
                  ].map((item) => (
                    <li key={item} className="text-sm flex gap-2 text-slate-700">
                      <span className="flex-shrink-0 mt-0.5 text-emerald-600 font-bold">&#10003;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Worked Example ───────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Tax minimisation worked example (2024&ndash;25 figures)
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              The following example illustrates how the salary sacrifice + TTR strategy works for a person
              aged 60 on a $120,000 salary with a total super balance (TSB) of $400,000.
            </p>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
              <h3 className="font-extrabold text-slate-900 mb-4">Example: age 60, $120K salary, $400K TSB</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="TTR strategy tax minimisation worked example">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th scope="col" className="text-left py-2 pr-4 font-bold text-slate-700">Item</th>
                      <th scope="col" className="text-right py-2 pr-4 font-bold text-slate-700">Without TTR strategy</th>
                      <th scope="col" className="text-right py-2 font-bold text-blue-700">With TTR strategy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { item: "Gross salary", without: "$120,000", with: "$120,000" },
                      { item: "Salary sacrifice to super", without: "$0", with: "$30,000" },
                      { item: "Taxable employment income", without: "$120,000", with: "$90,000" },
                      { item: "Income tax + Medicare levy (est.)", without: "~$31,800", with: "~$20,700" },
                      { item: "Take-home pay (after tax)", without: "$88,200", with: "$69,300" },
                      { item: "TTR pension drawn (tax-free at 60+)", without: "$0", with: "$30,000" },
                      { item: "Total cash in hand", without: "$88,200", with: "~$99,300*" },
                      { item: "Contributions tax in super (15% on $30k)", without: "–", with: "$4,500" },
                      { item: "Total tax paid (personal + contributions)", without: "~$31,800", with: "~$25,200" },
                      { item: "Estimated tax saving", without: "–", with: "~$6,600/yr" },
                    ].map((row) => (
                      <tr key={row.item}>
                        <td className="py-2 pr-4 text-slate-700">{row.item}</td>
                        <td className="py-2 pr-4 text-right text-slate-600">{row.without}</td>
                        <td className="py-2 text-right font-semibold text-blue-700">{row.with}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                * Drawing $30K from TTR exceeds what is needed to replace lost take-home pay in this example.
                The actual pension drawn can be set lower — between 4% and 10% of TTR balance — to match
                exactly the income shortfall. Figures are illustrative only; tax estimates use 2024&ndash;25
                rates and do not account for deductions, offsets, or individual circumstances.
                This is general information, not personal financial advice.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-extrabold text-slate-900 mb-3">How the tax saving works</h3>
              <div className="space-y-3">
                {[
                  {
                    num: "1",
                    text: "The $30,000 salary sacrifice reduces taxable income from $120,000 to $90,000. At $120K the marginal rate on that $30K slice is 37% plus 2% Medicare = 39%, so you avoid paying ~$11,700 in personal tax on that amount.",
                  },
                  {
                    num: "2",
                    text: "The super fund pays 15% contributions tax on the $30,000 = $4,500. Net personal tax saving from the sacrifice = ~$11,700 minus $4,500 = ~$7,200.",
                  },
                  {
                    num: "3",
                    text: "You draw $30,000 from the TTR pension account. At age 60+ from a taxed fund, this income is completely tax-free — $0 income tax and $0 Medicare levy on the pension payments.",
                  },
                  {
                    num: "4",
                    text: "Net position: you pay ~$6,600 less total tax per year while maintaining approximately the same cash flow. Your super balance grows faster because contributions are taxed at 15% not 39%.",
                  },
                ].map((s) => (
                  <div key={s.num} className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                      {s.num}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Key TTR Rules ────────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Key TTR rules (2025–26)</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Preservation age: 60 for most Australians",
                  badge: "Eligibility",
                  body: "You must have reached preservation age to start a TTR pension. For everyone born on or after 1 July 1964, preservation age is 60. You do not need to have retired — you just need to have reached preservation age and still be in the workforce. See the preservation age table below for those born earlier.",
                },
                {
                  title: "Minimum 4% / maximum 10% drawdown per year",
                  badge: "Drawdown limits",
                  body: "You must draw at least 4% and no more than 10% of your TTR account balance each financial year. The balance is measured at 1 July (or commencement date if starting mid-year, with the minimum pro-rated by days remaining). Payments can be monthly, quarterly, half-yearly, or annually. At age 65–74 the minimum rises to 5%; 75–79 it is 6%, and so on — the same age-based scale as account-based pensions.",
                },
                {
                  title: "15% earnings tax — not 0% like retirement phase",
                  badge: "Tax treatment",
                  body: "Since 1 July 2017, investment earnings inside a TTR pension are taxed at 15% — the same rate as the accumulation phase. This changed when the government removed the earnings tax exemption from TTR accounts as part of the 2016 Budget. Earnings only become tax-free (0%) once you fully retire and convert your TTR to a retirement-phase pension. The tax minimisation strategy still works through the concessional contributions side, but the earnings advantage that existed pre-2017 is gone.",
                },
                {
                  title: "Non-commutable: no lump-sum withdrawals",
                  badge: "Withdrawal restrictions",
                  body: "You cannot take a lump sum from a TTR pension while you remain in the workforce below age 65. All withdrawals must be taken as regular income stream payments within the 4–10% band. If you need a lump sum — for a major expense or investment — you must meet a full condition of release first (retire permanently after 60, or turn 65), at which point the TTR converts to a retirement-phase pension with full commutation rights.",
                },
                {
                  title: "No transfer balance cap while in TTR phase",
                  badge: "TBC rules",
                  body: "Starting a TTR pension does not count against your $1.9 million transfer balance cap (2025–26 general cap). Only when you convert to a retirement-phase pension does the account balance count against the cap. If your TTR balance at the time of conversion exceeds your available cap space, the excess must remain in accumulation phase. This is an important consideration if your total super balance is approaching $1.9M.",
                },
                {
                  title: "Concessional contributions continue alongside TTR",
                  badge: "Contributions",
                  body: "You can continue making concessional contributions — salary sacrifice, employer SG, and personal deductible contributions — up to the $30,000 annual cap while receiving TTR income. The $30,000 cap includes all concessional contributions. Carry-forward unused concessional cap amounts from prior years are also available if your total super balance was below $500,000 at 30 June of the prior year. These contributions go into your accumulation account, not your TTR pension account.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Preservation Age Table ───────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Preservation age by date of birth
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Super is &ldquo;preserved&rdquo; &mdash; it cannot be accessed before your preservation age except
              in limited circumstances. Preservation age depends on your date of birth. The age was phased
              up to 60 for those born from 1 July 1964 onwards.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
              <table className="w-full text-sm" aria-label="Preservation age by date of birth">
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
                      <td className="px-5 py-3.5 text-xs font-bold text-amber-800 border-l border-amber-100">
                        {row.age}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-extrabold text-slate-900 mb-2">
                Preservation age vs a full condition of release
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Reaching preservation age only qualifies you for a TTR pension, not a full retirement-phase
                pension. To access retirement-phase benefits (0% earnings tax, lump-sum withdrawals, subject to
                the transfer balance cap), you must also meet a condition of release &mdash; most commonly,
                retiring permanently after reaching preservation age, or simply turning 65 (which is a
                condition of release regardless of employment status).
              </p>
            </div>
          </div>
        </section>

        {/* ── When TTR Is Less Valuable ────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              When TTR is less effective &mdash; and when it doesn&apos;t help
            </h2>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6">
              <p className="text-sm font-bold text-amber-800 mb-1">The 2017 rule change reduced TTR&apos;s tax advantage</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                Before 1 July 2017, investment earnings inside a TTR pension were also tax-free, making
                TTR doubly attractive: 0% on earnings <em>and</em> the salary sacrifice tax saving.
                The 2016 Budget removed the earnings tax exemption, so TTR now only saves tax on the
                concessional contributions side. The income boost strategy is unaffected by this change;
                the tax minimisation strategy still works but with a smaller net advantage.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  label: "TTR makes sense when...",
                  color: "bg-emerald-50 border-emerald-200",
                  badgeColor: "bg-emerald-100 text-emerald-700",
                  marker: "✓",
                  markerColor: "text-emerald-600",
                  items: [
                    "Age 60+ still working, in the 32.5% or 37% tax bracket",
                    "TSB of $200K+ so 4–10% drawdown provides meaningful income",
                    "Employer SG leaves room to salary sacrifice above the SG amount",
                    "Want to reduce hours without a corresponding pay cut",
                    "Planning retirement within 1–5 years — TTR eases the transition",
                    "High income ($120K+) with maximum salary sacrifice capacity",
                  ],
                },
                {
                  label: "TTR is less valuable when...",
                  color: "bg-red-50 border-red-200",
                  badgeColor: "bg-red-100 text-red-700",
                  marker: "–",
                  markerColor: "text-red-400",
                  items: [
                    "Low income (below $45K) — marginal rate too low for significant savings",
                    "TSB under $100K — drawdown depletes the balance faster than contributions replace it",
                    "Planning to leave the workforce very soon anyway — not worth the setup",
                    "Already at the $30K concessional cap — no room to increase salary sacrifice",
                    "Division 293 taxpayers (income >$250K) pay 30% contributions tax, reducing the spread",
                    "TSB approaching $1.9M — consider timing of conversion to retirement phase carefully",
                  ],
                },
              ].map((col) => (
                <div key={col.label} className={`rounded-xl border p-5 ${col.color}`}>
                  <div className={`inline-block text-xs font-bold px-2 py-1 rounded-full mb-3 ${col.badgeColor}`}>
                    {col.label}
                  </div>
                  <ul className="space-y-2">
                    {col.items.map((item) => (
                      <li key={item} className="text-sm flex gap-2 text-slate-700">
                        <span className={`flex-shrink-0 mt-0.5 font-bold ${col.markerColor}`}>{col.marker}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How to Access TTR ────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              How to set up a TTR pension: step-by-step
            </h2>
            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "Check your preservation age",
                  body: "Confirm you have reached your preservation age using the table above. For most people in the workforce in 2026, this is age 60. If you have not yet reached preservation age, you cannot start a TTR pension regardless of your super balance.",
                },
                {
                  step: "2",
                  title: "Assess your super balance and salary sacrifice room",
                  body: "Review your total super balance and how much of it you want to move into the TTR pension account. Check how much salary sacrifice room you have: the $30,000 concessional cap minus your employer&apos;s SG contributions (e.g., 11.5% of $120K = $13,800 SG leaves $16,200 of sacrifice room). The more room, the greater the potential tax saving.",
                },
                {
                  step: "3",
                  title: "Model the salary sacrifice scenario",
                  body: "Work out how much tax you save by salary sacrificing the maximum available amount into super, and how much pension income you need to draw from TTR to replace the lost take-home pay. A simple spreadsheet or a financial adviser can do this modelling. The TTR drawdown must be between 4% and 10% of the account balance — so size the TTR account accordingly.",
                },
                {
                  step: "4",
                  title: "Contact your super fund to open a TTR account",
                  body: "Most large super funds support TTR pensions. Contact your fund directly or through their online portal. You will roll a portion of your accumulation balance into a new TTR pension account. You do not have to move your entire balance &mdash; only the portion you want to draw from. Your accumulation account continues to receive employer and salary sacrifice contributions.",
                },
                {
                  step: "5",
                  title: "Set your drawdown rate and payment frequency",
                  body: "Set the drawdown amount between 4% and 10% of your TTR balance. Choose your payment frequency (monthly is most common). Coordinate this with your salary sacrifice arrangement so the pension payments replace the take-home pay you sacrifice.",
                },
                {
                  step: "6",
                  title: "Review annually",
                  body: "At the start of each financial year, your fund recalculates the minimum and maximum drawdown based on the new 1 July balance. Review whether your salary sacrifice level, super balance, and personal circumstances still make the TTR strategy optimal. As you approach full retirement, consider the timing of converting the TTR to a retirement-phase pension.",
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Converting TTR to Retirement Phase ──────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Converting your TTR to a retirement-phase pension
            </h2>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 mb-6">
              <p className="text-sm font-bold text-emerald-800 mb-1">Do this as soon as you retire or turn 65</p>
              <p className="text-sm text-emerald-700 leading-relaxed">
                Once you meet a condition of release &mdash; typically retiring permanently after age 60,
                or turning 65 &mdash; you should notify your fund to convert your TTR to a retirement-phase
                account-based pension. Every day you remain in TTR phase after you have retired means paying
                15% earnings tax instead of 0%.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "What changes at conversion",
                  badge: "On retiring",
                  badgeColor: "bg-emerald-100 text-emerald-800",
                  items: [
                    "Earnings tax drops from 15% to 0%",
                    "No maximum drawdown cap (the 10% limit is removed)",
                    "Lump-sum withdrawals (commutations) permitted",
                    "Balance counts against your $1.9M transfer balance cap",
                    "Pension income remains tax-free at age 60+",
                  ],
                },
                {
                  title: "Transfer balance cap at conversion",
                  badge: "TBC rules",
                  badgeColor: "bg-blue-100 text-blue-800",
                  items: [
                    "TTR balance at conversion counts as a TBC credit",
                    "General TBC is $1.9M for 2025–26",
                    "Excess above your available cap must stay in accumulation",
                    "Accumulation earnings remain at 15% on the excess",
                    "Consider splitting between you and your spouse if TBC is a concern",
                  ],
                },
              ].map((col) => (
                <div key={col.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-extrabold text-slate-900">{col.title}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${col.badgeColor}`}>
                      {col.badge}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {col.items.map((item) => (
                      <li key={item} className="text-sm flex gap-2 text-slate-700">
                        <span className="flex-shrink-0 mt-0.5 font-bold text-slate-500">&bull;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 mt-4">
              Full guide:{" "}
              <Link href="/super/pension-phase" className="underline text-blue-700 hover:text-blue-800 font-semibold">
                Super pension phase &mdash; transfer balance cap, 0% earnings tax, drawdown rules &rarr;
              </Link>
            </p>
          </div>
        </section>

        {/* ── TTR and Age Pension ──────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              TTR and the Age Pension
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Income test: pension payments assessed</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  TTR pension income payments are generally assessed under the Centrelink income test,
                  which could affect your Age Pension entitlement once you reach Age Pension age (67).
                  {/* // dated-ok — legislative grandfathering date, never changes */}
                  Account-based pensions started on or after 1 January 2015 are assessed under deeming
                  rules on the account balance, regardless of actual drawdown. The interaction between
                  TTR income and the Age Pension income and assets tests is complex and depends on your
                  individual situation.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Retirement phase treated differently</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Once you convert your TTR to a retirement-phase pension, the Centrelink treatment
                  changes. Retirement-phase account-based pensions (post-2015) are assessed under deeming
                  on the balance, but the interaction with other income sources and the assets test cutoff
                  thresholds differ from TTR. If Age Pension eligibility is relevant to your retirement
                  plan, the timing of converting TTR and the amount held in pension phase warrants
                  professional advice.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mt-4">
              <p className="text-sm font-bold text-blue-800 mb-1">Seek advice on the interaction</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                The interaction between TTR income, salary sacrifice, Age Pension entitlement, and the
                assets test is one of the most complex areas of Australian personal finance. The tax
                saving from the TTR strategy can sometimes be partly offset by reduced Age Pension
                entitlement. A licensed financial adviser can model your specific situation.
              </p>
            </div>
          </div>
        </section>

        {/* ── Common Mistakes ──────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Common TTR mistakes to avoid</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "Drawing too much — hitting the 10% cap",
                  body: "Some people draw the maximum 10% thinking more is always better. But drawing 10% every year on a moderate balance depletes the account quickly, leaving less invested to grow. Draw only what you need to replace sacrificed income or lost part-time pay — the minimum required is usually more optimal long-term.",
                },
                {
                  title: "Not salary sacrificing enough to offset the pension income",
                  body: "The TTR tax minimisation strategy only works if you are genuinely shifting the tax-rate spread — paying 15% contributions tax instead of your marginal rate. If you draw from TTR but don&apos;t increase salary sacrifice to match, you are just drawing down your super without a corresponding tax saving.",
                },
                {
                  title: "Forgetting to convert to retirement phase after retiring",
                  body: "The most costly mistake. Once you retire, your TTR account should be converted to a retirement-phase pension as soon as possible. Every day it stays as a TTR means 15% earnings tax instead of 0%. Notify your fund promptly — the conversion is usually a simple written request.",
                },
                {
                  title: "Not checking the fund&apos;s drawdown flexibility",
                  body: "Some super funds have limited payment frequency options or minimum payment amounts that differ from the legislative minimums. Before opening a TTR account, check your fund&apos;s payment flexibility to ensure you can set the exact drawdown amount and frequency you need for the strategy to work.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-red-200 bg-red-50 p-5">
                  <h3 className="font-extrabold text-red-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-red-800 leading-relaxed">{item.body}</p>
                </div>
              ))}
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
              <h2 className="text-lg font-extrabold text-white mb-1">
                TTR strategy complexity warrants professional advice
              </h2>
              <p className="text-slate-400 text-sm max-w-xl">
                A licensed financial adviser can model the salary sacrifice + TTR scenario for your exact
                income, super balance, and retirement timeline &mdash; including any Age Pension interactions
                and the timing of converting to retirement phase.
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

        {/* ── Related Pages ────────────────────────────────────────────── */}
        <section className="py-8 bg-white border-t border-slate-100">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Related guides</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link
                href="/super"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                Super hub &rarr;
              </Link>
              <Link
                href="/super/pension-phase"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                Super pension phase guide &rarr;
              </Link>
              <Link
                href="/super/contributions"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                Super contributions guide &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ── Compliance Disclaimer ─────────────────────────────────────── */}
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
