import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import Icon from "@/components/Icon";
import HubLeadForm from "@/components/leads/HubLeadForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Crypto in Your SMSF: ATO Rules & Tax Benefits ${CURRENT_YEAR} | Invest.com.au`,
  description:
    "Australian SMSFs hold $3B+ in crypto. The ATO compliance rules, the 15% (or 0%) tax outcome versus 47% personal, and how to actually buy without breaching the rules.",
  alternates: { canonical: `${SITE_URL}/smsf/crypto` },
  openGraph: {
    title: `Crypto in Your SMSF: ATO Rules & Tax Benefits ${CURRENT_YEAR}`,
    description: "Compliance rules, tax outcomes and how to buy without breaching the sole-purpose test.",
    url: `${SITE_URL}/smsf/crypto`,
    type: "website",
  },
};

export default function SmsfCryptoPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Crypto", url: absoluteUrl("/smsf/crypto") },
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
              <span className="text-white font-medium">Crypto</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Crypto in Your SMSF: ATO Rules &amp; Tax Benefits {CURRENT_YEAR}
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Over $3B in crypto is held inside Australian SMSFs. The compliance rules are tight, but the tax differential — 15% inside vs up to 47% outside — makes it one of the most powerful structures available.
            </p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-extrabold text-amber-900 mb-3 flex items-center gap-2">
                <Icon name="bitcoin" size={20} className="text-amber-700" />
                The tax advantage in plain numbers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-lg bg-white border border-amber-200 p-4">
                  <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-1">Outside SMSF</p>
                  <p className="text-2xl font-extrabold text-slate-900">Up to 47%</p>
                  <p className="text-xs text-slate-600 mt-1">tax on gains at top marginal rate</p>
                </div>
                <div className="rounded-lg bg-white border border-amber-200 p-4">
                  <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-1">SMSF accumulation</p>
                  <p className="text-2xl font-extrabold text-slate-900">15% / 10%</p>
                  <p className="text-xs text-slate-600 mt-1">10% effective with 12-month CGT discount</p>
                </div>
                <div className="rounded-lg bg-white border border-amber-200 p-4">
                  <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-1">SMSF pension phase</p>
                  <p className="text-2xl font-extrabold text-slate-900">0%</p>
                  <p className="text-xs text-slate-600 mt-1">tax on income and capital gains</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">ATO compliance rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">Required</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>✅ Trust deed must explicitly allow digital assets</li>
                  <li>✅ Investment strategy must reference crypto</li>
                  <li>✅ Separate SMSF-dedicated exchange account</li>
                  <li>✅ Full transaction record-keeping for the audit</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3">Forbidden</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>❌ Acquiring crypto from related parties</li>
                  <li>❌ Personal use of any kind</li>
                  <li>❌ Commingled exchange accounts (personal + SMSF)</li>
                  <li>❌ Holding outside the trust deed&rsquo;s allowed asset list</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">SMSF-friendly exchanges</h2>
            <p className="text-sm text-slate-600 mb-6">Three Australian exchanges with meaningful SMSF onboarding flows. Cold storage (Ledger, Trezor) is permitted — and recommended above $50,000.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: "Swyftx", note: "SMSF onboarding flow with corporate-trustee and individual-trustee paths." },
                { name: "Coinstash", note: "SMSF-specific onboarding and account-naming protocols." },
                { name: "Independent Reserve", note: "Mature SMSF support; OTC desk for larger trades." },
              ].map((e) => (
                <div key={e.name} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-extrabold text-slate-900 mb-1">{e.name}</h3>
                  <p className="text-sm text-slate-600">{e.note}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Compare more options at <Link href="/compare?category=crypto" className="text-amber-700 hover:underline font-bold">our crypto exchange comparison</Link>.
            </p>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-2xl">
            <HubLeadForm
              heading="Speak to an SMSF crypto specialist"
              subheading="Deed update, investment strategy review, and dedicated account setup — without breaching the sole-purpose test."
              intent={{ need: "smsf", context: ["smsf_setup"] }}
              source="smsf_crypto"
              ctaLabel="Get matched with a specialist"
            />
          </div>
        </section>

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/article/smsf-crypto-investing-guide" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Read the deep-dive →</Link>
              <Link href="/smsf/property" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">SMSF property →</Link>
              <Link href="/smsf/investment-strategy" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Investment strategy →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
