import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Franchise Opportunities Australia (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Browse franchise investment opportunities in Australia. Food, fitness, cleaning, automotive, education, and retail franchises. Investment levels, training, and support outlined.",
  alternates: { canonical: `${SITE_URL}/invest/franchise` },
  openGraph: {
    title: `Franchise Opportunities Australia (${CURRENT_YEAR})`,
    description:
      "Food, fitness, cleaning, automotive, education, and retail franchises in Australia.",
    url: `${SITE_URL}/invest/franchise`,
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

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
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

      {/* Stats */}
      <section className="py-10 bg-purple-50 border-b border-purple-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "1,300+", label: "franchise systems" },
              { value: "90,000+", label: "franchise outlets" },
              { value: "$182B", label: "annual industry revenue" },
              { value: "Lower", label: "failure rate vs independent" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-purple-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-purple-700">{s.value}</p>
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
              All Australian franchisors must provide a Franchise Disclosure Document at least 14 days before signing. The FDD includes: franchisor's financial history, litigation history, list of existing franchisees, marketing fund details, territory rights, and renewal terms.
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
              <li>Review the franchisor's own financial accounts</li>
              <li>Research the brand's reputation and competitive position</li>
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
      <section className="py-14 bg-slate-900 text-white">
        <div className="container-custom text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Browse Franchise Opportunities</h2>
          <p className="text-slate-300 text-base mb-8 max-w-xl mx-auto">
            Explore available franchise territories across Australia — filtered by industry and investment level.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/invest/franchise/listings"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-xl transition-colors text-base"
            >
              Browse Franchise Listings
              <Icon name="arrow-right" size={18} />
            </Link>
            <Link
              href="/find-advisor"
              className="inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
            >
              Find a Franchise Consultant
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
