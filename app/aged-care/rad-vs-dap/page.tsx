import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `RAD vs DAP — Aged Care Accommodation Payments Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `RAD vs DAP for Australian residential aged care: lump sum deposit vs daily fee, tax treatment, Centrelink impact, and hybrid options. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `RAD vs DAP: Aged Care Accommodation Payments (${CURRENT_YEAR})`,
    description: "RAD vs DAP decision for Australian aged care: lump sum vs daily fee, Centrelink impact, tax, and the hybrid option.",
    url: `${SITE_URL}/aged-care/rad-vs-dap`,
    images: [{ url: `/api/og?title=${encodeURIComponent("RAD vs DAP Aged Care")}&sub=${encodeURIComponent("Lump Sum · Daily Fee · Centrelink · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/aged-care/rad-vs-dap` },
};

const COMPARISON = [
  { feature: "What it is", rad: "Lump-sum refundable deposit paid to the facility on entry", dap: "Daily fee calculated as a percentage of the RAD (MPIR × RAD ÷ 365)" },
  { feature: "Refundable?", rad: "Yes — 100% refunded when you leave (or to estate on death)", dap: "No — daily fee is gone, like rent" },
  { feature: "Who pays", rad: "Residents who can afford to pay the lump sum (assets typically $200k+)", dap: "Residents who can&apos;t or won&apos;t pay the RAD upfront" },
  { feature: "Centrelink (assets test)", rad: "RAD is excluded from the assets test — reduces assessable assets by the RAD amount", dap: "No assets test impact — daily fee is an expense" },
  { feature: "Centrelink (income test)", rad: "RAD not counted as income; but deemed income on assets is reduced (since assets used to pay RAD are no longer held)", dap: "DAP is an allowable deduction from aged care means-tested fee calculation" },
  { feature: "Cash flow impact", rad: "Large lump sum required upfront (typically $200k–$600k)", dap: "Ongoing daily expense (2024–25 MPIR: 8.38% p.a. of RAD ÷ 365)" },
  { feature: "Estate planning", rad: "RAD returned to estate — preserves intergenerational wealth", dap: "Erodes estate by the daily fee paid over the care period" },
  { feature: "Facility acceptance risk", rad: "Most facilities prefer RAD (gives them working capital)", dap: "Facilities must accept DAP — you have a legal right to pay DAP-only" },
];

const FAQS = [
  {
    q: "What is the Maximum Permissible Interest Rate (MPIR) and why does it matter?",
    a: "The MPIR is the interest rate used to calculate the DAP from the agreed RAD. For 2024–25, the MPIR is 8.38% p.a. Example: if the agreed RAD for a room is $400,000, the equivalent DAP is $400,000 × 8.38% ÷ 365 = $91.84/day ($33,521/year). If the MPIR rises, the DAP increases — creating interest-rate risk for DAP payers. The MPIR is set quarterly by the Department of Health and Aged Care and has increased significantly from the 2021–22 low of 4.07%, nearly doubling the cost of DAP in just three years.",
  },
  {
    q: "Is it always better to pay the RAD?",
    a: "Not always. The RAD decision depends on: (1) Your actual return on the funds if kept invested — if you can earn 9%+ net on the $400,000, paying DAP (at 8.38% MPIR) leaves you financially ahead; (2) Your Centrelink situation — a large RAD payment reduces assessable assets, potentially restoring or increasing Age Pension entitlements; (3) Your estate planning goals — RAD is refundable; DAP is gone; (4) Your cash flow — can you comfortably fund the DAP from income, or will it erode remaining assets rapidly? For most retirees not earning above the MPIR on their investments (rare in a conservative, balanced portfolio), paying the RAD is financially efficient.",
  },
  {
    q: "What is a combination RAD/DAP payment?",
    a: "You can choose to pay part of the accommodation price as a lump sum (partial RAD) and the remainder as a daily fee (partial DAP). Example: $400,000 RAD — you pay $200,000 lump sum as a partial RAD, and the remaining $200,000 is charged as a DAP of $45.92/day ($200,000 × 8.38% ÷ 365). This hybrid approach is useful if you have some but not all of the RAD available, or if you want to preserve some liquidity while reducing the ongoing daily fee.",
  },
  {
    q: "What happens to the RAD when I leave or die?",
    a: "The RAD must be refunded within 14 days of: (1) you leaving for another aged care facility; (2) death (to the estate); (3) the care arrangement ending for any reason. The refund is the original RAD amount — no interest is paid to you (the facility earns the float on the deposit). If the facility fails or goes into administration, the RAD is an unsecured creditor — this is a real risk for smaller or financially stressed facilities. APRA does not guarantee RAD refunds. Choosing a financially sound, well-run facility is essential when large RADs are involved.",
  },
];

