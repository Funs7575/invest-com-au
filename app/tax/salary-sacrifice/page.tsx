import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "How much can I salary sacrifice into super in 2025–26?",
    a: "The total concessional contributions cap is $30,000 per person per financial year (2025-26). This includes all concessional contributions: your employer's compulsory super guarantee (SG) contributions (11.5%), any salary sacrifice you arrange, and personal concessional contributions you claim a deduction for. If your employer pays 11.5% SG on a $120,000 salary ($13,800), you have up to $16,200 of salary sacrifice room. Exceeding the cap means the excess is included in your assessable income with a 15% tax offset.",
  },
  {
    q: "Is salary sacrifice worth it? How much tax do I actually save?",
    a: "The savings depend on your marginal tax rate. At 32.5% marginal rate: sacrificing $1 into super costs you only 15% in contributions tax vs 34.5% (including 2% Medicare Levy) in income tax — saving 19.5 cents per dollar. At 45% marginal rate (income $190k+): saving 32 cents per dollar (47% vs 15%). The catch: Division 293 tax applies if your income plus concessional super contributions exceed $250,000 — this adds 15% to the contributions tax, making the effective rate 30%. At 30%, salary sacrifice is still worth it vs 45%+ marginal rate, but less compelling vs 34.5%.",
  },
  {
    q: "What happens if I exceed the concessional contributions cap?",
    a: "Excess concessional contributions are included in your assessable income and taxed at your marginal rate — but you receive a 15% tax offset to represent the contributions tax already paid inside super. The tax outcome is roughly equivalent to having earned the money as ordinary income. You also receive an option to withdraw up to 85% of the excess from your super to help pay the extra tax. Excess contributions do not count against the non-concessional cap.",
  },
  {
    q: "Can I carry forward unused concessional cap from prior years?",
    a: "Yes. If your total super balance (across all accounts) is below $500,000 on 30 June of the previous financial year, you can carry forward unused concessional cap amounts from up to 5 previous financial years and use them in the current year. This is useful for people who have had lower incomes or career breaks in prior years and now have a high income. The ATO tracks your unused amounts — check via myGov/ATO online.",
  },
  {
    q: "What is the difference between salary sacrifice and personal deductible contributions?",
    a: "Both are concessional contributions that count toward the $30,000 cap and are taxed at 15% inside super. Salary sacrifice is arranged with your employer before you earn the income — the sacrifice reduces your taxable income directly. Personal deductible contributions are made from after-tax income; you then lodge a s290-170 notice of intent with your fund and claim a personal deduction in your tax return. The end-tax result is the same, but personal deductible contributions give you flexibility to adjust the amount at year-end.",
  },
  {
    q: "Does salary sacrifice affect my employer's super guarantee (SG) calculation?",
    a: "No — from 1 January 2020, the SG base is your ordinary time earnings, regardless of salary sacrifice. Your employer cannot use your salary sacrifice to reduce their SG obligation. If your employment contract says your salary package includes super, check the wording carefully — some older contracts have the super calculated on the reduced (post-sacrifice) salary. This is less common now but worth confirming with your payroll department.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Salary Sacrifice Super Guide Australia (${CURRENT_YEAR}) — How It Works & Tax Savings`,
  description:
    "How salary sacrifice into super works in Australia. Concessional cap $30,000 (2025-26), tax savings by bracket, carry-forward rules, Division 293, and step-by-step setup with your employer.",
  alternates: { canonical: `${SITE_URL}/tax/salary-sacrifice` },
  openGraph: {
    title: `Salary Sacrifice Super Guide Australia (${CURRENT_YEAR})`,
    description: "Tax savings, concessional cap, carry-forward rules, and how to set up salary sacrifice with your employer.",
    url: `${SITE_URL}/tax/salary-sacrifice`,
  },
};

