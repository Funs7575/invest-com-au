import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER, DTA_DISCLAIMER } from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";
import { AFFILIATE_REL } from "@/lib/tracking";

export const metadata: Metadata = {
  title: "Investing in Australia from New Zealand (2026) — Trans-Tasman Guide",
  description:
    "New Zealand citizens investing in Australia: no FIRB required, special category visa rights, NZ-AU DTA rates, KiwiSaver portability, ASX vs NZX, and CGT differences. Updated 2026.",
  openGraph: {
    title: "Investing in Australia from New Zealand (2026) — Trans-Tasman Guide",
    description:
      "NZ citizens have unique rights in Australia — no FIRB for property, any broker available, special category visa. NZ-AU DTA rates and KiwiSaver vs super explained.",
    url: `${SITE_URL}/foreign-investment/new-zealand`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from New Zealand")}&sub=${encodeURIComponent("Trans-Tasman · No FIRB · KiwiSaver · ASX · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/new-zealand` },
};

export const revalidate = 86400;

async function getNonResidentBrokers(): Promise<Broker[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("id, name, slug, color, logo_url, cta_text, affiliate_url, rating, accepts_non_residents, foreign_investor_notes, platform_type, status")
      .eq("accepts_non_residents", true)
      .eq("status", "active")
      .order("rating", { ascending: false })
      .limit(6);
    return (data ?? []) as unknown as Broker[];
  } catch {
    return [];
  }
}

export default async function NewZealandInvestingPage() {
  const brokers = await getNonResidentBrokers();

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
              { name: "Investing from New Zealand" },
            ])
          ),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/new-zealand" />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">From New Zealand</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700 mb-4">
              <span className="text-base">🇳🇿</span>
              <span>New Zealand · Trans-Tasman · SCV 444 · Simplified rules</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Investing in Australia{" "}
              <span className="text-amber-500">from New Zealand</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">Trans-Tasman Guide for 2026</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              New Zealand citizens have a uniquely close relationship with Australia. Under the Trans-Tasman
              Travel Arrangement, NZ citizens can live, work, and invest in Australia — and importantly,
              <strong className="text-slate-900"> NZ citizens in Australia do not need FIRB approval for property</strong>.
              Whether you live in New Zealand and invest in Australia, or you&apos;re a Kiwi living in Australia,
              here&apos;s the full guide.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Dividend WHT", value: "15%", sub: "Under NZ-AU DTA" },
                { label: "Interest WHT", value: "10%", sub: "Under NZ-AU DTA" },
                { label: "Royalties WHT", value: "10%", sub: "Under NZ-AU DTA" },
                { label: "FIRB (NZ citizens)", value: "None", sub: "SCV holders exempt" },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-extrabold text-amber-600">{stat.value}</p>
                  <p className="text-xs font-semibold text-slate-900">{stat.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Key NZ advantage callout ── */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="font-bold text-emerald-800 text-sm">NZ Citizens: No FIRB Required for Property</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              New Zealand citizens holding a Special Category Visa (subclass 444) are treated similarly to
              Australian permanent residents for FIRB purposes. You can buy Australian residential and
              commercial property without FIRB approval. Foreign buyer stamp duty surcharges may still apply
              in some states if you are not an Australian PR/citizen — check state rules.
            </p>
          </div>
        </div>

        {/* ── Two Audiences ── */}
        <section>
          <SectionHeading
            eyebrow="Who Are You?"
            title="Kiwi in NZ investing in Australia, or Kiwi living in Australia?"
            sub="The tax treatment differs depending on where you are tax resident."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-blue-800 mb-3">🇳🇿 NZ resident investing in Australia from NZ</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• No FIRB required for property (NZ citizen rights)</li>
                <li>• 15% dividend WHT on unfranked ASX dividends (under DTA)</li>
                <li>• NZ has no CGT — but Australian CGT applies on AU property</li>
                <li>• Can invest in ASX via international brokers</li>
                <li>• NZ residents pay NZ tax on worldwide income</li>
                <li>• Franking credits accessible under DTA</li>
              </ul>
            </div>
            <div className="border-2 border-amber-200 bg-amber-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-3">🇦🇺 Kiwi living in Australia (SCV 444 holder)</h3>
              <ul className="space-y-2 text-sm text-amber-700">
                <li>• Australian tax resident — full resident rates apply</li>
                <li>• Access to Australian super (employer SG contributions)</li>
                <li>• CGT discount (50%) available on assets held 12+ months</li>
                <li>• No FIRB required for property as SCV holder</li>
                <li>• Can use any Australian broker (same as residents)</li>
                <li>• KiwiSaver → AU super portability scheme available</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── DTA Rates ── */}
        <section>
          <SectionHeading
            eyebrow="DTA Rates"
            title="New Zealand–Australia Double Tax Agreement rates"
            sub="The NZ-Australia DTA is one of the world's most comprehensive bilateral tax agreements."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Income type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Without DTA</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">With DTA (NZ residents in NZ)</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", note: "Taxed in NZ with credit for AU WHT" },
                  { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", note: "Franking credits accessible under DTA" },
                  { type: "Interest", noTreaty: "10%", withTreaty: "10%", note: "Taxed in NZ with credit for AU WHT" },
                  { type: "Royalties", noTreaty: "30%", withTreaty: "10%", note: "Significant DTA benefit" },
                  { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", note: "NZ has no CGT on shares (generally)" },
                  { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", note: "AU CGT applies — NZ DTA credit for AU tax paid" },
                ].map((r) => (
                  <tr key={r.type} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.type}</td>
                    <td className="px-4 py-3 text-red-700 font-semibold">{r.noTreaty}</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">{r.withTreaty}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── KiwiSaver vs Super ── */}
        <section>
          <SectionHeading
            eyebrow="Retirement Savings"
            title="KiwiSaver vs Australian Super: Trans-Tasman portability"
            sub="New Zealanders can transfer their KiwiSaver into an Australian super fund, and vice versa."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">KiwiSaver → Australian Super</h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>• Transfer your NZ KiwiSaver balance to an Australian APRA-regulated fund</li>
                <li>• Funds are &quot;locked in&quot; under Australian preservation rules once transferred</li>
                <li>• Transferred funds classified as &quot;member contributions&quot; (no employer match)</li>
                <li>• Access follows Australian preservation age rules (60–65)</li>
                <li>• The Australian Tax Office (ATO) administers the portability scheme</li>
              </ul>
            </div>
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">Australian Super → KiwiSaver</h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>• Kiwis leaving Australia permanently can transfer AU super to KiwiSaver</li>
                <li>• Alternative: claim DASP (Departing AU Super Payment) — but high tax rate</li>
                <li>• Transfer preserves retirement savings in NZ tax environment</li>
                <li>• Only to a KiwiSaver scheme that accepts transfers</li>
                <li>• 15% exit tax applies on transfers (less than DASP&apos;s 35%)</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>Kiwis living in Australia:</strong> If you hold a Special Category Visa (444), your employer
              must contribute to your Australian superannuation fund at the Superannuation Guarantee rate (11.5% in 2024-25).
              You can choose your own super fund — including industry super funds.
            </p>
          </div>
        </section>

        {/* ── Investment Options ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Options"
            title="What NZ investors can access in Australia"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: "ASX Shares & ETFs", ok: true, desc: "NZ residents can use any major international broker — IBKR, Saxo, and others all accept NZ residents for ASX investing.", href: "/foreign-investment/shares" },
              { type: "Australian Property (any type)", ok: true, desc: "NZ citizens do not need FIRB approval. No established dwelling ban applies to NZ citizens. Standard stamp duty applies.", href: "/foreign-investment/property" },
              { type: "Australian Super (SCV holders)", ok: true, desc: "If you live in Australia on a 444 visa, your employer must pay SG contributions to super. KiwiSaver portability available.", href: "/foreign-investment/super" },
              { type: "ASX via NZ-based brokers", ok: true, desc: "NZ brokers like Sharesies, Hatch, and InvestNow provide access to Australian shares and ETFs from NZ.", href: "/foreign-investment/shares" },
              { type: "NZX + ASX cross-listed stocks", ok: true, desc: "Many large Australian companies are also listed on the NZX (dual-listed), offering convenient NZ-based access.", href: "/foreign-investment/shares" },
              { type: "Australian Fixed Income", ok: true, desc: "Term deposits and bonds accessible. 10% WHT on interest under DTA.", href: "/foreign-investment/savings" },
            ].map((item) => (
              <Link key={item.type} href={item.href} className="group block p-4 border border-slate-200 rounded-xl hover:border-amber-300 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="font-bold text-sm text-slate-800 group-hover:text-amber-700">{item.type}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed ml-6">{item.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Brokers ── */}
        {brokers.length > 0 && (
          <section>
            <SectionHeading
              eyebrow="Brokers"
              title="ASX brokers for NZ residents investing in Australia"
              sub="NZ residents have broader broker access than most other nationalities due to the Trans-Tasman relationship."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {brokers.map((broker) => (
                <div key={broker.id} className="border border-slate-200 rounded-xl p-4 hover:border-amber-200 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-extrabold shrink-0" style={{ backgroundColor: broker.color || "#1e293b" }}>
                      {broker.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{broker.name}</p>
                      {broker.rating && <p className="text-xs text-amber-600">★ {broker.rating.toFixed(1)}</p>}
                    </div>
                  </div>
                  {broker.affiliate_url && (
                    <a href={broker.affiliate_url} target="_blank" rel={AFFILIATE_REL} className="block w-full text-center px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg text-xs transition-colors">
                      {broker.cta_text || "Open Account"} &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              <Link href="/compare/non-residents" className="text-amber-600 hover:text-amber-700 underline">Compare all non-resident brokers &rarr;</Link>
            </p>
          </section>
        )}

        {/* ── Advisor CTA ── */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Find an advisor specialising in Trans-Tasman tax</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                NZ–Australia cross-border tax involves CGT differences, super vs KiwiSaver, DTA optimisation,
                and residency rules. A specialist in Trans-Tasman taxation can ensure you don&apos;t pay tax twice
                and maximise your investment returns.
              </p>
            </div>
            <Link href="/advisors/international-tax-specialists" className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find a Tax Specialist &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for New Zealand investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Australian Superannuation Guide", href: "/foreign-investment/super" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Buy Property in Australia", href: "/foreign-investment/property" },
              { title: "Send Money to Australia (NZD to AUD)", href: "/foreign-investment/send-money-australia" },
              { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
              { title: "ASX vs NZX — Where to Invest", href: "/foreign-investment/shares" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="group block p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/20 transition-all">
                <span className="font-semibold text-sm text-slate-800 group-hover:text-amber-700">{link.title} &rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs text-slate-500 leading-relaxed">{DTA_DISCLAIMER}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
