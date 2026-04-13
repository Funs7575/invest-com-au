import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { STATE_SURCHARGES } from "@/lib/firb-data";
import { FIRB_DISCLAIMER } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";
import ComplianceFooter from "@/components/ComplianceFooter";

export const metadata: Metadata = {
  title: "Australia's Foreign Buyer Property Ban 2025–2027: What You Can (and Can't) Buy",
  description:
    "From 1 April 2025 to 31 March 2027, foreign persons are banned from buying established dwellings in Australia. Learn who is affected, what you can still buy, exemptions, and what to do next. Updated March 2026.",
  openGraph: {
    title: "Australia's Foreign Buyer Property Ban 2025–2027",
    description:
      "Who is banned, what you can still buy, exemptions, enforcement penalties, and what the ban means for foreign property investors.",
    url: `${SITE_URL}/foreign-investment/guides/property-ban-2025`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Foreign Buyer Property Ban 2025–2027")}&sub=${encodeURIComponent("What You Can Still Buy · Exemptions · Next Steps")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/guides/property-ban-2025` },
};

export const revalidate = 86400;

export default function PropertyBan2025Page() {
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
              { name: "Property Ban 2025–2027" },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "When does the foreign buyer property ban start and end?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "The ban started on 1 April 2025 and runs until 31 March 2027 — a two-year period. The government has indicated it may extend the ban if housing affordability conditions don't improve.",
                },
              },
              {
                "@type": "Question",
                name: "Who is affected by the 2025 foreign buyer property ban?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Foreign persons — including non-residents, temporary visa holders, and foreign-owned companies — are all affected. Australian citizens, permanent residents, and New Zealand citizens living in Australia are exempt.",
                },
              },
            ],
          }),
        }}
      />

      {/* ── Urgent Alert Banner ── */}
      <div className="bg-red-600 text-white">
        <div className="container-custom py-3 flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm font-semibold">
            <strong>Currently in effect:</strong> Established dwelling purchases by foreign persons are banned until 31 March 2027.
          </p>
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
            <span className="text-slate-900 font-medium">Property Ban 2025–2027</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Active Now — Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Australia&apos;s Foreign Buyer{" "}
              <span className="text-red-600">Property Ban 2025–2027</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-500">What You Can and Can&apos;t Buy</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              From 1 April 2025 to 31 March 2027, the Australian government has banned foreign persons from purchasing
              established (existing) dwellings. This is the most significant change to foreign property investment rules
              in decades — and it affects every non-citizen, non-resident, and temporary visa holder in Australia.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/property/listings?firb=true" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
                FIRB-Eligible Listings &rarr;
              </Link>
              <Link href="/property/buyer-agents" className="px-5 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-sm transition-colors">
                Find a Buyer&apos;s Agent
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── The Ban — Key Facts ── */}
        <section className="grid md:grid-cols-3 gap-4">
          {[
            { label: "Ban started", value: "1 April 2025", color: "bg-red-50 border-red-200", textColor: "text-red-700" },
            { label: "Ban ends", value: "31 March 2027", color: "bg-red-50 border-red-200", textColor: "text-red-700" },
            { label: "Duration", value: "2 years exactly", color: "bg-slate-50 border-slate-200", textColor: "text-slate-700" },
            { label: "Who is banned", value: "All foreign persons", color: "bg-red-50 border-red-200", textColor: "text-red-700" },
            { label: "What is banned", value: "Established dwellings", color: "bg-red-50 border-red-200", textColor: "text-red-700" },
            { label: "What is still allowed", value: "New dwellings, off-the-plan, vacant land", color: "bg-emerald-50 border-emerald-200", textColor: "text-emerald-700" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border p-4 ${item.color}`}>
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className={`font-bold text-lg leading-tight ${item.textColor}`}>{item.value}</p>
            </div>
          ))}
        </section>

        {/* ── What is banned / what isn't ── */}
        <section>
          <SectionHeading
            eyebrow="The Ban"
            title="Exactly what is and isn't banned"
            sub="The ban is specific to 'established dwellings' — not all residential property."
          />
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="font-bold text-red-800">BANNED (until 31 March 2027)</h3>
              </div>
              <ul className="space-y-2">
                {[
                  "Established (existing) residential dwellings",
                  "Previously occupied houses",
                  "Previously occupied apartments/units",
                  "Townhouses that have been lived in",
                  "Properties where the seller was a foreign person who previously was banned from buying them",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-red-800">
                    <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-bold text-emerald-800">STILL AVAILABLE (with FIRB approval)</h3>
              </div>
              <ul className="space-y-2">
                {[
                  "New residential dwellings (first sale only)",
                  "Off-the-plan apartments and houses",
                  "Vacant residential land (must build within 4 years)",
                  "Commercial property (separate FIRB rules)",
                  "Agricultural land (separate higher thresholds)",
                  "New dwellings in FIRB-approved developments",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-emerald-800">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Who is affected ── */}
        <section>
          <SectionHeading
            eyebrow="Who Is Affected"
            title="Does the ban apply to you?"
            sub="The ban applies to 'foreign persons' as defined under the Foreign Acquisitions and Takeovers Act 1975."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { group: "Non-resident foreigners", affected: true, desc: "Living overseas and wanting to buy Australian property. Fully banned from established dwellings." },
              { group: "Temporary visa holders", affected: true, desc: "Working holiday, student, 482/457 visa holders currently in Australia. Also banned during this period." },
              { group: "Foreign-owned companies", affected: true, desc: "Entities where foreigners hold 20%+ interest. Treated as foreign persons." },
              { group: "Australian citizens", affected: false, desc: "Fully exempt. No FIRB required and no ban applies — can buy any property." },
              { group: "Permanent residents", affected: false, desc: "Fully exempt from the ban and from most FIRB requirements." },
              { group: "New Zealand citizens in Australia", affected: false, desc: "Generally treated as Australian residents for FIRB purposes. Exempt from established dwelling ban." },
            ].map((item) => (
              <div key={item.group} className={`rounded-xl border p-4 ${item.affected ? "border-red-200 bg-red-50/30" : "border-emerald-200 bg-emerald-50/30"}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.affected ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {item.affected ? "Banned" : "Exempt"}
                  </span>
                  <span className="font-bold text-sm text-slate-800">{item.group}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed ml-14">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why the ban was introduced ── */}
        <section>
          <SectionHeading
            eyebrow="Background"
            title="Why was the ban introduced?"
            sub="The ban is part of the Albanese government's housing affordability strategy."
          />
          <div className="prose prose-sm max-w-none text-slate-600 space-y-4">
            <p>
              The Australian government introduced the ban in 2025 as part of a broader strategy to reduce competition
              for established housing stock and improve affordability for Australian buyers and renters. The policy
              specifically targets established dwellings — not new construction — to preserve investment in new housing
              supply while reducing foreign competition for existing homes.
            </p>
            <p>
              The ban was announced in the 2024–25 Budget and took effect on 1 April 2025. It is time-limited to two
              years, running until 31 March 2027, after which the government will assess housing market conditions before
              deciding whether to extend, modify, or remove it.
            </p>
            <p>
              The ATO is the primary enforcement agency. It has expanded its data-matching capabilities and FIRB
              monitoring systems to detect unauthorised purchases. Penalties for non-compliance are severe: forced
              divestiture orders (requiring you to sell, often at a loss), civil fines up to 25% of property value,
              and potential criminal prosecution.
            </p>
          </div>
        </section>

        {/* ── Enforcement & penalties ── */}
        <section className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <h2 className="font-bold text-red-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Penalties for Breaching the Ban
          </h2>
          <div className="space-y-2 text-sm text-red-800">
            <p><strong>Divestiture orders:</strong> The ATO or Treasurer can order you to sell the property — typically within 12 months and at market value, but without the leverage to negotiate. Legal costs and taxes are your responsibility.</p>
            <p><strong>Civil fines:</strong> Up to the greater of $330,000 (individuals) or 25% of the property value.</p>
            <p><strong>Criminal prosecution:</strong> Up to 3 years imprisonment and/or fines for the most serious breaches.</p>
            <p><strong>Facilitation penalties:</strong> Lawyers, conveyancers, and agents who knowingly facilitate a breach also face penalties.</p>
          </div>
        </section>

        {/* ── What to do now ── */}
        <section>
          <SectionHeading
            eyebrow="What to Do"
            title="Your options as a foreign investor right now"
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                option: "Buy a new development",
                desc: "The most straightforward path. New apartments and house-and-land packages from FIRB-approved developers are fully available. Many offer fixed-price contracts with settlement 1–3 years away.",
                href: "/property/listings?firb=true",
                cta: "Browse FIRB-Eligible Listings",
              },
              {
                option: "Buy off-the-plan",
                desc: "Purchase before construction completes. You pay the deposit now and settle when built. This locks in today's price and gives time to organise finance.",
                href: "/foreign-investment/guides/buy-property-australia-foreigner",
                cta: "Off-the-plan buyer's guide",
              },
              {
                option: "Buy vacant land",
                desc: "Purchase vacant residential land and build a new dwelling within 4 years. Gives you control over the construction but requires a longer timeline and construction finance.",
                href: "/property/buyer-agents",
                cta: "Find a buyer's agent",
              },
              {
                option: "Wait for the ban to lift",
                desc: "The ban is scheduled to end 31 March 2027. If you need an established property in a specific location, waiting may be the right call — particularly if you're targeting a specific suburb.",
                href: "/advisors",
                cta: "Get investment advice",
              },
            ].map((opt) => (
              <div key={opt.option} className="rounded-xl border border-slate-200 p-5 hover:border-amber-200 transition-colors">
                <h3 className="font-bold text-slate-800 mb-2">{opt.option}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">{opt.desc}</p>
                <Link href={opt.href} className="text-sm font-semibold text-amber-600 hover:text-amber-700">
                  {opt.cta} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── State-specific impact ── */}
        <section>
          <SectionHeading
            eyebrow="State Impact"
            title="Impact by state — which markets are most affected?"
            sub="The ban affects all states equally, but the practical impact varies by market conditions."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">State</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Stamp Duty Surcharge</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Land Tax Surcharge</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Key Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {STATE_SURCHARGES.map((s) => (
                  <tr key={s.stateCode} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.state}</td>
                    <td className="px-4 py-3 font-bold text-red-700">{s.surchargePercent}%</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {s.landTaxSurchargePercent ? `${s.landTaxSurchargePercent}% p.a.` : "None"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Related content ── */}
        <section>
          <SectionHeading eyebrow="Related Guides" title="More on buying Australian property as a foreigner" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "How to Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "FIRB Application: Complete Step-by-Step Guide", href: "/foreign-investment/guides/firb-application-guide" },
              { title: "Foreign Buyer Stamp Duty by State (2026)", href: "/foreign-investment/guides/stamp-duty-foreign-buyers" },
              { title: "Can Non-Residents Open an Australian Bank Account?", href: "/foreign-investment/guides/non-resident-bank-account" },
              { title: "FIRB Property Guide", href: "/property/foreign-investment" },
              { title: "Send Money to Australia — FX Comparison", href: "/foreign-investment/send-money-australia" },
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
      <div className="container-custom pb-8"><ComplianceFooter variant="firb" /></div>

    </div>
  );
}
