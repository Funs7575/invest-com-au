import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Reverse Mortgages in Australia — How They Work & Risks (${CURRENT_YEAR}) | invest.com.au`,
  description: `Australian reverse mortgages: compound interest, NNEG, Home Equity Access Scheme alternative, and Centrelink treatment. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Reverse Mortgages Australia (${CURRENT_YEAR}) — Risks & Alternatives`,
    description: "Reverse mortgages: compounding interest risk, NNEG, Home Equity Access Scheme, aged care cost interaction, and estate planning considerations.",
    url: `${SITE_URL}/retirement/reverse-mortgage`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Reverse Mortgages Australia")}&sub=${encodeURIComponent("NNEG · HEAS · Compounding · Estate · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/retirement/reverse-mortgage` },
};

const KEY_TERMS = [
  { term: "Reverse mortgage", def: "A loan secured against your home equity, repayable when you sell, move to aged care, or die. No repayments during the loan — interest compounds onto the loan balance." },
  { term: "NNEG (No Negative Equity Guarantee)", def: "Statutory protection under the National Consumer Credit Protection Act: you cannot owe more than the value of your property at the time of sale — the lender absorbs the difference if compounding interest exceeds property value." },
  { term: "Home Equity Access Scheme (HEAS)", def: "Government alternative: fortnightly payments from Services Australia, secured against your home, at a lower interest rate (~3.95% p.a. 2024) vs private lenders (7–9%). Maximum loan: 150% of Age Pension rate." },
  { term: "LVR cap", def: "Maximum Loan-to-Valuation Ratio varies by age: typically 15% at age 60, increasing 1% per year to maximum ~45% by age 90. Designed to leave equity buffer for compounding interest." },
  { term: "Protected equity option", def: "Some reverse mortgage products allow you to nominate a percentage of home equity to protect from the loan (e.g. &apos;protect 30% for estate&apos;) — reduces available loan amount but guarantees inheritance." },
];

const RISKS = [
  { risk: "Compounding interest erosion", detail: "At 8% p.a., a $100,000 loan doubles in 9 years. A $300,000 reverse mortgage at 8% on a $900,000 home leaves only $300,000 equity after 15 years (ignoring property growth). Property appreciation may offset this but isn't guaranteed." },
  { risk: "Aged care cost impact", detail: "When you enter residential aged care, the reverse mortgage is typically repaid from the home sale proceeds. If the loan has grown significantly, you may have insufficient equity to fund your Refundable Accommodation Deposit (RAD), forcing a DAP (daily fee) arrangement at higher ongoing cost." },
  { risk: "Estate depletion", detail: "The compounding nature means the estate receives significantly less than the home's value. At aged 70 with $200k loan at 8%, the balance is ~$950k by age 90 — your estate receives nothing from the home if it sells for less than that." },
  { risk: "Interest rate risk", detail: "Most reverse mortgages have variable interest rates. Rate increases compound the erosion. The NNEG protects against negative equity but doesn't stop interest from consuming equity." },
];

const FAQS = [
  {
    q: "What is the Home Equity Access Scheme and how does it differ from a reverse mortgage?",
    a: "The Home Equity Access Scheme (HEAS), formerly the Pension Loans Scheme, is a government-run reverse mortgage from Services Australia. Key differences: (1) Interest rate: HEAS charges a compound rate of ~3.95% p.a. (2024), while private reverse mortgages charge 7–9%; (2) Payment form: HEAS pays a fortnightly supplement (up to 150% of Age Pension rate), not a lump sum; (3) No upfront fees; (4) Available to homeowners who meet Age Pension age and residency requirements, even if they don&apos;t receive the Age Pension. The HEAS is generally preferable to private reverse mortgages for retirees who need income supplementation — the lower interest rate significantly reduces long-term equity erosion.",
  },
  {
    q: "How does a reverse mortgage affect Centrelink Age Pension?",
    a: "The loan proceeds from a reverse mortgage are not assessable as income or assets if you spend them within the relevant assessment period (12 months for income test, immediate for assets test — the ATO considers the loan a liability offset). However: (1) If you invest the proceeds in assessable assets (shares, managed funds), those assets are counted; (2) HEAS fortnightly payments reduce your Age Pension by the amount received above the regular pension rate. The net effect varies significantly by situation. Always check with Services Australia before entering a reverse mortgage — the interaction with your current entitlements may be material.",
  },
  {
    q: "Can I still get a reverse mortgage if I have an existing mortgage?",
    a: "Generally yes, provided the existing mortgage is paid off first using a portion of the reverse mortgage funds. Most reverse mortgage providers require their loan to be a first mortgage. The remaining equity after repaying the existing mortgage determines the net funds available. Given the compounding nature of reverse mortgages, using them to replace a standard mortgage (which you&apos;re paying down) with a reverse mortgage (which grows) is usually financially disadvantageous unless you have significant income constraints.",
  },
  {
    q: "What alternatives to a reverse mortgage exist?",
    a: "Before taking a reverse mortgage, consider: (1) Home Equity Access Scheme (HEAS): government scheme, lower interest rate, fortnightly income; (2) Downsizing: sell your large home, buy a smaller property, and invest the difference — provides liquid capital without interest costs; (3) Downsizer super contributions: if you sell a home you&apos;ve owned 10+ years, you can contribute up to $300,000 ($600,000 for couples) to super post-age-55; (4) Part-time work under the Work Bonus scheme; (5) Reducing non-essential expenses; (6) Family arrangement for home equity release (with proper legal documentation). Each has different tax, Centrelink, and estate implications.",
  },
];

