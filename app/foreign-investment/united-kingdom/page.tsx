import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER, DTA_DISCLAIMER } from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import RememberCountry from "@/components/foreign-investment/RememberCountry";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Investing in Australia from the UK — Tax, Property, Pensions & Brokers Guide 2026",
  description:
    "Complete guide for UK residents and Australian expats: UK-AU DTA (15% dividend WHT, 5% royalties), FIRB property rules, established dwelling ban, QROPS pension transfer, UK IHT exposure, GBP→AUD transfers, HMRC SA106 reporting and ASX brokers that accept UK residents.",
  openGraph: {
    title: "Investing in Australia from the UK — 2026 Guide",
    description:
      "DTA · FIRB · QROPS · IHT · GBP→AUD · ASX brokers · UK-AU specialists. Updated March 2026.",
    url: `${SITE_URL}/foreign-investment/united-kingdom`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from the UK")}&sub=${encodeURIComponent("DTA · FIRB · QROPS · IHT · GBP→AUD · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/united-kingdom` },
};

export const revalidate = 86400;

// dated-ok — FIRB Foreign Buyer Ban window is fixed by Foreign Acquisitions & Takeovers Amendment 2024; review at expiry (March 2027).
const FIRB_BAN_HEADLINE_UK = "Established Dwelling Ban: Active until 31 March 2027";
// dated-ok — same regulatory window as above.
const FIRB_BAN_DETAIL_UK = "UK residents (and Australian expats in the UK who are non-residents for AU tax) cannot purchase existing Australian homes until at least 31 March 2027. New properties remain available.";

// Sticky table-of-contents anchors. The order here = the order on the page.
const TOC_SECTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "audiences", label: "Two audiences" },
  { id: "property", label: "Property + FIRB" },
  { id: "shares", label: "ASX shares — three paths" },
  { id: "fx", label: "GBP → AUD transfers" },
  { id: "tax", label: "UK tax side (HMRC)" },
  { id: "qrops", label: "UK pension transfer" },
  { id: "iht", label: "UK Inheritance Tax" },
  { id: "expat", label: "Aussie expat in UK" },
  { id: "migration", label: "Permanent move to AU" },
  { id: "minerals", label: "Critical minerals" },
  { id: "brokers", label: "Brokers" },
  { id: "faq", label: "FAQ" },
];

const UK_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Can I buy ASX shares as a UK resident?",
    a: "Yes — through a UK-based broker that offers international markets (Interactive Brokers UK, Saxo UK, IG UK), or by opening an account directly with an Australian broker that accepts non-residents. UK ISAs and SIPPs cannot hold ASX-listed shares directly, but they can hold UK-listed dual-ASX listings such as BHP and Rio Tinto.",
  },
  {
    q: "What withholding tax do UK residents pay on Australian dividends?",
    a: "Under the UK-Australia Double Tax Agreement (effective 2003), unfranked Australian dividends are subject to 15% withholding tax instead of the default 30%. Fully franked dividends carry 0% Australian withholding. Interest is 10%, royalties are 5%. UK residents must still report Australian-sourced income on HMRC Self Assessment SA106, and can claim foreign tax credit relief for Australian withholding paid.",
  },
  {
    q: "Can I transfer my UK pension (SIPP) to an Australian super fund?",
    a: "Only into an Australian super fund on HMRC's Recognised Overseas Pension Schemes (QROPS) list. Most Australian super funds are not on this list because Australian schemes generally allow access before age 55 in some circumstances. If you transfer to a non-QROPS scheme HMRC may treat the move as an unauthorised payment with up to 55% tax. Specialist UK-AU pension advice is essential before transferring.",
  },
  {
    q: "Can I still buy an established Australian home as a UK resident?",
    a: "No, not until 31 March 2027 at the earliest. The Foreign Acquisitions & Takeovers Amendment 2024 banned foreign persons (including UK residents) from purchasing established dwellings between April 2025 and March 2027. New properties (off-the-plan, new dwellings) remain available with FIRB approval.",
  },
  {
    q: "Do I owe UK Inheritance Tax on my Australian assets?",
    a: "If you are UK domiciled (which includes most UK-born and long-term UK residents), HMRC taxes your worldwide estate including Australian property, shares and super — currently at 40% above the £325,000 nil-rate band. Australia has no inheritance tax, so UK domicile creates the entire IHT exposure. The non-domiciled regime, the 7-year rule on lifetime gifts and the deemed-domicile test (15 of last 20 years) all interact with this and need cross-border IHT planning.",
  },
  {
    q: "How do I send money from a UK bank to an Australian broker or property purchase?",
    a: "Use a specialist money transfer service (Wise, OFX, MoneyMatch) rather than a high-street UK bank — they typically save 2–4% on the FX margin, which on a £100k transfer is £2,000–£4,000. Compare live rates at our /foreign-investment/send-money-australia page before transferring.",
  },
  {
    q: "I am an Australian expat living in the UK — can I keep contributing to my Australian super?",
    a: "No. Once you become a UK tax resident, you cannot make personal contributions to Australian super (employer contributions tied to Australian-sourced employment income are still possible but rare). Your existing super is preserved and continues to grow but cannot be accessed until preservation age. On returning to Australia, contributions can resume.",
  },
  {
    q: "What is the AUSFTA / UK-Australia FTA, and does it affect investors?",
    a: "The UK-Australia Free Trade Agreement (in force May 2023) raises the FIRB screening threshold for UK investors in non-sensitive sectors and reduces tariffs. It does not change tax treatment of investment income (DTA still governs that), but it does materially improve direct-investment terms for UK businesses acquiring Australian assets above the screening threshold.",
  },
  {
    q: "Should I hedge GBP/AUD currency exposure on my Australian investments?",
    a: "GBP/AUD has moved by 30%+ in the last decade, and FX risk often dominates equity returns over short horizons. Many UK investors with substantial Australian holdings use AUD-hedged ETFs on the LSE, or hold a portion of their portfolio in GBP to dampen volatility. This is a planning question — the right answer depends on whether you intend to spend the AUD or convert it back to GBP.",
  },
];

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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: UK_FAQ.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: { "@type": "Answer", text: entry.a },
    })),
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <RememberCountry code="uk" />
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
              <span>United Kingdom · DTA effective 2003 · UK-AU FTA in force · Updated March 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Investing in Australia{" "}
              <span className="text-amber-500">from the UK</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">Tax, Property, Pensions &amp; How to Start in 2026</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              The UK-Australia DTA reduces dividend withholding to 15% and royalties to 5%. The UK-Australia
              FTA raises FIRB thresholds for UK direct investment. But the UK side of the trade — HMRC SA106,
              UK Inheritance Tax exposure, QROPS rules on pension transfers, and GBP/AUD timing — is where
              most UK investors trip up. This guide covers both sides.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Dividend WHT", value: "15%", sub: "UK-AU DTA" },
                { label: "Interest WHT", value: "10%", sub: "Standard ATO" },
                { label: "Royalties WHT", value: "5%", sub: "UK-AU DTA" },
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

      {/* ── Sticky table of contents ── */}
      <nav
        aria-label="On-page table of contents"
        className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200"
      >
        <div className="container-custom">
          <div className="flex gap-1 overflow-x-auto py-2 -mx-2 px-2 text-xs">
            {TOC_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="shrink-0 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-700 font-semibold whitespace-nowrap transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Two audiences ── */}
        <section id="audiences" className="scroll-mt-20">
          <SectionHeading
            eyebrow="Two Audiences"
            title="Are you a UK resident or an Australian expat in the UK?"
            sub="The rules differ significantly depending on your tax residency. Skim the side that applies — the rest of the page is structured around both."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-blue-800 mb-3">🇬🇧 UK resident (not Australian)</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• 15% AU dividend WHT on unfranked dividends (DTA)</li>
                <li>• Generally exempt from AU CGT on listed shares</li>
                <li>• FIRB approval required for property; new dwellings only until March 2027</li>
                <li>• UK CGT may apply on disposal of AU property</li>
                <li>• Cannot contribute to AU super; cannot access</li>
                <li>• UK IHT applies to your Australian assets if UK domiciled</li>
                <li>• Report AU income on HMRC Self Assessment SA106; claim foreign tax credit</li>
              </ul>
            </div>
            <div className="border-2 border-amber-200 bg-amber-50/50 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-3">🇦🇺 Australian expat in the UK</h3>
              <ul className="space-y-2 text-sm text-amber-700">
                <li>• Likely UK tax resident — UK taxes worldwide income</li>
                <li>• Lose AU CGT 50% discount and AU tax-free threshold</li>
                <li>• AU-sourced income still taxable in Australia</li>
                <li>• No FIRB needed (AU citizen / PR)</li>
                <li>• AU super preserved; cannot access as non-resident</li>
                <li>• On return to AU: CGT rebasing on UK assets</li>
                <li>• DASP available only for ex-temp-visa holders, not citizens/PR</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Property ── */}
        <section id="property" className="scroll-mt-20 space-y-5">
          <SectionHeading
            eyebrow="Property + FIRB"
            title="Australian property as a UK buyer"
            sub="The 2025–2027 ban changes what's available. New dwellings, off-the-plan and commercial property remain fully open."
          />
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="font-bold text-red-800 text-sm">{FIRB_BAN_HEADLINE_UK}</p>
              <p className="text-sm text-red-700 mt-0.5">
                {FIRB_BAN_DETAIL_UK}{" "}
                <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full details &rarr;</Link>
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "New dwelling / off-the-plan", state: "open", note: "FIRB approval required. UK-AU FTA may raise screening thresholds." },
              { label: "Established home", state: "blocked", note: "Banned for foreign buyers until 31 March 2027." },
              { label: "Commercial property", state: "open", note: "Open to UK buyers with FIRB approval; FTA thresholds apply." },
            ].map((b) => (
              <div key={b.label} className={`p-4 rounded-xl border ${b.state === "open" ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase ${b.state === "open" ? "text-emerald-700" : "text-red-700"}`}>
                    {b.state === "open" ? "Open to UK" : "Blocked until 03/2027"}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900">{b.label}</p>
                <p className="text-xs text-slate-600 mt-1">{b.note}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-2">UK-side reminders</h3>
            <ul className="text-sm text-slate-700 space-y-1.5">
              <li>• <strong>UK CGT</strong> applies on disposal if you remain UK tax resident at sale, even though the property is in Australia. Foreign tax credit relief covers Australian CGT paid.</li>
              <li>• <strong>UK SDLT</strong> (Stamp Duty Land Tax) is not relevant for Australian property — but UK-domiciled buyers pay AU stamp duty plus the foreign-buyer surcharge (which varies by state, typically 7–8%).</li>
              <li>• <strong>UK IHT</strong> (see section below) applies to AU property in your estate if you&apos;re UK-domiciled.</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/invest/commercial-property"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Browse commercial property listings
            </Link>
            <Link
              href="/foreign-investment/guides/buy-property-australia-foreigner"
              className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Buy AU property as a foreigner — full guide
            </Link>
            <Link
              href="/advisors/international-tax-specialists"
              className="inline-flex items-center gap-2 border border-amber-300 hover:bg-amber-50 text-amber-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Speak to a UK-AU property tax specialist &rarr;
            </Link>
          </div>
        </section>

        {/* ── Three paths to ASX shares ── */}
        <section id="shares" className="scroll-mt-20">
          <SectionHeading
            eyebrow="ASX Shares"
            title="Three paths for UK investors to access Australian shares"
            sub="The right path depends on portfolio size, whether you want individual ASX stocks or just market exposure, and whether you're using ISA / SIPP wrappers."
          />
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-2xl p-5 flex flex-col">
              <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700 mb-2">Path 1 — UK-side platforms</p>
              <h3 className="text-base font-bold text-slate-900 mb-2">Use your existing UK broker</h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-3 flex-1">
                Hargreaves Lansdown, AJ Bell, Vanguard UK and Trading 212 don&apos;t offer direct ASX trading,
                but they do hold Australian dual-listings (BHP, Rio Tinto) on the LSE and Australian-themed
                ETFs. This keeps your UK ISA / SIPP wrapper intact — best for small balances.
              </p>
              <ul className="text-xs text-slate-600 space-y-1 mb-3">
                <li>✓ ISA / SIPP-eligible (UK tax shelter preserved)</li>
                <li>✓ No new account needed</li>
                <li>✗ Limited ASX coverage — dual-listings + ETFs only</li>
                <li>✗ No exposure to small/mid-cap ASX</li>
              </ul>
            </div>
            <div className="border-2 border-amber-300 bg-amber-50/30 rounded-2xl p-5 flex flex-col">
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700 mb-2">Path 2 — UK broker, AU access</p>
              <h3 className="text-base font-bold text-slate-900 mb-2">Open an international broker (UK entity)</h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-3 flex-1">
                Interactive Brokers UK, Saxo UK and IG UK are FCA-regulated and let you buy individual
                ASX-listed shares from a UK account. You&apos;re investing as a UK resident with full DTA
                benefits applied, in a UK-regulated wrapper. Most popular path for serious UK investors.
              </p>
              <ul className="text-xs text-slate-600 space-y-1 mb-3">
                <li>✓ Full ASX universe (small / mid / large cap)</li>
                <li>✓ FCA-regulated UK broker</li>
                <li>✓ DTA WHT applied automatically</li>
                <li>✗ Outside ISA / SIPP wrapper (held in GIA)</li>
              </ul>
            </div>
            <div className="border border-slate-200 rounded-2xl p-5 flex flex-col">
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-2">Path 3 — Australian broker direct</p>
              <h3 className="text-base font-bold text-slate-900 mb-2">Open an Australian broker that accepts UK</h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-3 flex-1">
                A handful of Australian brokers accept UK residents directly. You hold AU-domiciled
                investments under CHESS sponsorship, but you&apos;re subject to UK reporting on the
                worldwide income. Useful if you have an Australian bank account already (e.g. Aussie
                expat returning often, or property income).
              </p>
              <ul className="text-xs text-slate-600 space-y-1 mb-3">
                <li>✓ CHESS-sponsored, AU-domiciled</li>
                <li>✓ AUD-denominated; no constant FX hop</li>
                <li>✗ Need an AU bank account to fund</li>
                <li>✗ Still report AU income on HMRC SA106</li>
              </ul>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/compare/non-residents"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Compare brokers that accept UK residents &rarr;
            </Link>
            <Link
              href="/foreign-investment/shares"
              className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              ASX shares for non-residents — guide
            </Link>
          </div>
        </section>

        {/* ── FX ── */}
        <section id="fx" className="scroll-mt-20">
          <SectionHeading
            eyebrow="GBP → AUD"
            title="Sending money from a UK bank to Australia"
            sub="On a £100k transfer, the difference between a high-street bank and a specialist provider is typically £2,000–£4,000. This is usually the highest-cost touchpoint UK investors hit."
          />
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                name: "High-street UK bank (Lloyds, HSBC, Barclays)",
                cost: "2.5–4% margin",
                speed: "1–3 business days",
                note: "Default route; expensive on FX but feels safe. Consider only for ≤£5k transfers where margin matters less.",
                badge: "Avoid for large amounts",
                badgeClass: "bg-red-100 text-red-700",
              },
              {
                name: "Wise / OFX / MoneyMatch",
                cost: "0.4–1% margin",
                speed: "Same day to 2 days",
                note: "Specialist FX providers — significantly tighter spreads, fixed rates available, regulated.",
                badge: "Recommended",
                badgeClass: "bg-emerald-100 text-emerald-700",
              },
              {
                name: "Multi-currency account (Wise, Revolut)",
                cost: "0.3–0.6% margin",
                speed: "Instant balance hold",
                note: "Hold GBP/AUD in one account; convert when timing is favourable. Good for repeated transfers (e.g. property settlement deposits).",
                badge: "For active FX",
                badgeClass: "bg-blue-100 text-blue-700",
              },
            ].map((opt) => (
              <div key={opt.name} className="border border-slate-200 rounded-xl p-4 bg-white">
                <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${opt.badgeClass} mb-2`}>
                  {opt.badge}
                </span>
                <h3 className="font-bold text-sm text-slate-900 mb-1">{opt.name}</h3>
                <p className="text-xs text-slate-500 mb-1"><strong>FX margin:</strong> {opt.cost}</p>
                <p className="text-xs text-slate-500 mb-2"><strong>Speed:</strong> {opt.speed}</p>
                <p className="text-xs text-slate-600">{opt.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Link
              href="/foreign-investment/send-money-australia"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Compare GBP → AUD live rates &rarr;
            </Link>
          </div>
        </section>

        {/* ── DTA + UK tax side ── */}
        <section id="tax" className="scroll-mt-20">
          <SectionHeading
            eyebrow="UK Tax Side"
            title="UK-Australia DTA and how to report Australian income to HMRC"
            sub="Australian withholding is only one half. The UK side is HMRC Self Assessment SA106, foreign tax credit relief, and UK CGT on disposal."
          />
          <div className="overflow-x-auto mb-5">
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
                  { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", ukNote: "Taxed in UK; foreign tax credit for AU WHT (SA106 box 9)" },
                  { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", ukNote: "Subject to UK income tax; AU franking credits not refundable to UK" },
                  { type: "Interest", noTreaty: "10%", withTreaty: "10%", ukNote: "Taxed in UK; FTCR for AU WHT (SA106 box 11)" },
                  { type: "Royalties", noTreaty: "30%", withTreaty: "5%", ukNote: "Significant DTA benefit; FTCR available" },
                  { type: "Capital gains (listed shares)", noTreaty: "0% AU (exempt)", withTreaty: "0% AU (exempt)", ukNote: "UK CGT applies on disposal; no AU CGT on listed shares for non-residents" },
                  { type: "Capital gains (AU property)", noTreaty: "30% AU CGT", withTreaty: "30% AU CGT", ukNote: "Both AU and UK CGT apply; FTCR for AU CGT paid" },
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
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-2">HMRC Self Assessment SA106 — what to file</h3>
            <ul className="text-sm text-slate-700 space-y-1.5">
              <li>• AU dividend income → SA106 Box 6 (or 9 for foreign tax)</li>
              <li>• AU interest → SA106 Box 11</li>
              <li>• AU rental property → SA106 Box 14 onwards (separate columns for income, expenses)</li>
              <li>• AU CGT events → SA108 Capital Gains pages, with FTCR claim referencing SA106</li>
              <li>• Filing deadline: 31 January following the tax year (UK tax year = 6 April — 5 April)</li>
            </ul>
          </div>
          <div className="mt-5">
            <Link
              href="/advisors/international-tax-specialists"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Find a UK-AU cross-border tax accountant &rarr;
            </Link>
          </div>
        </section>

        {/* ── QROPS ── */}
        <section id="qrops" className="scroll-mt-20">
          <SectionHeading
            eyebrow="UK Pension Transfer"
            title="QROPS — transferring a UK pension to Australian super"
            sub="The single biggest cross-border financial decision UK→AU migrants face. Get this wrong and HMRC can tax up to 55% of the transfer."
          />
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-base font-bold text-slate-900 mb-3">When QROPS to Australia makes sense</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• You&apos;ve permanently migrated to Australia and don&apos;t plan to return to the UK</li>
                <li>• Your UK pension is a defined-contribution scheme (SIPP / personal pension), not a final-salary DB scheme (which usually shouldn&apos;t be transferred)</li>
                <li>• You&apos;re aged 55+ (UK access age) so the unauthorised-payment risk is lower</li>
                <li>• You&apos;ve modelled the long-term tax outcome with a UK-AU pension specialist — it isn&apos;t always the right call</li>
              </ul>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-base font-bold text-slate-900 mb-3">QROPS rules to know</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• <strong>Only QROPS-listed AU schemes</strong> qualify. Most retail Australian super funds are not on the HMRC QROPS list because AU rules allow access in some cases before age 55. Specialist self-managed super funds (SMSFs) can be QROPS-registered with bespoke trust deeds.</li>
                <li>• <strong>Overseas Transfer Charge (OTC)</strong> of 25% may apply unless you&apos;re resident in the same country as the receiving scheme, or other exemptions apply.</li>
                <li>• <strong>Age 55 rule</strong> — non-QROPS transfers can be treated as unauthorised, triggering up to 55% HMRC tax.</li>
                <li>• <strong>Reporting window</strong> — the receiving scheme must remain QROPS-listed for 5 years post-transfer or HMRC may unwind treatment.</li>
              </ul>
            </div>
          </div>
          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-sm text-amber-800">
              <strong>Don&apos;t self-direct this.</strong> QROPS is one of a small handful of cross-border
              decisions where DIY is genuinely high-risk — both sides of the trade need specialist input
              (a UK pension transfer specialist + an AU SMSF accountant for the receiving structure).
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/advisors/international-tax-specialists"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Speak to a UK-AU pension specialist &rarr;
            </Link>
            <Link
              href="/foreign-investment/super"
              className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Australian super for non-residents
            </Link>
          </div>
        </section>

        {/* ── UK IHT ── */}
        <section id="iht" className="scroll-mt-20">
          <SectionHeading
            eyebrow="UK Inheritance Tax"
            title="IHT exposure on your Australian assets"
            sub="Australia abolished inheritance tax in 1979. The UK didn't. If you're UK domiciled, HMRC taxes your worldwide estate — including Australian property, shares and super — at up to 40%."
          />
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2">The single biggest UK side-effect</h3>
            <p className="text-sm text-slate-700">
              Most UK-born long-term residents are <strong>UK domiciled</strong>. UK domicile follows you
              even when you live abroad — and it makes your worldwide estate (including AU property,
              ASX shares and Australian super) chargeable to UK IHT at 40% above the £325,000 nil-rate band.
              Australia has no equivalent tax, so this is a UK-side problem only.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">Domicile of origin</p>
              <p className="text-sm text-slate-800">Follows you from birth (typically your father&apos;s domicile). Hard to shed without genuine permanent move + cutting UK ties.</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">Deemed domicile</p>
              <p className="text-sm text-slate-800">UK resident for 15 of last 20 tax years → deemed domicile, even if not domiciled originally. Catches many long-term migrants.</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">7-year rule</p>
              <p className="text-sm text-slate-800">Lifetime gifts taper out of the IHT estate over 7 years. A common planning lever for AU-bound migrants.</p>
            </div>
          </div>
          <div className="mt-5">
            <Link
              href="/advisors/international-tax-specialists"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Speak to a UK IHT planner &rarr;
            </Link>
          </div>
        </section>

        {/* ── Aussie expat in UK ── */}
        <section id="expat" className="scroll-mt-20">
          <SectionHeading
            eyebrow="Australian Expat"
            title="If you're an Australian living in the UK"
            sub="Different rules. UK taxes worldwide income. Your Australian super is preserved but locked. CGT rebasing applies on return."
          />
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-bold text-sm text-slate-900 mb-2">Tax residency</h3>
              <p className="text-xs text-slate-700">Once UK tax resident under SRT (Statutory Residence Test), the UK taxes your worldwide income. AU income still taxed in Australia (foreign-sourced rules apply to AU residency). DTA prevents double taxation.</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-bold text-sm text-slate-900 mb-2">Australian super while away</h3>
              <p className="text-xs text-slate-700">Preserved. Cannot contribute (unless still tied to AU employment). Cannot access until preservation age. Ineligible for DASP if you&apos;re AU citizen / PR — DASP is only for ex-temp-visa holders.</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-bold text-sm text-slate-900 mb-2">Returning home — CGT rebasing</h3>
              <p className="text-xs text-slate-700">Becoming AU tax resident again triggers a deemed acquisition of overseas assets at market value at re-entry. UK gains accrued during your UK period typically aren&apos;t AU-taxable, but plan disposals carefully around the move.</p>
            </div>
          </div>
        </section>

        {/* ── Migration ── */}
        <section id="migration" className="scroll-mt-20">
          <SectionHeading
            eyebrow="Permanent move"
            title="Moving permanently to Australia from the UK"
            sub="If your goal is permanent migration, most of the cross-border tax problems above resolve themselves. The visa pathway determines timing and which tax-side issues bite."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { name: "Skilled Independent (189) / Skilled Nominated (190)", note: "Points-tested skilled migration. UK passport-holders are common applicants in shortage occupations (medicine, engineering, trades)." },
              { name: "Employer Sponsored (482 → 186)", note: "Temporary skilled visa converting to PR. Employer sponsors; 2–4 year pathway." },
              { name: "Parent visa (143 contributory / 173 temporary)", note: "Common pathway for retiring UK parents joining AU-resident adult children. Long processing times." },
              { name: "Investor / Business Innovation (188)", note: "For HNW UK investors deploying capital into AU. Coordinates with FIRB and SIV-aligned structures." },
            ].map((v) => (
              <div key={v.name} className="border border-slate-200 rounded-xl p-4">
                <p className="font-bold text-sm text-slate-900 mb-1">{v.name}</p>
                <p className="text-xs text-slate-600">{v.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Link
              href="/advisors/migration-agents"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Find a UK-AU migration specialist &rarr;
            </Link>
          </div>
        </section>

        {/* ── Critical Minerals ── */}
        <section id="minerals" className="scroll-mt-20">
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/40 border border-emerald-200 rounded-2xl p-6">
            <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-3">2026 Opportunity — UK angle</p>
            <h3 className="text-lg font-bold text-slate-900 mb-3">UK demand for Australian critical minerals</h3>
            <p className="text-sm text-emerald-800 leading-relaxed mb-4">
              The UK-Australia FTA (in force 2023) eliminated tariffs on Australian mineral exports. UK
              defence procurement and clean-energy manufacturing both drive structural demand for
              Australian lithium, rare earths, cobalt and nickel. Investment-side: the FTA raises FIRB
              screening thresholds for UK direct investment in non-sensitive Australian assets (currently
              A$1.339B for non-sensitive sectors), making UK-side mining acquisitions materially easier
              than for non-FTA countries.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/invest/mining/listings" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors">
                Browse mining opportunities
              </Link>
              <Link href="/article/australias-critical-minerals-boom-how-to-invest" className="inline-flex items-center gap-2 border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors">
                Read the full guide
              </Link>
            </div>
          </div>
        </section>

        {/* ── Brokers ── */}
        {brokers.length > 0 && (
          <section id="brokers" className="scroll-mt-20">
            <SectionHeading
              eyebrow="Brokers"
              title="ASX brokers that accept UK residents"
              sub="Verify eligibility and current account-opening conditions directly with each broker before applying."
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

        {/* ── FAQ ── */}
        <section id="faq" className="scroll-mt-20">
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently asked — UK investors in Australia"
            sub="Schema-marked for search visibility. If your question isn't here, the advisor CTA below routes to a UK-AU specialist."
          />
          <div className="space-y-3">
            {UK_FAQ.map((entry) => (
              <details key={entry.q} className="group border border-slate-200 rounded-xl bg-white">
                <summary className="cursor-pointer px-5 py-4 font-bold text-sm text-slate-900 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <span>{entry.q}</span>
                  <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{entry.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Advisor anchor CTA ── */}
        <section className="bg-slate-900 text-white rounded-2xl p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="max-w-xl">
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-2">Cross-border specialist</p>
              <h2 className="text-xl md:text-2xl font-bold mb-2">Get the UK-AU bit right</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                The Australian side is usually straightforward. The UK side — HMRC reporting, IHT exposure,
                QROPS rules, CGT on return — is where most UK investors get hurt. A cross-border specialist
                who handles both UK and Australian tax in the same conversation is worth the fee.
              </p>
            </div>
            <Link href="/advisors/international-tax-specialists" className="shrink-0 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
              Find a UK-AU specialist &rarr;
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
              { title: "Australian super for non-residents", href: "/foreign-investment/super" },
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
