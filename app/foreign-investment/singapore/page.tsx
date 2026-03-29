import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER, DTA_DISCLAIMER } from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Investing in Australia from Singapore — Tax Rates, Brokers & Property Guide 2026 — Invest.com.au",
  description:
    "Singapore residents investing in Australia: DTA dividend withholding rate 15%, FIRB property rules, the 2025–2027 established dwelling ban, ASX brokers that accept Singapore residents, and tax obligations. Updated March 2026.",
  openGraph: {
    title: "Investing in Australia from Singapore — 2026 Guide",
    description:
      "DTA rates (15% dividend WHT), FIRB property rules, ASX broker eligibility, and tax obligations for Singapore investors in Australia.",
    url: `${SITE_URL}/foreign-investment/singapore`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from Singapore")}&sub=${encodeURIComponent("DTA Rates · FIRB · ASX Brokers · Property · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/singapore` },
};

export const revalidate = 86400;

async function getNonResidentBrokers(): Promise<Broker[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("id, name, slug, color, logo_url, cta_text, affiliate_url, rating, accepts_non_residents, foreign_investor_notes, platform_type, regulated_by, status")
      .eq("accepts_non_residents", true)
      .eq("status", "active")
      .order("rating", { ascending: false })
      .limit(6);
    return (data ?? []) as unknown as Broker[];
  } catch {
    return [];
  }
}

const COUNTRY = {
  name: "Singapore",
  flag: "🇸🇬",
  code: "SG",
  currency: "SGD",
  dtaYear: 2010,
  hasDTA: true,
  dividendWHT: 15,
  interestWHT: 10,
  royaltiesWHT: 10,
  population: "5.9M",
  topInvestmentTypes: ["ASX shares", "New residential property", "ETFs", "Fixed income"],
  localLanguages: ["English", "Mandarin", "Malay", "Tamil"],
  capitalCity: "Singapore",
  timezone: "SGT (UTC+8)",
};

export default async function SingaporeInvestingPage() {
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
              { name: "Investing from Singapore" },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Can Singapore residents invest in Australian shares?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Singapore residents can invest in Australian shares via brokers that accept non-residents. Interactive Brokers is the most accessible option. Under the Australia-Singapore DTA, dividend withholding tax is reduced from 30% to 15% for Singapore residents. Fully franked dividends have 0% withholding regardless.",
                },
              },
              {
                "@type": "Question",
                name: "Can Singapore residents buy property in Australia?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Singapore is a Free Trade Agreement (FTA) country with Australia, which means Singapore residents generally have higher FIRB thresholds than other foreign buyers. However, from 1 April 2025 to 31 March 2027, Singapore residents (like all foreign persons) cannot purchase established (existing) dwellings. New dwellings, off-the-plan, and vacant land are still available.",
                },
              },
            ],
          }),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/singapore" />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-200">Foreign Investment</Link>
            <span>/</span>
            <span className="text-slate-300">From Singapore</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="text-base">{COUNTRY.flag}</span>
              <span>Singapore · DTA effective 2010 · Updated March 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight">
              Investing in Australia{" "}
              <span className="text-amber-400">from Singapore</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-300">Tax Rates, Rules & How to Start</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6">
              Singapore is one of Australia&apos;s top five source countries for foreign investment. The Singapore-Australia
              DTA (effective 2010) reduces dividend withholding to 15%, and Singapore&apos;s Free Trade Agreement status
              gives Singapore residents higher FIRB property thresholds. Here&apos;s everything you need to know.
            </p>

            {/* DTA quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Dividend WHT", value: "15%", sub: "Under SG-AU DTA" },
                { label: "Interest WHT", value: "10%", sub: "Standard ATO rate" },
                { label: "Royalties WHT", value: "10%", sub: "Under SG-AU DTA" },
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

        {/* ── Property ban notice ── */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="font-bold text-red-800 text-sm">Established Dwelling Ban: Active until 31 March 2027</p>
            <p className="text-sm text-red-700 mt-0.5">
              Singapore residents, like all foreign persons, <strong>cannot purchase existing Australian homes</strong> until at least 31 March 2027.
              New dwellings, off-the-plan, and vacant land are still available.{" "}
              <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full details &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── DTA overview ── */}
        <section>
          <SectionHeading
            eyebrow="Double Tax Agreement"
            title="Australia–Singapore DTA: what it means for you"
            sub="The DTA (effective 2010) prevents double taxation and reduces withholding rates."
          />
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-800 text-sm mb-3">Withholding tax rates under the DTA</h3>
                <div className="space-y-2">
                  {[
                    { type: "Unfranked dividends", rate: "15%", note: "Reduced from 30% default" },
                    { type: "Fully franked dividends", rate: "0%", note: "Tax already paid at company level" },
                    { type: "Interest income", rate: "10%", note: "Same as standard ATO rate" },
                    { type: "Royalties", rate: "10%", note: "Reduced from 30% default" },
                  ].map((r) => (
                    <div key={r.type} className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="text-sm text-slate-700">{r.type}</span>
                        <span className="ml-2 text-xs text-slate-400">{r.note}</span>
                      </div>
                      <span className="font-bold text-slate-800">{r.rate}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-bold text-amber-800 text-sm mb-2">Singapore tax advantage</h3>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Singapore has no capital gains tax and no tax on foreign-sourced dividends for individuals.
                  For Singapore residents investing in Australian shares, the 15% Australian withholding tax on
                  unfranked dividends is a final tax — there is no additional Singapore tax liability.
                  For fully franked dividends, the tax burden is 0%.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-800 text-sm mb-3">Non-resident CGT rules for shares</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Singapore residents investing in Australian shares are <strong>generally exempt from Australian CGT</strong> on
                  gains from selling listed securities (portfolio holdings under 10%). This is under Section 855-10 of
                  the ITAA 1997 — one of the most valuable rules for non-resident investors.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  In Singapore, capital gains are not taxed. So a Singapore resident buying and selling Australian
                  listed shares may owe <strong>zero capital gains tax in either country</strong>.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <h3 className="font-bold text-emerald-800 text-sm mb-2">FTA property advantage</h3>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  As a Free Trade Agreement country, Singapore residents generally have higher FIRB thresholds for
                  residential property than non-FTA country investors. Consult a FIRB specialist for current
                  threshold amounts — they are indexed annually.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Investment types ── */}
        <section>
          <SectionHeading
            eyebrow="What Can You Invest In"
            title="Investment options for Singapore residents"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                type: "ASX Shares & ETFs",
                available: true,
                desc: "Full access to ASX-listed shares, ETFs, and LICs. Use an Australian broker that accepts non-residents (Interactive Brokers recommended).",
                href: "/foreign-investment/shares",
              },
              {
                type: "New Residential Property",
                available: true,
                desc: "Off-the-plan, new dwellings, and vacant land — FIRB approval required. Established dwellings banned until 31 Mar 2027.",
                href: "/foreign-investment/guides/buy-property-australia-foreigner",
              },
              {
                type: "Australian Fixed Income",
                available: true,
                desc: "Australian government bonds, corporate bonds, and term deposits. Interest income subject to 10% withholding tax.",
                href: "/foreign-investment/savings",
              },
              {
                type: "Crypto",
                available: true,
                desc: "Most Australian crypto exchanges accept international users. Subject to Australian CGT rules for non-residents (generally exempt for portfolio holders).",
                href: "/foreign-investment/crypto",
              },
              {
                type: "Established Residential Property",
                available: false,
                desc: "BANNED until 31 March 2027. Singapore residents, like all foreign persons, cannot purchase existing homes.",
                href: "/foreign-investment/guides/property-ban-2025",
              },
              {
                type: "Superannuation",
                available: false,
                desc: "Super is for Australian residents and workers only. Non-residents cannot contribute to or access Australian super.",
                href: "/foreign-investment/super",
              },
            ].map((item) => (
              <Link key={item.type} href={item.href} className={`group block p-4 border rounded-xl transition-all ${item.available ? "border-slate-200 hover:border-amber-300 hover:bg-amber-50/20" : "border-red-100 bg-red-50/30 opacity-80"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {item.available ? (
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={`font-bold text-sm ${item.available ? "text-slate-800 group-hover:text-amber-700" : "text-red-800"}`}>{item.type}</span>
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
              title="ASX brokers that accept Singapore residents"
              sub="These brokers have confirmed they accept non-Australian residents. Verify directly before opening an account."
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
                  {broker.foreign_investor_notes && (
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{broker.foreign_investor_notes}</p>
                  )}
                  {broker.affiliate_url && (
                    <a href={broker.affiliate_url} target="_blank" rel="noopener noreferrer sponsored" className="block w-full text-center px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg text-xs transition-colors">
                      {broker.cta_text || "Open Account"} &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              <Link href="/compare/non-residents" className="text-amber-600 hover:text-amber-700 underline">Compare all brokers that accept non-residents &rarr;</Link>
            </p>
          </section>
        )}

        {/* ── Practical steps ── */}
        <section>
          <SectionHeading
            eyebrow="Getting Started"
            title="How to start investing in Australia from Singapore"
          />
          <div className="space-y-3">
            {[
              { step: 1, title: "Open an ASX brokerage account", desc: "Apply with Interactive Brokers or another non-resident-friendly broker. Process is entirely online — takes 1–3 business days." },
              { step: 2, title: "Open an Australian bank account (optional)", desc: "Useful for receiving dividends and rental income. All Big Four banks accept Singapore residents. Can be opened remotely." },
              { step: 3, title: "Transfer funds via OFX or Wise", desc: "Avoid bank wire fees — use OFX or Wise for SGD→AUD transfers. Typical saving of 1–2% vs bank rates on large amounts." },
              { step: 4, title: "Declare your residency status to your broker", desc: "Provide your Singapore TIN and declare non-resident status. This ensures the correct 15% DTA withholding rate is applied to dividends." },
              { step: 5, title: "For property: engage a buyer's agent + lawyer", desc: "Lodge your FIRB application before signing any contract. Engage a conveyancer with foreign buyer experience." },
              { step: 6, title: "Get cross-border tax advice", desc: "Particularly for property investment — you will need annual Australian tax returns for rental income. A cross-border tax specialist ensures compliance in both countries." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 p-4 border border-slate-200 rounded-xl hover:border-amber-200 transition-colors">
                <div className="shrink-0 w-8 h-8 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center font-extrabold text-sm">{s.step}</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Find an advisor ── */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Find a specialist for Singapore investors</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                Some Australian advisors specialise in Singapore residents and speak Mandarin, Malay, or Tamil.
                Our directory includes cross-border tax accountants, FIRB specialists, and buyer&apos;s agents experienced
                with Singapore clients.
              </p>
            </div>
            <Link href="/advisors" className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find an Advisor &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for Singapore investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Send Money to Australia (FX Comparison)", href: "/foreign-investment/send-money-australia" },
              { title: "Withholding Tax Guide", href: "/foreign-investment/tax" },
              { title: "DTA rates by country", href: `/foreign-investment/from/sg` },
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
