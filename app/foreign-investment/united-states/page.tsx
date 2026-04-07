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
  title: "Americans Investing in Australia (2026) — FIRB, Tax & US Person Rules — Invest.com.au",
  description:
    "US citizens investing in Australia: FBAR/FATCA obligations, PFIC rules for Australian funds, US-AU DTA (15% dividend WHT), AUSFTA thresholds, IBKR for US persons, and super complexity. Updated 2026.",
  openGraph: {
    title: "Americans Investing in Australia (2026) — FIRB, Tax & US Person Rules",
    description:
      "US persons face the most complex foreign investor situation in Australia — FBAR, FATCA, PFIC, AUSFTA, and global tax filing. Full 2026 guide for American investors.",
    url: `${SITE_URL}/foreign-investment/united-states`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Americans Investing in Australia")}&sub=${encodeURIComponent("FBAR · FATCA · PFIC · FIRB · AUSFTA · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/united-states` },
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

export default async function USAInvestingPage() {
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
              { name: "Americans Investing in Australia" },
            ])
          ),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/united-states" />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">From the United States</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">🇺🇸</span>
              <span>United States · AUSFTA · US-AU DTA · Most Complex Rules · 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Americans Investing{" "}
              <span className="text-amber-500">in Australia</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">FBAR, FATCA, PFIC & FIRB Rules for 2026</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              US citizens and green card holders face the most complex foreign investor situation of any
              nationality. The United States taxes its citizens on <strong className="text-slate-900">worldwide income</strong> — meaning
              your Australian investments have US tax implications regardless of where you live. FBAR, FATCA,
              and the PFIC rules for Australian managed funds create a uniquely challenging environment.
              A US-qualified international tax advisor is strongly recommended.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Dividend WHT", value: "15%", sub: "Under US-AU DTA" },
                { label: "Interest WHT", value: "10%", sub: "Under US-AU DTA" },
                { label: "Royalties WHT", value: "5%", sub: "Under US-AU DTA" },
                { label: "FBAR threshold", value: "$10K", sub: "FinCEN 114 filing" },
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

        {/* ── Critical Warning ── */}
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="font-bold text-red-800">Critical: US Citizens Must File US Taxes on Global Income</p>
              <p className="text-sm text-red-700 mt-1 leading-relaxed">
                Unlike almost every other country, the United States taxes its citizens and green card holders on
                their <strong>worldwide income</strong> — regardless of where they live. If you are a US citizen
                or green card holder investing in Australia, you must report your Australian income, gains, and
                account balances to the IRS and FinCEN. Penalties for non-compliance can be severe. Strongly
                recommend engaging a <strong>US-qualified CPA with international tax experience</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* ── Established Dwelling Ban ── */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="font-bold text-red-800 text-sm">Established Dwelling Ban: Active until 31 March 2027</p>
            <p className="text-sm text-red-700 mt-0.5">
              US residents who are non-residents of Australia cannot purchase existing Australian homes until
              at least 31 March 2027. New properties remain available.{" "}
              <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full details &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── Two Audiences ── */}
        <section>
          <SectionHeading
            eyebrow="Who Are You?"
            title="US investor in America, or American expat in Australia?"
            sub="Both situations carry US worldwide tax obligations — but Australian rules differ."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-blue-800 mb-3">🇺🇸 US Resident investing in Australia from the US</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• 15% Australian dividend WHT applies (under DTA)</li>
                <li>• Report Australian income on US Form 1040</li>
                <li>• FBAR required if AU accounts exceed $10K at any point</li>
                <li>• FATCA Form 8938 may be required</li>
                <li>• Australian ETFs and managed funds may be PFICs (complex US treatment)</li>
                <li>• FIRB required for property; AUSFTA gives higher thresholds for business</li>
              </ul>
            </div>
            <div className="border-2 border-amber-200 bg-amber-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-3">🇦🇺 American Expat living in Australia</h3>
              <ul className="space-y-2 text-sm text-amber-700">
                <li>• Australian tax resident — pay Australian income tax</li>
                <li>• Still must file US taxes annually (worldwide income)</li>
                <li>• Foreign Earned Income Exclusion (FEIE) may reduce US liability</li>
                <li>• Australian super: complex US treatment — not directly equivalent to 401k</li>
                <li>• No FIRB needed for property while an Australian tax resident</li>
                <li>• Consider Foreign Tax Credit to avoid double taxation</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── FBAR & FATCA ── */}
        <section>
          <SectionHeading
            eyebrow="US Reporting Obligations"
            title="FBAR, FATCA, and US reporting for Australian accounts"
            sub="US persons with Australian financial accounts have significant US reporting obligations."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">FBAR — FinCEN Form 114</h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>• Required if your Australian financial accounts (bank, brokerage, super) have an aggregate balance exceeding $10,000 USD at any point during the calendar year</li>
                <li>• File electronically via FinCEN BSA E-Filing System by April 15 (automatic extension to Oct 15)</li>
                <li>• Penalties: Up to $10,000 per violation (non-willful); up to $100,000+ or 50% of account value for willful violations</li>
                <li>• Australian superannuation: FBAR reporting required for AU super accounts</li>
              </ul>
            </div>
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">FATCA — Form 8938 & Australian compliance</h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>• IRS Form 8938: Required if foreign financial assets exceed $50K (single/MFS) or $100K (MFJ) at year-end</li>
                <li>• Australia-US FATCA IGA: Australian financial institutions automatically report US account holders to the ATO, who shares with IRS</li>
                <li>• Result: IRS may already have data on your Australian accounts before you file</li>
                <li>• Affects why some Australian brokers/banks may ask for US citizenship/green card status</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── PFIC Rules ── */}
        <section>
          <SectionHeading
            eyebrow="PFIC Warning"
            title="Australian ETFs and managed funds: PFIC rules for US investors"
            sub="This is one of the most significant tax traps for US persons investing in Australian markets."
          />
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <h3 className="font-bold text-red-800 mb-3">What is a PFIC and why does it matter?</h3>
            <ul className="space-y-3 text-sm text-red-700">
              <li>• <strong>PFIC definition:</strong> A Passive Foreign Investment Company is a non-US corporation where 75%+ of income is passive OR 50%+ of assets produce passive income. Most Australian managed funds and ETFs qualify as PFICs.</li>
              <li>• <strong>Tax treatment:</strong> Without a QEF (Qualified Electing Fund) election, PFIC gains are taxed at the highest ordinary income rate (currently 37%) plus interest charges — significantly worse than capital gains treatment.</li>
              <li>• <strong>Common PFIC traps:</strong> Vanguard Australia ETFs (e.g., VAS), iShares Australia ETFs, Betashares ETFs, and most Australian managed funds are PFICs for US tax purposes.</li>
              <li>• <strong>What to do:</strong> US persons investing in ASX should generally use individual stocks (not ETFs/managed funds) or US-listed ETFs that provide ASX exposure (e.g., EWA — iShares MSCI Australia ETF listed on NYSE).</li>
              <li>• <strong>Annual reporting:</strong> Each PFIC requires Form 8621 filed with your US return — adding significant compliance cost.</li>
            </ul>
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>Recommendation for US investors:</strong> Consider investing in individual ASX stocks rather than
              Australian ETFs or managed funds to avoid PFIC complexity. Alternatively, use US-listed ETFs with
              Australian exposure (such as EWA) which are not PFICs.
            </p>
          </div>
        </section>

        {/* ── DTA Rates ── */}
        <section>
          <SectionHeading
            eyebrow="DTA Rates"
            title="US–Australia Double Tax Agreement rates"
            sub="The US-Australia DTA reduces withholding on Australian income for US residents. But US persons still report global income."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Income type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Without DTA</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">With DTA (US residents)</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">US tax treatment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", note: "Also taxed in US — Foreign Tax Credit offsets AU WHT" },
                  { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", note: "Franking credits have limited benefit for US persons" },
                  { type: "Interest", noTreaty: "10%", withTreaty: "10%", note: "Also taxed in US — Foreign Tax Credit may apply" },
                  { type: "Royalties", noTreaty: "30%", withTreaty: "5%", note: "Significant DTA benefit — but US tax still applies" },
                  { type: "Capital gains (listed shares)", noTreaty: "0% (exempt AU)", withTreaty: "0% (exempt AU)", note: "IRS taxes US persons on AU share gains — DTA article 13" },
                  { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", note: "Both US and AU may tax — Foreign Tax Credit used to offset" },
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

        {/* ── AUSFTA and FIRB ── */}
        <section>
          <SectionHeading
            eyebrow="AUSFTA & FIRB"
            title="Australia-US Free Trade Agreement investment rules"
            sub="AUSFTA (2005) gives US investors higher FIRB screening thresholds for private business investment."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { title: "Private Business Investment", threshold: "$1.194B", desc: "Under AUSFTA, US investors get a higher threshold ($1.194B indexed) for private business acquisitions — significantly above the general $310M threshold." },
              { title: "Agricultural Land", threshold: "$15M", desc: "AUSFTA does not increase the agricultural land threshold. The standard $15M cumulative threshold applies to US investors." },
              { title: "New Residential Property", threshold: "All purchases", desc: "AUSFTA does not exempt US investors from FIRB for residential property. All non-resident residential purchases require FIRB." },
              { title: "Established Dwellings", threshold: "BANNED", desc: "The established dwelling ban (2025-2027) applies to US investors despite AUSFTA. New dwellings available with FIRB." },
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
        </section>

        {/* ── Investment Options ── */}
        <section>
          <SectionHeading
            eyebrow="Investment Options"
            title="What US investors can access in Australia"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: "Individual ASX Stocks", ok: true, desc: "Direct ASX shares are not PFICs. Best approach for US persons wanting Australian equities exposure. IBKR is the primary broker.", href: "/foreign-investment/shares" },
              { type: "US-Listed AU ETFs (e.g. EWA)", ok: true, desc: "iShares MSCI Australia ETF (EWA on NYSE) provides ASX exposure without PFIC issues. Not subject to AU PFIC rules.", href: "/foreign-investment/shares" },
              { type: "New Australian Property", ok: true, desc: "New dwellings available with FIRB. Australian property gains taxable in both AU and US (Foreign Tax Credit applies).", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { type: "Australian ETFs (ASX-listed)", ok: false, desc: "PFIC TRAP — Australian-listed ETFs (VAS, NDQ, etc.) are PFICs for US persons. Avoid unless prepared for complex Form 8621 filings.", href: "/foreign-investment/shares" },
              { type: "Australian Managed Funds", ok: false, desc: "PFIC TRAP — Most Australian managed funds are PFICs. The unfavourable PFIC tax regime makes these unsuitable for US persons.", href: "/foreign-investment/shares" },
              { type: "Australian Superannuation", ok: false, desc: "Complex — AU super not directly equivalent to US 401k or IRA. Contributions and earnings may not be tax-deferred under US rules. Specialised advice essential.", href: "/foreign-investment/super" },
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
              title="ASX brokers that accept US persons"
              sub="Interactive Brokers (IBKR) is the primary option for US persons investing in ASX due to FATCA compliance. Most Australian retail brokers do not accept US persons."
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
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-amber-900 mb-2">US persons: get a specialist cross-border advisor</h2>
              <p className="text-sm text-amber-800 leading-relaxed max-w-xl">
                Investing in Australia as a US citizen or green card holder involves some of the most complex
                cross-border tax rules in the world — FBAR, FATCA, PFIC, Foreign Tax Credits, and super treatment.
                We strongly recommend a CPA or tax attorney with specific US-Australia cross-border expertise.
              </p>
            </div>
            <Link href="/advisors/international-tax-specialists" className="shrink-0 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors">
              Find a US-AU Tax Specialist &rarr;
            </Link>
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for American investors in Australia" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "Send Money to Australia (USD to AUD)", href: "/foreign-investment/send-money-australia" },
              { title: "Australian Super Guide for Expats", href: "/foreign-investment/super" },
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
