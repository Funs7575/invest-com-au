import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What is an ACCU and how is it priced?",
    a: "An Australian Carbon Credit Unit (ACCU) represents one tonne of CO₂-equivalent abatement, issued by the Clean Energy Regulator under the Emissions Reduction Fund. ACCUs trade on the voluntary over-the-counter market and via broker-arranged deals, with spot prices ranging from $35–$55/tonne since the Safeguard Mechanism reform in 2023. There is no central exchange with real-time pricing — most retail access is through intermediaries or ASX-listed companies. The federal government also purchases ACCUs via contracts for difference (CfD auctions) at fixed strike prices, providing revenue certainty to project proponents.",
  },
  {
    q: "What is the difference between ACCUs and voluntary carbon credits (VCCs)?",
    a: "ACCUs are government-issued units under Australian law with regulatory demand via the Safeguard Mechanism — liable entities must surrender one ACCU per tonne above their baseline, or pay the Safeguard credit charge (~$75/tonne rising annually). VCCs (also called VERs or carbon offsets) are issued by private standards bodies like Verra (VCS), Gold Standard or the American Carbon Registry for voluntary markets. VCCs typically trade at a large discount to ACCUs ($5–$25/tonne for low-quality, $25–$50 for high-quality nature-based). ACCUs are not interchangeable with VCCs under the Safeguard Mechanism.",
  },
  {
    q: "Are carbon credits taxed as ordinary income or capital gains in Australia?",
    a: "The tax treatment depends on how you hold them. For individual investors holding carbon units as investments (not in business): gains from disposal are generally capital gains, eligible for the 50% discount if held 12+ months. For entities that are 'carbon unit traders' under section 420-10 of ITAA 1997, units are treated as trading stock and gains/losses are ordinary income. ACCU income received by project proponents under CfD auctions is ordinary income. The ATO has specific guidance in TR 2021/2 — get advice before trading at scale.",
  },
  {
    q: "How does the Safeguard Mechanism create investment demand for ACCUs?",
    a: "The Safeguard Mechanism requires ~215 of Australia's highest-emitting industrial facilities to reduce their net emissions intensity to net zero by 2050, with annual declining baselines. Where a facility exceeds its baseline, it must surrender ACCUs (or Safeguard Mechanism Credits — SMCs) at the rate of one unit per excess tonne, or pay the non-compliance charge (~$275/tonne). This creates structural demand for ACCUs from heavy industry, LNG exporters and cement manufacturers. The CER publishes annual Safeguard compliance data showing which facilities buy offsets.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Carbon & Environmental Markets in Australia (${CURRENT_YEAR})`,
  description:
    "Guide to carbon credit investing in Australia. ACCUs, voluntary carbon markets, Safeguard Mechanism, and ASX-listed carbon-exposed companies.",
  alternates: { canonical: `${SITE_URL}/invest/carbon-environmental-markets` },
  openGraph: {
    title: `Australian Carbon & Environmental Markets (${CURRENT_YEAR})`,
    description: "ACCUs, Safeguard Mechanism, voluntary markets and ASX-listed carbon plays.",
    url: `${SITE_URL}/invest/carbon-environmental-markets`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Carbon & Environmental Markets")}&sub=${encodeURIComponent("ACCUs · ETFs · ESG · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function CarbonEnvironmentalMarketsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Carbon & Environmental Markets", url: absoluteUrl("/invest/carbon-environmental-markets") },
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
              <span className="text-white font-medium">Carbon &amp; Environmental Markets</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1 rounded-full">Safeguard Mechanism Reform</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Carbon &amp; Environmental Markets in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              The Safeguard Mechanism reform created Australia&rsquo;s first true carbon compliance market. ACCUs trade at $35–55/tonne with structural demand from 215 major emitters — and the voluntary market adds a separate layer of nature-based and tech-removal credits.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "$35–55", l: "ACCU spot price", sub: "AUD per tonne CO₂-e" },
                { v: "215", l: "Safeguard facilities", sub: "compliance-driven buyers" },
                { v: "~28M", l: "ACCUs issued to date", sub: "since 2012 inception" },
                { v: "2050", l: "Net-zero target", sub: "under Safeguard baselines" },
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

        {/* Market structure */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to invest in Australian carbon markets</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Direct ACCU holdings",
                  badge: "Wholesale / direct",
                  body: "Investors can hold ACCUs in a registry account via the Australian National Registry of Emissions Units (ANREU) and trade OTC through intermediaries such as Monash Carbon Group, South Pole, and major banks. Spot trading is largely OTC with no central exchange. ACCUs are registered securities under the Carbon Credits (Carbon Farming Initiative) Act 2011.",
                },
                {
                  title: "Carbon project developer equity",
                  badge: "ASX-listed",
                  body: "Carbon Streaming Corp (CRE on TSX/ASX), and non-listed project developers, acquire future ACCUs in exchange for upfront capital to fund projects (reforestation, soil carbon, landfill gas). Investors receive equity exposure to ACCU price upside without holding the units directly. This structure bundles carbon optionality with project development risk.",
                },
                {
                  title: "ASX-listed carbon-adjacent equities",
                  badge: "ASX-listed",
                  body: "Companies like Clean Earth Capital, Nuvos, and large-cap landholders with soil carbon programs (AACo, Elders) have varying ACCU revenue exposure. The XJO includes emitters who are Safeguard buyers — the carbon price is a cost factor for BHP, Rio, Santos, Woodside, and Boral. Avoid confusing carbon price sensitivity with direct carbon investment.",
                },
                {
                  title: "Voluntary carbon funds",
                  badge: "Wholesale",
                  body: "Wholesale-only managed funds pool capital to purchase ACCUs and international voluntary credits (Verra VCS, Gold Standard) with the intent to sell into rising compliance demand. Returns depend on ACCU price appreciation, credit quality premiums, and forward contract execution. These are illiquid closed-end structures — redemption windows are typically annual.",
                },
                {
                  title: "Biodiversity certificates (BioCertificates)",
                  badge: "Emerging",
                  body: "The Nature Repair Market Act 2023 established a new biodiversity certificate market, issuing BioCertificates for habitat protection and restoration. The market opened in mid-2024 via a registry administered by the Clean Energy Regulator. Voluntary demand is expected from corporates pursuing Nature Positive commitments. Pricing and liquidity are nascent — treat as speculative and illiquid.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{item.badge}</span>
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
              href="/invest/carbon-environmental-markets/listings"
              className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-50 to-emerald-100/40 border border-emerald-200 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-extrabold text-emerald-900 text-lg">Browse carbon &amp; environmental listings</p>
                <p className="text-sm text-emerald-700 mt-0.5">Active carbon projects and opportunities on invest.com.au</p>
              </div>
              <span className="text-emerald-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Browse →</span>
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
              <Link href="/invest/renewable-energy" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Renewable energy guide →</Link>
              <Link href="/advisors/wealth-managers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a wealth manager →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
