import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";
import { faqJsonLd } from "@/lib/schema-markup";

const FRANCHISE_FAQS = [
  {
    q: "How much does it cost to buy a franchise in Australia?",
    a: "Franchise investment levels in Australia vary enormously by brand and sector. At the lower end, home services and cleaning franchises start from $20,000–$50,000. Mid-range food and fitness franchises typically require $150,000–$400,000 including fitout. Premium hospitality and retail concepts (McDonald's, Subway, national gym chains) can require $400,000–$1,000,000+ in total investment. These figures cover the franchise fee, equipment, fitout, working capital, and training costs. Most franchisors require 30–50% in unencumbered cash, with the balance financed.",
  },
  {
    q: "What is included in a franchise agreement?",
    a: "A franchise agreement is a legal document (typically 50–150 pages) that governs the relationship for the agreement term (usually 5–7 years with renewal options). Key terms include: the territory (exclusive or non-exclusive), the franchise fee structure (upfront + ongoing royalties of 5–12% of revenue + marketing levy of 2–4%), supply obligations (required suppliers), operational standards, renewal conditions, and transfer/exit rights. The Franchising Code of Conduct (administered by the ACCC) mandates specific disclosures and provides minimum protections — read the disclosure document before signing anything.",
  },
  {
    q: "What due diligence should I do before buying a franchise?",
    a: "Mandatory steps: (1) read the Disclosure Document thoroughly — the franchisor must provide it at least 14 days before signing; (2) speak to at least 5–10 current franchisees, not just the ones the franchisor suggests; (3) speak to former franchisees, especially those who exited — ask why they left; (4) review three years of audited financials for the franchisor entity; (5) have a franchise lawyer review the agreement (franchise law is specialist — a general commercial lawyer often misses sector-specific risks); (6) commission an independent financial model for your territory with realistic revenue assumptions, not the franchisor's projections.",
  },
  {
    q: "How are franchise royalties taxed in Australia?",
    a: "Franchise royalties are a tax-deductible business expense for the franchisee and assessable income for the franchisor. The initial franchise fee is treated differently: if it's a capital payment for the right to operate under the franchise system, it may be depreciated as an intangible asset over the agreement term, not immediately deductible. Running royalties (percentage of revenue paid monthly) are immediately deductible. The capital gain on selling a franchise territory is subject to CGT, with the 50% discount available for assets held 12+ months. Small-business CGT concessions may apply if you meet the turnover threshold.",
  },
];

