import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import {
  FOREIGN_INVESTOR_PERSONAS,
  VERTICAL_FOREIGN_RULES,
  TOP_5_RULES_FOR_FOREIGN_INVESTORS,
  DTA_COUNTRIES,
  DEFAULT_WHT,
  type ForeignInvestorPersona,
} from "@/lib/foreign-investment-data";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER, DTA_DISCLAIMER } from "@/lib/compliance";
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

export default function ForeignInvestmentHubPage() {
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
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-16">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <span className="text-slate-300">Foreign Investment in Australia</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                Updated March 2026 — All Verticals
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
                Investing in Australia{" "}
                <span className="text-amber-400">from Overseas</span>
              </h1>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-5">
                Rules for non-residents, visa holders, expats and new migrants across
                shares, property, savings, super and tax.
              </p>
              <p className="text-xs text-slate-400 mb-5">Where do you want to start?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                <Link
                  href="/foreign-investment/shares"
                  className="px-4 py-2.5 bg-white/10 hover:bg-amber-500/20 border border-white/20 hover:border-amber-500/40 text-slate-200 hover:text-white font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I want to buy Australian shares &rarr;
                </Link>
                <Link
                  href="/foreign-investment/property"
                  className="px-4 py-2.5 bg-white/10 hover:bg-amber-500/20 border border-white/20 hover:border-amber-500/40 text-slate-200 hover:text-white font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I want to buy property &rarr;
                </Link>
                <Link
                  href="/foreign-investment/super"
                  className="px-4 py-2.5 bg-white/10 hover:bg-amber-500/20 border border-white/20 hover:border-amber-500/40 text-slate-200 hover:text-white font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I&apos;m leaving Australia — super &amp; tax help &rarr;
                </Link>
                <Link
                  href="#find-your-situation"
                  className="px-4 py-2.5 bg-white/10 hover:bg-amber-500/20 border border-white/20 hover:border-amber-500/40 text-slate-200 hover:text-white font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I&apos;m an expat or new migrant &rarr;
                </Link>
              </div>
              <Link
                href="#find-your-situation"
                className="inline-block px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-xs text-center transition-colors shadow-lg shadow-amber-500/20"
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
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="text-xl md:text-2xl font-extrabold text-amber-400">{s.value}</div>
                  <div className="text-[0.65rem] font-bold text-white mt-0.5">{s.label}</div>
                  <div className="text-[0.6rem] text-slate-400 mt-0.5">{s.sub}</div>
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

      {/* ── Withholding Tax Calculator ───────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <WHTCalculator countries={DTA_COUNTRIES} defaultRates={DEFAULT_WHT} />
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
            countries={DTA_COUNTRIES}
            defaultRates={DEFAULT_WHT}
            dtaDisclaimer={DTA_DISCLAIMER}
          />
          <div className="mt-4">
            <Link href="/foreign-investment/tax" className="text-sm font-bold text-amber-600 hover:text-amber-700">
              See the full tax guide for non-residents &rarr;
            </Link>
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
