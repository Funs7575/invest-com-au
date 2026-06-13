import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "When do I have to start repaying my HECS-HELP debt?",
    a: "You start repaying once your repayment income exceeds the minimum threshold — $54,435 for the 2024-25 financial year. There is no fixed start date or deadline. The ATO automatically calculates your compulsory repayment when you lodge your tax return each year. Your employer should also withhold an amount from your salary throughout the year if you advise them you have a HELP debt on your Tax File Number declaration. If you never earn above the threshold, you are never required to repay.",
  },
  {
    q: "Does salary sacrificing to super reduce my HECS repayments?",
    a: "No. Reportable employer super contributions — super contributions your employer makes above the Super Guarantee rate at your direction (i.e., via salary sacrifice) — are included in your HECS repayment income. If you salary sacrifice $12,000 into super on top of your employer's compulsory SG, that $12,000 is added back to your taxable income when calculating your repayment income. You cannot reduce your HECS repayment obligation by salary sacrificing to super. The same applies to reportable fringe benefits, net investment losses, and net rental property losses.",
  },
  {
    q: "What is the indexation rate and can I avoid it?",
    a: "Each year on 1 June, your HELP debt is increased by the indexation factor, which is based on the Consumer Price Index (CPI). You cannot avoid indexation — it applies to your outstanding balance automatically. However, from June 2024, legislation capped HELP indexation at the lower of CPI or the Wage Price Index (WPI). This change also applied retroactively to the 2023 indexation (which was 7.1%), with a credit applied to reduce balances that had been inflated. Making voluntary repayments before 1 June each year can reduce the balance on which indexation is calculated.",
  },
  {
    q: "Should I pay off my HECS-HELP debt early?",
    a: "Whether to pay down HECS early depends on the indexation rate relative to your expected investment returns. Historically, HELP indexation has tracked CPI at around 2-3% per year (though it spiked to 7.1% in 2023). If you can earn higher returns by investing — Australian shares have historically returned around 9-10% per year long-term — it generally makes mathematical sense to invest rather than voluntarily repay. There is no longer a discount for voluntary repayments (the 5% bonus was abolished in 2017). That said, some people value the psychological certainty of being debt-free; that is a personal choice. If indexation rises significantly above typical investment returns, the calculus changes.",
  },
  {
    q: "What happens to my HECS debt if I go overseas?",
    a: "Since 2017, Australians living overseas are required to make HECS-HELP repayments if their worldwide income exceeds the repayment threshold. You must notify the ATO within 7 days of leaving Australia if you plan to live overseas, and lodge an 'overseas income declaration' each year. Repayments are calculated on your worldwide income — not just Australian income. Your debt also continues to be indexed by CPI while you are overseas. Failing to notify or lodge can result in penalties.",
  },
  {
    q: "How do I check my current HECS balance?",
    a: "Log in to your ATO account via myGov at my.gov.au and navigate to 'Study and training' or 'Loans and debts'. Your current HELP debt balance is shown there, along with a history of repayments and indexation applied each year. You can also see your balance on your most recent Notice of Assessment from the ATO. If you have multiple HELP debts (e.g., from different study periods), they are all combined into a single balance.",
  },
];

