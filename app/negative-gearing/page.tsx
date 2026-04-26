import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import Icon from "@/components/Icon";
import HubLeadForm from "@/components/leads/HubLeadForm";

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
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">&nbsp;</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Negative</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Positive</th>
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

        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-2xl">
            <HubLeadForm
              heading="Speak to a tax agent about your investment property"
              subheading="Tax structuring, depreciation schedules and capital-growth modelling — get the strategy right before you sign a contract."
              intent={{ need: "tax", context: ["tax_optimization"] }}
              source="negative_gearing_hub"
              ctaLabel="Find a tax agent"
            />
          </div>
        </section>

        <section className="py-10 bg-white border-t border-slate-200">
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
