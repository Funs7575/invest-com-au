import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FIRB_FEES, STATE_SURCHARGES, FIRB_PROCESS_STEPS } from "@/lib/firb-data";
import { FIRB_DISCLAIMER } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";
import ComplianceFooter from "@/components/ComplianceFooter";

export const metadata: Metadata = {
  title: "How to Buy Property in Australia as a Foreigner (2026 Guide)",
  description:
    "Complete step-by-step guide to buying property in Australia as a foreign buyer. FIRB approval, eligible property types, the 2025–2027 established dwelling ban, stamp duty surcharges, and costs. Updated March 2026.",
  openGraph: {
    title: "How to Buy Property in Australia as a Foreigner (2026 Guide)",
    description:
      "FIRB approval, eligible property types, the 2025–2027 established dwelling ban, state stamp duty surcharges, and total purchase costs explained.",
    url: `${SITE_URL}/foreign-investment/guides/buy-property-australia-foreigner`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Buy Property in Australia as a Foreigner")}&sub=${encodeURIComponent("FIRB Guide · 2025–2027 Ban · Stamp Duty · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/guides/buy-property-australia-foreigner` },
};

export const revalidate = 86400;

const STEPS = [
  {
    step: 1,
    title: "Determine your eligibility",
    description:
      "Your eligibility depends on your visa status and nationality. Non-residents and temporary visa holders can only buy new dwellings, off-the-plan properties, or vacant land for development. The established dwelling ban (1 April 2025 – 31 March 2027) means no foreign person can purchase an existing home during this period. Australian citizens, permanent residents, and New Zealand citizens living in Australia are exempt from FIRB requirements.",
  },
  {
    step: 2,
    title: "Choose an eligible property type",
    description:
      "Focus your search on new residential developments, off-the-plan apartments, or vacant land with council-approved development plans. You cannot buy an established (existing) dwelling until at least 1 April 2027. Check with the developer or agent that the property meets FIRB requirements — most new developments in major cities are pre-approved.",
  },
  {
    step: 3,
    title: "Engage a property lawyer or conveyancer",
    description:
      "A solicitor or conveyancer experienced with foreign buyers is essential. They will review the contract of sale, handle FIRB lodgement, manage settlement, and ensure all foreign buyer obligations are met. For off-the-plan purchases, they will also review the developer's disclosure statement.",
  },
  {
    step: 4,
    title: "Apply for FIRB approval",
    description:
      "Lodge your FIRB application through firb.gov.au before signing a contract (or include a FIRB approval condition in the contract). Application fees start at $14,100 for properties up to $1 million and increase with property value. Standard processing is 30 days, but complex cases can take up to 90 days. You cannot legally complete a purchase without FIRB approval if you are a foreign person.",
  },
  {
    step: 5,
    title: "Arrange finance",
    description:
      "Foreign buyers typically face stricter lending criteria than Australian residents. Maximum LVR is often 60–70% (compared to 80–90% for residents). You will need a larger deposit, and most major banks require you to have an Australian bank account. International mortgage specialists or private lenders may offer more flexible terms.",
  },
  {
    step: 6,
    title: "Budget for stamp duty surcharges",
    description:
      "All states and territories charge an additional foreign buyer stamp duty surcharge on top of standard stamp duty. This ranges from 7% to 8% of the purchase price depending on the state. NSW and Victoria charge 8%, Queensland charges 7%. Budget these costs upfront — they are non-negotiable and non-refundable.",
  },
  {
    step: 7,
    title: "Open an Australian bank account",
    description:
      "You will need an Australian bank account to settle the purchase and receive rent payments. Non-residents can open accounts at major banks (ANZ, Westpac, NAB, CBA) without visiting Australia, though the process requires certified documentation. Online banks like Wise and OFX are not typically suitable for property settlement.",
  },
  {
    step: 8,
    title: "Exchange contracts and settle",
    description:
      "Once FIRB approval is received, exchange contracts with a deposit (typically 10%). Your conveyancer manages the settlement process. For off-the-plan purchases, settlement occurs when construction completes — which may be 1–3 years after signing. Ensure your FIRB approval doesn't expire before settlement.",
  },
];

const FAQS = [
  {
    question: "Can foreigners buy property in Australia right now?",
    answer:
      "Yes, but with significant restrictions. From 1 April 2025 to 31 March 2027, foreign persons — including temporary residents — cannot purchase established (existing) dwellings. You can still buy new dwellings, off-the-plan apartments, and vacant land for development. FIRB approval is required for virtually all purchases by foreign persons.",
  },
  {
    question: "What is the cheapest state to buy as a foreign investor?",
    answer:
      "Queensland has the lowest foreign buyer stamp duty surcharge at 7% (vs 8% in NSW and Victoria). However, total purchase costs vary significantly by property value, state stamp duty rates, and FIRB fees. Get quotes from a local conveyancer before comparing states on price alone.",
  },
  {
    question: "Do I need to visit Australia to buy property?",
    answer:
      "No. Many foreign buyers complete Australian property purchases entirely remotely. You can sign contracts electronically, lodge FIRB applications online, and arrange an Australian bank account remotely. Your lawyer or buyer's agent can attend inspections, auctions, and settlement on your behalf.",
  },
  {
    question: "Can I rent out the property I buy?",
    answer:
      "Yes — rental income from Australian property is subject to Australian tax at non-resident rates (30% from the first dollar, no tax-free threshold). You are required to lodge an Australian tax return annually to report rental income. A local property manager can handle tenant management and provide records for your accountant.",
  },
  {
    question: "What happens if I buy without FIRB approval?",
    answer:
      "The penalties are severe. The government can order you to sell the property (often at a loss), impose fines of up to 25% of the property value, or pursue criminal charges. There is no amnesty for retrospective approval. Always obtain FIRB approval before or concurrent with signing a contract.",
  },
  {
    question: "Are there any exemptions from the established dwelling ban?",
    answer:
      "Limited exemptions may apply in specific circumstances, including properties that are genuinely uninhabitable or where redevelopment is planned. There are also exemptions for foreign-owned developers in some cases. Consult a FIRB specialist lawyer before assuming any exemption applies to your situation.",
  },
];

export default function BuyPropertyAustralieForeignerPage() {
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
              { name: "Buy Property as a Foreigner" },
            ])
          ),
        }}
      />

      {/* ── 2025–2027 Established Dwelling Ban Alert ── */}
      <div className="bg-red-50 border-b-2 border-red-200">
        <div className="container-custom py-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-red-800 text-sm">Established Dwelling Ban: 1 April 2025 – 31 March 2027</p>
              <p className="text-red-700 text-xs mt-0.5 leading-relaxed">
                Foreign persons (including temporary residents) are currently <strong>banned from purchasing existing homes</strong> in Australia.
                You can still buy new dwellings, off-the-plan properties, and vacant land.{" "}
                <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Full ban details &rarr;</Link>
              </p>
            </div>
          </div>
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
            <span className="text-slate-900 font-medium">Buy Property as a Foreigner</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              How to Buy Property in Australia{" "}
              <span className="text-amber-600">as a Foreigner</span>
              <br />
              <span className="text-xl sm:text-2xl md:text-3xl text-slate-500">(2026 Complete Guide)</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Foreign buyers can still invest in Australian property — but the rules changed significantly in 2025.
              This guide covers every step, from FIRB approval and the current established dwelling ban, to
              stamp duty surcharges and finding the right specialists.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/property/foreign-investment" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
                FIRB Guide &rarr;
              </Link>
              <Link href="/property/listings?firb=true" className="px-5 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-sm transition-colors">
                FIRB-Eligible Listings
              </Link>
              <Link href="/property/buyer-agents" className="px-5 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-sm transition-colors">
                Find a Buyer&apos;s Agent
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Quick summary box ── */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">Key facts for foreign buyers (March 2026)</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Established dwellings", value: "Banned (until 31 Mar 2027)", highlight: true },
              { label: "New dwellings / off-the-plan", value: "Available — FIRB required" },
              { label: "FIRB application fee (up to $1M)", value: "$14,100" },
              { label: "Stamp duty surcharge (NSW/VIC)", value: "8% on purchase price" },
              { label: "Stamp duty surcharge (QLD)", value: "7% on purchase price" },
              { label: "Standard FIRB processing", value: "30 days" },
              { label: "Typical max LVR for foreign buyers", value: "60–70%" },
              { label: "Capital gains withholding (≥$750K)", value: "12.5% withheld at settlement" },
            ].map((item) => (
              <div key={item.label} className={`flex justify-between gap-2 py-2 border-b border-amber-100 last:border-0 ${item.highlight ? "text-red-700" : ""}`}>
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className={`text-sm font-bold text-right ${item.highlight ? "text-red-700" : "text-slate-800"}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Step-by-step guide ── */}
        <section>
          <SectionHeading
            eyebrow="Step-by-Step"
            title="How to buy Australian property as a foreigner"
            sub="Follow these 8 steps in order. Each has specific foreign buyer requirements."
          />
          <div className="space-y-5">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-5 p-5 border border-slate-200 rounded-2xl hover:border-amber-200 transition-colors">
                <div className="shrink-0 w-10 h-10 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center font-extrabold text-sm">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── What can you buy? ── */}
        <section>
          <SectionHeading
            eyebrow="Eligible Properties"
            title="What can foreign buyers purchase?"
            sub="The 2025–2027 established dwelling ban means your options are now exclusively new construction."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { type: "New residential dwellings", eligible: true, desc: "Newly built houses, townhouses, or apartments never previously occupied." },
              { type: "Off-the-plan apartments", eligible: true, desc: "Apartments purchased before completion and registered to you as a new dwelling." },
              { type: "Vacant land (development)", eligible: true, desc: "Vacant residential land where you intend to build a new dwelling within 4 years." },
              { type: "Established dwellings", eligible: false, desc: "Banned from 1 April 2025 to 31 March 2027. No exceptions for most foreign persons." },
              { type: "Commercial property", eligible: true, desc: "Different FIRB thresholds apply. No residential rules — business/investor rules." },
              { type: "Rural land", eligible: true, desc: "Separate FIRB rules apply. Different thresholds ($15M for agricultural land)." },
            ].map((item) => (
              <div key={item.type} className={`rounded-xl border p-4 ${item.eligible ? "bg-emerald-50/50 border-emerald-200" : "bg-red-50/50 border-red-200"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {item.eligible ? (
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={`text-sm font-bold ${item.eligible ? "text-emerald-800" : "text-red-800"}`}>{item.type}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed ml-6">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Stamp duty surcharges ── */}
        <section>
          <SectionHeading
            eyebrow="State Costs"
            title="Foreign buyer stamp duty surcharges by state"
            sub="On top of standard stamp duty, all states charge an additional surcharge for foreign buyers."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">State/Territory</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Surcharge</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Land Tax Surcharge</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {STATE_SURCHARGES.map((s) => (
                  <tr key={s.stateCode} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.state}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-red-700">{s.surchargePercent}%</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {s.landTaxSurchargePercent ? `${s.landTaxSurchargePercent}% p.a.` : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Surcharges apply to the dutiable value of the property. Check your state&apos;s revenue office for current rates and any exemptions.
            {" "}<Link href="/foreign-investment/guides/stamp-duty-foreign-buyers" className="text-amber-600 hover:text-amber-700 underline">Full stamp duty guide &rarr;</Link>
          </p>
        </section>

        {/* ── FIRB fees ── */}
        <section>
          <SectionHeading
            eyebrow="FIRB Application Fees"
            title="How much does FIRB approval cost?"
            sub="Fees are based on the purchase price and are non-refundable regardless of outcome."
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
          <p className="text-xs text-slate-500 mt-2">FIRB fees are indexed annually. Current rates effective from 1 July 2024. Source: firb.gov.au</p>
        </section>

        {/* ── Who to engage ── */}
        <section>
          <SectionHeading
            eyebrow="Professional Help"
            title="Who do foreign buyers need to engage?"
            sub="These professionals are essential, not optional, for a foreign buyer purchase."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                role: "Property Lawyer / Conveyancer",
                why: "Required for FIRB lodgement, contract review, and settlement. Must have foreign buyer experience.",
                href: "/advisors/conveyancers",
              },
              {
                role: "Buyer&apos;s Agent",
                why: "Finds FIRB-eligible properties, attends inspections, and negotiates on your behalf — essential for remote buyers.",
                href: "/property/buyer-agents",
              },
              {
                role: "International Mortgage Broker",
                why: "Navigates the 60–70% LVR lending limits and specialist lenders who accept non-resident borrowers.",
                href: "/property/finance",
              },
              {
                role: "Cross-Border Tax Accountant",
                why: "Advises on CGT, rental income tax, FRCGW withholding, and double tax agreement implications.",
                href: "/advisors/tax-agents",
              },
              {
                role: "FIRB Specialist",
                why: "For complex applications (vacant land, commercial property, or large value) a specialist lawyer is worth the cost.",
                href: "/advisors",
              },
              {
                role: "Property Manager",
                why: "If renting out the property, a local property manager handles tenants, maintenance, and tax records.",
                href: "/property",
              },
            ].map((p) => (
              <Link key={p.role} href={p.href} className="group p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all">
                <h3 className="font-bold text-slate-800 text-sm mb-1.5 group-hover:text-amber-700" dangerouslySetInnerHTML={{ __html: p.role }} />
                <p className="text-xs text-slate-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: p.why }} />
                <span className="text-xs text-amber-600 font-semibold mt-2 inline-block">Find one &rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── FAQs ── */}
        <section>
          <SectionHeading eyebrow="FAQs" title="Common questions from foreign buyers" />
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.question} className="border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-800 text-sm mb-2">{faq.question}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related guides ── */}
        <section>
          <SectionHeading eyebrow="Related Guides" title="Dive deeper into specific topics" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "FIRB Application: Complete Step-by-Step Guide", href: "/foreign-investment/guides/firb-application-guide", desc: "How to lodge your FIRB application, what documents you need, and how long it takes." },
              { title: "Foreign Buyer Stamp Duty by State (2026)", href: "/foreign-investment/guides/stamp-duty-foreign-buyers", desc: "Exact surcharge rates for every state and territory, with cost examples." },
              { title: "Australia's Property Ban 2025–2027: Full Explainer", href: "/foreign-investment/guides/property-ban-2025", desc: "Who is banned, what you can still buy, and when the ban ends." },
              { title: "Can Non-Residents Open an Australian Bank Account?", href: "/foreign-investment/guides/non-resident-bank-account", desc: "How to open an account remotely, which banks accept non-residents, and what documents you need." },
              { title: "Withholding Tax on Australian Dividends", href: "/foreign-investment/tax", desc: "Tax rates for non-residents on dividends, interest, and capital gains." },
              { title: "FIRB-Eligible Listings", href: "/property/listings?firb=true", desc: "Browse new developments approved for foreign buyers across Australia." },
            ].map((guide) => (
              <Link key={guide.href} href={guide.href} className="group block p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all">
                <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-amber-700">{guide.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{guide.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 leading-relaxed">{FIRB_DISCLAIMER}</p>
        </div>
      </div>
      <div className="container-custom pb-8"><ComplianceFooter variant="firb" /></div>

    </div>
  );
}