const THRESHOLD_ROWS = [
  { from: "Below $54,435", rate: "Nil" },
  { from: "$54,435 – $62,850", rate: "1.0%" },
  { from: "$62,851 – $66,620", rate: "2.0%" },
  { from: "$66,621 – $70,618", rate: "2.5%" },
  { from: "$70,619 – $74,855", rate: "3.0%" },
  { from: "$74,856 – $79,346", rate: "3.5%" },
  { from: "$79,347 – $84,107", rate: "4.0%" },
  { from: "$84,108 – $89,154", rate: "4.5%" },
  { from: "$89,155 – $94,503", rate: "5.0%" },
  { from: "$94,504 – $100,174", rate: "5.5%" },
  { from: "$100,175 – $106,185", rate: "6.0%" },
  { from: "$106,186 – $112,556", rate: "6.5%" },
  { from: "$112,557 – $119,309", rate: "7.0%" },
  { from: "$119,310 – $126,467", rate: "7.5%" },
  { from: "$126,468 – $134,056", rate: "8.0%" },
  { from: "$134,057 – $142,100", rate: "8.5%" },
  { from: "$142,101 – $150,626", rate: "9.0%" },
  { from: "$150,627 – $159,663", rate: "9.5%" },
  { from: "$159,664 and above", rate: "10.0%" },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `HECS-HELP Repayments Guide Australia (${CURRENT_YEAR}) — Thresholds, Indexation & Strategies`,
  description: `How HECS-HELP repayments work: 2024-25 thresholds, CPI indexation, repayment income, worked examples, and whether to repay early. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `HECS-HELP Repayments Guide Australia (${CURRENT_YEAR})`,
    description: "2024-25 repayment thresholds, CPI indexation, salary sacrifice traps, and whether to pay your student debt off early.",
    url: `${SITE_URL}/tax/hecs-help`,
    images: [{ url: `/api/og?title=${encodeURIComponent("HECS-HELP Repayments Guide")}&sub=${encodeURIComponent("Thresholds · Indexation · Strategies · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/hecs-help` },
};

export default function HecsHelpPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "HECS-HELP Repayments", url: absoluteUrl("/tax/hecs-help") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/tax" className="hover:text-white">Tax</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">HECS-HELP Repayments</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">2024&#8211;25 Tax Year</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              HECS-HELP Repayments: How It Works ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              Australia&#8217;s student loan system repays automatically through the tax system once your income exceeds the threshold. Here&#8217;s everything you need to know about thresholds, indexation, and whether to pay it off early.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Min repayment threshold", value: "$54,435" },
                { label: "Max repayment rate", value: "10%" },
                { label: "2024 indexation rate", value: "4.7%" },
                { label: "Indexation date", value: "1 June" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What is HECS-HELP */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is HECS-HELP?</h2>
            <div className="space-y-4 text-sm leading-relaxed text-slate-700 mb-8">
              <p>
                HECS-HELP is a government loan scheme that pays your tuition fees directly to your university when you enrol. You don&#8217;t pay the fees upfront — instead, the debt accumulates and is repaid through the tax system once your income exceeds the minimum repayment threshold.
              </p>
              <p>
                There is no traditional interest charged on HECS-HELP debt. Instead, the outstanding balance is indexed (increased) on 1 June each year in line with the Consumer Price Index (CPI). This means the real value of your debt stays roughly constant with inflation — it doesn&#8217;t compound like a credit card or personal loan.
              </p>
              <p>
                There is no deadline to repay. If your income never rises above the threshold, you are never required to repay. The debt does not follow you to your estate — outstanding HECS-HELP is written off on death.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: "Paid directly to your uni",
                  body: "You never receive the money. The government pays your tuition fees to the university on your behalf, and the equivalent amount becomes your HELP debt.",
                },
                {
                  title: "Repaid via tax system",
                  body: "Each year when you lodge your tax return, the ATO calculates your compulsory repayment based on your repayment income. Your employer also withholds HECS repayments from your pay throughout the year.",
                },
                {
                  title: "Indexed to CPI, not interest",
                  body: "On 1 June each year, your outstanding balance is adjusted by the CPI indexation factor. From 2024, this is capped at the lower of CPI or the Wage Price Index (WPI).",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-extrabold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Repayment thresholds table */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Repayment thresholds 2024&#8211;25</h2>
            <p className="text-sm text-slate-600 mb-6">
              Rates apply to your total <strong>repayment income</strong> (not just your salary &#8212; see below). The rate applies to your entire repayment income once you cross a band &#8212; it is not marginal like income tax.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" aria-label="HECS-HELP repayment rates by income band 2024–25">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Repayment income</th>
                    <th scope="col" className="px-4 py-3 text-right font-extrabold text-slate-700">Repayment rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {THRESHOLD_ROWS.map((row) => (
                    <tr key={row.from} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{row.from}</td>
                      <td className={`px-4 py-3 text-right font-bold ${row.rate === "Nil" ? "text-slate-500" : "text-slate-900"}`}>{row.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">Source: ATO 2024&#8211;25 repayment thresholds. Thresholds are indexed annually. The repayment is applied to your full repayment income at the applicable rate (not a marginal rate per band).</p>
          </div>
        </section>

        {/* What is repayment income */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What counts as &#8220;repayment income&#8221;?</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              Repayment income is broader than your taxable income. It is designed to capture your full economic capacity to repay, including investment activity and salary structuring that would otherwise reduce your declared income.
            </p>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-6">
              <h3 className="font-extrabold text-blue-900 mb-3">Repayment income formula</h3>
              <p className="text-sm text-blue-900 font-mono leading-loose">
                Repayment income =<br />
                Taxable income<br />
                + Total net investment losses<br />
                + Reportable fringe benefits<br />
                + Reportable employer super contributions<br />
                + Total net rental property losses
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "Reportable employer super contributions",
                  badge: "Common trap",
                  badgeColor: "bg-red-100 text-red-700",
                  body: "If you salary sacrifice into super above the Super Guarantee (SG) rate, the extra amount is a 'reportable employer super contribution' and is added back into your repayment income. Sacrificing $12,000 extra into super does NOT reduce your HECS repayment — the $12,000 is counted as repayment income. This surprises many people who think salary sacrifice will lower their HECS bill.",
                },
                {
                  title: "Net investment and rental losses",
                  badge: "Included",
                  badgeColor: "bg-amber-100 text-amber-700",
                  body: "If you have negatively geared property or investments where costs exceed income, the net loss is added back to your taxable income to arrive at repayment income. You cannot reduce your HECS repayment income by holding negatively geared assets.",
                },
                {
                  title: "Reportable fringe benefits",
                  badge: "Included",
                  badgeColor: "bg-amber-100 text-amber-700",
                  body: "Fringe benefits reported on your payment summary (such as a company car or salary-packaged items above the FBT-exempt threshold) are included in repayment income. However, salary packaging at NFPs using the FBT-exempt threshold ($15,900) does not generate a reportable fringe benefit — so that portion genuinely does not increase your HECS repayment income.",
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

        {/* Worked examples */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Worked examples</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-extrabold shrink-0">E</span>
                  <h3 className="font-extrabold text-slate-900">Emma &#8212; salary only</h3>
                </div>
                <ul className="text-sm text-slate-700 space-y-1 mb-4">
                  <li>Salary: <strong>$80,000</strong></li>
                  <li>No other income or losses</li>
                  <li>Repayment income: <strong>$80,000</strong></li>
                  <li>Rate (from threshold table): <strong>3.5%</strong></li>
                </ul>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                  <p className="font-bold text-slate-900">Annual repayment: $2,800</p>
                  <p className="text-slate-600">&#8776; $107 per fortnight withheld by employer</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-extrabold shrink-0">T</span>
                  <h3 className="font-extrabold text-slate-900">Tom &#8212; with salary sacrifice</h3>
                </div>
                <ul className="text-sm text-slate-700 space-y-1 mb-4">
                  <li>Salary: <strong>$75,000</strong></li>
                  <li>Salary sacrifice to super (above SG): <strong>$12,000</strong></li>
                  <li>Taxable income: $63,000</li>
                  <li>Repayment income: $63,000 + $12,000 = <strong>$75,000</strong></li>
                  <li>Rate: <strong>3.0%</strong></li>
                </ul>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                  <p className="font-bold text-slate-900">Annual repayment: $2,250</p>
                  <p className="text-slate-600">The $12,000 salary sacrifice is counted back in &#8212; no HECS saving from sacrificing.</p>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-900">
                <strong>ATO pre-fills your repayment:</strong> When you lodge your tax return, the ATO calculates your compulsory HECS repayment automatically based on your declared income. Your employer also withholds an estimated HECS amount during the year if you indicated a HELP debt on your Tax File Number declaration. Lodge honestly and the system handles the rest.
              </p>
            </div>
          </div>
        </section>

        {/* CPI Indexation */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">CPI indexation explained</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              On 1 June each year, the ATO applies an indexation factor to your outstanding HELP balance. This is not interest &#8212; it is an inflation adjustment designed to maintain the real value of the debt. However, when CPI is high, indexation can add a significant amount to your balance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { year: "2022", rate: "3.9%", note: "Post-COVID inflation rising" },
                { year: "2023", rate: "7.1%", note: "Highest in decades — many balances grew faster than repayments" },
                { year: "2024", rate: "4.7%", note: "Reduced from 2023 peak; WPI cap now applies" },
              ].map((item) => (
                <div key={item.year} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">{item.year} indexation</p>
                  <p className="text-3xl font-extrabold text-slate-900 mb-1">{item.rate}</p>
                  <p className="text-xs text-slate-600">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-4">
              <h3 className="font-extrabold text-amber-900 mb-2">2024 law change: indexation now capped at lower of CPI or WPI</h3>
              <p className="text-sm text-amber-900 leading-relaxed">
                In June 2024, parliament passed legislation capping HELP indexation at the lower of the Consumer Price Index (CPI) or the Wage Price Index (WPI). This change also applied retroactively to the 2023 indexation event. Eligible borrowers received a credit on their HELP account reducing the 7.1% indexation applied in 2023 to the WPI rate (3.2%), effectively cutting the 2023 indexation roughly in half. Check your myGov ATO account to see if a credit was applied to your balance.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                <strong>Timing tip:</strong> Indexation applies on 1 June to your outstanding balance as at 1 June. If you are considering a voluntary repayment, making it before 1 June reduces the balance on which indexation is calculated &#8212; even a $1,000 repayment in late May can save you $47&#8211;$71 in indexation at 2024 rates.
              </p>
            </div>
          </div>
        </section>

        {/* Pay it off early? */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Should you pay off HECS early?</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              The 5% bonus for voluntary repayments was abolished in 2017. There is no longer any reward for paying off HECS ahead of schedule other than reducing your debt balance and stopping future indexation on that amount.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <h3 className="font-extrabold text-green-900 mb-3">Arguments for keeping HECS (invest instead)</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>&#8226; Historical share market returns (~9&#8211;10% per year) exceed typical CPI indexation (~2.5&#8211;3%)</li>
                  <li>&#8226; HECS is low-cost debt &#8212; no compound interest, no penalty for slow repayment</li>
                  <li>&#8226; Early in career, compound investment growth is most powerful</li>
                  <li>&#8226; If you never earn above threshold, the debt disappears on death</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3">Arguments for paying it off</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>&#8226; Peace of mind and simpler tax return</li>
                  <li>&#8226; If indexation spikes (like 7.1% in 2023), debt grows faster than expected</li>
                  <li>&#8226; High earners repay quickly anyway &#8212; voluntary payment may shorten the drag</li>
                  <li>&#8226; Mortgage serviceability &#8212; lenders count HECS repayments as reducing borrowing capacity</li>
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>General rule of thumb:</strong> If your expected long-term investment return exceeds the current HELP indexation rate, the mathematics favour investing rather than making voluntary HECS repayments. When indexation is unusually high (above 5&#8211;6%), the case for extra repayments strengthens. This is general information only &#8212; your circumstances may differ.
              </p>
            </div>
          </div>
        </section>

        {/* Going overseas */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">HECS-HELP and going overseas</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              Before 2017, Australians could leave the country and effectively defer HECS repayments indefinitely while their debt grew via indexation. That loophole was closed.
            </p>
            <div className="space-y-4">
              {[
                {
                  title: "Worldwide income counts",
                  body: "Since 2017, if you live overseas and your worldwide income (converted to AUD) exceeds the repayment threshold, you must make HECS repayments. This applies whether you are earning in the UK, US, Singapore, or anywhere else.",
                },
                {
                  title: "Overseas income declaration",
                  body: "You must notify the ATO within 7 days of leaving Australia if you plan to live overseas. Each year, you must lodge an overseas income declaration with the ATO, disclosing your worldwide income. The ATO uses this to calculate your compulsory repayment.",
                },
                {
                  title: "CPI indexation continues",
                  body: "While you are overseas, your HELP debt is still indexed on 1 June each year. There is no pause on indexation for overseas residents. If you do not earn above the threshold, the debt grows in real terms.",
                },
                {
                  title: "Consequences of non-compliance",
                  body: "Failing to notify the ATO of your overseas move or failing to lodge overseas income declarations can result in penalties and interest. The ATO has been increasing compliance activity for overseas borrowers.",
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

        {/* HECS and salary packaging at NFPs */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">HECS and salary packaging at NFPs</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-5">
              Not-for-profit employees can salary package up to $15,900 per year in living expenses (meals, mortgage/rent, etc.) under the FBT-exempt threshold. This is a genuine tax benefit &#8212; but how does it interact with HECS?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <h3 className="font-extrabold text-green-900 mb-3">FBT-exempt packaging ($15,900)</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  The $15,900 salary packaged under the FBT-exempt threshold does NOT generate a reportable fringe benefit. It does NOT appear on your payment summary and is NOT included in your repayment income. This is a genuine dual benefit: you reduce taxable income AND your HECS repayment income is not inflated.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-3">Salary sacrifice to super (above SG)</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Even at an NFP, if you salary sacrifice additional super above the SG rate, those reportable employer super contributions ARE included in repayment income. The super sacrifice does not reduce your HECS repayment obligation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Voluntary repayments */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Making voluntary repayments</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {[
                {
                  n: "1",
                  title: "Via ATO online (myGov)",
                  body: "Log in to myGov, go to your ATO account, select 'Make a payment' and specify a HELP debt repayment. Payments typically reflect on your balance within a few business days.",
                },
                {
                  n: "2",
                  title: "Via BPAY or bank transfer",
                  body: "The ATO provides BPAY and bank account details for HELP repayments. Use your personal ATO reference number as the reference so the payment is allocated correctly.",
                },
                {
                  n: "3",
                  title: "Time it before 1 June",
                  body: "If you want to reduce this year's indexation, ensure your voluntary payment reaches the ATO and is applied to your account before 1 June. Allow a few business days for processing.",
                },
              ].map((step) => (
                <div key={step.n} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-extrabold text-sm mb-3">{step.n}</div>
                  <h3 className="font-extrabold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                <strong>No discount for voluntary repayments:</strong> The 5% bonus that used to be available for voluntary HECS repayments was abolished in 2017. You pay $1 and your debt reduces by $1 &#8212; no bonus, no penalty. Repayments are non-refundable, so make sure you are repaying your own account and have the funds available before submitting.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-2">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 text-sm hover:bg-slate-50 transition-colors">
                    {item.q}
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">&#9660;</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Tax hub &#8594;
              </Link>
              <Link href="/tax/salary-sacrifice" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Salary sacrifice guide &#8594;
              </Link>
              <Link href="/advisors/tax-agents" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Find a tax agent &#8594;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