export default function SalarySacrificePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Salary Sacrifice", url: absoluteUrl("/tax/salary-sacrifice") },
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
              <Link href="/tax" className="hover:text-white">Tax</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Salary Sacrifice</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-green-600 text-white px-3 py-1 rounded-full">$30k Concessional Cap</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Salary Sacrifice Super: How It Works &amp; What You Save
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Redirect pre-tax salary into super and pay 15% contributions tax instead of up to 47% income tax. One of the simplest legal tax reduction strategies available to Australian employees.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "$30,000", l: "Concessional cap 2025–26", sub: "Includes employer SG" },
                { v: "15%", l: "Contributions tax", sub: "vs up to 47% marginal rate" },
                { v: "19.5¢–32¢", l: "Tax saved per dollar", sub: "Depends on marginal rate" },
                { v: "$250k", l: "Division 293 threshold", sub: "Income + super contributions" },
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

        {/* How it works */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">How salary sacrifice into super works</h2>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700 mb-8">
              <p>
                Salary sacrifice is an arrangement where you agree with your employer to forgo part of your pre-tax salary in exchange for super contributions. Because the sacrifice happens before income tax is applied, the sacrificed amount is not included in your assessable income — instead, it is treated as a concessional super contribution and taxed at 15% inside your super fund.
              </p>
              <p>
                For most Australian employees, this is a straightforward win: you effectively convert income taxed at your marginal rate (32.5%–47%) into super taxed at 15%. The money ends up in your super rather than your bank account — but it is still your money, building your retirement savings faster.
              </p>
            </div>

            {/* Tax saving table */}
            <h3 className="text-xl font-extrabold text-slate-900 mb-4">Tax savings by income bracket (2025–26)</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-bold text-slate-700">Annual income</th>
                    <th className="text-right p-4 font-bold text-slate-700">Marginal rate + Medicare</th>
                    <th className="text-right p-4 font-bold text-slate-700">Contributions tax</th>
                    <th className="text-right p-4 font-bold text-green-700">Saving per $1 sacrificed</th>
                    <th className="text-right p-4 font-bold text-green-700">Saving on $10k sacrifice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { income: "$45,001 – $135,000", marginal: "34.5%", conc: "15%", saving: "19.5¢", tenK: "~$1,950" },
                    { income: "$135,001 – $190,000", marginal: "39%", conc: "15%", saving: "24¢", tenK: "~$2,400" },
                    { income: "$190,001+", marginal: "47%", conc: "15%", saving: "32¢", tenK: "~$3,200" },
                    { income: "$250,001+ (Div 293)", marginal: "47%", conc: "30%", saving: "17¢", tenK: "~$1,700" },
                  ].map((row) => (
                    <tr key={row.income} className="hover:bg-slate-50">
                      <td className="p-4 text-slate-700">{row.income}</td>
                      <td className="p-4 text-right text-slate-600">{row.marginal}</td>
                      <td className="p-4 text-right text-slate-600">{row.conc}</td>
                      <td className="p-4 text-right font-bold text-green-700">{row.saving}</td>
                      <td className="p-4 text-right font-bold text-green-700">{row.tenK}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">Marginal rates include 2% Medicare Levy. Division 293 applies where income + concessional super contributions exceed $250,000, levying an additional 15% on contributions (total 30%). Figures are illustrative and assume no other income adjustments.</p>
          </div>
        </section>

        {/* Key rules */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Key rules and limits</h2>
            <div className="space-y-4">
              {[
                {
                  title: "$30,000 concessional cap (2025–26)",
                  badge: "Annual limit",
                  body: "All concessional contributions in a financial year — employer SG (11.5% of salary), salary sacrifice, and personal deductible contributions — must total no more than $30,000. The cap is indexed to AWOTE (Average Weekly Ordinary Time Earnings) and rises in $2,500 increments. In 2024-25 the cap was also $30,000. Plan your salary sacrifice carefully to avoid the employer SG eating into your room: 11.5% SG on a $130k salary = $14,950, leaving $15,050 of salary sacrifice room.",
                },
                {
                  title: "Carry-forward unused cap (5 years)",
                  badge: "Catch-up rule",
                  body: "If your total super balance was below $500,000 on 30 June of the previous financial year, you can carry forward unused concessional cap amounts from the prior 5 years and use them in the current year. Unused cap accrues from 2019-20 onwards. This is especially useful for people returning from leave, career breaks, or with irregular income — you can make a large catch-up contribution in a good income year.",
                },
                {
                  title: "Division 293 tax at $250,000 threshold",
                  badge: "High-income catch",
                  body: "If your income (including reportable fringe benefits, reportable employer super, and total net investment loss) plus your concessional super contributions exceed $250,000, the ATO levies an additional 15% Division 293 tax on the excess contributions. The assessment arrives with your tax return. Division 293 effectively makes the contributions tax 30% for high-income earners — still lower than the 47% marginal rate, so salary sacrifice retains a material benefit.",
                },
                {
                  title: "SG base is not reduced by salary sacrifice",
                  badge: "Important",
                  body: "Since 1 January 2020, employers must calculate the super guarantee on your ordinary time earnings, regardless of any salary sacrifice arrangement. Your employer cannot use your salary sacrifice contributions as an offset against their SG obligation. If your contract says your total package is X and includes super, check the exact wording — some older contracts have different provisions.",
                },
                {
                  title: "How to set up salary sacrifice",
                  badge: "Process",
                  body: "Approach your employer's payroll or HR team and request a salary sacrifice agreement. Specify: (1) the amount or percentage of salary to sacrifice, (2) start date, and (3) frequency of review (typically annual). Once in place, your payslip will show a reduced gross taxable salary and a super contribution line. Your super fund will receive the sacrificed amount as a concessional contribution. You can modify or cancel the arrangement at any time (with notice to your employer).",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Optimising your sacrifice */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Optimising how much to sacrifice</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Maximise to the cap",
                  body: "Most salary earners benefit from sacrificing as much as possible up to the $30,000 cap (minus SG). This maximises the tax saving and grows your super balance faster. Useful if you have high income and the super lock-up period (preservation age) is acceptable.",
                },
                {
                  title: "Match your spending needs",
                  body: "Do not sacrifice so much that your take-home pay falls below your living expenses. Super is locked up until preservation age (60). Sacrificing money you may need in 2–5 years could leave you short — consider the transition to retirement (TTR) strategy if you are close to 60.",
                },
                {
                  title: "Use personal deductible contributions at year-end",
                  body: "If you could not set up salary sacrifice with your employer, you can achieve the same outcome by making personal after-tax contributions to super and lodging a s290-170 notice of intent with your fund, then claiming the deduction in your tax return. Ideal for the self-employed or those wanting to fine-tune the amount after seeing full-year income.",
                },
                {
                  title: "Check carry-forward available",
                  body: "Log into your ATO account via myGov to see your available carry-forward amounts. If you have significant unused cap from prior years and your super balance is below $500k, you may be able to make a large catch-up contribution in a high-income year — potentially sacrificing $60k+ in a single year.",
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

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
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
              <Link href="/tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Tax hub →</Link>
              <Link href="/super/contributions" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Super contributions guide →</Link>
              <Link href="/super/transition-to-retirement" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Transition to retirement →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
