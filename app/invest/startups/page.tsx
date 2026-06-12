import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";
import DirectoryHero from "@/components/directory/DirectoryHero";
import { faqJsonLd } from "@/lib/schema-markup";

const STARTUP_FAQS = [
  {
    q: "What is the ESIC tax incentive for startup investors in Australia?",
    a: "The Early Stage Innovation Company (ESIC) tax incentive gives eligible investors a 20% non-refundable tax offset on their investment (capped at $200,000 per year), plus a CGT exemption if the shares are held for at least 12 months and sold within 10 years. To qualify, the startup must meet either a 100-point innovation test or a principles-based test, and must have been incorporated less than three years ago (or six years for a company whose expenditure is predominantly in R&D). The investor must not be an affiliate of the company.",
  },
  {
    q: "How can I invest in Australian startups as a retail investor?",
    a: "Retail investors can access startup investment through: (1) equity crowdfunding platforms (Equitise, OnMarket, Birchal) — regulated under the Corporations Act, allowing offers up to $5M to retail investors; (2) angel investing directly or via angel networks (Sydney Angels, Melbourne Angels, Innovation Bay); (3) listed venture capital funds or ASX-listed tech companies with early-stage characteristics; (4) some unlisted managed funds that accept retail minimums. Be aware that startup investing is high-risk: most startups fail, and liquidity is limited for years. Diversification across at least 10–20 companies is recommended.",
  },
  {
    q: "What due diligence should I do before investing in a startup?",
    a: "Key due diligence steps: review the company's constitution and shareholder agreement (especially anti-dilution provisions and liquidation preferences); examine three years of financial statements or management accounts; understand the cap table and founder equity; verify intellectual property ownership; check if there are existing investor agreements that would rank ahead of your shares; review the use-of-funds breakdown; assess the competitive landscape; speak to at least two customers; and confirm the team's background. In crowdfunding, the platform publishes an offer document — read it in full, including risk factors.",
  },
  {
    q: "What is the typical return profile of startup investing in Australia?",
    a: "Startup investing follows a power law: the vast majority of investments return little or nothing, while a small number return 10–100x and account for most of a portfolio's gains. Industry data suggests that portfolios of 20+ startups have historically returned 2–3x gross over 7–10 years at the institutional level — but retail portfolios are typically concentrated and illiquid. The ESIC offset materially improves the return profile by reducing the net cost of each investment by 20%. Only invest capital you can afford to lock up for 5–10 years.",
  },
];

