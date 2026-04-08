import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { DASP_KEY_FACTS, DASP_FAQS } from "@/lib/foreign-investment-data";
import { getDaspRates } from "@/lib/fi-data-server";
import { DASP_WARNING, FOREIGN_INVESTOR_GENERAL_DISCLAIMER } from "@/lib/compliance";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";
import DASPCalculator from "../DASPCalculator";

export const metadata: Metadata = {
  title: "Superannuation for Foreign Workers in Australia — DASP Guide 2026",
  description:
    "Complete guide to superannuation for temporary visa holders in Australia. How the super guarantee works, DASP withholding rates (35% or 65%), how to claim, NZ Trans-Tasman portability, and key mistakes to avoid. Updated March 2026.",
  openGraph: {
    title: "Super & DASP Guide for Foreign Workers — 2026",
    description:
      "Temporary visa holders in Australia earn super — but claiming it when you leave (DASP) costs 35–65% in withholding tax. Here's everything you need to know.",
    url: `${SITE_URL}/foreign-investment/super`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Superannuation for Foreign Workers")}&sub=${encodeURIComponent("DASP Guide · 35–65% Withholding · Claim Your Super · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/super` },
};

export const revalidate = 86400;

const SUPER_SECTIONS = [
  {
    heading: "How super works for temporary visa holders",
    body: `If you work in Australia on a temporary visa — whether that's a 457, 482 Temporary Skill Shortage visa, a student visa, a Working Holiday Maker visa, or any other work-authorised visa — your employer is legally required to pay superannuation on your behalf.

The super guarantee rate for 2025–26 is 11.5% of your ordinary time earnings, paid quarterly into a complying super fund of your choice. This applies to all employees regardless of residency status. If your employer is not paying super, this is wage theft — report it to the ATO or Fair Work Australia.

The key question is: what happens to your super when you leave? That's where DASP comes in.`,
  },
  {
    heading: "The DASP trap: what most people don't know",
    body: `DASP (Departing Australia Superannuation Payment) is the mechanism for temporary visa holders to claim their accumulated super when they leave Australia permanently. It sounds simple — but the withholding tax rates are brutal.

For most temporary visa holders, DASP withholding on the taxed element is 35%. That means on a $20,000 super balance, you receive $13,000. Gone are the days when foreign workers could receive their super with minimal tax deducted.

For Working Holiday Makers (subclass 417 and 462 visas), the rate is even worse: 65% across all components. A $10,000 balance returns just $3,500.

These rates are deliberately high — the Australian Government introduced them specifically to discourage temporary residents from using Australian super as a tax-advantaged savings vehicle. There is no way to reduce them.`,
  },
  {
    heading: "How to claim DASP — step by step",
    body: `Claiming your super via DASP is a relatively straightforward online process, but you must meet the eligibility criteria first.

**Eligibility requirements:**
1. You held a temporary visa (not a permanent resident or citizen)
2. You have permanently departed Australia (or your visa has expired/been cancelled)
3. You are not an Australian or New Zealand citizen

**The process:**
1. Gather your details: tax file number (or reason you don't have one), super fund details (fund ABN, member number, fund phone number), Australian bank account if you have one, overseas bank account details for international payment
2. Apply via the DASP online portal at ato.gov.au/dasp
3. Each super fund processes separately — if you have multiple funds, apply to each
4. AUSTRAC identity checks are performed — allow up to 28 days
5. Payment arrives by EFT to a nominated bank account (Australian or international)

**Pro tip:** Before leaving Australia, locate all your super funds via myGov (linked to the ATO). Consolidate into a single fund while still in Australia to simplify the DASP claim (but check exit fees first).`,
  },
  {
    heading: "New Zealand citizens — the Trans-Tasman alternative",
    body: `New Zealand citizens have a better option than DASP. Under the Trans-Tasman Retirement Savings Portability Scheme, NZ citizens can transfer their Australian super directly to a KiwiSaver fund, rather than taking DASP with its harsh withholding rates.

The transfer is not subject to DASP withholding tax. Instead, the funds sit in your KiwiSaver account and are accessed under normal NZ KiwiSaver rules (primarily at retirement age). This is significantly more tax-efficient than DASP for most NZ citizens with meaningful super balances.

The transfer must be to an eligible KiwiSaver scheme. Contact your Australian super fund and nominated KiwiSaver provider to arrange. The transfer typically takes 30–60 days.`,
  },
  {
    heading: "What if you don't claim DASP?",
    body: `Many temporary visa holders leave Australia without claiming their super — particularly those with small balances or who don't know about DASP. What happens to unclaimed super?

After a period of inactivity (typically 2 years since last contribution), super funds transfer unclaimed accounts to the ATO as "lost super" or "ATO-held super." The balance is preserved indefinitely — the ATO holds it as a custodian until you claim it.

You can still claim it years or decades later via the DASP portal. There is no time limit and the money is not forfeited. The ATO earns interest on ATO-held super at the CPI rate.

The practical message: even if you didn't claim DASP when you left, it's not too late. Log in to myGov or submit a DASP claim at any time.`,
  },
  {
    heading: "Tax treatment in your home country",
    body: `DASP withholding is a final Australian tax — you don't need to lodge an Australian tax return to claim it. However, you may need to declare the DASP payment in your home country's tax return.

How your home country treats Australian super DASP varies significantly:
- Some countries treat it as a pension or retirement payment (potentially exempt or concessionally taxed)
- Others treat it as a lump sum payment (taxed as income)
- Double Tax Agreement provisions may apply to reduce the overall tax burden

Get advice from a tax professional in your home country who understands cross-border retirement savings. The Australian DTA with your country may provide relief — but the specific treatment depends on the treaty's pension article.`,
  },
];

