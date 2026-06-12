import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What is the ESIC tax concession for early-stage VC investing?",
    a: "The Early Stage Innovation Company (ESIC) regime provides Australian investors with a 20% non-refundable tax offset on investments in qualifying early-stage companies (capped at $200,000 per investor per year) and a 10-year CGT exemption on gains from shares held for 12+ months. The company must have less than $1M in expenses and $200K in income in the prior year, and must show evidence of a high-growth business model. This makes direct angel or seed investment tax-advantaged — but the company must apply for ESIC status.",
  },
  {
    q: "Can retail investors access Australian VC funds?",
    a: "Most VC funds — including Blackbird, Square Peg, AirTree, EVP and Carthona — are wholesale-only managed investment schemes. They require investors to meet the sophisticated investor test (s708(8): $250,000 annual income or $2.5M in net assets) or the wholesale investor test via accountant certificate (s708(10)). Retail investors can get indirect exposure through ASX-listed VC plays (MFF, Bailador Technology Investments - BTI), or via retail-accessible platforms that hold stakes in qualifying startups under the CSF regime — though CSF offerings are small-cap and illiquid.",
  },
  {
    q: "What returns do Australian VC funds target?",
    a: "Top-quartile Australian VC funds target 3–5x DPI (distributed to paid-in capital) over 10-year horizons, implying an IRR of roughly 25–35%. Median fund performance is materially lower — the Cambridge Associates data on Australian VC shows pooled returns closer to 12–18% IRR over the past decade. Power-law dynamics dominate: the best 10–15% of investments in a fund typically generate 70%+ of returns. Diversification across at least 15–20 companies is considered table stakes for early-stage venture.",
  },
  {
    q: "How are VC fund gains taxed in Australia?",
    a: "Gains on VC fund investments held for 12+ months through a trust structure retain their capital gain character at the investor level and are eligible for the 50% CGT discount. For direct shareholdings meeting ESIC criteria, the full gain is exempt from CGT after 12 months. Non-ESIC direct holdings: standard CGT treatment (50% discount after 12 months). Carried interest paid to fund managers is treated as capital gain in the fund, retaining that character when distributed. Always confirm fund structure with your tax adviser.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Australian Venture Capital (${CURRENT_YEAR}) — VC Funds, ESIC & Co-Investing`,
  description:
    "Guide to VC investing in Australia. Blackbird, Square Peg, AirTree, ESIC tax offsets, wholesale access and ASX-listed VC plays.",
  alternates: { canonical: `${SITE_URL}/invest/venture-capital` },
  openGraph: {
    title: `Invest in Australian Venture Capital (${CURRENT_YEAR})`,
    description:
      "VC funds, ESIC concessions, wholesale access and the emerging co-investment market.",
    url: `${SITE_URL}/invest/venture-capital`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Invest in Australian Venture Capital")}&sub=${encodeURIComponent("VC Funds · ESIC · Wholesale Access · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function VentureCapitalPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Venture Capital", url: absoluteUrl("/invest/venture-capital") },
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
              <span className="text-white font-medium">Venture Capital</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-violet-600 text-white px-3 py-1 rounded-full">Wholesale Investor</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Venture Capital Investing in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Australian VC deployed over $3B in 2024. Blackbird, Square Peg and AirTree lead a maturing ecosystem — with ESIC tax offsets adding an additional lever for early-stage angles.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "$3B+", l: "AU/NZ VC deployed", sub: "2024 calendar year" },
                { v: "20%", l: "ESIC tax offset", sub: "on qualifying investments" },
                { v: "3–5×", l: "Top-quartile DPI", sub: "over 10-year fund life" },
                { v: "15–25", l: "Companies per fund", sub: "typical portfolio size" },
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

        {/* Ways to access */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to access Australian VC</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Top-tier VC fund LPs (wholesale)",
                  body: "Blackbird Ventures (largest AU/NZ fund, $1.5B+ AUM), Square Peg Capital (Israel-AU bi-coastal), AirTree Ventures (Series A–B focus), EVP, Carthona Capital, Rampersand. LP allocations in institutional funds start at $500K–$5M. Feeder funds and secondaries platforms occasionally offer smaller minimums for wholesale investors.",
                  badge: "Wholesale",
                },
                {
                  title: "Angel investing + ESIC",
                  body: "Direct angel investment in pre-seed and seed rounds qualifies for the ESIC 20% tax offset (capped at $200K investment per year) and a 10-year CGT exemption on qualifying gains. Angel syndicates — Scale Investors, Sydney Angels, Melbourne Angels — pool deal flow and diligence for accredited angels. Minimum tickets typically $5,000–$50,000 per deal.",
                  badge: "ESIC eligible",
                },
                {
                  title: "ASX-listed VC plays",
                  body: "Bailador Technology Investments (BTI) is an ASX-listed NTA-exposed VC trust holding SiteMinder, Rezdy and other scale-ups. MFF Capital (MFF) has indirect VC optionality. HUB24 (HUB) and Netwealth (NWL) are platform plays often mentioned in the VC adjacency space. These provide liquidity and quarterly disclosure not available in direct LP stakes.",
                  badge: "ASX-listed",
                },
                {
                  title: "Equity crowdfunding (retail access)",
                  body: "Birchal and Equitise operate licensed CSEF (Crowd-Sourced Equity Funding) platforms under the ASIC regime. Companies raising under CSF can take up to $5M per year; investors can invest up to $10,000 per company per year. Investments are early-stage with high failure rates and limited secondary liquidity — treat as speculative allocation.",
                  badge: "Retail accessible",
                },
                {
                  title: "Innovation accelerators & incubators",
                  body: "Startmate, Antler, and university programs (UNSW Founders, Melbourne Accelerator Programme) offer co-investor rights on demo-day graduates. Some run syndicate vehicles open to alumni investors. Return profiles are seed-stage: binary outcomes with 5–7 year illiquidity horizons.",
                  badge: "Co-invest",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-violet-100 text-violet-700 px-2 py-1 rounded-full">{item.badge}</span>
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
              href="/invest/venture-capital/listings"
              className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-violet-50 to-violet-100/40 border border-violet-200 rounded-2xl hover:border-violet-300 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-extrabold text-violet-900 text-lg">Browse VC listings</p>
                <p className="text-sm text-violet-700 mt-0.5">Active VC funds and co-investment opportunities on invest.com.au</p>
              </div>
              <span className="text-violet-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Browse →</span>
            </Link>
          </div>
        </section>

        {/* ESIC explainer */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">The ESIC advantage</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "20% tax offset", body: "Non-refundable offset against your tax liability. $50K invested → up to $10K off your tax bill. Capped at $200K investment per year (i.e. up to $40K offset)." },
                { title: "10-year CGT exemption", body: "Shares held 12+ months and sold within 10 years are fully exempt from CGT — no 50% discount required, the whole gain is excluded. This is materially better than standard CGT treatment." },
                { title: "Company must qualify", body: "ESIC status is company-driven: they must have <$1M expenses, <$200K income, and demonstrate an innovative, high-growth business model (points test or principles test). Ask for the ESIC determination letter before investing." },
              ].map((b) => (
                <div key={b.title} className="rounded-xl border border-violet-200 bg-violet-50 p-5">
                  <h3 className="font-extrabold text-violet-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-violet-800 leading-relaxed">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
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
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">All investment categories →</Link>
              <Link href="/invest/private-equity" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Private equity guide →</Link>
              <Link href="/advisors/wealth-managers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a wealth manager →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