const franchiseFaqLd = faqJsonLd(FRANCHISE_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Franchise Opportunities Australia (${CURRENT_YEAR})`,
  description:
    "Franchise investment opportunities in Australia. Food, fitness, cleaning, automotive, education and retail franchises with investment levels and support.",
  alternates: { canonical: `${SITE_URL}/invest/franchise` },
  openGraph: {
    title: `Franchise Opportunities Australia (${CURRENT_YEAR})`,
    description:
      "Food, fitness, cleaning, automotive, education, and retail franchises in Australia.",
    url: `${SITE_URL}/invest/franchise`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Franchise Opportunities Australia")}&sub=${encodeURIComponent("Food · Fitness · Retail · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function FranchisePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Franchise" },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {franchiseFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(franchiseFaqLd) }} />
      )}

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Franchise</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Franchise Investment Opportunities in Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
            Buy into a proven business system with established brand recognition, training, and ongoing support. Australia has over 1,300 active franchise systems with 90,000+ outlets.
          </p>

          <Link
            href="/invest/franchise/listings"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base px-7 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Browse Franchise Opportunities
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </section>

      {/* Browse Listings CTA */}
      <section className="bg-white pt-8">
        <div className="container-custom">
          <Link
            href="/invest/franchise/listings"
            className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-50 to-emerald-100/40 border border-emerald-200 rounded-2xl mb-8 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-1">Browse Listings</p>
              <p className="text-lg font-extrabold text-slate-900">View all franchise opportunities &rarr;</p>
              <p className="text-sm text-slate-600 mt-0.5">Active territories, investment levels, sub-categories &amp; more</p>
            </div>
            <svg className="w-8 h-8 text-emerald-600 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "1,300+", label: "franchise systems" },
              { value: "90,000+", label: "franchise outlets" },
              { value: "$182B", label: "annual industry revenue" },
              { value: "Lower", label: "failure rate vs independent" },
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
            eyebrow="Franchise categories"
            title="Popular Franchise Sectors in Australia"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            {[
              { icon: "star", title: "Food & Beverage", detail: "Cafes, fast food, bubble tea, bakeries, and restaurants. Investment range: $100K–$1M+. Examples: Gloria Jean's, Subway, Grill'd, Boost Juice." },
              { icon: "trending-up", title: "Fitness & Wellness", detail: "Gyms, pilates studios, yoga, and health services. Investment range: $100K–$500K. Examples: F45 Training, Anytime Fitness, Bodyfit." },
              { icon: "leaf", title: "Cleaning & Maintenance", detail: "Residential and commercial cleaning. Lowest entry point in franchising — from $20K. Examples: Jim's Cleaning, Jims Mowing, Electrodry." },
              { icon: "briefcase", title: "Automotive", detail: "Car servicing, tyres, detailing, and accessories. Investment range: $100K–$400K. Examples: Midas, Ultratune, Ultra Tune." },
              { icon: "globe", title: "Retail", detail: "Specialty retail and convenience. Investment range: $100K–$600K. Examples: Boost Mobile, The Cheesecake Shop, Bakers Delight." },
              { icon: "building", title: "Education & Tutoring", detail: "Children's tutoring, coding, and vocational training. Investment range: $50K–$200K. Examples: Kumon, Mathnasium, Sylvan Learning." },
            ].map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name={item.icon} size={20} className="text-purple-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <SectionHeading eyebrow="Evaluation" title="How to Evaluate a Franchise" />

          <div className="prose prose-slate max-w-none mb-12">
            <h3>The Franchise Disclosure Document (FDD)</h3>
            <p>
              All Australian franchisors must provide a Franchise Disclosure Document at least 14 days before signing. The FDD includes: franchisor&apos;s financial history, litigation history, list of existing franchisees, marketing fund details, territory rights, and renewal terms.
            </p>

            <h3>Franchise Agreement Key Terms</h3>
            <ul>
              <li><strong>Initial franchise fee</strong> — one-time fee for the right to operate the system</li>
              <li><strong>Royalty</strong> — ongoing percentage of gross revenue (typically 4–8%)</li>
              <li><strong>Marketing levy</strong> — contribution to national advertising fund (1–3%)</li>
              <li><strong>Territory</strong> — exclusive or non-exclusive geographic area</li>
              <li><strong>Term and renewal</strong> — initial term (5–10 years), renewal rights, and conditions</li>
              <li><strong>Exit provisions</strong> — right to sell, transfer conditions, franchisor buy-back options</li>
            </ul>

            <h3>Due Diligence Checklist</h3>
            <ul>
              <li>Talk to existing and former franchisees (list provided in FDD)</li>
              <li>Have a franchise lawyer review the agreement</li>
              <li>Have an accountant review the financial model</li>
              <li>Review the franchisor&apos;s own financial accounts</li>
              <li>Research the brand&apos;s reputation and competitive position</li>
              <li>Understand the support, training, and ongoing assistance provided</li>
            </ul>

            <h3>Franchise Code of Conduct</h3>
            <p>
              Australia has a mandatory Franchising Code of Conduct (administered by the ACCC) that all franchisors must follow. It provides significant protections for franchisees including cooling-off periods, disclosure obligations, and dispute resolution mechanisms.
            </p>

            <h3>Visa Considerations</h3>
            <p>
              The Subclass 188A Business Innovation visa requires buying into a business (which can include a franchise) with a value of at least $800K and demonstrating active management. Franchise agreements are accepted as qualifying businesses for visa purposes.
            </p>
          </div>

          {/* Investment levels */}
          <SectionHeading eyebrow="Investment guide" title="Franchise Investment Levels" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {[
              { range: "$20K – $100K", label: "Entry Level", examples: "Cleaning services, lawn mowing, mobile services, courier delivery" },
              { range: "$100K – $500K", label: "Mid-Range", examples: "Cafes, fitness studios, retail specialty, automotive services" },
              { range: "$500K – $2M+", label: "Premium", examples: "Fast food restaurants, large-format retail, hotel franchises" },
            ].map((l) => (
              <div key={l.range} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-lg font-extrabold text-purple-700 mb-1">{l.range}</p>
                <p className="font-semibold text-slate-900 text-sm mb-2">{l.label}</p>
                <p className="text-sm text-slate-500">{l.examples}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Browse Franchise Opportunities</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
              Explore available franchise territories across Australia — filtered by industry and investment level.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/invest/franchise/listings"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm"
              >
                Browse Franchise Listings
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                href="/find-advisor"
                className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm"
              >
                Browse Franchise Professionals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {FRANCHISE_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
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
