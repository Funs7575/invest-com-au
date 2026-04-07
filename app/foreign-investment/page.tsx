import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import {
  FOREIGN_INVESTOR_PERSONAS,
  VERTICAL_FOREIGN_RULES,
  TOP_5_RULES_FOR_FOREIGN_INVESTORS,
  DTA_COUNTRIES,
  type ForeignInvestorPersona,
} from "@/lib/foreign-investment-data";
import { getDtaCountries, getDefaultWHT } from "@/lib/fi-data-server";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER, DTA_DISCLAIMER } from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import PersonaSelector from "./PersonaSelector";
import DTASearchTable from "./DTASearchTable";
import ForeignInvestmentNav from "./ForeignInvestmentNav";
import WHTCalculator from "./WHTCalculator";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Investing in Australia from Overseas — Complete Guide 2026",
  description:
    "The complete guide to investing in Australia for non-residents, visa holders, expats and new migrants. Covers shares, crypto, savings, super (DASP), property (FIRB), and tax. Withholding tax rates, DTA treaty table, and per-vertical rules. Updated March 2026.",
  openGraph: {
    title: "Investing in Australia from Overseas — Complete Guide 2026",
    description:
      "Rules for non-residents, visa holders, expats and new migrants across shares, property, savings, super and tax.",
    url: `${SITE_URL}/foreign-investment`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing in Australia from Overseas")}&sub=${encodeURIComponent("Non-Residents · Visa Holders · Expats · Shares · Property · Tax · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment` },
};

export const revalidate = 86400;

const HUB_FAQS = [
  {
    question: "Can foreigners invest in Australia?",
    answer:
      "Yes. Non-residents can invest in Australian shares, crypto, savings accounts, and some property — but specific rules, taxes, and eligibility restrictions apply to each asset class. Key obligations include withholding tax on dividends (30% unfranked, reduced by DTA) and interest (10%), FIRB approval for property, and enhanced KYC for financial accounts.",
  },
  {
    question: "Do non-residents pay tax in Australia?",
    answer:
      "Non-residents pay Australian tax only on income sourced in Australia. Unlike residents, there is no tax-free threshold — tax applies from the first dollar at 30% (up to $135,000) for the 2025–26 year. Withholding tax is deducted automatically on dividends and interest. Non-residents generally do NOT owe Australian CGT on most listed shares, but DO owe CGT on Australian real property.",
  },
  {
    question: "What is the withholding tax rate for foreign investors?",
    answer:
      "Withholding tax rates are: unfranked dividends 30% (or lower under a DTA), fully franked dividends 0% (tax already paid via imputation), interest 10%, royalties 30% (or lower under DTA). Australia has DTAs with 40+ countries that reduce these rates — for example, US residents pay 15% on dividends and UK residents also 15%.",
  },
  {
    question: "What is DASP and how much will I get back?",
    answer:
      "DASP is the Departing Australia Superannuation Payment — the mechanism for temporary visa holders to claim their super when leaving Australia. For most temp visa holders, DASP withholding is 35% on the taxed element. Working Holiday Makers pay 65% across all components. You apply via the ATO's DASP portal after your visa has ceased.",
  },
  {
    question: "Do I need FIRB approval to buy property in Australia?",
    answer:
      "Yes, if you are a non-resident or temporary visa holder. Non-residents can only buy new dwellings, off-the-plan properties, or vacant land for development. From 1 April 2025 to 31 March 2027, the Australian Government has also banned foreign persons — including temporary residents — from purchasing established (existing) dwellings. Exceptions may apply in limited cases. Stamp duty surcharges of 7–8% (depending on state) apply on top of standard stamp duty. FIRB application fees start at $14,100 for properties up to $1 million.",
  },
  {
    question: "Which Australian share brokers accept non-residents?",
    answer:
      "Very few Australian-based retail brokers accept true non-residents (people without an Australian address). Interactive Brokers is the standout exception — available in 200+ countries. Most domestic brokers (CommSec, Stake, Moomoo) require an Australian residential address. Temporary visa holders in Australia can generally open accounts normally.",
  },
  {
    question: "What is a Double Tax Agreement (DTA)?",
    answer:
      "A DTA is a bilateral treaty between Australia and another country that prevents income from being taxed twice. DTAs reduce the Australian withholding tax rate on dividends, interest, and royalties for residents of the treaty country. Australia has DTAs with over 40 countries. If your country has a DTA with Australia, you may pay significantly less withholding tax.",
  },
  {
    question: "Can temporary visa holders in Australia invest normally?",
    answer:
      "It depends on your tax residency status, which is determined by the ATO's residency tests — not automatically assumed for all visa holders. Most temporary workers who live and work in Australia will pass the 'resides' test and be treated as Australian tax residents, allowing them to open brokerage, crypto, and savings accounts as residents. However, working holiday makers (subclass 417 and 462) are generally not Australian tax residents for tax purposes. Always confirm your residency status before assuming resident treatment applies.",
  },
];

const participationColors: Record<string, string> = {
  yes: "bg-green-100 text-green-800",
  mostly: "bg-blue-100 text-blue-800",
  limited: "bg-amber-100 text-amber-800",
  complex: "bg-orange-100 text-orange-800",
};
const participationLabels: Record<string, string> = {
  yes: "Open to all",
  mostly: "Generally open",
  limited: "Restricted",
  complex: "Complex rules",
};

async function getNonResidentBrokers(): Promise<Broker[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("id, name, slug, color, logo_url, cta_text, affiliate_url, rating, accepts_non_residents, foreign_investor_notes, platform_type, status")
      .eq("accepts_non_residents", true)
      .eq("status", "active")
      .order("rating", { ascending: false })
      .limit(8);
    return (data ?? []) as unknown as Broker[];
  } catch {
    return [];
  }
}

export default async function ForeignInvestmentHubPage() {
  const [dtaCountries, defaultWHT, nonResidentBrokers] = await Promise.all([
    getDtaCountries(),
    getDefaultWHT(),
    getNonResidentBrokers(),
  ]);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment Hub" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HUB_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <ForeignInvestmentNav current="/foreign-investment" />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Foreign Investment in Australia</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                Updated March 2026 — All Verticals
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
                Investing in Australia{" "}
                <span className="text-amber-500">from Overseas</span>
              </h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5">
                Rules for non-residents, visa holders, expats and new migrants across
                shares, property, savings, super and tax.
              </p>
              <p className="text-xs text-slate-500 mb-5">Where do you want to start?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                <Link
                  href="/foreign-investment/shares"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I want to buy Australian shares &rarr;
                </Link>
                <Link
                  href="/foreign-investment/property"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I want to buy property &rarr;
                </Link>
                <Link
                  href="/foreign-investment/super"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I&apos;m leaving Australia — super &amp; tax help &rarr;
                </Link>
                <Link
                  href="#find-your-situation"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I&apos;m an expat or new migrant &rarr;
                </Link>
              </div>
              <Link
                href="#find-your-situation"
                className="inline-block px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs text-center transition-colors shadow-lg shadow-amber-500/20"
              >
                See all situations &rarr;
              </Link>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Countries with DTA", value: "40+", sub: "reduced withholding rates" },
                { label: "Dividend WHT (unfranked)", value: "30%", sub: "or less under DTA" },
                { label: "DASP super tax", value: "35–65%", sub: "when leaving Australia" },
                { label: "Property FIRB fee", value: "$14,100", sub: "for properties up to $1M" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xl md:text-2xl font-extrabold text-amber-600">{s.value}</div>
                  <div className="text-[0.65rem] font-bold text-slate-900 mt-0.5">{s.label}</div>
                  <div className="text-[0.6rem] text-slate-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5 Key Rules Strip ───────────────────────────────────────── */}
      <section className="bg-amber-50 border-y border-amber-200 py-6">
        <div className="container-custom">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-4">
            5 things every foreign investor in Australia must know
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {TOP_5_RULES_FOR_FOREIGN_INVESTORS.map((rule) => (
              <div key={rule.number} className="bg-white rounded-xl border border-amber-200 p-4">
                <div className="text-2xl font-black text-amber-300 leading-none mb-1">{rule.number}</div>
                <div className="text-xs font-bold text-slate-900 mb-1">{rule.rule}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{rule.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Persona Selector ────────────────────────────────────────── */}
      <section id="find-your-situation" className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Find your situation"
            title="What best describes you?"
            sub="Select your situation to see the rules, key considerations, and next steps that apply specifically to you."
          />
          <PersonaSelector personas={FOREIGN_INVESTOR_PERSONAS} />
        </div>
      </section>

      {/* ── Platform Recommendations ────────────────────────────────── */}
      {nonResidentBrokers.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="container-custom">
            <SectionHeading
              eyebrow="Platforms for non-residents"
              title="Which platforms accept foreign investors?"
              sub="These platforms have confirmed they accept non-residents or international clients. Always verify current eligibility before applying."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {nonResidentBrokers.map((b) => (
                <div key={b.id} className="bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all p-4 flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: b.color || "#334155" }}>
                      {b.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{b.name}</p>
                      <p className="text-[0.65rem] text-slate-400 capitalize">{b.platform_type?.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  {b.foreign_investor_notes && (
                    <p className="text-xs text-slate-500 leading-relaxed mb-3 flex-1">{b.foreign_investor_notes}</p>
                  )}
                  <div className="mt-auto flex gap-2">
                    {b.affiliate_url && (
                      <Link href={b.affiliate_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg py-2 transition-colors">
                        Visit
                      </Link>
                    )}
                    <Link href={`/broker/${b.slug}`} className="flex-1 text-center text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg py-2 transition-colors">
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/best/foreign-investors" className="text-sm font-bold text-amber-600 hover:text-amber-700">
                Best platforms for non-residents &rarr;
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/best/expat-investors" className="text-sm font-bold text-amber-600 hover:text-amber-700">
                Best platforms for expats &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Vertical Cards ──────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="By investment type"
            title="Foreign investor rules by asset class"
            sub="Click any card to go to the full guide for that asset type."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VERTICAL_FOREIGN_RULES.map((v) => (
              <Link
                key={v.verticalSlug}
                href={v.href}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                    {v.vertical}
                  </h3>
                  <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${participationColors[v.canParticipate]}`}>
                    {participationLabels[v.canParticipate]}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3 flex-1">{v.tagline}</p>
                <div className="border-t border-slate-100 pt-3 mt-auto">
                  <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Key rule</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{v.keyRule}</p>
                </div>
                <div className="mt-3 text-xs font-bold text-amber-600 group-hover:text-amber-700 flex items-center gap-1">
                  Full guide <span>&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── New Investment Verticals (non-financial) ────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Expand your portfolio"
            title="Other ways to invest in Australia"
            sub="Beyond shares and property — explore mining, commercial real estate, farmland, renewable energy, and startups."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "⛏️", title: "Mining & Resources", desc: "Iron ore, lithium, gold & critical minerals. Australia leads global critical mineral production.", href: "/invest/mining" },
              { icon: "🏢", title: "Commercial Property", desc: "Office, industrial, hotels & A-REITs. FIRB threshold $268M for developed commercial land.", href: "/invest/commercial-property" },
              { icon: "🌾", title: "Farmland & Agriculture", desc: "50M+ ha with foreign interests. $15M FIRB threshold. Water rights as a growing asset class.", href: "/invest/farmland" },
              { icon: "⚡", title: "Renewable Energy", desc: "Solar, wind, hydrogen & battery storage. $100B+ investment needed for 82% renewables by 2030.", href: "/invest/renewable-energy" },
              { icon: "🏭", title: "Buy a Business", desc: "SME acquisitions, franchise opportunities & investor visa pathways (188A, 188B, SIV).", href: "/invest/buy-business" },
              { icon: "🚀", title: "Startups & Tech", desc: "Global Talent Visa, ESIC tax concessions, R&D incentives. Sydney & Melbourne top-20 ecosystems.", href: "/invest/startups" },
            ].map((v) => (
              <Link
                key={v.href}
                href={v.href}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all p-5 flex flex-col"
              >
                <div className="text-2xl mb-2">{v.icon}</div>
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 mb-1.5 transition-colors">{v.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed flex-1">{v.desc}</p>
                <div className="mt-3 text-xs font-bold text-amber-600 group-hover:text-amber-700">Full guide →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Country Guides ──────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Country guides"
            title="Investing from your country"
            sub="Tailored guides covering DTA rates, FIRB rules, visa pathways, and local specialists for the most active investor countries."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { code: "US", flag: "🇺🇸", name: "United States", slug: "united-states", note: "FATCA · DTA 1982 · $120B FDI" },
              { code: "GB", flag: "🇬🇧", name: "United Kingdom", slug: "united-kingdom", note: "DTA 1967 · FTA · $80B FDI" },
              { code: "SG", flag: "🇸🇬", name: "Singapore", slug: "singapore", note: "DTA 1969 · FTA · $15B FDI" },
              { code: "JP", flag: "🇯🇵", name: "Japan", slug: "japan", note: "DTA 1969 · FTA · $30B FDI" },
              { code: "IN", flag: "🇮🇳", name: "India", slug: "india", note: "DTA 1991 · ECTA · $5B FDI" },
              { code: "HK", flag: "🇭🇰", name: "Hong Kong", slug: "hong-kong", note: "DTA 2019 · $12B FDI" },
              { code: "AE", flag: "🇦🇪", name: "UAE", slug: "united-arab-emirates", note: "DTA 2022 · $5B FDI" },
              { code: "CN", flag: "🇨🇳", name: "China", slug: "china", note: "DTA 1990 · ChAFTA · $8B FDI" },
              { code: "NZ", flag: "🇳🇿", name: "New Zealand", slug: "new-zealand", note: "Special exemptions · $25B FDI" },
              { code: "MY", flag: "🇲🇾", name: "Malaysia", slug: "malaysia", note: "DTA 1999 · MAFTA · $4B FDI" },
              { code: "KR", flag: "🇰🇷", name: "South Korea", slug: "south-korea", note: "DTA 1982 · KAFTA · $8B FDI" },
              { code: "SA", flag: "🇸🇦", name: "Saudi Arabia", slug: "saudi-arabia", note: "No DTA · $2B FDI" },
            ].map((c) => (
              <Link
                key={c.code}
                href={`/foreign-investment/${c.slug}`}
                className="group bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all p-4 flex items-start gap-3"
              >
                <span className="text-2xl leading-none shrink-0">{c.flag}</span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors">{c.name}</p>
                  <p className="text-[0.65rem] text-slate-400 mt-0.5">{c.note}</p>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/foreign-investment/send-money-australia" className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700">
            Send money to Australia — compare transfer rates →
          </Link>
        </div>
      </section>

      {/* ── Withholding Tax Calculator ───────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <WHTCalculator countries={dtaCountries} defaultRates={defaultWHT} />
        </div>
      </section>

      {/* ── DTA Quick-Reference Table ───────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Tax treaties"
            title="Double Tax Agreement (DTA) withholding rates"
            sub="Indicative Australian withholding tax rates for residents of common treaty countries. Without a DTA, dividends are taxed at 30%, royalties at 30%. This table is illustrative — treaty application depends on income type and individual conditions."
          />
          <DTASearchTable
            countries={dtaCountries}
            defaultRates={defaultWHT}
            dtaDisclaimer={DTA_DISCLAIMER}
          />
          <div className="mt-4">
            <Link href="/foreign-investment/tax" className="text-sm font-bold text-amber-600 hover:text-amber-700">
              See the full tax guide for non-residents &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── By Country ──────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="By country"
            title="Country-specific investment guides"
            sub="See the exact withholding tax rates, DTA status, and platform recommendations for your specific country."
          />
          <div className="flex flex-wrap gap-2 mb-4">
            {DTA_COUNTRIES.slice(0, 20).map((c) => (
              <Link
                key={c.countryCode}
                href={`/foreign-investment/from/${c.countryCode.toLowerCase()}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-xs font-semibold text-slate-700 hover:text-amber-700 rounded-lg transition-colors"
              >
                <span>{c.country}</span>
                {c.hasDTA && <span className="text-[0.6rem] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">DTA</span>}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {DTA_COUNTRIES.slice(20).map((c) => (
              <Link
                key={c.countryCode}
                href={`/foreign-investment/from/${c.countryCode.toLowerCase()}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-xs font-semibold text-slate-700 hover:text-amber-700 rounded-lg transition-colors"
              >
                <span>{c.country}</span>
                {c.hasDTA && <span className="text-[0.6rem] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">DTA</span>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Find an Advisor CTA ─────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white mb-2">
                Get professional advice for your situation
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Foreign investment rules are complex — the right professional advice can save
                thousands in unnecessary tax and prevent costly mistakes. Find a verified
                Australian tax agent who specialises in international clients.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/advisors/tax-agents"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm text-center transition-colors shadow-lg"
              >
                Find a Tax Agent (International)
              </Link>
              <Link
                href="/advisors/financial-planners"
                className="px-6 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-sm text-center transition-colors"
              >
                Find a Financial Planner
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Common questions"
            title="Frequently asked questions"
          />
          <div className="space-y-4">
            {HUB_FAQS.map((faq) => (
              <details key={faq.question} className="group bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3">⌄</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER}</p>
        </div>
      </section>
    </div>
  );
}
