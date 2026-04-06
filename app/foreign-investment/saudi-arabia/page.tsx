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
  title: "Saudi Arabian Investors in Australia (2026) — FIRB, Tax & Investment Guide — Invest.com.au",
  description:
    "Saudi investors in Australia: no DTA (standard 30% WHT on unfranked dividends), FIRB rules, agricultural land opportunities, critical minerals, Islamic finance options. Updated 2026.",
  openGraph: {
    title: "Saudi Arabian Investors in Australia — 2026 Guide",
    description:
      "No DTA (30% WHT on unfranked dividends), FIRB agricultural land threshold $15M, PIF sovereign wealth fund activity, Islamic finance structures. Updated 2026.",
    url: `${SITE_URL}/foreign-investment/saudi-arabia`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Saudi Arabian Investors in Australia")}&sub=${encodeURIComponent("FIRB · No DTA · Islamic Finance · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/saudi-arabia` },
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

export default async function SaudiArabiaInvestingPage() {
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
              { name: "Saudi Arabian Investors" },
            ])
          ),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/saudi-arabia" />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Saudi Arabian Investors</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">🇸🇦</span>
              <span>Saudi Arabia · No DTA · Updated 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Saudi Arabian Investors{" "}
              <span className="text-amber-500">in Australia</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">FIRB, Tax & Investment Guide 2026</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Saudi Arabia is one of Australia&apos;s fastest-growing investment partners, driven by the Public
              Investment Fund&apos;s global diversification mandate and Vision 2030. There is no Double Tax Agreement
              between Australia and Saudi Arabia — meaning standard Australian withholding tax rates apply. Franked
              dividends and Islamic finance structures offer significant advantages for Saudi investors.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Dividend WHT", value: "30%", sub: "No DTA" },
                { label: "FIRB Agricultural", value: "$15M", sub: "Threshold" },
                { label: "PIF", value: "$750B+", sub: "Saudi sovereign wealth fund" },
                { label: "Islamic Finance", value: "Available", sub: "Halal structures" },
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

        {/* ── No DTA warning ── */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="font-bold text-red-800 text-sm">No Double Tax Agreement — Standard 30% WHT Applies to Unfranked Dividends</p>
            <p className="text-sm text-red-700 mt-0.5">
              Australia and Saudi Arabia have no DTA. Unfranked dividends attract the maximum 30% withholding tax rate.
              Fully franked dividends remain at 0% WHT — prioritising franked ASX shares is critical for Saudi investors.{" "}
              <Link href="/foreign-investment/tax" className="underline font-semibold">Full tax guide &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── Investment Relationship ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Relationship"
            title="Saudi Arabia–Australia investment relationship"
            sub="Driven by Vision 2030 diversification, food security, and critical minerals demand."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Public Investment Fund (PIF)</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                The PIF — Saudi Arabia&apos;s sovereign wealth fund managing over $750 billion — is increasingly
                active in Australian assets. Its global diversification mandate under Vision 2030 has driven
                growing interest in Australian agriculture, infrastructure, and critical minerals.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-600">
                <li>• Agricultural land — food security mandate driving acquisitions</li>
                <li>• Critical minerals — lithium, cobalt for battery supply chains</li>
                <li>• Commercial property and infrastructure</li>
                <li>• Saudi Aramco&apos;s ongoing interest in Australian LNG assets</li>
              </ul>
            </div>
            <div className="border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Vision 2030 & Global Diversification</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Saudi Arabia&apos;s Vision 2030 program explicitly pushes sovereign and private investors to
                diversify globally beyond oil revenues. Australia offers political stability, strong rule of
                law, and complementary trade ties — making it an attractive destination for Saudi capital.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-600">
                <li>• Bilateral trade relationship growing steadily</li>
                <li>• Australian agricultural exports to Saudi Arabia valued at hundreds of millions annually</li>
                <li>• Energy transition creating new minerals investment opportunities</li>
                <li>• Strong diplomatic ties support investment confidence</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Tax Treatment ── */}
        <section>
          <SectionHeading
            eyebrow="Tax Treatment"
            title="No DTA — Australian withholding tax rates for Saudi investors"
            sub="Without a Double Tax Agreement, standard Australian rates apply. Saudi Arabia has no personal income tax on investment returns."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Income type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">AU withholding rate</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Saudi Arabia tax</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Key note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { type: "Unfranked dividends", au: "30%", sa: "None", note: "Highest rate — no DTA reduction" },
                  { type: "Fully franked dividends", au: "0%", sa: "None", note: "Franking credits offset WHT — very beneficial" },
                  { type: "Interest income", au: "10%", sa: "None", note: "Standard non-resident rate" },
                  { type: "Royalties", au: "30%", sa: "None", note: "No DTA — full rate applies" },
                  { type: "Capital gains (listed shares)", au: "0% (exempt)", sa: "None", note: "AU CGT generally exempt for non-residents on listed shares" },
                  { type: "Capital gains (property)", au: "CGT applies", sa: "None", note: "Australian CGT applies; no Saudi CGT" },
                ].map((r) => (
                  <tr key={r.type} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.type}</td>
                    <td className="px-4 py-3 text-red-700 font-semibold">{r.au}</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">{r.sa}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-bold text-amber-800 mb-1">Key advice for Saudi investors</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              Prioritise fully franked ASX shares — franking credits eliminate Australian withholding tax entirely,
              making this the most tax-efficient structure. Consider Islamic finance structures for property and
              lending. Avoid high-interest products where possible given the 10% WHT on interest.
            </p>
          </div>
        </section>

        {/* ── FIRB Rules ── */}
        <section>
          <SectionHeading
            eyebrow="FIRB Rules"
            title="FIRB rules for Saudi investors"
            sub="Standard foreign investor thresholds apply. Agricultural land and government investors face additional scrutiny."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "General commercial threshold",
                threshold: "$310M",
                desc: "Most commercial and business acquisitions under $310M do not require FIRB approval. Above this threshold, FIRB application mandatory.",
                ok: true,
              },
              {
                title: "Agricultural land",
                threshold: "$15M",
                desc: "Reduced FIRB threshold for agricultural land. Any acquisition above $15M (cumulative) requires mandatory FIRB approval. Food security interests attract closer scrutiny.",
                ok: false,
              },
              {
                title: "Residential property",
                threshold: "New only",
                desc: "Saudi residents can purchase new dwellings only. Established dwelling purchases banned until at least 31 March 2027 under the foreign buyer ban.",
                ok: false,
              },
              {
                title: "Mining & critical minerals",
                threshold: "FIRB required",
                desc: "Foreign investment allowed in mining. Acquiring 50%+ of a significant Australian mining asset requires FIRB approval. Critical minerals attract national interest review.",
                ok: true,
              },
              {
                title: "Government investors (PIF, Aramco)",
                threshold: "Any amount",
                desc: "Government-linked investors including PIF and Saudi Aramco may need separate national interest review regardless of deal size. All acquisitions by foreign governments require FIRB.",
                ok: false,
              },
              {
                title: "Infrastructure",
                threshold: "Varies",
                desc: "Critical infrastructure (ports, electricity, water) subject to additional review under critical infrastructure protection laws.",
                ok: true,
              },
            ].map((item) => (
              <div key={item.title} className={`border rounded-xl p-4 ${item.ok ? "border-slate-200" : "border-amber-200 bg-amber-50/30"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-800">{item.title}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.ok ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-800"}`}>
                    {item.threshold}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            <Link href="/foreign-investment/property" className="text-amber-600 hover:text-amber-700 underline">Use the FIRB property calculator &rarr;</Link>
          </p>
        </section>

        {/* ── Islamic Finance ── */}
        <section>
          <SectionHeading
            eyebrow="Islamic Finance"
            title="Islamic finance options in Australia"
            sub="Shariah-compliant investment and finance structures are available in Australia through specialist providers."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: "MCCA",
                full: "Muslim Community Co-operative Australia",
                desc: "Australia's longest-established Islamic finance provider. Offers Shariah-compliant home finance (Ijarah and diminishing Musharakah structures) for property purchases.",
              },
              {
                name: "Hejaz Financial Services",
                full: "Shariah-compliant investments & super",
                desc: "Provides Islamic home loans, superannuation, and managed investment funds all screened for Shariah compliance. One of Australia's fastest-growing Islamic finance providers.",
              },
              {
                name: "Shariah-compliant ASX shares",
                full: "Halal equity investing",
                desc: "ASX-listed companies can be screened for halal compliance — excluding alcohol, gambling, weapons, pork, and interest-bearing businesses. Specialty managers provide screened portfolios.",
              },
              {
                name: "Islamic managed funds",
                full: "Specialty fund managers",
                desc: "Islamic managed funds available through specialty managers. IOOF and others offer Shariah-screened options within their broader fund ranges.",
              },
              {
                name: "Sukuk",
                full: "Islamic bonds",
                desc: "Limited Australian dollar sukuk market. Some Islamic financial institutions issue sukuk instruments. The Australian market is less developed than Malaysia or UAE.",
              },
              {
                name: "SMSF — Shariah structured",
                full: "Self-managed super fund",
                desc: "An SMSF can be structured for Shariah compliance by adopting an appropriate investment strategy that excludes non-halal assets. Specialist SMSF advisors can assist.",
              },
            ].map((item) => (
              <div key={item.name} className="border border-slate-200 rounded-xl p-4 hover:border-amber-200 transition-colors">
                <p className="font-bold text-sm text-slate-800 mb-0.5">{item.name}</p>
                <p className="text-xs text-amber-700 font-semibold mb-2">{item.full}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Brokers ── */}
        {brokers.length > 0 && (
          <section>
            <SectionHeading
              eyebrow="Brokers"
              title="ASX brokers that accept Saudi residents"
              sub="IBKR, Saxo, and CMC Markets accept Saudi residents. KYC typically requires passport, proof of address, and source of funds documentation."
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
            eyebrow="Visa & Business Investment"
            title="Visa and business investment pathways for Saudi nationals"
            sub="Australia offers several pathways for significant investors seeking residency through capital deployment."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                name: "Significant Investor Stream",
                visa: "Subclass 188/888",
                min: "$5M minimum",
                desc: "Requires $5 million invested in complying investments (venture capital, private equity, emerging companies, and managed funds). No age limit, no points test.",
                ok: true,
              },
              {
                name: "Premium Investor Stream",
                visa: "Subclass 188/888",
                min: "$15M minimum",
                desc: "Premium stream for $15M+ in complying investments. Faster pathway to permanent residence (Subclass 888). Very limited places annually.",
                ok: true,
              },
              {
                name: "Business Innovation Stream",
                visa: "Subclass 188",
                min: "Business ownership",
                desc: "Requires ownership of an active business meeting turnover and assets tests. Must establish or manage a new or existing business in Australia.",
                ok: true,
              },
              {
                name: "Business Talent Stream",
                visa: "Subclass 132",
                min: "State nomination",
                desc: "For high-calibre business owners. Requires state/territory nomination, significant business history, and either significant assets ($1.5M net) or venture capital backing.",
                ok: true,
              },
            ].map((item) => (
              <div key={item.name} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-bold text-sm text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.visa}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full shrink-0">{item.min}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            <Link href="/advisors/migration-agents" className="text-amber-600 hover:text-amber-700 underline">Find a migration agent with Saudi client experience &rarr;</Link>
          </p>
        </section>

        {/* ── CTAs ── */}
        <section className="grid sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-2">International tax specialist</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              No DTA means careful tax structuring is essential. Find an accountant experienced in Saudi–Australia cross-border investment.
            </p>
            <Link href="/advisors/international-tax-specialists" className="block text-center px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs transition-colors">
              Find Tax Specialist &rarr;
            </Link>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-2">Migration agent</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Significant Investor and Business Innovation visas require expert guidance. Find a registered migration agent.
            </p>
            <Link href="/advisors/migration-agents" className="block text-center px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs transition-colors">
              Find Migration Agent &rarr;
            </Link>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-2">FIRB property calculator</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Check whether your property purchase requires FIRB approval and understand applicable thresholds.
            </p>
            <Link href="/foreign-investment/property" className="block text-center px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs transition-colors">
              FIRB Calculator &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for Saudi and Middle East investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "UAE investors in Australia", href: "/foreign-investment/united-arab-emirates" },
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
              { title: "Send Money to Australia", href: "/foreign-investment/send-money-australia" },
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
