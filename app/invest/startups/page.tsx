import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Australian Startups & Tech (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Guide to startup investment in Australia. ESIC tax incentives, angel investing, VC funds, crowdfunding, and the Global Talent Visa. Sydney and Melbourne ecosystems.",
  alternates: { canonical: `${SITE_URL}/invest/startups` },
  openGraph: {
    title: `Invest in Australian Startups & Tech (${CURRENT_YEAR})`,
    description:
      "ESIC incentives, angel investing, VC funds, and crowdfunding. Sydney and Melbourne ecosystems.",
    url: `${SITE_URL}/invest/startups`,
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

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Startups</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-rose-600 text-white px-3 py-1 rounded-full">
              ESIC Tax Incentives Available
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Invest in Australian Startups & Technology
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
            Sydney and Melbourne rank in the global top 20 startup ecosystems. From Canva to Atlassian, Australia produces world-class technology companies. Invest early with generous tax incentives.
          </p>

          <Link
            href="/invest/listings?vertical=startup"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base px-7 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Browse Startup Opportunities
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "20%", label: "ESIC tax offset" },
              { value: "$200K", label: "Max offset per year" },
              { value: "10 yr", label: "CGT exemption on ESIC shares" },
              { value: "Top 20", label: "Global startup ecosystem" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-14 bg-white">
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
      <section className="py-14 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Browse Startup Investment Opportunities</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
              Australian startups and growth companies raising capital — including ESIC-qualifying companies for tax incentives.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/invest/listings?vertical=startup"
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
    </div>
  );
}
