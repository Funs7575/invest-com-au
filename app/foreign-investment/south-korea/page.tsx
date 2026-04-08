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
  title: "Investing in Australia from South Korea (2026) — FIRB, Tax & Broker Guide",
  description:
    "South Korean investors in Australia: KAFTA investment rules, Korea-Australia DTA (15% dividend WHT), lithium and critical minerals, FIRB thresholds, ASX brokers for Korean residents. Updated 2026.",
  openGraph: {
    title: "Investing in Australia from South Korea (2026) — FIRB, Tax & Broker Guide",
    description:
      "Korea–Australia DTA (15% WHT), KAFTA investment provisions, lithium supply chain investment, FIRB rules, and ASX broker eligibility for Korean residents.",
    url: `${SITE_URL}/foreign-investment/south-korea`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from South Korea")}&sub=${encodeURIComponent("KAFTA · DTA · Lithium · FIRB · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/south-korea` },
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

export default async function SouthKoreaInvestingPage() {
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
              { name: "Investing from South Korea" },
            ])
          ),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/south-korea" />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">From South Korea</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">🇰🇷</span>
              <span>South Korea · KAFTA since 2014 · Updated 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Investing in Australia{" "}
              <span className="text-amber-500">from South Korea</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">KAFTA, Tax Rates & Critical Minerals in 2026</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              South Korean companies are among the most active foreign investors in Australia&apos;s critical
              minerals sector. POSCO, Samsung SDI, and SK Innovation have all invested heavily in Australian
              lithium, cobalt, and nickel — the raw materials for Korean battery manufacturing. The Korea–Australia
              Free Trade Agreement (KAFTA, 2014) also provides investment protections for Korean investors.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Dividend WHT", value: "15%", sub: "Under Korea-AU DTA" },
                { label: "Interest WHT", value: "15%", sub: "Under Korea-AU DTA" },
                { label: "Royalties WHT", value: "15%", sub: "Under Korea-AU DTA" },
                { label: "FIRB Threshold", value: "$310M", sub: "General business" },
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
              Korean non-residents cannot purchase existing Australian homes until at least 31 March 2027.
              New off-the-plan properties remain available with FIRB approval.{" "}
              <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full details &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── Critical Minerals Investment Theme ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Theme"
            title="Korea's critical minerals investment in Australia"
            sub="South Korean companies are securing Australian raw material supplies for battery and semiconductor manufacturing."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-blue-800 mb-3">⚡ Korean Battery Supply Chain</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• POSCO Holdings — major lithium investments in the Pilbara and South Australia</li>
                <li>• Samsung SDI — invested in Australian lithium hydroxide processing</li>
                <li>• SK Innovation / SK On — securing lithium off-take agreements</li>
                <li>• LG Energy Solution — partnerships with Australian lithium miners</li>
                <li>• Australia supplies ~50% of global lithium — critical for Korean EV batteries</li>
              </ul>
            </div>
            <div className="border-2 border-amber-200 bg-amber-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-3">🏗️ Other Korean Investment</h3>
              <ul className="space-y-2 text-sm text-amber-700">
                <li>• Korean construction firms — residential and commercial development</li>
                <li>• Lotte, Hyundai — Australian retail and automotive operations</li>
                <li>• Korean institutional investors — commercial property, infrastructure</li>
                <li>• Individual Korean investors — ASX shares, investment properties</li>
                <li>• Korea-Australia LNG trade — POSCO and gas importers hold off-take</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── DTA Rates ── */}
        <section>
          <SectionHeading
            eyebrow="DTA Rates"
            title="Korea–Australia Double Tax Agreement rates"
            sub="The Korea-Australia DTA prevents double taxation on Australian-sourced income for Korean residents."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Income type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Without DTA</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">With DTA (Korean residents)</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", note: "Taxed in Korea with credit for AU WHT" },
                  { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", note: "Korean income tax may apply" },
                  { type: "Interest", noTreaty: "10%", withTreaty: "15%", note: "Taxed in Korea with credit for AU WHT" },
                  { type: "Royalties", noTreaty: "30%", withTreaty: "15%", note: "Taxed in Korea with credit for AU WHT" },
                  { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", note: "Korean CGT rules may apply" },
                  { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", note: "AU CGT applies — DTA credit in Korea" },
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

        {/* ── KAFTA Investment Rules ── */}
        <section>
          <SectionHeading
            eyebrow="KAFTA"
            title="Korea-Australia Free Trade Agreement investment provisions"
            sub="KAFTA (in force 2014) includes investment protections and some modified FIRB rules for Korean investors."
          />
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <ul className="space-y-3 text-sm text-blue-800">
              <li>• <strong>Investment chapter:</strong> KAFTA Chapter 11 provides protections including fair and equitable treatment, protection against expropriation without compensation, and investor-state dispute settlement.</li>
              <li>• <strong>FIRB screening thresholds:</strong> Korean investors follow the general foreign investor FIRB thresholds ($310M for non-sensitive business). Sensitive sectors (media, telecoms, defence, agriculture) retain lower thresholds.</li>
              <li>• <strong>National treatment:</strong> Korean investors must be treated no less favourably than Australian investors in like circumstances.</li>
              <li>• <strong>Most-favoured-nation:</strong> Korea benefits from any more favourable FIRB treatment Australia grants to other FTA partners in future.</li>
            </ul>
          </div>
        </section>

        {/* ── FIRB Rules ── */}
        <section>
          <SectionHeading
            eyebrow="FIRB Rules"
            title="FIRB rules for Korean investors"
          />
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { title: "General Business Investment", threshold: "$310M", desc: "Korean investors require FIRB approval for business acquisitions above $310M. Sensitive sectors have lower thresholds." },
              { title: "Agricultural Land", threshold: "$15M", desc: "Cumulative agricultural land holdings above $15M require FIRB approval. Food production assets receive careful scrutiny." },
              { title: "New Residential Property", threshold: "All purchases", desc: "All property purchases by non-resident Koreans require FIRB approval. New dwellings generally approved with FIRB." },
              { title: "Established Dwellings", threshold: "BANNED", desc: "Established dwelling ban applies to Korean non-residents until 31 March 2027. New construction unaffected." },
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
          <div className="mt-4">
            <Link href="/foreign-investment/property" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-sm hover:bg-slate-800 transition-colors">
              Use our FIRB property guide &rarr;
            </Link>
          </div>
        </section>

        {/* ── Investment Options ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Options"
            title="Popular investment vehicles for Korean investors"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: "ASX Lithium & Mining Stocks", ok: true, desc: "Pilbara Minerals, Allkem, Liontown Resources, IGO — direct exposure to Australia's critical minerals sector.", href: "/foreign-investment/shares" },
              { type: "ASX Mining ETFs", ok: true, desc: "Diversified critical minerals exposure via ASX ETFs. VanEck Australian Resources ETF and similar products available.", href: "/foreign-investment/shares" },
              { type: "Commercial Property", ok: true, desc: "Korean institutional investors have been active in Sydney and Melbourne commercial property with FIRB approval.", href: "/foreign-investment/property" },
              { type: "Infrastructure", ok: true, desc: "Korean investors have participated in Australian infrastructure privatisations including ports and utilities.", href: "/foreign-investment/shares" },
              { type: "New Residential Property", ok: true, desc: "Off-the-plan apartments available with FIRB approval. State stamp duty surcharges apply.", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { type: "Established Dwellings", ok: false, desc: "BANNED for non-residents until 31 March 2027.", href: "/foreign-investment/guides/property-ban-2025" },
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
              title="ASX brokers that accept Korean residents"
              sub="Interactive Brokers and Saxo Bank accept Korean residents for ASX investing. Verify eligibility before applying."
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

        {/* ── Currency Note ── */}
        <section>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-bold text-amber-800 mb-2">KRW/AUD Currency Considerations</h3>
            <ul className="space-y-2 text-sm text-amber-700">
              <li>• The Korean Won (KRW) and Australian Dollar (AUD) are both commodity-sensitive currencies — they tend to move in tandem with global commodity cycles.</li>
              <li>• When commodities boom, both currencies typically strengthen against the USD — meaning KRW/AUD may be relatively stable for Korean investors in Australian resources.</li>
              <li>• AUD-denominated investments (bonds, term deposits) allow you to hold AUD directly and avoid constant currency conversion costs.</li>
              <li>• For corporate investors: hedging AUD exposure may be appropriate depending on the scale of investment.</li>
            </ul>
          </div>
        </section>

        {/* ── Advisor CTA ── */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Find a specialist advisor for Korean investors</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                Korea–Australia investment involves KAFTA rules, FIRB applications, DTA tax optimisation, and
                critical minerals sector expertise. A specialist advisor can help structure your investment for
                maximum efficiency.
              </p>
            </div>
            <Link href="/advisors/international-tax-specialists" className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find a Tax Specialist &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for Korean investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "ASX Mining & Resources Stocks", href: "/foreign-investment/shares" },
              { title: "FIRB Property Guide", href: "/foreign-investment/property" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Send Money to Australia (KRW to AUD)", href: "/foreign-investment/send-money-australia" },
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
