import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Can foreign investors buy Australian livestock stations?",
    a: "Foreign investors must obtain FIRB approval to acquire interests in Australian agricultural land and businesses. For private foreign investors, the threshold is $15M cumulative (reduced from $55M in 2015). Foreign government-related entities have a $0 threshold — all acquisitions require approval. Large station acquisitions by Chinese, US or Middle Eastern capital have faced scrutiny and some refusals on national interest grounds. FIRB approval typically includes conditions on water licence use, employment practices, and export reporting.",
  },
  {
    q: "What returns do Australian livestock stations generate?",
    a: "Pasture-based cattle stations in northern Australia typically generate 2–5% cash yield on land value before capital appreciation. Prime lamb and Merino wool properties in southern Australia target 4–8% EBITDA/equity depending on season and wool price. Capital appreciation in pastoral land has averaged 6–10% per annum over the past decade, driven by strong beef export demand (particularly Japan, Korea, US) and institutional appetite for agricultural land. AACo (ASX: AAC) and Elders (ASX: ELD) report publicly — their financials provide benchmarks.",
  },
  {
    q: "How do I access livestock investment without direct station ownership?",
    a: "Three routes for non-direct access: (1) ASX-listed: AACo (AAC) owns 7M+ ha of northern Australian cattle stations; Elders (ELD) has station agency, genetics and rural services; Nufarm (NUF) and GrainCorp (GNC) are adjacent. (2) Agricultural managed funds: Macquarie Infrastructure and Real Assets (MIRA), Laguna Bay, and Roc Partners run wholesale agricultural funds with livestock exposure. (3) Agri debt: Some credit funds provide station-secured pastoral loans at 8–12% interest — investors access the debt side without equity volatility.",
  },
  {
    q: "What water rights come with a livestock station and how are they valued?",
    a: "Most Australian pastoral leases include bore and surface water access entitlements, not tradeable water allocations. Freehold properties in the Murray–Darling Basin often include tradeable irrigation entitlements (separate property). In Queensland, unregulated water licences attach to property. Water entitlement value has surged — high-reliability irrigation entitlements in Victoria and NSW now trade at $600–$1,400/ML. Valuing a station correctly requires disaggregating land, improvements, water rights and cattle enterprise separately. Carbon credit potential (soil carbon, methane reduction) adds an emerging revenue layer.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Australian Livestock & Pastoral Stations (${CURRENT_YEAR})`,
  description:
    "Guide to livestock investment in Australia. Cattle stations, sheep properties, AACo, Elders, FIRB rules, water rights, carbon credits and agricultural managed funds.",
  alternates: { canonical: `${SITE_URL}/invest/livestock` },
  openGraph: {
    title: `Australian Livestock & Pastoral Investment (${CURRENT_YEAR})`,
    description: "Cattle stations, sheep properties, returns, FIRB rules and ASX-listed access.",
    url: `${SITE_URL}/invest/livestock`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Livestock Investment Australia")}&sub=${encodeURIComponent("Cattle · Sheep · Managed Schemes · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function LivestockPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Livestock", url: absoluteUrl("/invest/livestock") },
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
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Livestock</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-orange-600 text-white px-3 py-1 rounded-full">FIRB Applicable</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Livestock &amp; Pastoral Station Investment in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Australia runs 25M+ cattle and 65M+ sheep across 400M ha of agricultural land. Institutional demand from superannuation funds and offshore capital has driven pastoral land appreciation of 6–10% p.a. over the past decade.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "400M ha", l: "Agricultural land area", sub: "50% of Australian land mass" },
                { v: "2–8%", l: "Cash yield range", sub: "on property value" },
                { v: "+6–10%", l: "Land appreciation p.a.", sub: "10-year average" },
                { v: "$15M", l: "FIRB threshold", sub: "cumulative foreign investment" },
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
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to invest in Australian livestock</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Direct station ownership",
                  badge: "Direct",
                  body: "Purchasing a pastoral or grazing property outright — running cattle, sheep or mixed enterprise. Northern Australia (NT, QLD, WA north) favours large-scale extensive beef production. Southern Australia (VIC, SA, southern NSW) is dominated by sheep and wool, or lamb finishing. Direct ownership includes management responsibility unless you employ a station manager.",
                },
                {
                  title: "ASX-listed: AACo (AAC) and Elders (ELD)",
                  badge: "ASX-listed",
                  body: "Australian Agricultural Company (AAC) is the largest vertically-integrated beef producer, owning 7M+ ha across QLD and NT plus a Darwin abattoir. Elders (ELD) provides station agency, livestock genetic services (Elders Genetics), and rural financial services — not direct cattle exposure but significant agri leverage. Both trade on the ASX with quarterly updates.",
                },
                {
                  title: "Agricultural managed funds (wholesale)",
                  badge: "Wholesale",
                  body: "Macquarie Agricultural Funds Management, Laguna Bay, Gunn Agri Partners and First Sentier (formerly CFSGAM) manage diversified agricultural portfolios including pastoral and livestock assets. These are wholesale-only with 10-year lock-ups and $500K+ minimums. Superannuation funds (CBUS, Aware Super) invest directly into agricultural land alongside these managers.",
                },
                {
                  title: "Carbon + livestock integration",
                  badge: "Emerging",
                  body: "Many pastoral properties are now developing secondary ACCU income streams — soil carbon programs, methane reduction programs (3-NOP feed additive, selective breeding), and avoided deforestation projects. Carbon revenue can add 5–15% to station EBITDA. Investors buying stations should model the ACCU potential separately — ERF methodology improvements have significantly increased the commercial viability.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{item.badge}</span>
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
              href="/invest/livestock/listings"
              className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-orange-50 to-orange-100/40 border border-orange-200 rounded-2xl hover:border-orange-300 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-extrabold text-orange-900 text-lg">Browse livestock listings</p>
                <p className="text-sm text-orange-700 mt-0.5">Pastoral stations and livestock investment opportunities on invest.com.au</p>
              </div>
              <span className="text-orange-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Browse →</span>
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
              <Link href="/invest/farmland" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Farmland guide →</Link>
              <Link href="/invest/carbon-environmental-markets" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Carbon markets →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
