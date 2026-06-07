import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import Icon from "@/components/Icon";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";
import { faqJsonLd } from "@/lib/schema-markup";

const NEGATIVE_GEARING_FAQS = [
  {
    q: "Is negative gearing worth it in Australia?",
    a: "Negative gearing reduces your taxable income each year, but the tax saving is only a partial offset — not a full offset — of the cash shortfall. At a 37% marginal rate, a $14,000 annual rental loss saves $5,180 in tax, but you still fund the remaining $8,820 from your own pocket. Negative gearing makes financial sense only if the property appreciates enough in capital value to outweigh the cumulative cash outflows. It suits high-income earners in strong growth corridors with a long investment horizon. For properties with flat or falling capital growth, the strategy becomes a slow cash drain.",
  },
  {
    q: "What can I claim as a deduction on a negatively geared property?",
    a: "Deductible expenses include: loan interest (the largest deduction); property management fees; council and water rates; landlord insurance; repairs and maintenance (not improvements — these are capital); depreciation on building structure (capital works deduction at 2.5%/yr for buildings built after Sept 1987) and plant/equipment items; accountant fees; body corporate levies; advertising for tenants; and land tax in some states. Improvements (renovations that add value) are not immediately deductible — they're added to your cost base, reducing CGT when you sell.",
  },
  {
    q: "Can I negatively gear shares or ETFs?",
    a: "Yes. Negative gearing is not limited to property — it applies to any income-producing investment where deductible costs exceed income. You can use a margin loan to buy shares or ETFs; the interest on the margin loan is deductible against dividend income. If total investment income is less than total investment expenses (interest, brokerage on income transactions, etc.), the loss is deductible against other income. However, shares carry higher short-term volatility than property, so margin loan risk (margin calls) needs careful management.",
  },
  {
    q: "When does negative gearing end?",
    a: "Negative gearing ends when the investment becomes positively geared (income exceeds costs), or when you sell the asset. As rental income rises over time (with rent reviews) and the loan balance falls (with principal repayments on P&I loans), most negatively geared properties gradually become neutral then positively geared. Note: the accumulated losses from negative gearing do NOT carry forward as a capital loss — they were already deducted against income in the year incurred. Only the capital gain or loss on disposal is a CGT event.",
  },
];

const negGearingFaqLd = faqJsonLd(NEGATIVE_GEARING_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Negative Gearing Australia ${CURRENT_YEAR}: How It Works, Tax Benefits & Risks | Invest.com.au`,
  description:
    "How negative gearing actually works, the worked tax math, when it's right, when it's a slow leak, and why it doesn't apply inside an SMSF.",
  alternates: { canonical: `${SITE_URL}/negative-gearing` },
  openGraph: {
    title: `Negative Gearing Australia ${CURRENT_YEAR}`,
    description: "Worked example, when it makes sense, and why SMSF rules differ.",
    url: `${SITE_URL}/negative-gearing`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Negative Gearing Guide Australia")}&sub=${encodeURIComponent("Tax Rules · Property · Shares · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function NegativeGearingHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Negative Gearing", url: absoluteUrl("/negative-gearing") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {negGearingFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(negGearingFaqLd) }} />
      )}
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Negative Gearing</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Negative Gearing Australia {CURRENT_YEAR}: How It Works, Tax Benefits &amp; Risks
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              When deductible expenses exceed investment income, the loss reduces your taxable income at your marginal rate. The math is simple — the strategy isn&rsquo;t.
            </p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">The numbers — worked through</h2>
            <p className="text-sm text-slate-600 mb-6">A typical {CURRENT_YEAR} metro investment property at 80% LVR.</p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-200"><dt>Rental income</dt><dd className="font-bold">$28,000/yr</dd></div>
                <div className="flex justify-between py-1 border-b border-slate-200"><dt>Interest + costs</dt><dd className="font-bold">$42,000/yr</dd></div>
                <div className="flex justify-between py-1 border-b border-slate-200"><dt>Net rental loss</dt><dd className="font-bold text-red-600">$14,000/yr</dd></div>
                <div className="flex justify-between py-1 border-b border-slate-200"><dt>Tax saving (37%)</dt><dd className="font-bold text-emerald-600">$5,180/yr</dd></div>
                <div className="flex justify-between py-1 md:col-span-2 mt-2"><dt className="font-extrabold">Net out-of-pocket after tax</dt><dd className="font-extrabold text-xl">$8,820/yr</dd></div>
              </dl>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Try your own numbers in the <Link href="/negative-gearing/calculator" className="text-amber-700 hover:underline font-bold">calculator</Link>.
            </p>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Negative vs positive gearing</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table aria-label="Negative vs positive gearing comparison" className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">&nbsp;</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Negative</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Positive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="px-4 py-3 font-bold">Cash flow</td><td className="px-4 py-3">Costs you each year</td><td className="px-4 py-3">Earns you money</td></tr>
                  <tr><td className="px-4 py-3 font-bold">Tax</td><td className="px-4 py-3">Reduces tax now</td><td className="px-4 py-3">Adds to taxable income</td></tr>
                  <tr><td className="px-4 py-3 font-bold">Strategy</td><td className="px-4 py-3">Capital growth focus</td><td className="px-4 py-3">Income focus</td></tr>
                  <tr><td className="px-4 py-3 font-bold">Best for</td><td className="px-4 py-3">High income earners</td><td className="px-4 py-3">Retirees, SMSF</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">Want a deeper comparison? Read <Link href="/article/positive-gearing-vs-negative-gearing" className="text-amber-700 hover:underline font-bold">positive vs negative gearing</Link>.</p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl md:text-2xl font-extrabold text-amber-900 mb-2 flex items-center gap-2">
                <Icon name="alert-triangle" size={20} className="text-amber-700" />
                Can you negatively gear inside an SMSF?
              </h2>
              <p className="text-sm text-amber-900 leading-relaxed">
                <strong>No.</strong> SMSF borrowing (LRBA) cannot create a tax loss against member income. Inside an SMSF, the rental loss can offset other fund income at the 15% fund tax rate — but cannot offset your personal 37% or 45% marginal income. The personal-tax shield doesn&rsquo;t translate into super. SMSF property is a tax-effective wealth structure for different reasons. Read more in our <Link href="/smsf/property" className="text-amber-800 hover:underline font-bold">SMSF property guide</Link>.
              </p>
            </div>
          </div>
        </section>

        <HubAdvisorCTA
          heading="Speak to a tax agent about your investment property"
          subheading="Tax structuring, depreciation schedules and capital-growth modelling — get the strategy right before you sign a contract."
          intent={{ need: "tax", context: ["tax_optimization"] }}
          source="negative_gearing_hub"
          ctaLabel="Find a tax agent"
        />

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {NEGATIVE_GEARING_FAQS.map((faq) => (
                <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">▾</span>
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/negative-gearing/calculator" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Try the calculator →</Link>
              <Link href="/article/negative-gearing-australia-guide-2026" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Deep-dive guide →</Link>
              <Link href="/advisors/buyers-agents" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a buyers agent →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
