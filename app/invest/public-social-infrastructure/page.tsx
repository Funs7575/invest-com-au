import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What is Specialist Disability Accommodation (SDA) and how is it funded?",
    a: "SDA is purpose-built housing for NDIS participants with very high support needs, funded by the NDIS under the Specialist Disability Accommodation Pricing and Payments Framework. The NDIA pays SDA providers directly at regulated prices per participant per year — ranging from ~$22,000 for improved liveability to ~$80,000+ for fully accessible or high-physical-support designs in major cities. SDA developers must be registered with the NDIS Commission. Lease income is government-backed, typically long-term (3–20 years), making it attractive for infrastructure investors seeking income certainty.",
  },
  {
    q: "Who are the main SDA investment REITs and funds?",
    a: "The primary listed vehicle is Centuria Capital (CNI) through its SDA portfolio, and HWUST (HMC Capital&apos;s social housing sub-fund). Unlisted: Summer Housing, Compass Housing Services and Independent Living Specialists operate SDA portfolios with external investor capital. Roberts Co and Altis Property Partners have developed SDA projects for superannuation funds. Returns target 6–9% yield on cost (stabilised), with capital appreciation from increased NDIS pricing and scarcity of compliant stock. The NDIS participant pipeline provides multi-decade demand visibility.",
  },
  {
    q: "What are Social Impact Bonds (SIBs) and how do they work in Australia?",
    a: "Social Impact Bonds (also called Social Benefit Bonds in NSW/VIC) are outcome-based contracts where government pays investors only if a social program achieves defined outcome targets — recidivism reduction, out-of-home-care diversion, homelessness prevention. Investors provide upfront capital; the program is delivered by a non-profit; government evaluates outcomes after 2–5 years. NSW has run SIBs since 2013 (The Benevolent Society, UnitingCare). Returns are typically 7–11% IRR on success, lower or zero on failure. SIBs are wholesale-only instruments.",
  },
  {
    q: "What is the difference between social infrastructure and traditional infrastructure investing?",
    a: "Traditional infrastructure — roads, airports, ports, utilities — is asset-heavy and depends on usage volume (tolls, throughput). Social infrastructure — hospitals, schools, correctional facilities, disability housing — depends on government payments tied to capacity availability rather than usage. This makes social infrastructure more like a regulated utility: income is stable but capped, and returns are driven by government reimbursement pricing rather than market demand. Social infrastructure typically offers lower but more predictable returns (6–10% vs 8–15% for economic infrastructure) with a strong ESG profile.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Public Social Infrastructure in Australia (${CURRENT_YEAR}) — SDA, Social Housing & SIBs`,
  description:
    "Social infrastructure investing: NDIS Specialist Disability Accommodation (SDA), social housing, social impact bonds, and government-backed income streams.",
  alternates: { canonical: `${SITE_URL}/invest/public-social-infrastructure` },
  openGraph: {
    title: `Australian Public Social Infrastructure Investment (${CURRENT_YEAR})`,
    description: "SDA, social housing, social impact bonds and government-backed income assets.",
    url: `${SITE_URL}/invest/public-social-infrastructure`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Public Social Infrastructure Investment")}&sub=${encodeURIComponent("Hospitals · Schools · Government · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function PublicSocialInfrastructurePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Public Social Infrastructure", url: absoluteUrl("/invest/public-social-infrastructure") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Public Social Infrastructure</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-teal-600 text-white px-3 py-1 rounded-full">Government-Backed Income</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Public Social Infrastructure Investment in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Government-funded social assets — disability housing, social impact bonds, justice facilities — offer stable income backed by NDIS, state government, and Commonwealth payments. Growing institutional allocation as superannuation funds seek ESG-aligned infrastructure.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "~$40B", l: "NDIS annual expenditure", sub: "2024–25 budget estimate" },
                { v: "6–9%", l: "SDA target yield", sub: "stabilised, on cost" },
                { v: "7–11%", l: "SIB target IRR", sub: "on success outcomes" },
                { v: "Long-term", l: "Government leases", sub: "3–20 year terms typical" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ways to invest */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Categories of social infrastructure investment</h2>
            <div className="space-y-4">
              {[
                {
                  title: "NDIS Specialist Disability Accommodation (SDA)",
                  badge: "NDIS-backed",
                  body: "SDA is government-backed housing for NDIS participants with extreme functional impairment or very high support needs. The NDIA pays regulated annual prices per participant — from $22K to $80K+ depending on design category and location. SDA developers and property trusts offer investors a direct government-income stream with 20–25 year asset lives. Registration with the NDIS Commission is required to access NDIA payments.",
                },
                {
                  title: "Social housing and affordable housing",
                  badge: "State-backed",
                  body: "Community housing providers (CHPs) — HousingFirst, Evolve Housing, Aboriginal Housing Victoria — develop social housing with government capital subsidies (NHFIC bond aggregation, HAFF grants) and Commonwealth Rent Assistance income. Super funds invest via NHFIC Social Bond issuances and direct equity in CHP development vehicles. Yields 4–7% before capital appreciation; below-market rents constrain income but government subsidies fill the gap.",
                },
                {
                  title: "Social Impact Bonds (SIBs)",
                  badge: "Wholesale only",
                  body: "Outcome-based contracts where investors fund a social program and are repaid with returns if government-defined outcomes are achieved (e.g. reduction in out-of-home care placements, lower recidivism). NSW, VIC and WA have existing SIB programs. Wholesale investors only. Returns are contingent — 0–11% IRR depending on outcome performance. The market is niche (~$500M total issuance in Australia).",
                },
                {
                  title: "Justice and correctional infrastructure",
                  badge: "PPP / listed",
                  body: "Public-private partnership correctional facilities — managed by Serco, Sodexo, G4S/Allied Universal — provide government-contracted infrastructure returns. Broadspectrum and John Holland Group develop and operate correctional assets. ASX-listed infrastructure funds (IFT, APA Group) may have indirect exposure. Returns are availability-based (paid for beds, not for prisoner numbers), providing high revenue certainty.",
                },
                {
                  title: "Healthcare and aged care facilities",
                  badge: "REIT / listed",
                  body: "ASX-listed: Healthco Healthcare and Wellness REIT (HCW), Charter Hall Social Infrastructure REIT (CQE) and Elanor Healthcare Real Estate Fund provide exposure to hospitals, aged care facilities, childcare centres, and government leased health assets. These are liquid, diversified, with 6–8% distribution yields and government/quasi-government tenants.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-teal-100 text-teal-700 px-2 py-1 rounded-full">{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Listings CTA */}
        <section className="py-8 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <Link
              href="/invest/public-social-infrastructure/listings"
              className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-teal-50 to-teal-100/40 border border-teal-200 rounded-2xl hover:border-teal-300 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-extrabold text-teal-900 text-lg">Browse social infrastructure listings</p>
                <p className="text-sm text-teal-700 mt-0.5">SDA, social housing and social impact opportunities on invest.com.au</p>
              </div>
              <span className="text-teal-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Browse →</span>
            </Link>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance + nav */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">All investment categories →</Link>
              <Link href="/invest/infrastructure" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Infrastructure guide →</Link>
              <Link href="/aged-care" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Aged care guide →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