const startupFaqLd = faqJsonLd(STARTUP_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Australian Startups & Tech (${CURRENT_YEAR})`,
  description:
    "Guide to startup investment in Australia. ESIC tax incentives, angel investing, VC funds, equity crowdfunding and Sydney/Melbourne ecosystems.",
  alternates: { canonical: `${SITE_URL}/invest/startups` },
  openGraph: {
    title: `Invest in Australian Startups & Tech (${CURRENT_YEAR})`,
    description:
      "ESIC incentives, angel investing, VC funds, and crowdfunding. Sydney and Melbourne ecosystems.",
    url: `${SITE_URL}/invest/startups`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Invest in Australian Startups")}&sub=${encodeURIComponent("Angel Investing · ESIC · Equity Crowdfunding · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function StartupsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Startups" },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {startupFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(startupFaqLd) }} />
      )}

      {/* Hero — house-standard compact light header (E3). The old stat band
          rides as pills beside the title; the browse-all and personalised-feed
          entry points live in the light band below, replacing the standalone
          CTA band (E4). */}
      <DirectoryHero
        tone="light"
        breadcrumbLabel="Startups"
        headlineLead="Invest in Australian Startups & Technology"
        subtitle="Sydney and Melbourne rank in the global top 20 startup ecosystems. From Canva to Atlassian, Australia produces world-class technology companies. Invest early with generous tax incentives."
        stats={[
          { v: "20%", l: "ESIC tax offset" },
          { v: "$200K", l: "Max offset per year" },
          { v: "10 yr", l: "CGT exemption on ESIC shares" },
          { v: "Top 20", l: "Global startup ecosystem" },
        ]}
        containerClassName="container-custom"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/invest/startups/listings"
            className="inline-flex items-center gap-1.5 rounded-full border border-coral-200 bg-coral-50 px-3 py-1 text-[0.65rem] font-semibold text-coral-700 shadow-sm transition-colors hover:bg-coral-100 md:text-xs"
          >
            Browse all startup opportunities →
          </Link>
          <Link
            href="/invest/startups/for-you"
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[0.65rem] font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-100 md:text-xs"
          >
            Rounds matched for you →
          </Link>
          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[0.65rem] font-semibold text-rose-700 md:text-xs">
            ESIC Tax Incentives Available
          </span>
        </div>
      </DirectoryHero>

      {/* Content */}
      <section className="py-8 md:py-10 bg-white">
        <div className="container-custom max-w-4xl">
          <SectionHeading
            eyebrow="Tax incentives"
            title="ESIC — Early Stage Innovation Company Tax Incentives"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {[
              { icon: "dollar-sign", title: "20% Tax Offset", detail: "Non-refundable 20% tax offset on your investment in qualifying ESIC companies, up to $200,000 offset per year per investor." },
              { icon: "trending-up", title: "10-Year CGT Exemption", detail: "If you hold qualifying ESIC shares for 1–10 years, any capital gain is exempt from CGT. A powerful incentive for long-term investors." },
              { icon: "star", title: "ESIC Test", detail: "Companies qualify via 100-point innovation test (R&D spend, IP, prior grant) or principles-based test (ATO assessment). Startup must be at early stage." },
            ].map((item) => (
              <div key={item.title} className="bg-rose-50 border border-rose-100 rounded-xl p-5 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Icon name={item.icon} size={20} className="text-rose-600" />
                </div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>

          <SectionHeading eyebrow="Investment pathways" title="How to Invest in Australian Startups" />

          <div className="prose prose-slate max-w-none mb-12">
            <h3>1. Angel Investing (Direct Equity)</h3>
            <p>
              Invest directly in early-stage startups via SAFE notes, convertible notes, or equity rounds. Typically $10K–$250K per deal. Access through networks like Cut Through Venture, Sydney Angels, Melbourne Angels, and ASIN (Australian Investment Network).
            </p>

            <h3>2. Venture Capital Funds</h3>
            <p>
              Invest in a VC fund that deploys capital across a portfolio of startups. Diversified risk, professional management. Major Australian VCs: Blackbird Ventures, Square Peg Capital, AirTree Ventures, Folklore Ventures, Tempus Partners. Minimum investments typically $250K+.
            </p>

            <h3>3. Equity Crowdfunding</h3>
            <p>
              ASIC-regulated equity crowdfunding platforms allow retail investors to participate in startup rounds from as little as $50. Platforms: Birchal, OnMarket, Equitise, VentureCrowd. These investments are highly illiquid and high-risk.
            </p>

            <h3>4. ASX-Listed Tech Companies</h3>
            <p>
              Australia has a growing ASX-listed tech sector. Notable companies: WiseTech Global, Altium, Technology One, REA Group, Seek. Available via any ASX broker from $500.
            </p>

            <h3>5. R&D Tax Incentive (for founders)</h3>
            <p>
              Australian companies spending on eligible R&D activities receive a 43.5% refundable tax offset (turnover under $20M) or 38.5% non-refundable offset (larger companies). This makes Australia attractive for deep-tech R&D.
            </p>

            <h3>Global Talent Visa (Subclass 858)</h3>
            <p>
              Outstanding talent in technology, fintech, medtech, space, agricultural technology, and energy can apply for the Global Talent Visa — a permanent visa from the time of grant. No sponsoring employer required. Endorsed by peak bodies including ACS (tech), FinTech Australia, and MedTech.
            </p>

            <h3>Key Sectors to Watch</h3>
            <ul>
              <li><strong>Fintech</strong> — Afterpay, Zip, Airwallex, TrueLayer, Frollo</li>
              <li><strong>Healthtech / MedTech</strong> — Pro Medicus, Nuvation Bio, Microba</li>
              <li><strong>AgTech</strong> — Farmers Edge, The Yield, Agriculture digital</li>
              <li><strong>Climate Tech</strong> — Tritium (EV charging), Relectrify, BuildingIQ</li>
              <li><strong>SaaS / B2B software</strong> — ServiceRocket, Culture Amp, Sine</li>
            </ul>
          </div>

          {/* Notable exits */}
          <SectionHeading eyebrow="Ecosystem" title="Notable Australian Tech Exits" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              { company: "Canva", detail: "$55B+ valuation, graphic design SaaS, founded Perth 2012" },
              { company: "Atlassian", detail: "NASDAQ-listed $50B+, enterprise software (Jira, Confluence)" },
              { company: "Afterpay", detail: "Acquired by Block (Jack Dorsey) for $39B in 2022" },
              { company: "WiseTech Global", detail: "ASX-listed $30B+, global logistics software" },
              { company: "Seek", detail: "ASX-listed $7B+, global employment marketplace" },
              { company: "Airwallex", detail: "$5.6B valuation, global payments and financial infrastructure" },
            ].map((e) => (
              <div key={e.company} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="font-bold text-slate-900 mb-1">{e.company}</p>
                <p className="text-xs text-slate-500">{e.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 md:py-10 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Browse Startup Investment Opportunities</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
              Australian startups and growth companies raising capital — including ESIC-qualifying companies for tax incentives.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/invest/startups/listings"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm"
              >
                Browse Startup Opportunities
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                href="/find-advisor"
                className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm"
              >
                Browse Startup Professionals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 md:py-8 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {STARTUP_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
