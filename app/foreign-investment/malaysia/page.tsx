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
  title: "Investing in Australia from Malaysia (2026) — Property, Shares & Tax Guide",
  description:
    "Malaysian investors in Australia: DTA dividend WHT 15%, FIRB property rules, foreign buyer stamp duty surcharges (VIC 8%, NSW 8%), ASX brokers for Malaysian residents. Updated 2026.",
  openGraph: {
    title: "Investing in Australia from Malaysia (2026) — Property, Shares & Tax",
    description:
      "Malaysia–Australia DTA (15% dividend WHT), FIRB property rules, state stamp duty surcharges, currency risk, and broker eligibility for Malaysian residents.",
    url: `${SITE_URL}/foreign-investment/malaysia`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from Malaysia")}&sub=${encodeURIComponent("DTA · FIRB · Property · ASX Brokers · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/malaysia` },
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

export default async function MalaysiaInvestingPage() {
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
              { name: "Investing from Malaysia" },
            ])
          ),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/malaysia" />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">From Malaysia</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">🇲🇾</span>
              <span>Malaysia · DTA in force · Updated 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Investing in Australia{" "}
              <span className="text-amber-500">from Malaysia</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">Property, Shares & Tax Guide for 2026</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Malaysia is one of Australia&apos;s largest sources of foreign students and has a deep diaspora
              connection — particularly with Melbourne and Sydney. Many Malaysians own Australian investment
              properties, and Malaysian investors are active in ASX shares. Here&apos;s what every Malaysian
              investor needs to know about Australian tax rules, FIRB, and state stamp duty surcharges.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Dividend WHT", value: "15%", sub: "Under Malaysia-AU DTA" },
                { label: "Interest WHT", value: "15%", sub: "Under Malaysia-AU DTA" },
                { label: "Royalties WHT", value: "15%", sub: "Under Malaysia-AU DTA" },
                { label: "VIC Surcharge", value: "8%", sub: "Foreign buyer stamp duty" },
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

        {/* ── Established Dwelling Ban ── */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="font-bold text-red-800 text-sm">Established Dwelling Ban: Active until 31 March 2027</p>
            <p className="text-sm text-red-700 mt-0.5">
              Malaysian citizens who are non-residents of Australia cannot purchase existing Australian homes
              until at least 31 March 2027. New off-the-plan properties remain available with FIRB approval.{" "}
              <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full details &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── Two Audiences ── */}
        <section>
          <SectionHeading
            eyebrow="Who Are You?"
            title="Malaysian resident or Malaysian-Australian?"
            sub="Your Australian residency status determines which rules apply."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-blue-800 mb-3">🇲🇾 Malaysian Resident (not Australian PR/citizen)</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• 15% dividend WHT on unfranked ASX dividends</li>
                <li>• FIRB required for all property purchases</li>
                <li>• Foreign buyer stamp duty surcharges apply (up to 8%)</li>
                <li>• No Australian CGT on listed ASX shares</li>
                <li>• MYR/AUD currency risk on all investments</li>
              </ul>
            </div>
            <div className="border-2 border-amber-200 bg-amber-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-3">🇦🇺 Malaysian-Australian (citizen or PR)</h3>
              <ul className="space-y-2 text-sm text-amber-700">
                <li>• No FIRB required for property (Australian citizen/PR)</li>
                <li>• Australian tax resident rules apply if living in Australia</li>
                <li>• No foreign buyer stamp duty surcharges if Australian citizen</li>
                <li>• Access to Australian superannuation</li>
                <li>• DTA prevents double taxation on Malaysia-source income</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── DTA Rates ── */}
        <section>
          <SectionHeading
            eyebrow="DTA Rates"
            title="Malaysia–Australia Double Tax Agreement rates"
            sub="The Malaysia-Australia DTA prevents double taxation for Malaysian investors on Australian-sourced income."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Income type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Without DTA</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">With DTA (Malaysian residents)</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", note: "Taxed in Malaysia with credit for AU WHT" },
                  { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", note: "Malaysian income tax may apply" },
                  { type: "Interest", noTreaty: "10%", withTreaty: "15%", note: "Taxed in Malaysia with credit for AU WHT" },
                  { type: "Royalties", noTreaty: "30%", withTreaty: "15%", note: "Taxed in Malaysia with credit for AU WHT" },
                  { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", note: "Malaysia has no CGT on shares" },
                  { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", note: "AU CGT applies — no DTA exemption" },
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

        {/* ── Foreign Buyer Stamp Duty ── */}
        <section>
          <SectionHeading
            eyebrow="Stamp Duty Surcharges"
            title="Foreign buyer stamp duty surcharges by state"
            sub="On top of standard stamp duty, foreign buyers pay an additional surcharge. These are state/territory taxes — not FIRB fees."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">State/Territory</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Foreign Buyer Surcharge</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Annual Land Tax Surcharge</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { state: "Victoria (VIC)", surcharge: "8%", landTax: "4%", note: "Melbourne — most popular with Malaysian buyers" },
                  { state: "New South Wales (NSW)", surcharge: "8%", landTax: "4%", note: "Sydney — high demand from Malaysian investors" },
                  { state: "Queensland (QLD)", surcharge: "7%", landTax: "3%", note: "Brisbane, Gold Coast — growing interest" },
                  { state: "Western Australia (WA)", surcharge: "7%", landTax: "Nil", note: "Perth — lower overall cost of property" },
                  { state: "South Australia (SA)", surcharge: "7%", landTax: "Nil", note: "Adelaide — emerging market" },
                  { state: "ACT", surcharge: "Nil", landTax: "Nil", note: "No foreign buyer surcharge in ACT" },
                ].map((r) => (
                  <tr key={r.state} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.state}</td>
                    <td className="px-4 py-3 text-red-700 font-bold">{r.surcharge}</td>
                    <td className="px-4 py-3 text-red-600 text-xs hidden md:table-cell">{r.landTax}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>Malaysian-Australians:</strong> If you are an Australian citizen or permanent resident,
              foreign buyer surcharges do NOT apply to you — even if you are of Malaysian origin. The surcharge
              only applies to non-resident foreigners.
            </p>
          </div>
        </section>

        {/* ── Investment Options ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Options"
            title="What Malaysian investors typically buy in Australia"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: "Melbourne/Sydney Apartments", ok: true, desc: "Malaysia is one of the top sources of Melbourne property investment. Off-the-plan CBD and inner-suburb apartments are particularly popular.", href: "/foreign-investment/property" },
              { type: "ASX Shares via IBKR/Saxo", ok: true, desc: "Interactive Brokers, Saxo Bank, and Tiger Brokers all accept Malaysian residents for ASX investing.", href: "/foreign-investment/shares" },
              { type: "Commercial Property", ok: true, desc: "Office and retail properties available with FIRB approval. Labuan-based structures sometimes used by Malaysian HNW investors.", href: "/foreign-investment/property" },
              { type: "New Residential (Off-the-Plan)", ok: true, desc: "New dwellings available with FIRB approval. Foreign buyer surcharges apply on top of standard duty.", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { type: "Established Dwellings", ok: false, desc: "BANNED for non-residents until 31 March 2027. Australian citizens/PRs are exempt.", href: "/foreign-investment/guides/property-ban-2025" },
              { type: "Australian Fixed Income", ok: true, desc: "Term deposits and bonds accessible. 15% withholding tax on interest under DTA.", href: "/foreign-investment/savings" },
            ].map((item) => (
              <Link key={item.type} href={item.href} className={`group block p-4 border rounded-xl transition-all ${item.ok ? "border-slate-200 hover:border-amber-300" : "border-red-100 bg-red-50/30 opacity-80"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {item.ok ? (
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                  <span className={`font-bold text-sm ${item.ok ? "text-slate-800 group-hover:text-amber-700" : "text-red-800"}`}>{item.type}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed ml-6">{item.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Currency Risk ── */}
        <section>
          <SectionHeading
            eyebrow="Currency"
            title="MYR/AUD currency risk for Malaysian investors"
            sub="The Malaysian Ringgit (MYR) is not freely traded internationally, which creates unique currency considerations."
          />
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <ul className="space-y-3 text-sm text-blue-800">
              <li>• <strong>MYR/AUD fluctuation:</strong> The Ringgit&apos;s value relative to the AUD affects your effective returns. When AUD strengthens, your MYR-denominated returns decrease.</li>
              <li>• <strong>Ringgit controls:</strong> Bank Negara Malaysia (BNM) has rules on ringgit outflows. Malaysian residents moving funds offshore should verify BNM requirements for large transfers.</li>
              <li>• <strong>Transfer options:</strong> Wise, OFX, and Instarem are popular for MYR → AUD transfers with competitive rates over traditional banks.</li>
              <li>• <strong>Labuan structures:</strong> Some Malaysian HNW investors use Labuan International Business and Financial Centre (Labuan IBFC) entities for international investment structuring. Specialist advice recommended.</li>
            </ul>
          </div>
        </section>

        {/* ── Brokers ── */}
        {brokers.length > 0 && (
          <section>
            <SectionHeading
              eyebrow="Brokers"
              title="ASX brokers that accept Malaysian residents"
              sub="IBKR, Saxo, and Tiger Brokers accept Malaysian residents. Verify eligibility before applying."
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
              <h2 className="text-lg font-bold text-slate-800 mb-2">Find a specialist advisor for Malaysian investors</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                Malaysia–Australia property investment involves FIRB, state stamp duty surcharges, DTA
                optimisation, and currency management. A specialist advisor can help navigate all of these.
              </p>
            </div>
            <Link href="/advisors/international-tax-specialists" className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find a Tax Specialist &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for Malaysian investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "FIRB Property Guide", href: "/foreign-investment/property" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Send Money to Australia (MYR to AUD)", href: "/foreign-investment/send-money-australia" },
              { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
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
