import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Family Home in Aged Care — Exempt Assets & Selling Decisions (${CURRENT_YEAR}) | invest.com.au`,
  description: `The family home in aged care: the 2-year exemption, when to sell, CGT on sale, using proceeds for a RAD, and estate planning. ${UPDATED_LABEL}`,
  openGraph: {
    title: `Family Home in Aged Care (${CURRENT_YEAR}) — What Happens to Your House`,
    description: "Family home aged care treatment: 2-year exemption, spouse staying, when to sell, CGT, RAD funding, and estate implications.",
    url: `${SITE_URL}/aged-care/family-home`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Family Home in Aged Care")}&sub=${encodeURIComponent("2-Year Exemption · CGT · RAD · Estate · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/aged-care/family-home` },
};

const EXEMPTION_SCENARIOS = [
  {
    scenario: "Spouse or partner remains in home",
    status: "Fully exempt — indefinite",
    detail: "The family home is excluded from the aged care assets assessment for as long as your spouse or de facto partner continues to live there. If the spouse later moves to their own residential care, the 2-year exemption begins from that date.",
    planning: "Where possible, keeping a spouse at home preserves the asset exemption. Consider home care packages to support the at-home spouse rather than both moving to residential care simultaneously.",
  },
  {
    scenario: "No one lives in the home",
    status: "2-year exemption from entry",
    detail: "The home is exempt for 2 years from when you enter residential care. After 2 years, the market value of the home is included in your assessed assets — this can significantly increase your means-tested care fee.",
    planning: "Decide whether to sell before or after the 2-year mark. Selling within 2 years: proceeds become assessable assets immediately. Selling after 2 years: home becomes assessable anyway. Timing affects cash flow and fee calculation timing.",
  },
  {
    scenario: "Eligible carer previously lived there",
    status: "Exempt while carer remains in home",
    detail: "A person who has lived in your home for 2+ years providing care (and who has no other suitable home) can keep the exemption active while they remain there.",
    planning: "Rare but important — a carer who qualifies can continue the exemption indefinitely. Document the care relationship carefully — Services Australia assesses eligibility.",
  },
  {
    scenario: "Dependent child lives in home",
    status: "Exempt while dependent child remains",
    detail: "A dependent child (under 25 or permanently disabled) living in the home maintains the exemption.",
    planning: "Adult disabled children who have lived in the family home may qualify — get specialist advice on whether the dependent child exemption applies.",
  },
];

const CGT_RULES = [
  { rule: "Main residence exemption", detail: "If the home was your principal place of residence, no CGT applies on the gain up to the time you moved into aged care. The home retains its CGT-free status." },
  { rule: "6-year absence rule", detail: "If you move into aged care and rent out the home, the main residence exemption continues for up to 6 years. If you sell within 6 years, no CGT. After 6 years, proportional CGT applies on the post-6-year gain." },
  { rule: "Renting while in care (post-6 years)", detail: "After 6 years of renting, CGT applies on the portion of gain after the 6-year mark. The cost base includes the market value at the time the 6-year period expired." },
  { rule: "Not renting — selling later", detail: "If the home is vacant (not rented), the main residence exemption may continue even beyond 6 years, depending on circumstances. ATO guidance is fact-specific." },
];

