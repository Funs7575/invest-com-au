import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import HubLeadForm from "@/components/leads/HubLeadForm";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import { createClient } from "@/lib/supabase/server";
import { getAffiliateLink, AFFILIATE_REL, renderStars } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `How to Set Up an SMSF in Australia (${CURRENT_YEAR} Guide) | Invest.com.au`,
  description:
    "Complete SMSF setup guide: trustee structure, trust deed, ATO registration, costs ($800–$3,500), and the 7-step process to get your fund operational.",
  alternates: { canonical: `${SITE_URL}/smsf/setup` },
  openGraph: {
    title: `How to Set Up an SMSF in Australia (${CURRENT_YEAR} Guide)`,
    description: "Trustee structure, trust deed, ATO registration, costs and 7-step setup.",
    url: `${SITE_URL}/smsf/setup`,
    type: "website",
  },
};

const SETUP_STEPS = [
  { n: 1, title: "Choose trustee structure", body: "Individual or corporate trustee. Corporate is the right default for property, borrowing, and succession." },
  { n: 2, title: "Create trust deed", body: "Use a licensed deed provider — generic templates won't support strategies you'll want within 2–3 years." },
  { n: 3, title: "Register with ATO", body: "Apply for ABN and TFN, elect to be regulated as an SMSF." },
  { n: 4, title: "Open dedicated bank account", body: "Must be in the fund's name; never commingled with personal accounts." },
  { n: 5, title: "Document investment strategy", body: "ATO legal requirement — must address risk, return, diversification, liquidity and member insurance." },
  { n: 6, title: "Roll over existing super", body: "Consolidate from existing funds. Watch for insurance you may lose in the rollover." },
  { n: 7, title: "Engage SMSF accountant", body: "Annual audit (mandatory) plus tax return and member statements." },
];

export default async function SmsfSetupPage() {
  const supabase = await createClient();
  const { data: brokerRows } = await supabase
    .from("brokers")
    .select("id, name, slug, color, logo_url, rating, cta_text, benefit_cta, tagline, affiliate_url, status, platform_type, created_at, updated_at, chess_sponsored, smsf_support, is_crypto, deal, editors_pick")
    .eq("status", "active")
    .eq("smsf_support", true)
    .order("rating", { ascending: false })
    .limit(3);
  const smsfBrokers: Broker[] = brokerRows ?? [];
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Setup", url: absoluteUrl("/smsf/setup") },
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
              <span className="text-white font-medium">Setup</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              How to Set Up an SMSF in Australia ({CURRENT_YEAR} Guide)
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              The complete 7-step setup, with realistic cost ranges and the trustee-structure decision that drives most of the downstream complexity.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              {[
                { v: "663,867", l: "SMSFs in Australia" },
                { v: "$1.06T", l: "Total SMSF assets" },
                { v: "42,000", l: "New funds in FY2025" },
                { v: "$800–$3,500", l: "Setup cost range" },
              ].map((s) => (
                <div key={s.l} className="bg-white/10 border border-white/10 rounded-lg px-3 py-2.5">
                  <dt className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">{s.l}</dt>
                  <dd className="text-lg md:text-xl font-extrabold text-white mt-0.5">{s.v}</dd>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">The 7-step setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SETUP_STEPS.map((s) => (
                <div key={s.n} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-extrabold mb-3">{s.n}</div>
                  <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Individual vs corporate trustee</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Type</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Cost</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Suitable for</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="px-4 py-3 font-bold">Individual trustee</td><td className="px-4 py-3">$800–$1,500</td><td className="px-4 py-3 text-slate-700">Simple setups, lower cost, single-asset funds</td></tr>
                  <tr><td className="px-4 py-3 font-bold">Corporate trustee</td><td className="px-4 py-3">$1,500–$3,500</td><td className="px-4 py-3 text-slate-700">Property, LRBA borrowing, succession, multi-member funds</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">Corporate trustee adds a $538 ASIC establishment fee and $63/year ongoing for a special-purpose super company — but solves real operational problems and is the default most SMSF specialists recommend.</p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="font-extrabold text-emerald-900 mb-3">Is an SMSF right for me?</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>✅ You have $200,000+ in super</li>
                  <li>✅ You want to hold direct property or crypto</li>
                  <li>✅ You want control over your investments</li>
                  <li>✅ You&rsquo;ll spend at least one Saturday a quarter on it</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                <h3 className="font-extrabold text-red-900 mb-3">When SMSF is the wrong call</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>❌ You want a set-and-forget solution</li>
                  <li>❌ You have limited time for compliance</li>
                  <li>❌ Combined balance is under $100,000</li>
                  <li>❌ You don&rsquo;t have a strategy retail super can&rsquo;t deliver</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-2xl">
            <HubLeadForm
              heading="Find an SMSF accountant or auditor"
              subheading="A specialist will set up the deed, register with the ATO and run the first audit cycle. Setup is the easy part — ongoing compliance is where most SMSFs trip up."
              intent={{ need: "smsf", context: ["smsf_setup"] }}
              source="smsf_setup"
              ctaLabel="Find an SMSF specialist"
            />
          </div>
        </section>

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/advisors/smsf-accountants" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">SMSF Accountants →</Link>
              <Link href="/smsf/auditors" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">SMSF Auditors →</Link>
              <Link href="/article/smsf-setup-cost-australia-2026" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Cost deep-dive →</Link>
            </div>
          </div>
        </section>

        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Setting up your SMSF?</h2>
            <AdvisorPrompt type="smsf_accountant" />
          </div>
        </section>

        {smsfBrokers.length > 0 && (
          <section className="py-10 bg-white border-t border-slate-200">
            <div className="container-custom max-w-3xl">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">COMPARE PLATFORMS</p>
                  <h2 className="text-lg font-bold text-slate-900">SMSF-compatible investment platforms</h2>
                  <p className="text-sm text-slate-500 mt-1">Your SMSF needs a broker that issues CHESS-sponsored HINs to the fund&apos;s name.</p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {smsfBrokers.map((b) => (
                    <div key={b.slug} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                        <p className="text-xs text-amber-500">{renderStars(Number(b.rating))}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.tagline}</p>
                      </div>
                      <div className="mt-auto">
                        <p className="text-xs font-semibold text-slate-700 mb-2">{b.benefit_cta ?? b.cta_text ?? 'Open Account'}</p>
                        <a
                          href={getAffiliateLink(b)}
                          rel={AFFILIATE_REL}
                          target="_blank"
                          className="block text-center w-full px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition-colors"
                        >
                          {b.cta_text ?? 'Open Account →'}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
