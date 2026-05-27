import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "When does Division 296 start?",
    a: "Division 296 applies from 1 July 2026. The first tax assessments will be issued by the ATO in the 2026–27 financial year. Members with TSB above $3 million as at 30 June 2026 will be subject to the tax for that year.",
  },
  {
    q: "Is the $3 million threshold indexed to inflation?",
    a: "No. The $3 million threshold is fixed in legislation and will not be indexed to inflation. This means that over time, as super balances grow with investment returns, more members will become subject to the tax — even those who are not currently considered ‘high balance’. At 7% annual returns, a $2 million balance today would breach $3 million in approximately 6 years.",
  },
  {
    q: "Do unrealised capital gains count?",
    a: "Yes. Unlike all other Australian taxes, Division 296 includes unrealised (notional) capital gains as part of the earnings calculation. An SMSF holding property or private equity that increases in value triggers Div 296 tax even if the asset is not sold. This is particularly concerning for illiquid assets.",
  },
  {
    q: "Can I pay the tax from outside my super?",
    a: "Yes. If your fund receives a Div 296 tax notice, you can choose to pay it personally (from your own non-super assets) rather than having your fund release assets to pay it. This preserves more capital inside super. The payment is not deductible and does not count as a contribution.",
  },
  {
    q: "What happens if my super earnings are negative?",
    a: "If super earnings (the Div 296 calculation, which includes unrealised movements) are negative for a year, no Div 296 tax is payable. The loss can be carried forward to offset future earnings in the Div 296 calculation — but you do not get a refund for prior years.",
  },
  {
    q: "Should I withdraw from super to avoid Division 296?",
    a: "This depends on your personal circumstances. Withdrawing from super to bring your balance below $3 million reduces future Div 296 exposure but also forfeits future tax-advantaged compound growth. A tax adviser should model the after-tax break-even between staying inside super (paying 15% + 30% on above-threshold proportion) versus investing outside super (at marginal rates). For most people, super remains tax-advantaged even above $3 million.",
  },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Division 296 Tax — The New 30% Super Tax Explained (${CURRENT_YEAR})`,
  description:
    "Complete guide to Division 296, the new 30% tax on superannuation balances over $3 million commencing 1 July 2026. How the tax is calculated, notional gains, who is affected, and strategies to consider.",
  alternates: { canonical: `${SITE_URL}/super/division-296` },
  openGraph: {
    title: `Division 296 — The New 30% Tax on Super Over $3 Million (${CURRENT_YEAR})`,
    description:
      "How Division 296 works, why notional gains are controversial, who is affected, and planning strategies.",
    url: `${SITE_URL}/super/division-296`,
  },
};

export default function Division296Page() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Super", url: absoluteUrl("/super") },
    { name: "Division 296 Tax", url: absoluteUrl("/super/division-296") },
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
              <span className="text-white font-medium">Division 296 Tax</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-red-600 text-white px-3 py-1 rounded-full">From 1 July 2026</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Division 296 &mdash; The New 30% Tax on Super Over $3 Million
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              From 1 July 2026, superannuation members with a total super balance above $3 million will pay an additional 30% tax on the earnings attributable to the proportion of their balance above the threshold.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "1 Jul 2026", l: "Commencement date", sub: "First assessments issued 2026–27" },
                { v: "+30%", l: "Additional tax rate", sub: "On earnings above $3M threshold" },
                { v: "~80,000", l: "Australians affected initially", sub: "ATO estimate at commencement" },
                { v: "Notional", l: "Gains included", sub: "Unrealised gains taxed for first time" },
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

        {/* What is Division 296 */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is Division 296?</h2>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 mb-6">
              <p className="text-sm font-bold text-amber-800 mb-1">The most significant superannuation tax change in over a decade</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                Division 296 is an <strong>additional tax of 30%</strong> on the earnings attributable to the proportion of a
                member&apos;s total super balance (TSB) above $3 million. It operates on top of the existing tax
                system &mdash; the standard 15% concessional tax rate continues to apply to the first $3 million of
                balance. Division 296 tax is levied at the <strong>individual level</strong> and applies across
                all super accounts combined.
              </p>
            </div>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700">
              <p>
                The existing 15% tax rate on investment earnings in accumulation phase continues to apply to the
                first $3 million of a member&apos;s TSB. Pension-phase accounts (earning at 0%) also count toward
                the TSB for Div 296 purposes &mdash; the 0% rate in pension phase is preserved, but the
                Div 296 calculation uses the total fund balance.
              </p>
              <p>
                One of the most significant and contested aspects of the legislation is that the <strong>$3 million
                threshold is not indexed to inflation</strong>. Unlike most other thresholds in the super system (such
                as the concessional contributions cap and the transfer balance cap, which are CPI-indexed), the $3
                million figure is fixed in legislation. Over time, as balances grow through investment returns and
                compounding, an increasing number of members will cross the threshold &mdash; even without making
                additional contributions.
              </p>
            </div>
          </div>
        </section>

        {/* How the tax is calculated */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How Division 296 tax is calculated</h2>
            <p className="text-sm text-slate-600 mb-6">
              The ATO calculates the tax using a formula based on the member&apos;s total super balance at the end of
              the financial year. The steps below reflect the legislative formula.
            </p>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Calculate adjusted TSB at year end",
                  body: "The adjusted total super balance (TSB) at 30 June is calculated as: TSB at year end + withdrawals made during the year − contributions made during the year. This adjustment ensures that large withdrawals or contributions do not distort the earnings calculation.",
                },
                {
                  step: "2",
                  title: "Determine the proportion above $3 million",
                  body: "The proportion of the TSB above $3 million is: (TSB − $3,000,000) ÷ TSB. For example, if your TSB at 30 June is $4 million: ($4M − $3M) ÷ $4M = 25%. Only 25% of earnings are subject to the Div 296 calculation.",
                },
                {
                  step: "3",
                  title: "Calculate super earnings for the year",
                  body: "Super earnings = Adjusted TSB at year end − Opening TSB at 1 July − Contributions + Withdrawals. This figure captures all movements in the account, including both realised and unrealised gains and losses. Importantly, this figure can be negative in years where markets fall.",
                },
                {
                  step: "4",
                  title: "Apply the proportion to earnings",
                  body: "Taxable earnings for Div 296 purposes = Super earnings × proportion above $3 million. Continuing the example: if super earnings are $280,000 and the proportion is 25%, taxable earnings = $70,000.",
                },
                {
                  step: "5",
                  title: "Apply 30% tax rate",
                  body: "Division 296 tax = Taxable earnings × 30%. If taxable earnings are positive, the tax is assessed and a notice is issued by the ATO. If taxable earnings are negative (the fund lost value in Div 296 terms), no tax is payable for that year — and the loss is carried forward to offset future earnings. There is no refund mechanism for prior years’ tax.",
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
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

        {/* Notional gains controversy */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Notional gains &mdash; the key controversy</h2>
            <div className="rounded-xl border border-red-300 bg-red-50 p-5 mb-6">
              <p className="text-sm font-bold text-red-800 mb-1">Unlike all other Australian tax, Division 296 taxes unrealised gains</p>
              <p className="text-sm text-red-700 leading-relaxed">
                The Division 296 earnings formula includes <strong>notional (unrealised) capital gains</strong> &mdash;
                increases in the value of assets that have not been sold. This is a departure from the fundamental
                principle of Australian tax law that tax is triggered by a realisation event.
              </p>
            </div>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700 mb-6">
              <p>
                For SMSF trustees holding illiquid assets such as direct property or private equity investments,
                this creates a genuine cash-flow problem. A fund holding a commercial property worth $3.5 million
                that increases in value by 10% during the year ($350,000 notional gain) will trigger a Div 296
                tax assessment even though no cash has been received from the property.
              </p>
              <p>
                The ATO provides a mechanism called a <strong>release authority</strong> to address this. When a Div 296
                tax assessment is issued, the member can direct their super fund to release funds to pay the
                tax directly to the ATO. Alternatively, the member can pay the tax personally from non-super
                assets &mdash; preserving more capital inside the fund.
              </p>
              <p>
                Where a fund is heavily invested in illiquid assets and does not hold sufficient liquid assets
                to meet the tax liability, trustees may need to restructure their investment mix or negotiate
                the timing of asset sales. For some SMSFs, this could require selling a property asset sooner
                than planned.
              </p>
            </div>
          </div>
        </section>

        {/* Who is affected */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Who is affected &mdash; example scenarios</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  scenario: "High-balance accumulation",
                  tsb: "$4M with 7% return = $280K earnings",
                  impact: "~$21K extra tax",
                  detail: "25% proportion × $280K × 30% = $21,000 additional Div 296 tax on top of standard 15% concessional tax.",
                  color: "border-red-200 bg-red-50",
                  badgeColor: "bg-red-100 text-red-700",
                },
                {
                  scenario: "SMSF with direct property",
                  tsb: "$3.5M property-heavy fund, property up 10%",
                  impact: "Notional gain triggers tax without cash",
                  detail: "A 14.3% proportion ($0.5M / $3.5M) on $350K notional gain = $15,015 tax. No cash received from the property.",
                  color: "border-amber-200 bg-amber-50",
                  badgeColor: "bg-amber-100 text-amber-700",
                },
                {
                  scenario: "Near-threshold member",
                  tsb: "$3.1M fund",
                  impact: "Small proportion, manageable impact",
                  detail: "3.2% proportion ($0.1M / $3.1M). On $217K earnings (7%), taxable earnings = ~$7K, Div 296 tax = ~$2,100.",
                  color: "border-slate-200 bg-slate-50",
                  badgeColor: "bg-slate-100 text-slate-700",
                },
              ].map((item) => (
                <div key={item.scenario} className={`rounded-xl border p-5 ${item.color}`}>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full mb-3 inline-block ${item.badgeColor}`}>{item.scenario}</span>
                  <p className="text-sm font-bold text-slate-800 mb-1">{item.tsb}</p>
                  <p className="text-base font-extrabold text-slate-900 mb-2">{item.impact}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">Scenarios are illustrative only. Actual tax depends on individual circumstances, contributions, withdrawals, and asset values. This is general information, not personal financial advice.</p>
          </div>
        </section>

        {/* Strategies to consider */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Strategies to consider</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "Withdrawals before the threshold",
                  badge: "Balance management",
                  body: "Members approaching $3 million should model projected TSB trajectories and consider structured withdrawals to manage their balance. Withdrawals must respect preservation rules (condition of release required) and pension payment caps. The break-even analysis should compare after-tax growth inside super versus investing outside super at marginal tax rates.",
                },
                {
                  title: "Spouse contribution splitting",
                  badge: "Couples strategy",
                  body: "Splitting concessional contributions to a spouse’s fund can distribute the TSB more evenly between partners, potentially keeping both balances below the $3 million threshold. The concessional contribution splitting cap is up to 85% of concessional contributions, subject to the $30,000 annual concessional cap. Timing and eligibility rules apply.",
                },
                {
                  title: "Rebalancing to liquid assets (SMSF)",
                  badge: "SMSF trustees",
                  body: "SMSF trustees with illiquid assets such as direct property face a structural cash-flow problem: notional gains trigger Div 296 tax without generating cash. Trustees should assess their portfolio liquidity and consider rebalancing before 1 July 2026 to ensure the fund can meet annual Div 296 tax liabilities without distressed asset sales.",
                },
                {
                  title: "Review pension and accumulation account mix",
                  badge: "Account structure",
                  body: "Pension accounts count toward TSB for Div 296 purposes. The 0% earnings tax in pension phase is preserved for existing pension accounts, but the Div 296 formula uses the total balance regardless. Review whether your pension-to-accumulation mix is still optimal given the new tax, and whether pension drawdowns can be structured to manage the year-end TSB figure.",
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

        {/* What Div 296 does NOT change */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">What Division 296 does not change</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: "First $3M still taxed at 15% (or 0% in pension phase)",
                  body: "Division 296 is an additional tax on the above-threshold proportion only. The first $3 million of super balance continues to be taxed at the existing 15% concessional rate in accumulation phase and 0% in pension phase. No change to these rates.",
                },
                {
                  title: "No change to Transfer Balance Cap or pension rules",
                  body: "The Transfer Balance Cap ($1.9 million for 2025–26) and associated pension eligibility rules are unchanged by Division 296. The ability to move super into pension phase (and the 0% earnings tax that applies to pension accounts) continues as before.",
                },
                {
                  title: "Contribution caps unchanged",
                  body: "The concessional contributions cap ($30,000) and the non-concessional contributions cap ($120,000 per year, subject to total super balance limits) are not changed by Division 296 legislation. Existing bring-forward and carry-forward rules continue to apply.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-emerald-600 font-extrabold flex-shrink-0">&#10003;</span>
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
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
              <Link href="/super" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Super hub &rarr;</Link>
              <Link href="/super/transition-to-retirement" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Transition to retirement &rarr;</Link>
              <Link href="/advisors/financial-planners" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a financial planner &rarr;</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
