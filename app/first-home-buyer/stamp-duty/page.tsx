import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Stamp Duty for First Home Buyers — State-by-State Concessions (${CURRENT_YEAR}) | invest.com.au`,
  description: `First home buyer stamp duty concessions and exemptions by state: NSW, VIC, QLD, WA, SA, ACT, TAS, NT. Thresholds, full exemptions, and land tax opt-in alternatives. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `First Home Buyer Stamp Duty (${CURRENT_YEAR}) — State Concessions Guide`,
    description: "Stamp duty concessions for first home buyers: NSW, VIC, QLD, WA, SA, ACT, TAS, NT — exemption thresholds, full vs partial concessions, and alternatives.",
    url: `${SITE_URL}/first-home-buyer/stamp-duty`,
    images: [{ url: `/api/og?title=${encodeURIComponent("First Home Buyer Stamp Duty")}&sub=${encodeURIComponent("NSW · VIC · QLD · WA · Concessions · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/first-home-buyer/stamp-duty` },
};

const STATE_CONCESSIONS = [
  {
    state: "NSW",
    fullExemption: "Established homes ≤$800k; new homes ≤$800k",
    partialConcession: "Up to $1M for new homes",
    maxSaving: "~$30,890 (full exemption on $800k property)",
    notes: "Property Tax (annual land tax) opt-in available as alternative to stamp duty for first home buyers who prefer to defer upfront cost",
  },
  {
    state: "VIC",
    fullExemption: "Established: ≤$600k; new: ≤$600k",
    partialConcession: "$600k–$750k (50% duty reduction for new homes)",
    maxSaving: "~$31,000 on $600k property",
    notes: "50% off-the-plan duty reduction for new/refurbished apartments under certain conditions",
  },
  {
    state: "QLD",
    fullExemption: "Owner-occupier homes ≤$550k (first home buyers get full exemption)",
    partialConcession: "$550k–$700k",
    maxSaving: "~$15,925 on $550k home",
    notes: "First home vacant land concession: full exemption on land ≤$400k; partial up to $500k",
  },
  {
    state: "WA",
    fullExemption: "Established: ≤$430k; new: ≤$530k",
    partialConcession: "Up to $530k (established) / $630k (new)",
    maxSaving: "~$14,440 on $430k established",
    notes: "Western Australia has separate exemptions for new and established homes — new home threshold is higher",
  },
  {
    state: "SA",
    fullExemption: "All new homes + land purchases (off-the-plan exemption only for new builds)",
    partialConcession: "No first home buyer established concession — standard rates apply",
    maxSaving: "Full exemption on new builds only",
    notes: "SA has the least generous first home buyer stamp duty concession — consider new builds to maximise",
  },
  {
    state: "ACT",
    fullExemption: "Income-tested — singles ≤$160k/couples ≤$190k; property ≤$585k",
    partialConcession: "Above income threshold: 50% concession on properties ≤$585k",
    maxSaving: "~$17,550 on $500k property",
    notes: "ACT also offers the Home Buyer Concession Scheme regardless of first home status for low-to-medium income buyers",
  },
  {
    state: "NT",
    fullExemption: "Up to $650k for all home buyers (not first home specific — general principal residence concession)",
    partialConcession: "Above $650k",
    maxSaving: "~$23,928 on $650k property",
    notes: "Northern Territory has a generous general principal residence concession — applies to first and subsequent buyers",
  },
  {
    state: "TAS",
    fullExemption: "50% concession on established homes up to $600k (first home buyers)",
    partialConcession: "New homes: 50% concession",
    maxSaving: "~$11,640 on $600k established",
    notes: "Tasmania has lower property prices — stamp duty burden is lower than eastern states",
  },
];

