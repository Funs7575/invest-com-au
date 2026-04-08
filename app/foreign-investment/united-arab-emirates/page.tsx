import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER, DTA_DISCLAIMER } from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Investing in Australia from UAE / Dubai — Tax Rates & Property Guide 2026",
  description:
    "UAE residents (Dubai, Abu Dhabi) investing in Australia: no DTA — 30% dividend withholding applies. FIRB property rules, established dwelling ban 2025–2027, ASX broker access, and tax-efficient structures. Updated March 2026.",
  openGraph: {
    title: "Investing in Australia from UAE / Dubai — 2026 Guide",
    description:
      "No DTA — 30% dividend WHT applies. FIRB property rules, established dwelling ban, tax-efficient structuring options, and broker access for UAE investors.",
    url: `${SITE_URL}/foreign-investment/united-arab-emirates`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from UAE / Dubai")}&sub=${encodeURIComponent("No DTA · FIRB · Tax Structures · Broker Access · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/united-arab-emirates` },
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

export default async function UAEInvestingPage() {
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
              { name: "Investing from UAE / Dubai" },
            ])
          ),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/united-arab-emirates" />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">From UAE / Dubai</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">🇦🇪</span>
              <span>UAE / Dubai · No DTA with Australia · Updated March 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Investing in Australia{" "}
              <span className="text-amber-500">from UAE / Dubai</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">No DTA — Here&apos;s What That Means</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Australia and the UAE have <strong>no Double Tax Agreement</strong>, which means UAE residents pay full
              Australian withholding rates on dividends (30%) and royalties (30%). However, Australian interest
              is still 10%, and non-residents are generally exempt from Australian CGT on listed shares.
              For property, the UAE&apos;s zero personal income tax creates a unique structuring opportunity —
              but FIRB approval and the 2025–2027 dwelling ban still apply.
            </p>

            {/* No DTA warning + rates */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Dividend WHT", value: "30%", sub: "No DTA — full rate", warn: true },
                { label: "Interest WHT", value: "10%", sub: "Standard ATO rate", warn: false },
                { label: "Royalties WHT", value: "30%", sub: "No DTA — full rate", warn: true },
              ].map((stat) => (
                <div key={stat.label} className={`border rounded-xl p-3 text-center ${stat.warn ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-xl font-extrabold ${stat.warn ? "text-orange-600" : "text-amber-600"}`}>{stat.value}</p>
                  <p className="text-xs font-semibold text-slate-900">{stat.label}</p>
                  <p className={`text-xs mt-0.5 ${stat.warn ? "text-orange-600" : "text-slate-500"}`}>{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Property ban ── */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="font-bold text-red-800 text-sm">Established Dwelling Ban: Active until 31 March 2027</p>
            <p className="text-sm text-red-700 mt-0.5">
              UAE residents cannot purchase existing Australian homes until at least 31 March 2027.
              New off-the-plan and new developments remain available with FIRB approval.{" "}
              <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full details &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── No DTA explained ── */}
        <section>
          <SectionHeading
            eyebrow="No DTA"
            title="What &apos;no DTA&apos; means for UAE investors"
            sub="Without a Double Tax Agreement, full Australian withholding rates apply — but not everything is bad news."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
              <h3 className="font-bold text-orange-800 mb-3">The disadvantages</h3>
              <ul className="space-y-2 text-sm text-orange-700">
                <li>• <strong>30% WHT on unfranked dividends</strong> — significantly reduces yield vs DTA countries</li>
                <li>• <strong>30% WHT on royalties</strong> — affects IP-holding structures</li>
                <li>• No formal mechanism to avoid double taxation (though UAE has no income tax, this is less of a concern)</li>
                <li>• Higher effective cost for unfranked dividend strategies</li>
              </ul>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <h3 className="font-bold text-emerald-800 mb-3">The silver linings</h3>
              <ul className="space-y-2 text-sm text-emerald-700">
                <li>• <strong>UAE has zero personal income tax</strong> — so the AU WHT is the only tax you pay</li>
                <li>• <strong>Fully franked dividends: 0% WHT</strong> — the same benefit as DTA countries</li>
                <li>• <strong>No AU CGT on listed share gains</strong> — non-resident exemption still applies</li>
                <li>• <strong>10% interest WHT</strong> — same as treaty countries</li>
                <li>• Focus on franked dividend strategies minimises the no-DTA impact</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-bold text-amber-800 mb-2">Strategy tip: focus on fully franked dividends</h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              Australian blue-chip companies — particularly banks, retailers, and established industrials — pay
              high levels of franked dividends. For UAE investors, fully franked dividends have <strong>0% Australian
              withholding tax</strong> (the tax has already been paid at the corporate level). This significantly
              reduces the no-DTA disadvantage. A portfolio focused on high-franking ASX companies can be highly
              tax-efficient for UAE residents.
            </p>
          </div>
        </section>

        {/* ── Investment options ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Options"
            title="Investment options for UAE / Dubai residents"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: "ASX Shares (Franked Focus)", ok: true, desc: "Focus on high-franking stocks to minimise WHT impact. Interactive Brokers available globally including UAE.", href: "/foreign-investment/shares" },
              { type: "New Residential Property", ok: true, desc: "New dwellings with FIRB approval. Stamp duty surcharges 7–8% by state apply.", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { type: "Australian Fixed Income", ok: true, desc: "10% WHT on interest — same as DTA countries. Term deposits and bonds accessible.", href: "/foreign-investment/savings" },
              { type: "Established Dwellings", ok: false, desc: "BANNED until 31 March 2027.", href: "/foreign-investment/guides/property-ban-2025" },
              { type: "Significant Investor Visa (SIV)", ok: true, desc: "$5M+ investment pathway to Australian residency. Opens access to all investment types.", href: "/advisors" },
              { type: "Crypto", ok: true, desc: "Most AU exchanges accessible. Non-resident CGT exemption may apply.", href: "/foreign-investment/crypto" },
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
              title="ASX brokers available to UAE residents"
              sub="Verify eligibility directly before applying."
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
                    <a href={broker.affiliate_url} target="_blank" rel="noopener noreferrer sponsored" className="block w-full text-center px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg text-xs transition-colors">
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

        {/* ── Find advisor ── */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Specialist advice for UAE investors</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                UAE investors may benefit from specialist cross-border tax structuring advice to optimise their
                Australian investment strategy given the no-DTA situation. Our advisor directory includes
                international tax specialists and some Arabic-speaking advisors.
              </p>
            </div>
            <Link href="/advisors" className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find an Advisor &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for UAE / Dubai investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Send Money to Australia (AED to AUD)", href: "/foreign-investment/send-money-australia" },
              { title: "Withholding Tax Guide", href: "/foreign-investment/tax" },
              { title: "UAE DTA status", href: `/foreign-investment/from/ae` },
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
