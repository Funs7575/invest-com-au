import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Who can start a transition to retirement pension?",
    a: "You must have reached your preservation age, which is 60 for anyone born on or after 1 July 1964 (which covers most Australians still in the workforce in 2026). You must still be in the workforce — once you permanently retire, you move to a full retirement-phase pension, not a TTR. You can only access super as a non-commutable income stream under TTR, not as lump-sum withdrawals.",
  },
  {
    q: "How much can I draw from a TTR pension each year?",
    a: "Between 4% and 10% of your TTR account balance per year. Payments can be made monthly, quarterly, half-yearly, or annually. You cannot make lump-sum withdrawals (the pension is non-commutable). The minimum is set at the start of each financial year based on your account balance on 1 July. If you start part-way through the year, the minimum is pro-rated.",
  },
  {
    q: "Are TTR pension payments taxed?",
    a: "If you are age 60 or over, pension payments from a taxed super fund are tax-free — they are not included in your assessable income. If you are between preservation age and 60 (which now only applies to older Australians, since preservation age is 60 for most), the taxable component is assessable income but you receive a 15% tax offset to partially compensate. For most Australians using TTR in 2026, payments are tax-free.",
  },
  {
    q: "Are earnings inside a TTR pension tax-free?",
    a: "No. Since 1 July 2017, investment earnings inside a TTR pension account are taxed at 15% — the same rate as the accumulation phase. This changed when the government removed the earnings tax exemption from TTR accounts. Earnings only become tax-free (0%) once you fully retire and convert your TTR to a retirement-phase pension (when you meet a full condition of release).",
  },
  {
    q: "Does a TTR pension count against the transfer balance cap?",
    a: "No, starting a TTR pension does not count against your $1.9M transfer balance cap (2025-26). Only when you convert to a retirement-phase pension (on fully retiring) does the account balance count against the cap. If your TTR balance at the time of conversion exceeds the cap, the excess stays in accumulation phase and is not brought into the pension phase.",
  },
  {
    q: "Can I contribute to super while receiving a TTR pension?",
    a: "Yes. You can continue making concessional contributions (salary sacrifice, employer SG, personal deductible) up to the $30,000 annual concessional cap, and non-concessional contributions up to $120,000 per year (subject to total super balance limits). This is the basis of the salary sacrifice + TTR strategy: sacrifice more into super while drawing from TTR to maintain take-home pay.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Transition to Retirement (TTR) Guide Australia (${CURRENT_YEAR}) — Strategy, Tax & Rules`,
  description:
    "Complete guide to transition to retirement (TTR) pension strategy in Australia. Salary sacrifice + TTR tax savings, 4–10% drawdown rules, preservation age, transfer balance cap, and when TTR makes sense.",
  alternates: { canonical: `${SITE_URL}/super/transition-to-retirement` },
  openGraph: {
    title: `Transition to Retirement Pension Guide Australia (${CURRENT_YEAR})`,
    description: "How TTR pensions work, the salary sacrifice strategy, tax treatment, and common traps.",
    url: `${SITE_URL}/super/transition-to-retirement`,
  },
};

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

        {/* Hero */}
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
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">Age 60+ Strategy</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Transition to Retirement (TTR) Pension Guide
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Once you reach 60 and are still working, you can access super as a non-commutable income stream — and combine it with salary sacrifice to legally reduce your tax while maintaining your take-home pay.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "60", l: "Preservation age", sub: "For those born after 1 July 1964" },
                { v: "4–10%", l: "Annual drawdown range", sub: "% of account balance" },
                { v: "15%", l: "Earnings tax in TTR", sub: "Same as accumulation phase" },
                { v: "Tax-free", l: "Pension payments", sub: "If aged 60+ from a taxed fund" },
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

        {/* What is TTR */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is a transition to retirement pension?</h2>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700">
              <p>
                A transition to retirement (TTR) pension is a type of super income stream you can start once you reach preservation age (60 for most Australians) and are still in the workforce. Unlike a full retirement pension, it does not require you to have fully retired — the whole point is that you can access super while continuing to work.
              </p>
              <p>
                TTR pensions are <strong>non-commutable</strong>, meaning you cannot take lump sums from them. All withdrawals must be taken as regular income stream payments, and you are limited to drawing between 4% and 10% of your account balance each financial year.
              </p>
              <p>
                When you fully retire (or turn 65, which is a condition of release regardless of employment status), your TTR pension automatically converts to a standard account-based pension (retirement phase), at which point earnings inside the account become tax-free.
              </p>
            </div>
          </div>
        </section>

        {/* The Salary Sacrifice Strategy */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">The salary sacrifice + TTR strategy explained</h2>
            <p className="text-sm text-slate-600 mb-6">
              The main reason Australians start a TTR pension while still working is to reduce their total income tax bill without reducing their take-home pay. Here is how it works in practice.
            </p>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
              <h3 className="font-extrabold text-slate-900 mb-4">Example: $120k salary, age 62</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-4 font-bold text-slate-700">Item</th>
                      <th className="text-right py-2 pr-4 font-bold text-slate-700">Without TTR strategy</th>
                      <th className="text-right py-2 font-bold text-blue-700">With TTR strategy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { item: "Gross salary", without: "$120,000", with: "$120,000" },
                      { item: "Salary sacrifice to super", without: "$0", with: "$20,000" },
                      { item: "Assessable employment income", without: "$120,000", with: "$100,000" },
                      { item: "Income tax + Medicare", without: "~$31,800", with: "~$24,700" },
                      { item: "Take-home pay", without: "$88,200", with: "$75,300" },
                      { item: "TTR pension drawn (tax-free)", without: "$0", with: "$13,100" },
                      { item: "Net cash in hand", without: "$88,200", with: "~$88,400" },
                      { item: "Contributions tax in super (15%)", without: "–", with: "$3,000" },
                      { item: "Total tax paid", without: "~$31,800", with: "~$27,700" },
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
              <p className="text-xs text-slate-500 mt-3">Illustrative only. Tax figures are approximate. Actual amounts depend on your full income, deductions, and super balance. This is general information only — not personal financial advice.</p>
            </div>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Increase salary sacrifice to super",
                  body: "Arrange with your employer to salary sacrifice an additional amount into super — up to the $30,000 concessional cap minus your employer SG contributions (e.g., if your employer pays 11.5% SG on $120k = $13,800, you have up to $16,200 of sacrifice room). The sacrificed amount is taxed at 15% inside super, not at your marginal rate of 34.5–47%.",
                },
                {
                  step: "2",
                  title: "Start a TTR pension with part of your super",
                  body: "Roll a portion of your super accumulation account into a TTR pension account with your fund. This becomes the pool you draw income from. You do not have to move all of your super — just enough to cover the income you need to replace.",
                },
                {
                  step: "3",
                  title: "Draw tax-free pension payments to replace take-home pay",
                  body: "Receive regular payments (monthly, quarterly) from your TTR pension. If you are 60+, these payments are tax-free. The net effect: you draw from super to replace the after-tax pay you lost from salary sacrificing, but you are paying 15% contributions tax instead of your marginal rate on the sacrificed amount.",
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center">{s.step}</div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rules and limits */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">TTR rules and key limits (2025–26)</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Preservation age requirement",
                  badge: "Eligibility",
                  body: "Preservation age is 60 for all Australians born on or after 1 July 1964. You must have reached preservation age to start a TTR pension. You do not need to have retired.",
                },
                {
                  title: "Annual drawdown: 4% minimum, 10% maximum",
                  badge: "Drawdown limits",
                  body: "You must draw at least 4% and no more than 10% of your TTR account balance each year. The balance is measured at 1 July each year (or the commencement date if starting mid-year). At age 65-74 the minimum rises to 5%, at 75-79 it is 6%, and so on. The temporary COVID-era halved minimums no longer apply.",
                },
                {
                  title: "Non-commutable: no lump sum withdrawals",
                  badge: "Withdrawal restrictions",
                  body: "You cannot take a lump sum from a TTR pension while you are still working and below age 65. All withdrawals must be taken as regular income stream payments. If you need a lump sum, you must fully retire (or turn 65) first, which converts the TTR to a retirement-phase pension with full commutation rights.",
                },
                {
                  title: "Earnings taxed at 15% inside TTR",
                  badge: "Tax treatment",
                  body: "Since 1 July 2017, investment earnings inside a TTR pension account are taxed at 15% — the same rate as the accumulation phase. This is less favourable than retirement-phase pensions (0%). The earnings tax exemption was removed by the 2016 Budget. TTR's tax benefit now comes from the salary sacrifice strategy on the contributions side, not from investment earnings.",
                },
                {
                  title: "Transfer balance cap: TTR exempt until retirement",
                  badge: "TBC rules",
                  body: "Starting a TTR pension does not count against your $1.9 million transfer balance cap (general cap for 2025-26). The balance only counts against the TBC when you convert to a retirement-phase pension. If your TTR balance at conversion exceeds your available cap space, the excess stays in accumulation. This matters if your super total is approaching $1.9M.",
                },
                {
                  title: "Concessional contributions still allowed",
                  badge: "Contributions",
                  body: "You can continue making concessional contributions (salary sacrifice, employer SG, personal deductible) up to $30,000/year while receiving TTR payments. The $30,000 cap includes all concessional contributions — SG plus salary sacrifice. Carry-forward unused cap amounts from prior years (if total super balance below $500,000) are also available.",
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

        {/* When TTR makes sense */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">When does TTR make financial sense?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  label: "Makes sense",
                  color: "bg-emerald-50 border-emerald-200",
                  textColor: "text-emerald-700",
                  badgeColor: "bg-emerald-100 text-emerald-700",
                  items: [
                    "Age 60+ still working, in the 32.5%+ tax bracket — salary sacrifice savings are meaningful",
                    "Sufficient super balance to fund both the drawdown and ongoing growth",
                    "Want to reduce hours without reducing income (draw TTR to replace part-time income loss)",
                    "Planning retirement within 2–5 years and want to transition the super to pension phase",
                    "High income ($120k+) with room to salary sacrifice above current SG level",
                  ],
                },
                {
                  label: "Less effective",
                  color: "bg-amber-50 border-amber-200",
                  textColor: "text-amber-700",
                  badgeColor: "bg-amber-100 text-amber-700",
                  items: [
                    "Low income (below $45k) — the marginal rate isn't high enough for significant savings",
                    "Small super balance — drawing 4-10% depletes the balance faster than contributions replace it",
                    "Under age 60 — pension payments are not fully tax-free, reducing the benefit",
                    "High super balance near the $1.9M TBC — consider whether TTR or simply moving to retirement phase is better",
                    "Division 293 tax payers (income > $250k) — still worthwhile but the advantage is smaller",
                  ],
                },
              ].map((col) => (
                <div key={col.label} className={`rounded-xl border p-5 ${col.color}`}>
                  <div className={`inline-block text-xs font-bold px-2 py-1 rounded-full mb-3 ${col.badgeColor}`}>{col.label}</div>
                  <ul className="space-y-2">
                    {col.items.map((item) => (
                      <li key={item} className={`text-sm flex gap-2 ${col.textColor}`}>
                        <span className="flex-shrink-0 mt-0.5">{col.label === "Makes sense" ? "✓" : "–"}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
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

        {/* Compliance + nav */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/super" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Super hub →</Link>
              <Link href="/super/contributions" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Super contributions guide →</Link>
              <Link href="/advisors/financial-planners" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a financial planner →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
