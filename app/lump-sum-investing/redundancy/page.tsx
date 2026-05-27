import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Redundancy Payout: What to Do With the Money (${CURRENT_YEAR}) | Invest.com.au`,
  description:
    "Genuine redundancy gets a tax-free threshold. Unused leave is taxed differently. Here's how to handle the tax window, super top-up and the 12-month rebuild.",
  alternates: { canonical: `${SITE_URL}/lump-sum-investing/redundancy` },
  openGraph: {
    title: `Redundancy Payout: What to Do With the Money`,
    description: "Tax window, super opportunity and the cash buffer that comes first.",
    url: `${SITE_URL}/lump-sum-investing/redundancy`,
    type: "website",
  },
};

const FAQS = [
  {
    q: "How is a genuine redundancy different from a non-genuine redundancy?",
    a: "A genuine redundancy occurs when a job is abolished and the employee is not re-employed in the same or similar role. It qualifies for the tax-free threshold ($12,524 + $6,264 per completed year of service in 2025–26). A non-genuine redundancy includes resignation, termination for cause, or redundancy where the role is immediately refilled — the payment is taxed as an ETP at concessional rates but with no tax-free component. The ATO has strict criteria; verify the classification with a tax agent before signing the deed of release.",
  },
  {
    q: "How much super can I contribute after a redundancy?",
    a: "Standard concessional (before-tax) cap is $30,000 per year. If your total super balance was under $500,000 on 30 June of the prior year, you can carry forward unused cap from the previous five years. At age 50 with five years of unused cap, a carry-forward contribution of $100,000–$150,000 is possible in a single year. The contribution must be made by 30 June of the redundancy year. For after-tax (non-concessional) contributions, the annual cap is $120,000 or up to $360,000 in a single year under the bring-forward rule.",
  },
  {
    q: "What is the Centrelink income maintenance period?",
    a: "If you receive a severance payment or unused annual/long-service leave payout, Centrelink imposes an 'income maintenance period' before you can receive JobSeeker. The period is calculated by dividing the severance or leave payment by your applicable earnings amount. A $100,000 payout at $1,700/week = ~58-week waiting period. Genuine redundancy tax-free amounts count towards the income maintenance period calculation. Plan your cash buffer to cover this wait before applying for Centrelink support.",
  },
  {
    q: "Should I invest the redundancy payout immediately?",
    a: "No. Build a 9–12 month cash buffer first in a high-interest savings account or short-dated term deposit. White-collar re-employment typically takes 4–7 months; specialist/senior roles take longer. Investing the lump sum immediately and being forced to sell in a market downturn 4 months later is the most expensive redundancy mistake. Once you have stable income again, you can dollar-cost average the remaining lump sum into your investment portfolio over 6–12 months.",
  },
];

export default function RedundancyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Lump-Sum Investing", url: absoluteUrl("/lump-sum-investing") },
    { name: "Redundancy", url: absoluteUrl("/lump-sum-investing/redundancy") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/lump-sum-investing" className="hover:text-white">Lump-Sum Investing</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Redundancy</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Redundancy Payout: What to Do With the Money ({CURRENT_YEAR} Guide)
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              The first call after the email should be to a tax agent — not a broker. Here&rsquo;s why, and the right sequence for the next 12 months.
            </p>
          </div>
        </section>

        {/* Tax rates table */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">How redundancy payments are taxed (2025–26)</h2>
            <p className="text-sm text-slate-500 mb-5">Different components of a redundancy package are taxed in different ways. The classification matters — get it wrong and you could pay $10,000–$30,000 more in tax.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Component</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Tax treatment</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Rate / cap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-emerald-50">
                    <td className="px-4 py-3 font-bold text-emerald-900">Genuine redundancy — tax-free component</td>
                    <td className="px-4 py-3 text-emerald-800">Tax-free</td>
                    <td className="px-4 py-3 text-emerald-800">$12,524 + $6,264 × completed years of service</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Genuine redundancy — above threshold (ETP)</td>
                    <td className="px-4 py-3 text-slate-700">Employment Termination Payment — concessional</td>
                    <td className="px-4 py-3 text-slate-700">32% up to $235,000 cap; 47% above</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Non-genuine redundancy payment (ETP)</td>
                    <td className="px-4 py-3 text-slate-700">ETP — concessional rates, no tax-free component</td>
                    <td className="px-4 py-3 text-slate-700">32% up to $235,000 cap; 47% above</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Unused annual leave</td>
                    <td className="px-4 py-3 text-slate-700">Marginal rate (after 32% withholding floor)</td>
                    <td className="px-4 py-3 text-slate-700">Taxed as income in year received</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Unused long-service leave (pre-1978)</td>
                    <td className="px-4 py-3 text-slate-700">5% of payment taxed at marginal rate</td>
                    <td className="px-4 py-3 text-slate-700">~95% effectively tax-free</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Unused long-service leave (1978–1993)</td>
                    <td className="px-4 py-3 text-slate-700">Marginal rate on 100%, but 16% offset</td>
                    <td className="px-4 py-3 text-slate-700">Effective rate reduction of ~16 percentage points</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Regular salary owed to termination</td>
                    <td className="px-4 py-3 text-slate-700">Normal income — PAYG withheld</td>
                    <td className="px-4 py-3 text-slate-700">Marginal rate</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400">{GENERAL_ADVICE_WARNING} Thresholds indexed annually by the ATO. Confirm current figures at ato.gov.au.</p>
          </div>
        </section>

        {/* Super contribution opportunity */}
        <section className="py-12 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-xl md:text-2xl font-extrabold text-amber-900 mb-3">The super contribution window</h2>
            <p className="text-sm text-amber-900 leading-relaxed mb-4">
              A redundancy creates a one-off opportunity to make a large concessional super contribution and reduce taxable income. The standard cap is $30,000 — but unused cap from the previous five years can be carry-forward contributed if your total super balance was under $500,000 on 30 June of the prior year.
            </p>
            <div className="rounded-xl bg-amber-100 border border-amber-300 p-4 mb-4">
              <p className="text-sm text-amber-900 font-bold mb-2">Example: Carry-forward at age 50</p>
              <p className="text-sm text-amber-900">5 years × $20,000 unused cap = $100,000 carry-forward. At 32.5% marginal rate, a $100,000 concessional contribution saves ~$22,500 in income tax versus taking the cash (15% contribution tax applies inside super vs 32.5% + Medicare outside).</p>
            </div>
            <p className="text-sm text-amber-800 font-medium">
              Deadline: contribution must be made before 30 June of the redundancy year.
            </p>
            <Link href="/super/contributions" className="mt-3 inline-block text-sm font-bold text-amber-800 hover:underline">Super contribution rules →</Link>
          </div>
        </section>

        {/* Income maintenance period */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Centrelink income maintenance period</h2>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 mb-4">
              <p className="text-sm text-red-900 font-bold mb-2">Centrelink waiting period on JobSeeker</p>
              <p className="text-sm text-red-900 leading-relaxed">
                If you receive severance or unused leave payouts, Centrelink imposes an &ldquo;income maintenance period&rdquo; before you can receive JobSeeker. The period is calculated as: <strong>total payout ÷ weekly earnings rate</strong>. A $100,000 payout at $1,700/week = approximately 58-week wait.
              </p>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              Plan your cash buffer to cover this full waiting period before applying for any income support. The 9–12 month buffer guideline accounts for both job-search time and the Centrelink income maintenance period overlapping.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Genuine redundancy tax-free amounts <em>do</em> count toward the income maintenance period calculation — they are not exempt. Verify the exact calculation with Services Australia before making financial plans around Centrelink support timing.
            </p>
          </div>
        </section>

        {/* 12-month sequence */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-5">The 12-month sequence</h2>
            <div className="space-y-3">
              {[
                {
                  timing: "Week 1–2",
                  action: "Verify classification + sign deed",
                  detail: "Confirm genuine vs non-genuine with a tax agent before signing the deed of release. Classification determines tax treatment — impossible to change after signing.",
                },
                {
                  timing: "Week 2–4",
                  action: "Negotiate and receive payout",
                  detail: "If there is room to negotiate, consider taking a higher lump sum rather than a longer notice period (notice period is taxed at marginal rates as salary; genuine redundancy component has a lower effective rate).",
                },
                {
                  timing: "Week 2–4",
                  action: "Park cash in HISA or term deposit",
                  detail: "Move the payout to a high-interest savings account or 3–6 month term deposit. Do not make investment decisions in the first 30 days.",
                },
                {
                  timing: "Before 30 June",
                  action: "Make carry-forward super contribution",
                  detail: "If your TSB was under $500,000, maximize concessional carry-forward contributions before financial year end. Get advice on the exact contribution amount.",
                },
                {
                  timing: "Month 3–6",
                  action: "Job search and income restart",
                  detail: "White-collar re-employment averages 4–7 months for mid-level roles; longer for C-suite or specialist positions. Adjust the cash buffer target based on your realistic job-search timeline.",
                },
                {
                  timing: "Month 6–12",
                  action: "Begin dollar-cost averaging into investments",
                  detail: "Once income is stable and a buffer is maintained, begin investing the remaining lump sum over 6–12 months rather than deploying it all at once.",
                },
              ].map((step, idx) => (
                <div key={step.timing} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex-shrink-0 flex items-start justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-extrabold mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-extrabold text-slate-900">{step.action}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{step.timing}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cash buffer */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Cash buffer first, investment second</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              Before any investment decision, build an explicit cash buffer for the job-search window. White-collar re-employment averages 4–7 months at similar seniority — longer for senior or specialist roles. A buffer of 9–12 months of household running costs is the right baseline, held in a high-interest savings account or short-dated term deposit.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Investing the redundancy into ETFs in month one and being forced to sell in a drawdown four months later is the most common — and most expensive — redundancy mistake. The buffer is non-negotiable.
            </p>
          </div>
        </section>

        <HubAdvisorCTA
          heading="Speak to a financial planner about your redundancy"
          subheading="Tax window planning, super contribution sequencing and the right cash-buffer level for your circumstances."
          intent={{ need: "planning", context: ["retirement"] }}
          source="lump_sum_redundancy"
          ctaLabel="Find a financial planner"
        />

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((faqItem) => (
                <details key={faqItem.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {faqItem.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{faqItem.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/lump-sum-investing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">All lump-sum guides →</Link>
              <Link href="/article/redundancy-payout-investment-guide" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Deep-dive guide →</Link>
              <Link href="/lump-sum-investing/calculator" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Project the growth →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
