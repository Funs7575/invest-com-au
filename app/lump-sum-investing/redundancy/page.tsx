import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
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

export default function RedundancyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Lump-Sum Investing", url: absoluteUrl("/lump-sum-investing") },
    { name: "Redundancy", url: absoluteUrl("/lump-sum-investing/redundancy") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
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

        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">The redundancy tax window</h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-3 text-sm text-slate-700 leading-relaxed">
              <p><strong>Genuine redundancy threshold (2025–26):</strong> $12,524 plus $6,264 per completed year of service is tax-free.</p>
              <p><strong>Above the threshold:</strong> taxed concessionally — 32% up to $235,000, 47% above.</p>
              <p><strong>Unused leave:</strong> taxed at marginal rates (with discount for long-service leave accrued before 1993).</p>
              <p><strong>Tax classification matters:</strong> the difference between &ldquo;genuine&rdquo; and &ldquo;non-genuine&rdquo; redundancy can swing $20,000+ in tax outcome. Verify with a tax agent before signing the deed.</p>
            </div>
          </div>
        </section>

        <section className="py-12 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-xl md:text-2xl font-extrabold text-amber-900 mb-3">The super contribution opportunity</h2>
            <p className="text-sm text-amber-900 leading-relaxed">
              A redundancy creates a one-off opportunity to make a large concessional super contribution and reduce taxable income. The standard cap is $30,000 — but unused cap from the previous five years can be carry-forward contributed if your total super balance was under $500,000 on 30 June of the prior year. A $50,000 carry-forward concessional contribution at age 50 saves $15,000+ in tax for someone in the 32.5% bracket. The contribution must occur before 30 June of the redundancy year to count.
            </p>
            <Link href="/super/contributions" className="mt-3 inline-block text-sm font-bold text-amber-800 hover:underline">Super contribution rules →</Link>
          </div>
        </section>

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