const FAQS = [
  {
    q: "Should I sell the family home when entering residential aged care?",
    a: "This is one of the most consequential financial decisions in aged care planning. Arguments for selling: (1) proceeds can fund the RAD, reducing DAP fees; (2) a large empty home has maintenance costs; (3) if no exemption applies after 2 years, it becomes an assessed asset anyway. Arguments against selling: (1) the main residence CGT exemption; (2) if a spouse remains there; (3) the possibility of returning home (rare but possible); (4) sentimental/family value. In most cases, the decision depends on: whether a spouse remains at home, the RAD amount needed, and whether the sale proceeds would trigger a significant means-tested fee increase. A CAFA (Certified Aged Care Financial Adviser) should model the timing.",
  },
  {
    q: "What happens if I sell the home and use proceeds to pay the RAD?",
    a: "Selling the home and paying a RAD with the proceeds converts an assessable amount (cash in a bank account) into a partially-exempt asset (the RAD). The RAD itself is not counted in the aged care assets assessment. However: the means-tested care fee may still increase if total remaining assets remain high; and the family home&apos;s original CGT-free status on the gain is preserved (the sale of the main residence is CGT-exempt regardless of whether proceeds go to a RAD or a bank account). Timing the home sale and RAD payment to align with the 2-year assessment window is key planning territory.",
  },
  {
    q: "Can I rent out the family home while in aged care?",
    a: "Yes — renting out the home while in care is permitted. Rental income is assessable for the aged care income test. The main residence CGT exemption continues for up to 6 years under the &apos;absence rule&apos; — if you sell within 6 years and hadn&apos;t occupied it as your home after renting commenced, the gain is still exempt. This is a common strategy: rent the home for 5–6 years, using the rental income to fund care costs, then sell CGT-free. Rental income will affect your means-tested care fee, but may be better than selling immediately and having a large bank balance assessed.",
  },
  {
    q: "What are the estate planning implications?",
    a: "The family home is often the largest asset in an estate. If you sell it to fund care, the proceeds (less fees) pass to your beneficiaries. If you die while still owning it, it passes via your estate under your Will — the main residence CGT exemption may not apply to your beneficiaries (only to you as the original owner). Beneficiaries inherit at market value; any subsequent gain from their date of inheritance is taxable. Estate planning while in aged care should address: who gets the home or proceeds, whether a spouse has right of occupancy, enduring power of attorney for ongoing decisions, and the interaction with any trusts. A solicitor specialising in aged care and estate planning is essential for complex family situations.",
  },
];

export default function AgedCareFamilyHomePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Aged Care", url: `${SITE_URL}/aged-care` },
    { name: "Family Home" },
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
            <span className="text-slate-900 font-medium">Family Home</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Family home in aged care: exemptions, selling decisions &amp; CGT
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            The family home is exempt from the aged care assets assessment for 2 years (or indefinitely
            if a spouse stays). When to sell, whether to rent it, CGT implications, and how to use
            proceeds to fund a RAD — these decisions have a $100,000+ impact on fees and estate.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not tax or legal advice</p>
        </div>
      </section>

      {/* Exemption scenarios */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">When is the home exempt?</h2>
          <div className="space-y-4">
            {EXEMPTION_SCENARIOS.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{item.scenario}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.status.includes("Fully") || item.status.includes("indefinite") ? "bg-emerald-500 text-white" : "bg-amber-400 text-slate-900"}`}>{item.status}</span>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">How it works</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{item.detail}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Planning note</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{item.planning}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CGT rules */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">CGT and the family home in aged care</h2>
          <div className="space-y-3">
            {CGT_RULES.map((item, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="font-bold text-slate-900 mb-1">{item.rule}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">CGT rules for aged care scenarios are complex — always confirm your specific situation with a registered tax agent. The ATO has rulings on various absence-rule scenarios.</p>
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
        heading="Get specialist aged care financial advice"
        subheading="The family home decision affects CGT, Centrelink, estate planning, and the means-tested care fee. A Certified Aged Care Financial Adviser can map out the full financial picture."
        intent={{ need: "aged_care", context: ["family_home", "centrelink", "aged_care_planning"] }}
        source="aged_care_family_home"
        ctaLabel="Find an aged care financial specialist"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/aged-care/means-test", label: "Aged care means test" },
              { href: "/aged-care/rad-vs-dap", label: "RAD vs DAP" },
              { href: "/aged-care/costs", label: "Aged care costs" },
              { href: "/tax/capital-gains", label: "CGT guide" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} CGT rules, aged care means test rules, and exemption criteria change. This page is general information only — it is not tax, legal, or financial advice. Consult a registered tax agent for CGT advice, a solicitor for estate planning, and a Certified Aged Care Financial Adviser (CAFA) for aged care financial planning.
          </p>
        </div>
      </section>
    </div>
  );
}
