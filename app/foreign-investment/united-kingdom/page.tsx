import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER, DTA_DISCLAIMER } from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Investing in Australia from the UK — Tax, Property & Brokers Guide 2026",
  description:
    "UK residents investing in Australia: DTA dividend WHT 15%, FIRB property rules, established dwelling ban 2025–2027, expat super rules, ASX brokers that accept UK residents. Updated March 2026.",
  openGraph: {
    title: "Investing in Australia from the UK — 2026 Guide",
    description:
      "UK–Australia DTA (15% dividend WHT), FIRB property rules, established dwelling ban, super access, and ASX broker eligibility for UK residents.",
    url: `${SITE_URL}/foreign-investment/united-kingdom`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from the UK")}&sub=${encodeURIComponent("DTA · FIRB · ASX Brokers · Expat Rules · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/united-kingdom` },
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

export default async function UKInvestingPage() {
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
              { name: "Investing from the UK" },
            ])
          ),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/united-kingdom" />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">From the UK</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">🇬🇧</span>
              <span>United Kingdom · DTA effective 2003 · Updated March 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Investing in Australia{" "}
              <span className="text-amber-500">from the UK</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">Tax Rates, Rules & How to Start in 2026</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              The UK–Australia DTA (effective 2003) reduces dividend withholding to 15% and royalties to just 5%.
              There&apos;s also a large Australian expat community in the UK — and vice versa. Whether you&apos;re a
              UK resident or an Australian expat in the UK, here&apos;s everything you need to know about
              investing in Australia from the UK.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Dividend WHT", value: "15%", sub: "Under UK-AU DTA" },
                { label: "Interest WHT", value: "10%", sub: "Standard ATO rate" },
                { label: "Royalties WHT", value: "5%", sub: "Under UK-AU DTA" },
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

        {/* ── Property ban ── */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="font-bold text-red-800 text-sm">Established Dwelling Ban: Active until 31 March 2027</p>
            <p className="text-sm text-red-700 mt-0.5">
              UK residents (and Australian expats in the UK who are non-residents for AU tax) cannot purchase
              existing Australian homes until at least 31 March 2027. New properties remain available.{" "}
              <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full details &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── Two audiences callout ── */}
        <section>
          <SectionHeading
            eyebrow="Two Audiences"
            title="Are you a UK resident or an Australian expat in the UK?"
            sub="The rules differ significantly depending on your tax residency status."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-blue-800 mb-3">🇬🇧 UK Resident (not Australian)</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• 15% dividend WHT on unfranked ASX dividends (under DTA)</li>
                <li>• Generally exempt from AU CGT on listed shares</li>
                <li>• FIRB approval required for property — FTA rules may apply</li>
                <li>• UK capital gains tax may apply on AU property sale</li>
                <li>• Cannot access Australian super</li>
              </ul>
            </div>
            <div className="border-2 border-amber-200 bg-amber-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-3">🇦🇺 Australian Expat in the UK</h3>
              <ul className="space-y-2 text-sm text-amber-700">
                <li>• May lose AU tax residency — lose CGT discount and tax-free threshold</li>
                <li>• Australian-sourced income still taxed in Australia</li>
                <li>• No FIRB needed for property (Australian citizen/PR)</li>
                <li>• Super preserved until preservation age — cannot access as non-resident</li>
                <li>• UK domestic tax rules apply to your UK income</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── DTA rates ── */}
        <section>
          <SectionHeading
            eyebrow="DTA Rates"
            title="UK–Australia Double Tax Agreement rates"
            sub="DTA effective since 2003. Prevents double taxation for UK residents on Australian-sourced income."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Income type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Without DTA</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">With DTA (UK residents)</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">UK tax treatment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", ukNote: "Taxed in UK with credit for AU WHT" },
                  { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", ukNote: "Subject to UK income tax" },
                  { type: "Interest", noTreaty: "10%", withTreaty: "10%", ukNote: "Taxed in UK with credit for AU WHT" },
                  { type: "Royalties", noTreaty: "30%", withTreaty: "5%", ukNote: "Significant DTA benefit" },
                  { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", ukNote: "UK CGT may apply" },
                ].map((r) => (
                  <tr key={r.type} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.type}</td>
                    <td className="px-4 py-3 text-red-700 font-semibold">{r.noTreaty}</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">{r.withTreaty}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{r.ukNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Investment options ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Options"
            title="What UK residents can invest in Australia"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: "ASX Shares & ETFs", ok: true, desc: "Interactive Brokers is the primary option for UK residents. Full access to ASX, ETFs, and international markets.", href: "/foreign-investment/shares" },
              { type: "New Property (off-the-plan)", ok: true, desc: "New dwellings available with FIRB approval. UK is an FTA country — higher thresholds may apply.", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { type: "Australian Fixed Income", ok: true, desc: "Term deposits and bonds accessible. 10% withholding on interest.", href: "/foreign-investment/savings" },
              { type: "Established Dwellings", ok: false, desc: "BANNED until 31 March 2027.", href: "/foreign-investment/guides/property-ban-2025" },
              { type: "Superannuation (as non-resident)", ok: false, desc: "Cannot contribute to AU super as a non-resident. Australian expats can preserve existing super.", href: "/foreign-investment/super" },
              { type: "Crypto", ok: true, desc: "Most AU exchanges accept UK residents.", href: "/foreign-investment/crypto" },
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
              title="ASX brokers that accept UK residents"
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

        {/* ── Advisor ── */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Find an advisor with UK client experience</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                Whether you&apos;re a UK resident investing in Australia or an Australian expat in the UK, a
                cross-border tax accountant can navigate the complexities of both tax systems.
              </p>
            </div>
            <Link href="/advisors" className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find an Advisor &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for UK investors and expats" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Send Money to Australia (GBP to AUD)", href: "/foreign-investment/send-money-australia" },
              { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
              { title: "UK DTA rates detail", href: `/foreign-investment/from/gb` },
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
