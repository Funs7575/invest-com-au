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
  title: "Investing in Australia from Japan (2026) — Tax, FIRB & Broker Guide — Invest.com.au",
  description:
    "Japanese investors in Australia: DTA dividend WHT 10-15%, FIRB mining and property rules, agricultural land thresholds, ASX brokers that accept Japanese residents. Updated 2026.",
  openGraph: {
    title: "Investing in Australia from Japan (2026) — Tax, FIRB & Broker Guide",
    description:
      "Japan–Australia DTA (10-15% dividend WHT), FIRB rules for mining and property, agricultural thresholds, and ASX broker eligibility for Japanese residents.",
    url: `${SITE_URL}/foreign-investment/japan`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from Japan")}&sub=${encodeURIComponent("DTA · FIRB · Mining · ASX Brokers · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/japan` },
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

export default async function JapanInvestingPage() {
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
              { name: "Investing from Japan" },
            ])
          ),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/japan" />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-200">Foreign Investment</Link>
            <span>/</span>
            <span className="text-slate-300">From Japan</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="text-base">🇯🇵</span>
              <span>Japan · DTA since 1970 · Updated 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight">
              Investing in Australia{" "}
              <span className="text-amber-400">from Japan</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-300">Tax, FIRB Rules & How to Start in 2026</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6">
              Japan is Australia&apos;s #2 trading partner and the single largest foreign investor in Australian
              mining and resources. The Japan–Australia DTA (in force since 1970) reduces dividend withholding
              to 10–15%, and Japanese companies collectively represent billions in iron ore, LNG, and agricultural
              investment. Whether you are a Japanese corporation or individual investor, here is everything you
              need to know.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Dividend WHT", value: "10–15%", sub: "Under Japan-AU DTA" },
                { label: "Interest WHT", value: "10%", sub: "Under Japan-AU DTA" },
                { label: "Royalties WHT", value: "5%", sub: "Under Japan-AU DTA" },
                { label: "FIRB Threshold", value: "$310M", sub: "General business" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-extrabold text-amber-400">{stat.value}</p>
                  <p className="text-xs font-semibold text-white">{stat.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
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
              Japanese residents (non-residents of Australia) cannot purchase existing Australian homes until at
              least 31 March 2027. New off-the-plan properties remain available with FIRB approval.{" "}
              <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full details &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── Japan-Australia Investment Relationship ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Relationship"
            title="Japan–Australia: A Deep Economic Partnership"
            sub="Japan has been one of Australia's most significant investment partners for over five decades."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-blue-800 mb-3">🏭 Corporate Investors (Japanese companies)</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• Mitsui, Mitsubishi, Sumitomo — major stakes in iron ore, coal, LNG</li>
                <li>• JERA (Japan&apos;s largest power generator) — LNG off-take agreements</li>
                <li>• Toyota Tsusho — rare earths and critical minerals projects</li>
                <li>• FIRB corporate thresholds apply ($310M general)</li>
                <li>• Japanese FTA (JAEPA) provides some additional protections</li>
              </ul>
            </div>
            <div className="border-2 border-amber-200 bg-amber-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-3">👤 Individual Japanese Investors</h3>
              <ul className="space-y-2 text-sm text-amber-700">
                <li>• 15% dividend WHT on unfranked ASX dividends (10% if 10%+ company ownership)</li>
                <li>• No Australian CGT on listed ASX shares for non-residents</li>
                <li>• FIRB required for residential property purchases</li>
                <li>• Agricultural land over $15M requires FIRB approval</li>
                <li>• Capital gains from AU property taxed in Japan (DTA Article 13)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── DTA Rates ── */}
        <section>
          <SectionHeading
            eyebrow="DTA Rates"
            title="Japan–Australia Double Tax Agreement rates"
            sub="The Japan-Australia DTA has been in force since 1970, one of Australia's longest-standing tax treaties."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Income type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Without DTA</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">With DTA (Japanese residents)</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Japan tax treatment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { type: "Unfranked dividends (company owns 10%+)", noTreaty: "30%", withTreaty: "10%", note: "Beneficial rate for substantial corporate shareholders" },
                  { type: "Unfranked dividends (other)", noTreaty: "30%", withTreaty: "15%", note: "Taxed in Japan with credit for AU WHT" },
                  { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", note: "Subject to Japanese income tax" },
                  { type: "Interest", noTreaty: "10%", withTreaty: "10%", note: "Taxed in Japan with credit for AU WHT" },
                  { type: "Royalties", noTreaty: "30%", withTreaty: "5%", note: "Significant DTA benefit for IP/tech licensing" },
                  { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", note: "Japanese CGT rules apply" },
                  { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", note: "DTA Article 13 — AU source, taxed in AU" },
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
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>For Japanese companies:</strong> The 10% dividend rate applies when the Japanese company beneficially owns 10% or more of the voting shares in the Australian company paying the dividend. Most portfolio investors (owning less than 10%) pay the 15% rate.
            </p>
          </div>
        </section>

        {/* ── FIRB Rules ── */}
        <section>
          <SectionHeading
            eyebrow="FIRB Rules"
            title="FIRB rules for Japanese investors"
            sub="The Foreign Investment Review Board screens foreign investment into Australia. Japan-specific thresholds and rules apply."
          />
          <div className="grid sm:grid-cols-2 gap-5 mb-6">
            {[
              {
                title: "General Business Investment",
                threshold: "$310M",
                desc: "Japanese investors require FIRB approval for business acquisitions above $310M. Investments in sensitive sectors (media, telecoms, defence supply chain) have lower thresholds.",
              },
              {
                title: "Agricultural Land",
                threshold: "$15M",
                desc: "Cumulative agricultural land holdings above $15M require FIRB approval. This threshold applies to all foreign investors regardless of nationality.",
              },
              {
                title: "Residential Property (New)",
                threshold: "All purchases",
                desc: "All residential property purchases by non-resident foreigners require FIRB approval. New dwellings and off-the-plan apartments are generally approved.",
              },
              {
                title: "Residential Property (Existing)",
                threshold: "BANNED",
                desc: "The established dwelling ban is in effect until 31 March 2027. Japanese non-residents cannot purchase existing Australian homes during this period.",
              },
            ].map((item) => (
              <div key={item.title} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                  <span className="shrink-0 text-xs font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded-full">{item.threshold}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>JAEPA investment provisions:</strong> The Japan-Australia Economic Partnership Agreement (JAEPA, in force 2015) includes investment chapter protections for Japanese investors, but does not substantially alter FIRB screening thresholds compared to general foreign investor rules.
            </p>
          </div>
          <div className="mt-4">
            <Link href="/foreign-investment/property" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-sm hover:bg-slate-800 transition-colors">
              Use our FIRB property guide &rarr;
            </Link>
          </div>
        </section>

        {/* ── Popular Investment Vehicles ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Options"
            title="Popular investment vehicles for Japanese investors"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                type: "ASX Mining & Resources Stocks",
                ok: true,
                desc: "Iron ore, LNG, coal and uranium stocks — core to Japan-Australia investment flows. BHP, RIO, Woodside, Santos widely held by Japanese entities.",
                href: "/foreign-investment/shares",
              },
              {
                type: "Mining ETFs",
                ok: true,
                desc: "Diversified exposure via ASX-listed ETFs (e.g., VanEck Australian Resources ETF). Full access for non-resident investors through IBKR or Saxo.",
                href: "/foreign-investment/shares",
              },
              {
                type: "Agricultural Assets",
                ok: true,
                desc: "Food security is a strategic priority for Japan. Agricultural land over $15M requires FIRB. Agribusiness investments are popular.",
                href: "/foreign-investment/property",
              },
              {
                type: "Commercial Property",
                ok: true,
                desc: "Office, industrial, and logistics assets available with FIRB approval. Sydney and Melbourne CBD office towers popular with Japanese institutional investors.",
                href: "/foreign-investment/property",
              },
              {
                type: "New Residential Property",
                ok: true,
                desc: "Off-the-plan apartments available with FIRB approval. Established dwellings banned until 31 March 2027.",
                href: "/foreign-investment/guides/buy-property-australia-foreigner",
              },
              {
                type: "Infrastructure",
                ok: true,
                desc: "Japanese groups have invested in Australian infrastructure including ports and energy networks. Sensitive infrastructure requires FIRB screening.",
                href: "/foreign-investment/shares",
              },
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

        {/* ── Brokers ── */}
        {brokers.length > 0 && (
          <section>
            <SectionHeading
              eyebrow="Brokers"
              title="ASX brokers that accept Japanese residents"
              sub="Interactive Brokers, Saxo, and CMC Markets are the primary options for Japanese investors. Verify eligibility directly before applying."
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

        {/* ── Visa Pathways ── */}
        <section>
          <SectionHeading
            eyebrow="Visa & Business Pathways"
            title="Visa options for Japanese investors"
            sub="Japanese investors can access Australia through business and investment visa streams."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 mb-2 text-sm">Business Innovation & Investment Visa (188/888)</h3>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>• Subclass 188B Investor stream: $1.5M in designated investments for 4 years</li>
                <li>• Subclass 188C Significant Investor: $5M+ in complying investments</li>
                <li>• Subclass 888: Permanent residence after meeting stream requirements</li>
                <li>• Popular with high-net-worth Japanese individuals</li>
              </ul>
            </div>
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 mb-2 text-sm">Business & Work Visas</h3>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>• Subclass 400/401: Short-term business activity</li>
                <li>• Subclass 482: Temporary Skill Shortage — for company secondees</li>
                <li>• Working Holiday (subclass 417): Available to Japanese citizens under 31</li>
                <li>• JAEPA mobility provisions for Japanese business visitors</li>
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/advisors/migration-agents" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find a specialist migration agent &rarr;
            </Link>
          </div>
        </section>

        {/* ── Tax advisor CTA ── */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Find an international tax specialist for Japanese investors</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                Japan–Australia cross-border tax is complex, especially for corporate investors with resource-sector
                positions. A specialist can help optimise DTA benefits, manage FIRB applications, and structure
                investments tax-efficiently.
              </p>
            </div>
            <Link href="/advisors/international-tax-specialists" className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find a Tax Specialist &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related links ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for Japanese investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Send Money to Australia (JPY to AUD)", href: "/foreign-investment/send-money-australia" },
              { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
              { title: "FIRB Property Guide", href: "/foreign-investment/property" },
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
