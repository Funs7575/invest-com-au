import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `First Home Guarantee (FHBG) — 5% Deposit, Eligibility & Lenders (${CURRENT_YEAR}) | invest.com.au`,
  description: `How the First Home Guarantee works: 5% deposit with no LMI, 35,000 places per year, income caps, property price caps by state, eligible lenders, and how to apply. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `First Home Guarantee (FHBG) — 5% Deposit Guide (${CURRENT_YEAR})`,
    description: "First Home Guarantee: 5% deposit, no LMI, 35,000 places per year, income caps, property price limits, eligible lenders.",
    url: `${SITE_URL}/first-home-buyer/first-home-guarantee`,
    images: [{ url: `/api/og?title=${encodeURIComponent("First Home Guarantee Australia")}&sub=${encodeURIComponent("5% Deposit · No LMI · 35,000 Places · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/first-home-buyer/first-home-guarantee` },
};

const PRICE_CAPS = [
  { state: "New South Wales — capital cities & regional centres", cap: "$900,000" },
  { state: "New South Wales — rest of state", cap: "$750,000" },
  { state: "Victoria — capital city & regional centres", cap: "$800,000" },
  { state: "Victoria — rest of state", cap: "$650,000" },
  { state: "Queensland — capital city & regional centres", cap: "$700,000" },
  { state: "Queensland — rest of state", cap: "$550,000" },
  { state: "Western Australia — capital city & regional centres", cap: "$600,000" },
  { state: "Western Australia — rest of state", cap: "$450,000" },
  { state: "South Australia — capital city & regional centres", cap: "$600,000" },
  { state: "South Australia — rest of state", cap: "$450,000" },
  { state: "ACT", cap: "$750,000" },
  { state: "Northern Territory", cap: "$600,000" },
  { state: "Tasmania — capital city & regional centres", cap: "$600,000" },
  { state: "Tasmania — rest of state", cap: "$450,000" },
];

const SCHEMES_COMPARISON = [
  { scheme: "First Home Guarantee (FHBG)", deposit: "5% minimum", lmi: "No LMI", places: "35,000/year", eligibility: "First home buyers; income limits apply" },
  { scheme: "Regional First Home Buyer Guarantee (RFHBG)", deposit: "5% minimum", lmi: "No LMI", places: "10,000/year", eligibility: "Regional areas only; 12 months regional residence" },
  { scheme: "Family Home Guarantee (FHG)", deposit: "2% minimum", lmi: "No LMI", places: "5,000/year", eligibility: "Single parents / guardians only; not required to be first home buyer" },
];

const FAQS = [
  {
    q: "What is the First Home Guarantee and how does it save money?",
    a: "The First Home Guarantee (FHBG) is a government scheme administered by Housing Australia that allows eligible first home buyers to purchase with as little as a 5% deposit — without paying Lenders Mortgage Insurance (LMI). The government guarantees up to 15% of the property value to the lender, eliminating the need for LMI (which typically costs $5,000–$20,000 on a standard low-deposit loan). The scheme does not reduce your loan amount or give you cash — it simply means the bank doesn&apos;t require you to pay LMI. You still need to demonstrate borrowing capacity and meet the lender&apos;s credit standards.",
  },
  {
    q: "What are the income caps for the First Home Guarantee?",
    a: "For the 2024–25 financial year: single applicants must have a taxable income of $125,000 or less in the previous financial year; couples must have a combined taxable income of $200,000 or less. The income test is based on the prior year&apos;s Notice of Assessment from the ATO. If you&apos;ve just received a large bonus or have a significant income year, plan carefully — your prior year income determines eligibility, not your current income. For high-income earners approaching the threshold in the prior year, review eligibility before applying.",
  },
  {
    q: "How many places are available and how do I apply?",
    a: "35,000 places are available per year for the FHBG (plus 10,000 RFHBG and 5,000 FHG places). Places are allocated on a first-come, first-served basis through approved lenders — Housing Australia does not accept direct applications. To apply: (1) check eligibility at housingaustralia.gov.au; (2) choose an approved lender (major banks and many brokers participate); (3) notify the lender of your intent to use the guarantee; (4) the lender confirms your eligibility with Housing Australia; (5) once approved, proceed with your loan application normally. There is no separate application form — it&apos;s integrated into the home loan process.",
  },
  {
    q: "Can I use the FHBG with the FHSS scheme?",
    a: "Yes — you can combine the First Home Guarantee (5% deposit, no LMI) with the First Home Super Saver Scheme (FHSS, up to $50k withdrawn from super). Using both maximises the benefit for eligible first home buyers. Example: 5% deposit on a $700,000 property = $35,000; a couple withdrawing $40,000–$50,000 FHSS funds combined can cover the deposit and associated costs without touching savings. The schemes are complementary — FHSS provides the deposit funds; FHBG eliminates the LMI cost of a low-deposit purchase. Note: FHSS funds must arrive before or at settlement, so coordinate timing carefully with your FHSS release.",
  },
];

export default function FirstHomeGuaranteePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "First Home Buyer", url: `${SITE_URL}/first-home-buyer` },
    { name: "First Home Guarantee" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/first-home-buyer" className="hover:text-slate-900">First Home Buyer</Link><span>/</span>
            <span className="text-slate-900 font-medium">First Home Guarantee</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            First Home Guarantee (FHBG): buy with 5% deposit, no LMI
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            The First Home Guarantee gives 35,000 eligible first home buyers per year the ability to
            purchase with just 5% deposit — without paying Lenders Mortgage Insurance (LMI), which
            typically costs $5,000–$20,000. Income caps: $125k single, $200k couple.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Verify at housingaustralia.gov.au</p>
        </div>
      </section>

      {/* Schemes comparison */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Housing Australia guarantee schemes compared</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Scheme</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Min deposit</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">LMI</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Places/year</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Who qualifies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {SCHEMES_COMPARISON.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.scheme}</td>
                    <td className="px-3 py-3 text-amber-700 font-bold text-xs">{row.deposit}</td>
                    <td className="px-3 py-3 text-emerald-700 font-bold text-xs">{row.lmi}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.places}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.eligibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Property price caps */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Property price caps (2024–25)</h2>
          <p className="text-sm text-slate-500 mb-5">Properties above the cap are ineligible for the guarantee — you must use LMI or have a 20%+ deposit. Caps vary by state/territory and location.</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Location</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Price cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {PRICE_CAPS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 text-xs">{row.state}</td>
                    <td className="px-3 py-3 font-bold text-slate-900 text-xs">{row.cap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Verify current caps at housingaustralia.gov.au/support-buy-home/first-home-guarantee</p>
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
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">▾</span>
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
              { href: "/first-home-buyer/fhss-guide", label: "FHSS guide" },
              { href: "/first-home-buyer/deposit-guide", label: "Saving your deposit" },
              { href: "/first-home-buyer/stamp-duty", label: "Stamp duty guide" },
              { href: "/home-loans", label: "Home loans hub" },
              { href: "/first-home-buyer", label: "First home buyer hub" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Scheme eligibility rules, income caps, property price caps, and annual places available change. Verify current details at housingaustralia.gov.au before applying. This page is general information only; it is not financial or credit advice. Consult a licensed mortgage broker or financial adviser for personalised home-buying guidance.
          </p>
        </div>
      </section>
    </div>
  );
}