export default function RadVsDapPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Aged Care", url: `${SITE_URL}/aged-care` },
    { name: "RAD vs DAP" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/aged-care" className="hover:text-slate-900">Aged Care</Link><span>/</span>
            <span className="text-slate-900 font-medium">RAD vs DAP</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            RAD vs DAP: aged care accommodation payments explained
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            A Refundable Accommodation Deposit (RAD) is refunded when you leave; a Daily Accommodation
            Payment (DAP) is a daily fee calculated at the MPIR on the RAD amount. Choosing the right
            option affects your Centrelink entitlements, estate, and cash flow significantly.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-6 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { v: "8.38%", l: "2024–25 MPIR (p.a.)" },
              { v: "$400k", l: "Typical metropolitan RAD" },
              { v: "$91.84/day", l: "DAP on $400k RAD" },
              { v: "14 days", l: "RAD refund window on exit" },
            ].map(s => (
              <div key={s.l} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-xl font-extrabold text-slate-900">{s.v}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">RAD vs DAP comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="RAD vs DAP comparison" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Feature</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">RAD (lump sum)</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">DAP (daily fee)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COMPARISON.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.feature}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 leading-relaxed">{row.rad}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 leading-relaxed">{row.dap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Decision framework */}
      <section className="py-8 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <span className="text-2xl shrink-0" aria-hidden>💡</span>
            <div>
              <p className="font-bold text-slate-900 mb-1">The decision framework in 30 seconds</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Pay the RAD if: (a) you can afford it without needing the cash for emergencies; (b) your Age Pension situation benefits from reducing assessable assets; (c) estate return of the RAD matters to your family. Pay DAP if: (a) your investment portfolio reliably earns above the MPIR (8.38%); (b) you need liquidity for other costs (home care ongoing, unexpected medical); (c) the stay is expected to be short. In practice, most financial advisers recommend a combination — pay enough RAD to reduce assets below the means-tested fee threshold, keep the rest invested.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Get matched with an aged care financial specialist"
        subheading="RAD vs DAP affects your Centrelink entitlements, estate, and cash flow. An aged care specialist can model the numbers for your situation."
        intent={{ need: "aged_care", context: ["rad_dap", "aged_care_planning"] }}
        source="aged_care_rad_dap"
        ctaLabel="Find an aged care financial specialist"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/aged-care/costs", label: "Total aged care costs" },
              { href: "/aged-care/means-test", label: "Aged care means test" },
              { href: "/aged-care/centrelink", label: "Centrelink assessment" },
              { href: "/aged-care/family-home", label: "Family home in aged care" },
              { href: "/aged-care", label: "Aged care hub" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} MPIR, means-tested fee thresholds, and aged care rules change frequently. Always verify current rates at health.gov.au/aged-care. This page is general information only; it is not financial, legal, or aged care advice. Consult a licensed aged care financial adviser before making RAD/DAP decisions — the means-tested fee interaction is complex.
          </p>
        </div>
      </section>
    </div>
  );
}