export default async function ForeignSuperPage() {
  const daspRates = await getDaspRates();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: "Superannuation & DASP" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: DASP_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <ForeignInvestmentNav current="/foreign-investment/super" />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Superannuation & DASP</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Temporary Visa Holders · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Superannuation for{" "}
              <span className="text-amber-500">Foreign Workers</span>
              <br />— DASP Guide
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Everything you need to know about super as a temporary visa holder: how the
              super guarantee works, DASP withholding rates (35% to 65%), how to claim your
              super, and how to avoid the most common mistakes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="#how-to-claim"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm text-center transition-colors"
              >
                How to Claim DASP &rarr;
              </Link>
              <Link
                href="/advisors/tax-agents"
                className="px-6 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm text-center transition-colors"
              >
                Find a Tax Agent
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Critical Warning ─────────────────────────────────────────── */}
      <section className="bg-red-50 border-y border-red-200 py-5">
        <div className="container-custom">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-900 mb-1">Important: DASP withholding rates are very high</p>
              <p className="text-xs text-red-800 leading-relaxed">{DASP_WARNING}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DASP Rates Table ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="DASP withholding rates"
            title="How much tax is withheld from DASP?"
            sub="DASP withholding rates by super component type. Most employer contributions fall into the 'taxed element' category."
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Component type</th>
                  <th className="text-center px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">WHT rate</th>
                  <th className="text-center px-5 py-3 text-xs font-bold text-red-600 uppercase tracking-wide">WHM rate</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody>
                {daspRates.map((r, i) => (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                    <td className="px-5 py-4 font-medium text-slate-900 text-xs">{r.componentType}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-sm font-black ${r.withholdingRate === 0 ? "text-green-700" : r.withholdingRate <= 35 ? "text-amber-700" : "text-red-700"}`}>
                        {r.withholdingRate}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {r.withholdingRate > 0 ? (
                        <span className="text-sm font-black text-red-700">65%</span>
                      ) : (
                        <span className="text-sm font-black text-green-700">0%</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 leading-relaxed max-w-xs">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">WHM = Working Holiday Maker (subclass 417 and 462). Their 65% rate applies across ALL components.</p>

          {/* Calculator-style example */}
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Example: Standard temp visa</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Super balance</span><span className="font-bold text-slate-900">$20,000</span></div>
                <div className="flex justify-between"><span className="text-slate-600">DASP tax (35%)</span><span className="font-bold text-red-700">−$7,000</span></div>
                <div className="flex justify-between border-t border-amber-200 pt-1 mt-1"><span className="font-bold text-slate-700">You receive</span><span className="font-bold text-green-700">$13,000</span></div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Example: Working Holiday Maker</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Super balance</span><span className="font-bold text-slate-900">$10,000</span></div>
                <div className="flex justify-between"><span className="text-slate-600">DASP tax (65%)</span><span className="font-bold text-red-700">−$6,500</span></div>
                <div className="flex justify-between border-t border-red-200 pt-1 mt-1"><span className="font-bold text-slate-700">You receive</span><span className="font-bold text-red-700">$3,500</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Facts ────────────────────────────────────────────────── */}
      <section id="how-to-claim" className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="At a glance"
            title="Key facts about DASP"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DASP_KEY_FACTS.map((f) => (
              <div key={f.fact} className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">{f.fact}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{f.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASP Calculator ──────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <DASPCalculator />
        </div>
      </section>

      {/* ── Detailed Sections ────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Complete guide"
            title="Super for temporary visa holders — full detail"
          />
          <div className="space-y-10">
            {SUPER_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3 className="text-base font-extrabold text-slate-900 mb-3">{section.heading}</h3>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {section.body.split("\n\n").map((para, i) => (
                    <p key={i}>{para.replace(/\*\*(.*?)\*\*/g, "$1")}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions about DASP" />
          <div className="space-y-4">
            {DASP_FAQS.map((faq) => (
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
            <h2 className="text-lg font-extrabold text-white mb-1">Need help with your super claim?</h2>
            <p className="text-slate-400 text-sm">A tax agent experienced in international tax can help with DASP, tax returns, and home-country obligations.</p>
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