const FAQS = [
  {
    q: "What is stamp duty and why do first home buyers need to plan for it?",
    a: "Stamp duty (also called transfer duty) is a state government tax on property purchases. It is calculated as a percentage of the property price, rising progressively with price. On a $700,000 property in NSW (without a concession), stamp duty is approximately $26,990. First home buyer concessions can eliminate or significantly reduce this. Stamp duty must be paid at settlement — it cannot be included in your home loan (though some lenders allow capitalising it into the loan in specific circumstances). It is a major cost that must be saved alongside your deposit.",
  },
  {
    q: "Can I avoid stamp duty entirely as a first home buyer?",
    a: "Yes — in most states, first home buyers can avoid stamp duty if they purchase below the full exemption threshold: NSW ($800k), VIC ($600k), QLD ($550k), WA ($430k established/$530k new). In these states, buying below the threshold means zero stamp duty. In higher-priced markets (Sydney, Melbourne), most first home buyers buying at median prices will be above the threshold and pay some duty, unless they buy a unit/apartment within the exemption range. NSW also offers the Property Tax alternative — a lower annual land tax instead of upfront stamp duty — which some first home buyers find attractive for managing cash flow.",
  },
  {
    q: "How does the NSW Property Tax (stamp duty alternative) work?",
    a: "From 16 January 2023, eligible NSW first home buyers purchasing homes for $1.5M or less can choose between paying stamp duty upfront or an annual property tax of $400 plus 0.3% of the land value. This is particularly attractive if you expect to sell within 5–7 years — the break-even point between paying stamp duty upfront vs the annual property tax is typically 7–10 years. If you&apos;ll own the home long-term, stamp duty upfront may be cheaper in total. If you want to preserve cash, the annual tax is better despite the long-term cost. The property tax moves with the property when sold — the new buyer then chooses their preference.",
  },
  {
    q: "Do stamp duty concessions apply to off-the-plan purchases?",
    a: "Yes — most state first home buyer concessions apply to off-the-plan (new build) purchases. Additionally, some states have separate off-the-plan concessions that provide additional savings (VIC, SA). For off-the-plan purchases, stamp duty is typically calculated on the value of the contract (at contract date) rather than the completion value — this can significantly reduce the stamp duty bill for properties where the value is expected to increase by completion. NSW exemptions apply at the time of contract, not settlement. Always confirm with a solicitor that your contract qualifies.",
  },
];

export default function StampDutyGuidePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "First Home Buyer", url: `${SITE_URL}/first-home-buyer` },
    { name: "Stamp Duty Guide" },
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
            <span className="text-slate-900 font-medium">Stamp Duty</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Stamp duty for first home buyers: state-by-state concessions ({CURRENT_YEAR})
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Every state offers stamp duty concessions for first home buyers — saving up to $31,000
            in VIC and $30,890 in NSW. Know your state&apos;s threshold before you set a budget. In NSW,
            you can also opt for an annual property tax instead of upfront stamp duty.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · State rules change — verify at your state revenue office · Not legal advice</p>
        </div>
      </section>

      {/* State concessions table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">First home buyer stamp duty concessions by state (2024–25)</h2>
          <div className="space-y-4">
            {STATE_CONCESSIONS.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{s.state}</p>
                  <p className="text-xs text-amber-300 font-semibold">{s.maxSaving}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Full exemption</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{s.fullExemption}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Partial concession</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{s.partialConcession}</p>
                  </div>
                  <div className="sm:col-span-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-600 leading-relaxed"><strong>Note:</strong> {s.notes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">Thresholds and concession rules change. Verify at your state revenue office: Revenue NSW, State Revenue Office VIC, Queensland Revenue Office, etc.</p>
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
              { href: "/first-home-buyer/first-home-guarantee", label: "First Home Guarantee" },
              { href: "/first-home-buyer/fhss-guide", label: "FHSS guide" },
              { href: "/first-home-buyer/deposit-guide", label: "Saving your deposit" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Stamp duty thresholds, concessions, and state government schemes change frequently. Always verify at your state revenue office before relying on this information. This page is general information only; it is not legal, financial, or tax advice. Consult a solicitor or licensed conveyancer for stamp duty advice on your specific purchase.
          </p>
        </div>
      </section>
    </div>
  );
}