export default function ReverseMortgagePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Reverse Mortgage" },
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
            <Link href="/retirement" className="hover:text-slate-900">Retirement</Link><span>/</span>
            <span className="text-slate-900 font-medium">Reverse Mortgage</span>
          </nav>
          <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            ⚠️ Credit product — not financial or legal advice · See a licensed mortgage broker
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Reverse mortgages in Australia: how they work, risks &amp; alternatives
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            A reverse mortgage lets you borrow against your home without making repayments — but interest
            compounds, eroding your equity over time. The government&apos;s Home Equity Access Scheme (HEAS)
            offers a significantly lower rate alternative. Here&apos;s what to know before signing anything.
          </p>
          <p className="text-xs text-slate-500">{UPDATED_LABEL} · General information only · This page does not constitute credit advice</p>
        </div>
      </section>

      {/* Key terms */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Key concepts</h2>
          <div className="space-y-3">
            {KEY_TERMS.map((item, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="font-bold text-slate-900 mb-1">{item.term}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.def}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk cards */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Key risks to understand</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {RISKS.map((item, i) => (
              <div key={i} className="rounded-xl border border-red-200 bg-red-50 p-5">
                <p className="font-bold text-red-900 mb-2">{item.risk}</p>
                <p className="text-sm text-red-800 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HEAS callout */}
      <section className="py-8 border-b border-slate-100 bg-emerald-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <span className="text-2xl shrink-0" aria-hidden>💡</span>
            <div>
              <p className="font-bold text-slate-900 mb-1">Check the Home Equity Access Scheme first (HEAS)</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                The HEAS charges ~3.95% p.a. compound vs 7–9% for private reverse mortgages. On a $200,000 loan over 10 years, the difference in interest is approximately $100,000–$160,000 in additional equity erosion with a private lender. If you need fortnightly income supplementation (up to 150% of Age Pension rate), the HEAS is almost always preferable. Apply at servicesaustralia.gov.au/heas or through a Services Australia financial information service officer.
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
                  <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Get independent advice before a reverse mortgage"
        subheading="Reverse mortgages are irreversible and compound over time. A licensed financial adviser can model the equity erosion, Centrelink impact, and whether HEAS or downsizing is a better option."
        intent={{ need: "retirement", context: ["reverse_mortgage", "retirement_income"] }}
        source="retirement_reverse_mortgage"
        ctaLabel="Find a retirement financial planner"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/retirement/how-much-do-you-need", label: "How much do I need?" },
              { href: "/retirement/age-pension", label: "Age pension guide" },
              { href: "/aged-care/costs", label: "Aged care costs" },
              { href: "/home-loans", label: "Home loans hub" },
              { href: "/retirement", label: "Retirement hub" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Reverse mortgages are credit products regulated under the National Consumer Credit Protection Act 2009 (NCCP). This page is general information only — it is not credit advice, not credit assistance, and not legal advice. Interest rates quoted are indicative and change. Before entering any reverse mortgage arrangement, obtain a credit guide from a licensed credit representative or ACL-holder, and consult a licensed financial adviser and solicitor. The HEAS rate should be verified at servicesaustralia.gov.au.
          </p>
        </div>
      </section>
    </div>
  );
}
