import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER, DTA_DISCLAIMER } from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Investing in Australia from Hong Kong — Tax Rates, Brokers & Property 2026 — Invest.com.au",
  description:
    "Hong Kong residents investing in Australia: DTA dividend WHT 15%, FIRB property rules, established dwelling ban 2025–2027, ASX broker eligibility, and withholding tax rates. Updated March 2026.",
  openGraph: {
    title: "Investing in Australia from Hong Kong — 2026 Guide",
    description:
      "DTA rates (15% dividend WHT), FIRB rules, established dwelling ban, ASX brokers, and tax obligations for Hong Kong investors.",
    url: `${SITE_URL}/foreign-investment/hong-kong`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from Hong Kong")}&sub=${encodeURIComponent("DTA Rates · FIRB · ASX Brokers · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/hong-kong` },
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

export default async function HongKongInvestingPage() {
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
              { name: "Investing from Hong Kong" },
            ])
          ),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/hong-kong" />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">From Hong Kong</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">🇭🇰</span>
              <span>Hong Kong · DTA effective 2011 · Updated March 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Investing in Australia{" "}
              <span className="text-amber-500">from Hong Kong</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">Tax Rates, Rules & How to Start</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Hong Kong is a major source of capital for Australian real estate and shares. The Hong Kong–Australia
              DTA (effective 2011) reduces dividend withholding to 15% and royalty WHT to just 5%.
              Here&apos;s everything Hong Kong investors need to know about investing in Australia in 2026.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Dividend WHT", value: "15%", sub: "Under HK-AU DTA" },
                { label: "Interest WHT", value: "10%", sub: "Standard ATO rate" },
                { label: "Royalties WHT", value: "5%", sub: "Under HK-AU DTA" },
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
              Hong Kong residents cannot purchase existing Australian homes until at least 31 March 2027.
              New developments and off-the-plan properties remain available with FIRB approval.{" "}
              <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full ban details &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── DTA section ── */}
        <section>
          <SectionHeading
            eyebrow="Double Tax Agreement"
            title="Australia–Hong Kong DTA: key rates"
            sub="The DTA effective from 2011 provides meaningful rate reductions for Hong Kong investors."
          />
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Withholding tax rates</h3>
              <div className="space-y-3">
                {[
                  { type: "Unfranked dividends", rate: "15%", note: "Reduced from 30% standard", highlight: true },
                  { type: "Fully franked dividends", rate: "0%", note: "Already taxed at company level", highlight: false },
                  { type: "Interest income", rate: "10%", note: "Standard rate (same as treaty)", highlight: false },
                  { type: "Royalties", rate: "5%", note: "Reduced from 30% — excellent rate", highlight: true },
                ].map((r) => (
                  <div key={r.type} className={`flex items-center justify-between gap-2 p-2 rounded-lg ${r.highlight ? "bg-amber-50" : ""}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.type}</p>
                      <p className="text-xs text-slate-500">{r.note}</p>
                    </div>
                    <span className={`font-extrabold text-lg ${r.rate === "0%" ? "text-emerald-700" : "text-amber-700"}`}>{r.rate}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-bold text-amber-800 text-sm mb-2">Hong Kong tax advantage for investors</h3>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Hong Kong has no capital gains tax. For HK residents investing in Australian shares,
                  the 15% Australian dividend withholding is a final tax — no additional HK tax applies.
                  Australian share sales are also generally exempt from Australian CGT for non-residents
                  (portfolio holdings under 10%). This can mean near-zero total tax on share gains.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-800 text-sm mb-2">Australia is an FTA partner with HK</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The Australia–Hong Kong Free Trade Agreement (AUSFTA) gives Hong Kong residents
                  higher FIRB thresholds for commercial investments. For residential property,
                  standard FIRB rules apply — but the FTA provides a broader favourable framework
                  for investment relationships between the two economies.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Investment options ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Options"
            title="What Hong Kong residents can invest in"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: "ASX Shares & ETFs", ok: true, desc: "Full access via non-resident-friendly brokers. Interactive Brokers is the primary option.", href: "/foreign-investment/shares" },
              { type: "New Property (off-the-plan)", ok: true, desc: "New dwellings available with FIRB approval. Established dwellings banned until 31 Mar 2027.", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { type: "Savings Accounts", ok: true, desc: "Australian bank accounts available to HK residents. 10% withholding on interest.", href: "/foreign-investment/savings" },
              { type: "Crypto", ok: true, desc: "Most AU crypto exchanges accept international users.", href: "/foreign-investment/crypto" },
              { type: "Established Dwellings", ok: false, desc: "BANNED until 31 March 2027.", href: "/foreign-investment/guides/property-ban-2025" },
              { type: "Superannuation", ok: false, desc: "Not available to non-residents or non-workers.", href: "/foreign-investment" },
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
              title="ASX brokers that accept Hong Kong residents"
              sub="Verify eligibility directly with the broker before applying."
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

        {/* ── Advisor match ── */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Find an advisor for Hong Kong investors</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                Some Australian advisors specialise in Hong Kong clients and speak Cantonese or Mandarin.
                Our directory includes cross-border tax accountants, FIRB specialists, and buyer&apos;s agents
                with Hong Kong client experience.
              </p>
            </div>
            <Link href="/advisors" className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find an Advisor &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More resources for Hong Kong investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Send Money to Australia (FX Comparison)", href: "/foreign-investment/send-money-australia" },
              { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
              { title: "HK DTA rates detail", href: `/foreign-investment/from/hk` },
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
