import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Choosing a Residential Aged Care Facility in Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `How to choose an Australian aged care facility: star ratings, accreditation, RAD levels, memory care units, and inspection reports. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Choosing a Residential Aged Care Facility (${CURRENT_YEAR})`,
    description: "Aged care facility types, star ratings, accreditation, memory care, extra service, RAD levels, and questions to ask before signing.",
    url: `${SITE_URL}/aged-care/facilities`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Choosing Aged Care Facilities")}&sub=${encodeURIComponent("Star Ratings · Accreditation · Memory Care · RAD · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/aged-care/facilities` },
};

const FACILITY_TYPES = [
  {
    type: "Standard residential aged care",
    description: "Government-funded facility providing 24/7 nursing, personal care, meals, laundry, and basic activities. Most residential care in Australia is this type.",
    rad: "Varies by location — typically $200k–$500k in metro; $100k–$250k in regional",
    funding: "Government care subsidy + basic daily fee + means-tested care fee from resident",
    bestFor: "Standard care needs; value-focused families; government-subsidised access",
  },
  {
    type: "Extra service facility",
    description: "Approved by the government to charge an additional &apos;extra service fee&apos; for premium services — private room, higher food quality, entertainment options, lifestyle programs.",
    rad: "Higher — typically $400k–$700k+ in metro areas",
    funding: "As above, plus extra service fee (not means-tested, can be $15–$100+/day)",
    bestFor: "Residents who want hotel-quality amenities; private room guarantee; wine with dinner",
  },
  {
    type: "Specialist dementia/memory care unit",
    description: "Secure unit within a facility (or standalone) for residents with moderate-to-advanced dementia. Features: secure environment, specialist staff training, structured activities.",
    rad: "Standard to premium — specialist facilities vary widely",
    funding: "Standard fee structure plus potentially higher care subsidy for complex dementia",
    bestFor: "Residents with wandering behaviour, aggression, or severe cognitive impairment",
  },
  {
    type: "Multipurpose service (MPS)",
    description: "Regional facilities combining aged care, hospital, and community health services. Government-funded; not-for-profit. Common in rural and remote areas.",
    rad: "Typically lower or nil (supported resident accommodation)",
    funding: "Government block-funded; minimal out-of-pocket for eligible residents",
    bestFor: "Rural/remote residents who want to stay in their community",
  },
];

const EVALUATION_CHECKLIST = [
  { category: "Safety & compliance", items: ["Check the Aged Care Quality and Safety Commission inspection reports (quality.aged.gov.au)", "Review any sanctions, notices of non-compliance, or enforceable undertakings", "Look at the facility&apos;s Aged Care Star Ratings on the My Aged Care website"] },
  { category: "Care quality", items: ["Ask about staff-to-resident ratios (minimum 200 care minutes per resident per day mandated from Oct 2024)", "Enquire about registered nurse availability — 24/7 RN presence now required", "Ask how complex medical needs (wound care, dementia, palliative) are handled on-site vs via external providers"] },
  { category: "Accommodation", items: ["Single vs shared room — and what the RAD/DAP covers", "Location and accessibility for family visits", "Outdoor access, natural light, and room size"] },
  { category: "Financial", items: ["Confirm the current RAD amount and whether it&apos;s negotiable", "Review the Resident Agreement and Accommodation Agreement carefully before signing", "Check whether the facility has applied for an accommodation price increase since your assessment"] },
];

const FAQS = [
  {
    q: "What are the Aged Care Star Ratings?",
    a: "The Australian government introduced mandatory Aged Care Star Ratings from December 2022, displayed on the My Aged Care website (myagedcare.gov.au/find-a-provider). Each facility is rated 1–5 stars across four sub-categories: Compliance (from ACQSC inspection outcomes), Residents&apos; Experience (quarterly resident survey), Staffing (care minutes, RN minutes), and Quality Measures (clinical indicators like pressure injuries, falls, unplanned weight loss). An overall star rating is calculated. One-star facilities have serious issues; five-star facilities consistently exceed all standards. Use star ratings as a starting point — visit in person and read the most recent inspection report.",
  },
  {
    q: "What are the new staffing requirements for aged care?",
    a: "From 1 October 2024, all residential aged care providers must: (1) deliver a minimum average of 200 minutes of care per resident per day (up from the previous 114-minute benchmark); (2) have a registered nurse on-site 24/7 (previously only required during day shifts). These mandated minimums were introduced following the Royal Commission into Aged Care Quality and Safety findings. Facilities that fail to meet the minimum are required to publish this information publicly. When evaluating a facility, ask for their current care minutes data and whether they consistently meet the 200-minute floor.",
  },
  {
    q: "Can I negotiate the RAD?",
    a: "For most government-funded residential aged care places, the accommodation price is set by the facility and approved by the government. The government operates a price cap process — facilities above a threshold must get ministerial approval. Within the approved price, the RAD is typically fixed and is the same for all residents choosing that room type. Some facilities have room types at different RAD levels — you may be able to choose a lower-RAD room. Extra service facilities may have more pricing flexibility for premium room types. Always compare multiple facilities&apos; RAD levels for comparable room types — variation can be $100,000+ for similar quality.",
  },
  {
    q: "What should I look for in the Resident Agreement?",
    a: "Key things to review before signing: (1) The exact accommodation price and whether it&apos;s subject to CPI or price increase clauses; (2) Refundable Accommodation Deposit terms — refund timeline, conditions, and what happens in facility insolvency; (3) Extra service fees — what they cover, how they can be changed, and notice period; (4) Care review process — how and when care needs are reassessed; (5) Discharge procedures — under what circumstances can the facility ask you to leave; (6) Complaints process. Have a solicitor or aged care financial adviser review the agreement before signing if you&apos;re unfamiliar with these documents.",
  },
];

export default function AgedCareFacilitiesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Aged Care", url: `${SITE_URL}/aged-care` },
    { name: "Residential Facilities" },
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
            <span className="text-slate-900 font-medium">Residential Facilities</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Choosing a residential aged care facility in Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Standard residential care, extra service facilities, and specialist dementia units each
            serve different needs and cost differently. Use Aged Care Star Ratings as a starting point
            — then visit, read inspection reports, and review the Resident Agreement carefully.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial or medical advice</p>
        </div>
      </section>

      {/* Facility types */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Types of residential aged care facilities</h2>
          <div className="space-y-4">
            {FACILITY_TYPES.map((ft, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3">
                  <p className="text-sm font-bold text-white">{ft.type}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{ft.description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Typical RAD</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{ft.rad}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Funding structure</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{ft.funding}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Best for</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{ft.bestFor}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Evaluation checklist */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Evaluation checklist</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {EVALUATION_CHECKLIST.map((cat, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="font-extrabold text-slate-900 mb-3">{cat.category}</p>
                <ul className="space-y-2">
                  {cat.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                      <p className="text-sm text-slate-600 leading-relaxed">{item}</p>
                    </li>
                  ))}
                </ul>
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

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Get help reviewing your Resident Agreement"
        subheading="Before signing a Resident Agreement for an aged care facility, an aged care financial adviser can review the RAD terms, fee structures, and discharge conditions to protect your family."
        intent={{ need: "aged_care", context: ["aged_care_facility", "aged_care_planning"] }}
        source="aged_care_facilities"
        ctaLabel="Find an aged care financial specialist"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/aged-care/rad-vs-dap", label: "RAD vs DAP decision" },
              { href: "/aged-care/costs", label: "Aged care costs" },
              { href: "/aged-care/home-vs-residential", label: "Home vs residential" },
              { href: "/aged-care/centrelink", label: "Centrelink assessment" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Facility star ratings, RAD prices, and care requirements change regularly. Verify current star ratings at myagedcare.gov.au and inspection reports at quality.aged.gov.au. This page is general information only; it is not financial, medical, or legal advice. Consult a licensed aged care financial adviser and, where appropriate, a solicitor before signing a Resident Agreement.
          </p>
        </div>
      </section>
    </div>
  );
}
