import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What aquaculture leases are required in Australia and how are they granted?",
    a: "Aquaculture leases are granted by state and territory government agencies (e.g. NSW DPI, DPIRD in WA, DPIPWE in Tasmania, PIRSA in SA). A lease grants the right to occupy coastal or inland waters for aquaculture, typically for 10–30 years with renewal options. Lease areas are specified by coordinates and may include tidal or subtidal zones. Most states require a development consent alongside the lease. FIRB approval is required for foreign interests acquiring aquaculture leases or businesses above the applicable threshold ($0 for foreign government-related investors, $1.339B for private).",
  },
  {
    q: "Are there ASX-listed aquaculture companies?",
    a: "Huon Aquaculture (formerly ASX: HUO) was acquired by JBS S.A. (Brazil) in 2021 for $425M, delisting it. Tassal Group (formerly TAS) was acquired by Cooke Inc (Canada) in 2022 for $1.09B, also delisting. There are currently no pure-play Australian aquaculture companies on the ASX. Investors seeking listed aquaculture exposure are limited to NZ-listed Sanford and Seafood Holdings, or global names. Private equity and unlisted fund structures dominate Australian aquaculture ownership.",
  },
  {
    q: "What biosecurity risks affect Australian aquaculture investments?",
    a: "The key biosecurity threats depend on species. Atlantic salmon farming in Tasmania faces risks from amoebic gill disease (AGD), infectious salmon anaemia (ISA) and sea lice — all of which have caused significant stock losses globally. Oyster production faces Pacific Oyster Mortality Syndrome (POMS). Prawn farming risks white spot disease, which devastated Queensland operations in 2016–2017. Sea cage escapes and interaction with wild fisheries are secondary but material risks. Investors should assess the operator&apos;s biosecurity protocols, insurance coverage and geographic diversification as due diligence priorities.",
  },
  {
    q: "How is aquaculture income taxed in Australia?",
    a: "Aquaculture is classified as a primary production business under the Income Tax Assessment Act 1997. This entitles operators to access primary producer tax concessions including income averaging (to smooth volatile annual incomes over up to 5 years), FMDs (Farm Management Deposits — tax-deductible deposits that can be drawn down in low-income years) and accelerated depreciation on eligible depreciating assets. Investors in aquaculture trust structures or managed investment schemes will receive trust distributions treated as ordinary income or capital gains depending on the scheme structure.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Australian Aquaculture (${CURRENT_YEAR}) — Salmon, Oysters & Marine Farming`,
  description:
    "Guide to aquaculture investment in Australia. Salmon, oysters, prawns and marine farming. Lease structures, biosecurity risks, FIRB rules and PE access.",
  alternates: { canonical: `${SITE_URL}/invest/aquaculture` },
  openGraph: {
    title: `Australian Aquaculture Investment (${CURRENT_YEAR})`,
    description: "Marine farming, lease structures, biosecurity risks and investment access.",
    url: `${SITE_URL}/invest/aquaculture`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Aquaculture Investment Australia")}&sub=${encodeURIComponent("Seafood · Fish Farming · Returns · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function AquaculturePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Aquaculture", url: absoluteUrl("/invest/aquaculture") },
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
              <span className="text-white font-medium">Aquaculture</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-cyan-600 text-white px-3 py-1 rounded-full">FIRB Applicable</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Aquaculture Investment in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Australia produces 100,000+ tonnes of farmed seafood annually — led by Atlantic salmon, Pacific oysters, prawns and barramundi. With two major ASX-listed players acquired by foreign buyers, the sector is now primarily a private equity and direct-investment market.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "$1.6B", l: "Annual production value", sub: "ABARES 2024 estimate" },
                { v: "~75%", l: "Salmon dominance", sub: "of AU aquaculture by value" },
                { v: "TAS", l: "Primary salmon zone", sub: "+ SA, WA emerging" },
                { v: "FIRB", l: "Foreign buyer rules", sub: "apply to all leases" },
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
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to invest in Australian aquaculture</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Direct farm acquisition or lease",
                  badge: "Direct",
                  body: "Acquiring an existing salmon, oyster or prawn farm requires state government lease consent and, for foreign buyers, FIRB approval. Typical salmon farm transactions are $5M–$100M depending on lease area, cage equipment and broodstock. Oyster leases in NSW and SA can transact at $100K–$2M for established sites. Due diligence must include biosecurity history, lease remaining term, and local council approvals.",
                },
                {
                  title: "Agribusiness private equity funds",
                  badge: "Wholesale fund",
                  body: "Agricultural private equity funds — Roc Partners, Laguna Bay, Gunn Agri Partners — invest in primary production including aquaculture. These are wholesale-only managed investment schemes with 7–10 year lock-ups and $500K–$5M minimums. Returns typically target 12–18% IRR. Some funds specifically focus on Tasmanian salmon farming or oyster production.",
                },
                {
                  title: "Managed aquaculture investment schemes",
                  badge: "MIS",
                  body: "Registered managed investment schemes that pool investor capital into aquaculture operations have a mixed history in Australia — the 2000s saw several failed agri-MIS structures. Contemporary schemes focus on oysters and barramundi with tighter ASIC oversight. Investors receive a share of production income and any capital appreciation on lease values. Assess the responsible entity&apos;s track record and ASIC registration carefully.",
                },
                {
                  title: "Farmed seafood processing and export",
                  badge: "Adjacent",
                  body: "Aquaculture processing and logistics businesses — cold chain, export packaging, live seafood air freight — offer indirect exposure with lower biosecurity risk than farming. Markets include China (WA lobster), Japan (premium salmon) and the US. These B2B businesses can be acquired at 4–7x EBITDA in private transactions.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full">{item.badge}</span>
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
              href="/invest/aquaculture/listings"
              className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-cyan-50 to-cyan-100/40 border border-cyan-200 rounded-2xl hover:border-cyan-300 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-extrabold text-cyan-900 text-lg">Browse aquaculture listings</p>
                <p className="text-sm text-cyan-700 mt-0.5">Active farms, leases and investment opportunities on invest.com.au</p>
              </div>
              <span className="text-cyan-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Browse →</span>
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
              <Link href="/advisors/wealth-managers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a wealth manager →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
