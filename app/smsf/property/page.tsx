import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import HubLeadForm from "@/components/leads/HubLeadForm";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `SMSF Property Investment ${CURRENT_YEAR}: Rules, Borrowing & Strategy | Invest.com.au`,
  description:
    "Direct property is the most common SMSF investment after shares. LRBA borrowing explained, residential vs commercial, costs and the $300K minimum balance.",
  alternates: { canonical: `${SITE_URL}/smsf/property` },
  openGraph: {
    title: `SMSF Property Investment ${CURRENT_YEAR}`,
    description: "LRBA borrowing, residential vs commercial, costs and the rules that matter.",
    url: `${SITE_URL}/smsf/property`,
    type: "website",
  },
};

export default function SmsfPropertyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Property", url: absoluteUrl("/smsf/property") },
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
              <Link href="/smsf" className="hover:text-white">SMSF</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Property</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              SMSF Property Investment {CURRENT_YEAR}: Rules, Borrowing &amp; Strategy
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Direct residential and commercial property are both available to SMSFs — but the rules are tight, the lending market is specialist, and the break-even balance is higher than most trustees expect.
            </p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">What property an SMSF can hold</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">Allowed</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>✅ Residential investment property (arm&rsquo;s-length tenants only)</li>
                  <li>✅ Commercial property leased to a related-party business at market rent</li>
                  <li>✅ Unlisted property funds and REITs</li>
                  <li>✅ Vacant land (with care — must satisfy investment strategy)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3">Forbidden</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>❌ Buying residential from a related party</li>
                  <li>❌ Trustees or related parties living in or renting it</li>
                  <li>❌ Improving the property significantly while under LRBA</li>
                  <li>❌ Mixing personal and SMSF holdings on the same title</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">LRBA borrowing — how it works</h2>
            <p className="text-sm text-slate-600 mb-5 max-w-3xl">A Limited Recourse Borrowing Arrangement lets an SMSF borrow to buy a single asset. The lender&rsquo;s recourse is limited to that asset. Major banks exited SMSF lending in 2018, so most LRBAs in {CURRENT_YEAR} are written by specialist lenders.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr><th className="px-4 py-3 text-left font-extrabold text-slate-700">Feature</th><th className="px-4 py-3 text-left font-extrabold text-slate-700">Residential</th><th className="px-4 py-3 text-left font-extrabold text-slate-700">Commercial</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="px-4 py-3 font-bold">Max LVR</td><td className="px-4 py-3">60–70%</td><td className="px-4 py-3">Up to 80%</td></tr>
                  <tr><td className="px-4 py-3 font-bold">Typical rate premium</td><td className="px-4 py-3">+1.5–2.0% over investor</td><td className="px-4 py-3">+1.0–1.5%</td></tr>
                  <tr><td className="px-4 py-3 font-bold">Year-1 setup costs</td><td className="px-4 py-3">$3,500–$8,000</td><td className="px-4 py-3">$4,500–$10,000</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-extrabold text-amber-900 mb-2">Minimum recommended SMSF balance for property</h2>
              <p className="text-3xl font-extrabold text-amber-900 mb-2">$300,000+</p>
              <p className="text-sm text-amber-900 leading-relaxed">Below $300K, fixed costs of LRBA structuring, audit complexity and ongoing servicing eat too much of the return. The economics improve materially above $600K.</p>
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-2xl space-y-6">
            <AdvisorPrompt
              type="smsf_accountant"
              heading="Get specialist SMSF advice before investing in property"
            />
            <AdvisorPrompt
              type="mortgage_broker"
              heading="SMSF limited recourse borrowing arrangement (LRBA)"
            />
            <HubLeadForm
              heading="Speak to an SMSF property specialist"
              subheading="LRBA structuring, bare-trust setup, deed update — get the structure right before you make an offer."
              intent={{ need: "smsf", context: ["smsf_setup"] }}
              source="smsf_property"
              ctaLabel="Find a specialist"
            />
          </div>
        </section>

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/article/smsf-property-investment-guide" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Property deep-dive →</Link>
              <Link href="/property/foreign-investment" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">FIRB &amp; foreign investors →</Link>
              <Link href="/smsf/setup" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">SMSF setup →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
