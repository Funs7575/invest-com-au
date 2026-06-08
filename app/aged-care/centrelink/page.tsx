import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Centrelink & Aged Care — Income Assessment, ACAT & Forms (${CURRENT_YEAR}) | invest.com.au`,
  description: `How Services Australia assesses your finances for aged care: the SA486/SA457 income and assets forms, ACAT assessment process, and how Centrelink decisions affect your aged care fees. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Centrelink & Aged Care (${CURRENT_YEAR}) — Assessment, Forms & Fees`,
    description: "Services Australia aged care assessment: SA486/SA457 forms, ACAT assessment, income and assets assessment, and fee impacts.",
    url: `${SITE_URL}/aged-care/centrelink`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Centrelink Aged Care Assessment")}&sub=${encodeURIComponent("SA486 · SA457 · ACAT · Means Test · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/aged-care/centrelink` },
};

const FORMS_OVERVIEW = [
  {
    form: "SA486 — Income and Assets Assessment",
    purpose: "The primary means-test form for residential aged care. Details all income and assets for Services Australia to calculate your means-tested care fee and determine accommodation assistance eligibility.",
    when: "Required before or at entry to residential aged care. Completed by the person entering care (or their legal representative if they lack capacity).",
    tip: "Gather 3 months of bank statements, super statements, real property valuations, and Centrelink statement before completing. Errors or omissions delay your assessment.",
  },
  {
    form: "SA457 — Home Care Income and Assets Assessment",
    purpose: "Similar assessment form for Home Care Package recipients. Determines your income-tested care fee for home care.",
    when: "Completed when assigned a Home Care Package. Lower stakes than SA486 — home care income-tested fees are typically lower.",
    tip: "If you&apos;re already receiving an Age Pension, Services Australia may already hold your income/assets data and the process is streamlined.",
  },
  {
    form: "ACAT / RAS Assessment",
    purpose: "Not a Centrelink form — the Aged Care Assessment Team (ACAT) assesses your care needs and approves you for a level of care (residential or home care package level). Separate from the financial assessment.",
    when: "Required before entering residential care or receiving a Home Care Package. Call My Aged Care to request.",
    tip: "ACAT assessment is free. Ask for written confirmation of your approved care level — this document is needed when applying to facilities.",
  },
];

const PROCESS_TIMELINE = [
  { stage: "Contact My Aged Care", action: "Call 1800 200 422 or register online — starts the ACAT/RAS referral", timing: "Day 1" },
  { stage: "Care needs assessment", action: "ACAT (residential) or RAS (home care) assessor visits; approves care level", timing: "1–4 weeks" },
  { stage: "Financial assessment", action: "Complete SA486 (residential) or SA457 (home care) — Services Australia assesses income and assets", timing: "2–4 weeks after form submission" },
  { stage: "Notification of fees", action: "Services Australia issues a letter with your means-tested fee and accommodation assistance status", timing: "4–8 weeks from form submission" },
  { stage: "Choose facility/provider", action: "Select aged care facility or home care provider with your approved level", timing: "Varies — waitlists can be 3–36 months" },
  { stage: "Entry and ongoing review", action: "Care commences; annual reassessment of income/assets; fees adjusted accordingly", timing: "Annual" },
];

const FAQS = [
  {
    q: "What if I refuse to complete the income and assets assessment?",
    a: "You are not legally required to complete the SA486 assessment. However, if you don&apos;t provide financial information, Services Australia will assess you at the maximum means-tested care fee — you pay the full fee as if you have significant assets, regardless of your actual situation. For people with limited assets, completing the form is strongly in their financial interest. If you genuinely cannot complete the form due to cognitive impairment, your legal guardian, enduring power of attorney, or administrator can complete it on your behalf.",
  },
  {
    q: "Can I update my financial assessment if my circumstances change?",
    a: "Yes. You can notify Services Australia of significant changes to your income or assets at any time. Your means-tested care fee is formally reviewed annually, but you can request a review if you have a major change: a large asset is sold, your home is eventually included in the assets assessment (after the 2-year family home exemption period ends), or your income decreases significantly. Reviews can result in both increases and decreases to your means-tested fee depending on the change.",
  },
  {
    q: "How does the aged care assessment interact with my Age Pension?",
    a: "The aged care income and assets assessment uses the same data as the Age Pension assets test, but the calculations and outcomes are different. The aged care assessment affects your means-tested care fee and accommodation assistance eligibility. The Age Pension assets test affects whether you receive a pension. These run simultaneously — an event that reduces your Age Pension (e.g. receiving a superannuation lump sum) may also affect your aged care fee. Services Australia shares information between its Age Pension and aged care teams — you don&apos;t need to notify each separately for most changes, but it&apos;s good practice to confirm.",
  },
  {
    q: "What is a financial hardship supplement in aged care?",
    a: "If you cannot afford your aged care fees due to financial hardship, you can apply for a hardship supplement from Services Australia. Hardship applies if: (1) you can demonstrate your assessable income and assets are genuinely insufficient to pay the required fees; and (2) you don&apos;t have access to assets that could be used (including non-assessable assets that Services Australia considers accessible). Hardship assistance is not automatic — you must apply, and there is a formal assessment process. Speak to a Services Australia Financial Information Service officer for guidance.",
  },
];

export default function AgedCareCentrelinkPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Aged Care", url: `${SITE_URL}/aged-care` },
    { name: "Centrelink Assessment" },
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
            <span className="text-slate-900 font-medium">Centrelink Assessment</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Centrelink &amp; aged care: income assessment, ACAT &amp; forms
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Before entering residential aged care or receiving a Home Care Package, Services Australia
            assesses your income and assets to determine your means-tested fee. The SA486 and SA457
            forms are key. Here&apos;s what happens, in what order, and what mistakes to avoid.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial or legal advice</p>
        </div>
      </section>

      {/* Forms overview */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Key forms and assessments</h2>
          <div className="space-y-4">
            {FORMS_OVERVIEW.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3">
                  <p className="text-sm font-bold text-white">{item.form}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Purpose</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{item.purpose}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">When required</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{item.when}</p>
                  </div>
                  <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Tip</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{item.tip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process timeline */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">The aged care process: step by step</h2>
          <div className="space-y-3">
            {PROCESS_TIMELINE.map((item, i) => (
              <div key={i} className="flex gap-4 bg-white rounded-xl border border-slate-200 p-4">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-extrabold flex items-center justify-center shrink-0">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-slate-900">{item.stage}</p>
                    <p className="text-xs text-slate-400 shrink-0">{item.timing}</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.action}</p>
                </div>
              </div>
            ))}
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

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/aged-care/means-test", label: "Aged care means test" },
              { href: "/aged-care/costs", label: "Aged care costs" },
              { href: "/aged-care/rad-vs-dap", label: "RAD vs DAP" },
              { href: "/retirement/age-pension", label: "Age pension guide" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Aged care forms, assessment processes, and fee rules change. Always verify current requirements at myagedcare.gov.au and servicesaustralia.gov.au. This page is general information only; it is not financial, legal, or aged care advice. Contact a Services Australia Financial Information Service officer (free service) for personalised guidance on aged care assessments.
          </p>
        </div>
      </section>
    </div>
  );
}
