import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FIRB_FEES, FIRB_PROCESS_STEPS, FIRB_FAQS, WHO_NEEDS_FIRB } from "@/lib/firb-data";
import { FIRB_DISCLAIMER } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "FIRB Application: Complete Step-by-Step Guide (2026)",
  description:
    "How to lodge a FIRB application to buy Australian property as a foreign investor. Documents required, fees, processing times, approval conditions, and what to do if rejected. Updated March 2026.",
  openGraph: {
    title: "FIRB Application: Complete Step-by-Step Guide (2026)",
    description:
      "Documents, fees, processing times, and approval conditions for FIRB applications. Everything a foreign buyer needs to know before lodging.",
    url: `${SITE_URL}/foreign-investment/guides/firb-application-guide`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("FIRB Application: Step-by-Step Guide")}&sub=${encodeURIComponent("Documents · Fees · Processing · Approval Conditions · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/guides/firb-application-guide` },
};

export const revalidate = 86400;

const DOCUMENTS_NEEDED = [
  { doc: "Passport or government-issued photo ID", required: "Always", notes: "Certified copy required" },
  { doc: "Proof of residency / visa status", required: "Always", notes: "Passport stamp, visa grant notice, or VEVO printout" },
  { doc: "Property contract or heads of agreement", required: "Always", notes: "Draft contract is acceptable — final not required at lodgement" },
  { doc: "Valuation or purchase price evidence", required: "Always", notes: "Can be an agent's written price indication for off-the-plan" },
  { doc: "Company structure documentation", required: "If buying via entity", notes: "ASIC extract, constitution, shareholder register" },
  { doc: "Trust deed", required: "If buying via trust", notes: "Full trust deed including all amendments" },
  { doc: "Source of funds evidence", required: "High-value properties", notes: "Bank statements showing funds or finance pre-approval" },
  { doc: "Development plans", required: "Vacant land applications", notes: "Council DA approval or developer's building plans" },
];

const APPROVAL_CONDITIONS = [
  {
    condition: "Development obligation",
    desc: "For vacant land — you must build a dwelling within 4 years of FIRB approval. The ATO monitors compliance.",
  },
  {
    condition: "Occupancy conditions",
    desc: "Some approvals require you to occupy the property rather than rent it out, particularly for temporary residents.",
  },
  {
    condition: "No sub-division",
    desc: "You may not subdivide the land without further FIRB approval unless specifically permitted.",
  },
  {
    condition: "Notification obligations",
    desc: "You must notify FIRB of changes in circumstances — visa status change, sale, or changes to intended use.",
  },
  {
    condition: "Time limits",
    desc: "Most approvals have a validity period (typically 2 years). You must complete the purchase before expiry.",
  },
];

export default function FirbApplicationGuidePage() {
  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
              { name: "Guides", url: `${SITE_URL}/foreign-investment/guides` },
              { name: "FIRB Application Guide" },
            ])
          ),
        }}
      />

      {/* ── Ban reminder ── */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="container-custom py-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-amber-800">
            <strong>Note:</strong> Foreign persons are currently banned from buying established dwellings (1 Apr 2025 – 31 Mar 2027).
            FIRB applications for new dwellings and off-the-plan are still accepted.
          </p>
          <Link href="/foreign-investment/guides/property-ban-2025" className="shrink-0 text-xs font-bold text-amber-700 underline whitespace-nowrap">
            Full ban details &rarr;
          </Link>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span>/</span>
            <Link href="/foreign-investment/guides" className="hover:text-slate-900">Guides</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">FIRB Application Guide</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              FIRB Application:{" "}
              <span className="text-amber-600">Complete Step-by-Step Guide</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Every foreign person buying Australian property must obtain FIRB approval. This guide covers exactly
              what to submit, how much it costs, how long it takes, and what happens after you apply.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Standard processing", value: "30 days" },
                { label: "Fee (up to $1M)", value: "$14,100" },
                { label: "Online portal", value: "firb.gov.au" },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-extrabold text-amber-600">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Do you need FIRB? ── */}
        <section>
          <SectionHeading
            eyebrow="Eligibility"
            title="Do you need FIRB approval?"
            sub="FIRB approval is required for most foreign persons. Check your category below."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Buyer type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">FIRB needed?</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {WHO_NEEDS_FIRB.map((row) => (
                  <tr key={row.group} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.group}</td>
                    <td className="px-4 py-3">
                      {row.needsFirb ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Yes — required</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Step-by-step process ── */}
        <section>
          <SectionHeading
            eyebrow="The Process"
            title="FIRB application: step by step"
          />
          <div className="space-y-4">
            {FIRB_PROCESS_STEPS.map((s) => (
              <div key={s.step} className="flex gap-5 p-5 border border-slate-200 rounded-2xl hover:border-amber-200 transition-colors">
                <div className="shrink-0 w-10 h-10 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center font-extrabold text-sm">
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-1.5">
                    <h3 className="font-bold text-slate-800">{s.title}</h3>
                    <span className="shrink-0 text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">{s.timeframe}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Documents ── */}
        <section>
          <SectionHeading
            eyebrow="Required Documents"
            title="What documents do you need?"
            sub="Gather these before lodging. Incomplete applications cause delays."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Document</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">When required</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DOCUMENTS_NEEDED.map((doc) => (
                  <tr key={doc.doc} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{doc.doc}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${doc.required === "Always" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                        {doc.required}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{doc.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Fees ── */}
        <section>
          <SectionHeading
            eyebrow="FIRB Fees"
            title="Application fees by property value"
            sub="Fees are non-refundable regardless of outcome. Pay when you lodge."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Property value</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">FIRB fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FIRB_FEES.map((fee) => (
                  <tr key={fee.label} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">{fee.label}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">${fee.feeAud.toLocaleString("en-AU")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">Source: firb.gov.au — fees indexed annually from 1 July.</p>
        </section>

        {/* ── Approval conditions ── */}
        <section>
          <SectionHeading
            eyebrow="After Approval"
            title="Common FIRB approval conditions"
            sub="Most approvals come with conditions. Breaching them can lead to forced divestiture."
          />
          <div className="space-y-3">
            {APPROVAL_CONDITIONS.map((c) => (
              <div key={c.condition} className="flex gap-4 p-4 border border-amber-200 bg-amber-50/30 rounded-xl">
                <div className="shrink-0 w-2 h-2 bg-amber-500 rounded-full mt-2" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">{c.condition}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQs ── */}
        <section>
          <SectionHeading eyebrow="FAQs" title="FIRB application questions answered" />
          <div className="space-y-4">
            {FIRB_FAQS.slice(0, 6).map((faq) => (
              <div key={faq.question} className="border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-800 text-sm mb-2">{faq.question}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related Guides" title="More foreign buyer resources" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "How to Buy Property as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Buyer Stamp Duty by State", href: "/foreign-investment/guides/stamp-duty-foreign-buyers" },
              { title: "The Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "FIRB-Eligible Property Listings", href: "/property/listings?firb=true" },
              { title: "Find a Buyer's Agent", href: "/property/buyer-agents" },
              { title: "Can Non-Residents Open an Australian Bank Account?", href: "/foreign-investment/guides/non-resident-bank-account" },
            ].map((guide) => (
              <Link key={guide.href} href={guide.href} className="group block p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all">
                <span className="font-semibold text-sm text-slate-800 group-hover:text-amber-700">{guide.title} &rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 leading-relaxed">{FIRB_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
