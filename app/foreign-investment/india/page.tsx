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
  title: "Investing in Australia from India (2026) — NRI Guide to Tax, Property & Shares",
  description:
    "NRI guide to investing in Australia: India-Australia DTA dividend WHT 15%, FIRB property rules for non-resident Indians, ASX shares, super DASP, and brokers for Indian residents. Updated 2026.",
  openGraph: {
    title: "Investing in Australia from India (2026) — NRI Guide",
    description:
      "India–Australia DTA (15% dividend WHT), FIRB rules for non-resident Indians, ASX shares, stranded super DASP, and broker eligibility.",
    url: `${SITE_URL}/foreign-investment/india`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from India")}&sub=${encodeURIComponent("NRI Guide · DTA · FIRB · ASX Brokers · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/india` },
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

export default async function IndiaInvestingPage() {
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
              { name: "Investing from India" },
            ])
          ),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/india" />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">From India</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">🇮🇳</span>
              <span>India · ECTA 2022 · DTA in force · Updated 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Investing in Australia{" "}
              <span className="text-amber-500">from India</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">NRI Guide: Tax, Property & Shares in 2026</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              India is Australia&apos;s 5th largest source of foreign investment, and the Indian diaspora is
              Australia&apos;s third largest immigrant group. Whether you are an NRI investing from India,
              an Indian-Australian on a temporary visa, or an Australian citizen of Indian origin living
              abroad — the rules are different in each case. This guide covers them all.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Dividend WHT", value: "15%", sub: "Under India-AU DTA" },
                { label: "Interest WHT", value: "15%", sub: "Under India-AU DTA" },
                { label: "Royalties WHT", value: "15%", sub: "Under India-AU DTA" },
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
              Non-resident foreigners (including NRIs who are not Australian citizens or PRs) cannot purchase
              existing Australian homes until at least 31 March 2027. Australian citizens — even if living in India — are exempt.{" "}
              <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full details &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── Three Audiences ── */}
        <section>
          <SectionHeading
            eyebrow="Who Are You?"
            title="NRI, Indian-Australian, or temporary visa holder — the rules differ"
            sub="Your Australian tax residency status determines which rules apply to you."
          />
          <div className="grid sm:grid-cols-3 gap-5">
            <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-blue-800 mb-3 text-sm">🇮🇳 NRI in India (non-resident)</h3>
              <ul className="space-y-2 text-xs text-blue-700">
                <li>• 15% dividend WHT on unfranked ASX dividends</li>
                <li>• FIRB required for all property purchases</li>
                <li>• Established dwelling ban applies</li>
                <li>• No Australian CGT on listed ASX shares</li>
                <li>• Capital gains from AU property taxed in Australia</li>
              </ul>
            </div>
            <div className="border-2 border-amber-200 bg-amber-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-3 text-sm">🇦🇺 Australian Citizen (living in India)</h3>
              <ul className="space-y-2 text-xs text-amber-700">
                <li>• No FIRB required for property (Australian citizen)</li>
                <li>• May lose AU tax residency if living in India long-term</li>
                <li>• Can access Australian super at preservation age</li>
                <li>• CGT discount may be lost if non-resident</li>
                <li>• Australia–India DTA prevents double taxation</li>
              </ul>
            </div>
            <div className="border-2 border-green-200 bg-green-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-green-800 mb-3 text-sm">📋 Temp Visa (457/482 in Australia)</h3>
              <ul className="space-y-2 text-xs text-green-700">
                <li>• Australian tax resident while working in Australia</li>
                <li>• Pay Australian income tax at resident rates</li>
                <li>• Employer contributes to super (SG rate)</li>
                <li>• Can claim DASP (departing super) when leaving</li>
                <li>• Property: resident rules apply while in Australia</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── DTA Rates ── */}
        <section>
          <SectionHeading
            eyebrow="DTA Rates"
            title="India–Australia Double Tax Agreement & ECTA"
            sub="The India-Australia DTA prevents double taxation. The 2022 ECTA also includes investment provisions."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Income type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Without DTA</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">With DTA (Indian residents)</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", note: "Taxed in India with credit for AU WHT" },
                  { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", note: "Franking credits available under DTA" },
                  { type: "Interest", noTreaty: "10%", withTreaty: "15%", note: "Taxed in India with credit for AU WHT" },
                  { type: "Royalties", noTreaty: "30%", withTreaty: "15%", note: "Taxed in India with credit for AU WHT" },
                  { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", note: "Indian tax rules may apply" },
                  { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", note: "Australian CGT applies — no exemption" },
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
              <strong>Franking credits:</strong> Indian residents who receive fully franked dividends can access
              attached franking credits under the DTA — this can effectively reduce or eliminate Australian tax on
              those dividends. Speak to a tax adviser to optimise your franking credit position.
            </p>
          </div>
        </section>

        {/* ── Super DASP ── */}
        <section>
          <SectionHeading
            eyebrow="Superannuation"
            title="Stranded super: DASP for Indians who worked in Australia"
            sub="Many Indians who worked in Australia on temporary visas have superannuation funds they may be able to claim."
          />
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-bold text-amber-800 mb-3">Departing Australia Superannuation Payment (DASP)</h3>
            <ul className="space-y-2 text-sm text-amber-700">
              <li>• If you worked in Australia on a temporary visa (457, 482, WHV) and your employer contributed to super, you may be able to claim your super when you permanently leave Australia.</li>
              <li>• DASP tax rate: 35% on taxable component (higher than usual, but still worth claiming for large balances).</li>
              <li>• Apply directly through the ATO&apos;s DASP online system after departing Australia.</li>
              <li>• You must have departed Australia and have no intention to return as a resident.</li>
              <li>• Working Holiday Makers pay 65% tax on DASP — a higher rate.</li>
            </ul>
            <div className="mt-4">
              <Link href="/foreign-investment/super" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors">
                Learn more about DASP &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ── FIRB Rules ── */}
        <section>
          <SectionHeading
            eyebrow="FIRB Rules"
            title="FIRB property rules for Indian investors"
            sub="FIRB rules depend on your residency status — not your nationality."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                title: "Australian Citizen (in India)",
                label: "No FIRB required",
                colour: "green",
                desc: "Australian citizens — even if living in India — do not need FIRB approval to buy property in Australia. Normal state/territory stamp duty applies.",
              },
              {
                title: "Australian Permanent Resident (in India)",
                label: "No FIRB required",
                colour: "green",
                desc: "Australian permanent residents are treated the same as citizens for FIRB purposes. No FIRB needed for property purchases.",
              },
              {
                title: "NRI / Non-Resident Indian (not PR/citizen)",
                label: "FIRB required",
                colour: "red",
                desc: "Non-resident foreigners must obtain FIRB approval. New dwellings generally approved. Established dwellings banned until 31 March 2027. Foreign buyer stamp duty surcharges apply.",
              },
              {
                title: "Temp Visa Holder in Australia",
                label: "Limited FIRB rights",
                colour: "amber",
                desc: "Temporary residents can buy one established dwelling to live in as their primary residence only (must sell when leaving). New properties available without this restriction.",
              },
            ].map((item) => (
              <div key={item.title} className={`border rounded-xl p-4 ${item.colour === "green" ? "border-green-200 bg-green-50/30" : item.colour === "red" ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/30"}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                  <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${item.colour === "green" ? "bg-green-100 text-green-800" : item.colour === "red" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{item.label}</span>
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
            title="Popular investments for Indian investors in Australia"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: "ASX Shares", ok: true, desc: "Direct access to Australian shares — BHP, CBA, CSL popular. Use IBKR or Saxo as an Indian resident.", href: "/foreign-investment/shares" },
              { type: "Sydney/Melbourne Property", ok: true, desc: "NRIs often target Sydney and Melbourne investment properties. Foreign buyer surcharges apply.", href: "/foreign-investment/property" },
              { type: "Gold & Commodities", ok: true, desc: "ASX-listed gold ETFs (GOLD, PMGOLD) popular with Indian investors. Accessible via international brokers.", href: "/foreign-investment/shares" },
              { type: "Mining Stocks", ok: true, desc: "Australia's resources sector offers exposure to commodities India needs for its industrial growth.", href: "/foreign-investment/shares" },
              { type: "New Residential Property", ok: true, desc: "Off-the-plan available with FIRB. Sydney and Melbourne off-the-plan apartments particularly popular.", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { type: "Established Dwellings", ok: false, desc: "BANNED for non-residents until 31 March 2027. Australian citizens/PRs in India are exempt.", href: "/foreign-investment/guides/property-ban-2025" },
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
              title="ASX brokers that accept Indian residents"
              sub="IBKR and Saxo are the primary options for Indian residents investing in ASX. Verify eligibility directly."
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
            eyebrow="Visa Pathways"
            title="Visa options for Indian investors"
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 mb-2 text-sm">Significant Investor Visa (188C / 888C)</h3>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>• $5M+ in complying investments (venture capital, private equity, managed funds, ASX)</li>
                <li>• Popular with high-net-worth Indian individuals</li>
                <li>• Leads to permanent residence via subclass 888C</li>
                <li>• No minimum residency requirement for most streams</li>
              </ul>
            </div>
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 mb-2 text-sm">Business Innovation & Investment (188/888)</h3>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>• 188A Business Innovation: $800K business turnover, net assets $625K</li>
                <li>• 188B Investor: $1.5M in designated investments for 4 years</li>
                <li>• State/territory nomination required</li>
                <li>• Age limit: under 55 (some state variations)</li>
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/advisors/migration-agents" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find a specialist migration agent &rarr;
            </Link>
          </div>
        </section>

        {/* ── Advisor CTA ── */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Find a specialist advisor for Indian investors</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                India–Australia cross-border tax, FIRB property rules, DASP claims, and investment visas
                each require specialist expertise. An advisor experienced with Indian clients can save you
                significant time and money.
              </p>
            </div>
            <Link href="/advisors/international-tax-specialists" className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find a Tax Specialist &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for Indian investors and NRIs" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Departing Australia Super (DASP)", href: "/foreign-investment/super" },
              { title: "Send Money to Australia (INR to AUD)", href: "/foreign-investment/send-money-australia" },
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
