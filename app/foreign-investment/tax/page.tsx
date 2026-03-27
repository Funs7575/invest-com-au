import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import {
  DTA_COUNTRIES,
  NON_RESIDENT_TAX_BRACKETS,
  RESIDENT_TAX_BRACKETS,
  AUSTRALIAN_RESIDENCY_TESTS,
  DEFAULT_WHT,
} from "@/lib/foreign-investment-data";
import {
  WITHHOLDING_TAX_NOTE,
  DTA_DISCLAIMER,
  NON_RESIDENT_TAX_NOTE,
  FOREIGN_INVESTOR_GENERAL_DISCLAIMER,
} from "@/lib/compliance";
import DTASearchTable from "../DTASearchTable";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Australian Tax for Non-Residents & Foreign Investors — 2026 Guide — Invest.com.au",
  description:
    "Complete Australian tax guide for non-residents and foreign investors. Withholding tax rates, Double Tax Agreements (DTA) by country, CGT rules, residency tests, and the key differences vs resident tax rates. Updated March 2026.",
  openGraph: {
    title: "Australian Tax Guide for Non-Residents & Foreign Investors — 2026",
    description:
      "Withholding tax rates by income type and country, DTA treaty table, non-resident vs resident tax rates, CGT rules, and residency tests.",
    url: `${SITE_URL}/foreign-investment/tax`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Australian Tax for Non-Residents")}&sub=${encodeURIComponent("Withholding Tax · DTA Treaties · CGT Rules · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/tax` },
};

export const revalidate = 86400;

const TAX_FAQS = [
  {
    question: "Does a non-resident pay Australian tax?",
    answer:
      "Yes — on income sourced in Australia. Non-residents pay tax on Australian dividends, interest, rental income, and business income. The withholding tax system usually means this tax is deducted at source (automatically by the fund or bank), so there is often no Australian tax return required. However, non-residents do NOT pay Australian tax on most capital gains from listed shares.",
  },
  {
    question: "What is the tax-free threshold for non-residents?",
    answer:
      "There is no tax-free threshold for non-residents. Residents pay 0% on the first $18,200 of income. Non-residents are taxed from the first dollar at 30% (for income up to $135,000 in 2025–26). This makes non-residency tax-disadvantageous for lower-income investors.",
  },
  {
    question: "Do non-residents pay CGT in Australia?",
    answer:
      "Non-residents generally do NOT pay Australian CGT on gains from selling listed Australian company shares — this is known as the Section 855-10 exemption. However, non-residents DO pay Australian CGT on 'taxable Australian property' — primarily Australian real estate and certain other assets. There is also a 15% foreign resident CGT withholding obligation for the buyer on properties sold by foreign residents for over $750,000 (rate increased from 12.5% to 15% from 1 January 2025).",
  },
  {
    question: "What is the Medicare levy for non-residents?",
    answer:
      "Non-residents are exempt from the Medicare levy (2% of taxable income for residents). This partly offsets the loss of the tax-free threshold.",
  },
  {
    question: "Can I claim a refund of withholding tax?",
    answer:
      "Generally no — withholding tax on Australian dividends and interest is a final tax for non-residents. You cannot lodge an Australian return to reclaim it. However, you may be able to claim a foreign tax credit in your home country for Australian withholding tax paid, depending on your home country's tax rules and any DTA.",
  },
  {
    question: "What is taxable Australian property?",
    answer:
      "Taxable Australian property (TAP) is the category of assets where Australian CGT applies to non-residents. The main categories are: (1) Australian real property (land and buildings), (2) interests in 'land-rich' companies where ≥50% of value is Australian property, (3) assets used in carrying on an Australian business, and (4) shares or units where a non-resident holds ≥10% directly or indirectly in a company/trust. Listed portfolio shares (under 10%) are specifically excluded.",
  },
  {
    question: "Do I need to file an Australian tax return as a non-resident?",
    answer:
      "Most non-resident investors with only passive income (dividends, interest) subject to withholding tax do NOT need to file an Australian return — withholding is the final tax. However, if you have Australian rental income, business income, or realised a capital gain on taxable Australian property, you must lodge an Australian tax return. Seek advice from a registered Australian tax agent.",
  },
  {
    question: "When do I become a non-resident for Australian tax purposes?",
    answer:
      "Your tax residency is determined by the ATO's residency tests — primarily the 'resides' test (do you actually live in Australia?), the domicile test, and the 183-day test. For departing Australians, you generally become a non-resident when you leave Australia with no intention to return and have established a permanent home overseas. The transition date is important — it affects the cost base of assets you hold.",
  },
];

const WITHHOLDING_TABLE = [
  {
    incomeType: "Dividends (unfranked)",
    standardRate: "30%",
    withDTA: "Typically 15% (varies by country)",
    notes: "Applied to the unfranked portion of dividends paid to non-residents",
    color: "red",
  },
  {
    incomeType: "Dividends (fully franked)",
    standardRate: "0%",
    withDTA: "0%",
    notes: "Tax already paid via imputation system. Non-residents receive the dividend gross but cannot claim the franking credit refund.",
    color: "green",
  },
  {
    incomeType: "Dividends (partially franked)",
    standardRate: "30% on unfranked portion",
    withDTA: "Typically 15% on unfranked portion",
    notes: "WHT applies only to the unfranked component.",
    color: "amber",
  },
  {
    incomeType: "Interest (bank deposits, bonds)",
    standardRate: "10%",
    withDTA: "Typically 10% (rarely reduced below 10%)",
    notes: "Final withholding tax. No Australian return required for passive interest income only.",
    color: "amber",
  },
  {
    incomeType: "Royalties",
    standardRate: "30%",
    withDTA: "Typically 5–15% (varies significantly)",
    notes: "Covers intellectual property, patents, copyright, software licences.",
    color: "red",
  },
  {
    incomeType: "Rental income",
    standardRate: "Non-resident rates (30%+ no TFT)",
    withDTA: "DTAs rarely reduce rental income WHT",
    notes: "Australian rental income is taxed at non-resident rates. Australian tax return required.",
    color: "orange",
  },
  {
    incomeType: "CGT — Australian real property",
    standardRate: "Non-resident rates + 15% buyer WHT on sale >$750k",
    withDTA: "No CGT exemption for real property",
    notes: "No 50% CGT discount for non-residents. 15% WHT deducted from sale price by buyer's conveyancer (rate increased from 12.5% effective 1 Jan 2025).",
    color: "red",
  },
  {
    incomeType: "CGT — Listed Australian shares (<10% holding)",
    standardRate: "0% (exempt)",
    withDTA: "0%",
    notes: "Section 855-10 exemption: non-residents generally exempt from CGT on portfolio share investments in listed Australian companies.",
    color: "green",
  },
];

const colorMap: Record<string, string> = {
  red: "text-red-700",
  amber: "text-amber-700",
  green: "text-green-700",
  orange: "text-orange-700",
};

export default function ForeignTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: "Tax Guide" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: TAX_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <ForeignInvestmentNav current="/foreign-investment/tax" />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-200">Foreign Investment</Link>
            <span>/</span>
            <span className="text-slate-300">Tax Guide</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              2025–26 Tax Year · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Australian Tax for{" "}
              <span className="text-amber-400">Non-Residents</span>
              <br />& Foreign Investors
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Withholding tax rates by income type, DTA treaty table (40+ countries, illustrative),
              non-resident vs. resident rate comparison, CGT rules, residency tests, and the key
              differences that affect every non-resident investor.
            </p>
          </div>
        </div>
      </section>

      {/* ── Withholding Tax Table ────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Withholding tax"
            title="Withholding tax rates by income type"
            sub="How much Australian tax is deducted from different types of income paid to non-residents."
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Income type</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">No DTA</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-green-700 uppercase tracking-wide">With DTA</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {WITHHOLDING_TABLE.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                    <td className="px-4 py-3 font-bold text-slate-900 text-xs">{row.incomeType}</td>
                    <td className={`px-4 py-3 text-xs font-bold ${colorMap[row.color]}`}>{row.standardRate}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-green-700">{row.withDTA}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 leading-relaxed hidden md:table-cell max-w-[220px]">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400 leading-relaxed">{WITHHOLDING_TAX_NOTE}</p>
        </div>
      </section>

      {/* ── Non-Resident vs Resident Tax Rates ──────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Income tax rates"
            title="Non-resident vs. resident tax rates (2025–26)"
            sub="Non-residents pay tax from the first dollar. Residents get a $18,200 tax-free threshold and are subject to Medicare levy."
          />
          <div className="grid md:grid-cols-2 gap-6">
            {/* Non-resident table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-red-50 border-b border-red-100 px-5 py-3">
                <h3 className="text-sm font-extrabold text-red-900">Non-resident rates</h3>
                <p className="text-xs text-red-700 mt-0.5">No tax-free threshold · No Medicare levy</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {NON_RESIDENT_TAX_BRACKETS.map((b, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3 text-xs text-slate-700">{b.description}</td>
                      <td className="px-5 py-3 text-xs font-bold text-red-700 text-right">{b.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Resident table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-green-50 border-b border-green-100 px-5 py-3">
                <h3 className="text-sm font-extrabold text-green-900">Resident rates</h3>
                <p className="text-xs text-green-700 mt-0.5">Tax-free threshold: $18,200 · Medicare levy: +2%</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {RESIDENT_TAX_BRACKETS.map((b, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3 text-xs text-slate-700">{b.description}</td>
                      <td className={`px-5 py-3 text-xs font-bold text-right ${b.rate === 0 ? "text-green-700" : "text-slate-700"}`}>
                        {b.rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">{NON_RESIDENT_TAX_NOTE}</p>
        </div>
      </section>

      {/* ── Residency Tests ──────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Residency determination"
            title="Australian tax residency tests"
            sub="The ATO applies four tests to determine if you are an Australian tax resident. Pass any one and you are likely a resident."
          />
          <div className="grid sm:grid-cols-2 gap-5">
            {AUSTRALIAN_RESIDENCY_TESTS.map((test) => (
              <div key={test.testName} className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">{test.testName}</h3>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{test.description}</p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-green-800 mb-1">You are a resident if:</p>
                  <p className="text-xs text-green-700 leading-relaxed">{test.youAreResident}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed italic">{test.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DTA Table ────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Tax treaties"
            title="DTA withholding rates by country"
            sub="Australia has DTAs with 40+ countries. This table shows indicative withholding rates for common treaty countries — it is illustrative, not exhaustive. Treaty application depends on income type, conditions, and individual circumstances."
          />
          <DTASearchTable
            countries={DTA_COUNTRIES}
            defaultRates={DEFAULT_WHT}
            dtaDisclaimer={DTA_DISCLAIMER}
          />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-4">
            {TAX_FAQS.map((faq) => (
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

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">Get expert tax advice for non-residents</h2>
            <p className="text-slate-400 text-sm">Find a verified Australian tax agent who specialises in international tax, DTAs, and non-resident obligations.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/advisors/tax-agents" className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap">
              Find a Tax Agent
            </Link>
            <Link href="/foreign-investment" className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap">
              ← Back to Hub
            </Link>
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
