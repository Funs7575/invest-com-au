import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Browse Investment Opportunities in Australia (${CURRENT_YEAR})`,
  description:
    "Browse all Australian investment listings — businesses for sale, mining opportunities, farmland, commercial property, franchises, renewable energy, investment funds, and startups.",
  alternates: { canonical: `${SITE_URL}/invest/listings` },
  openGraph: {
    title: `Browse Investment Opportunities in Australia (${CURRENT_YEAR})`,
    description:
      "Browse all Australian investment listings — businesses for sale, mining opportunities, farmland, commercial property, franchises, renewable energy, investment funds, and startups.",
    url: `${SITE_URL}/invest/listings`,
  },
};

const VERTICALS = [
  {
    slug: "business",
    title: "Businesses for Sale",
    description:
      "Established businesses across hospitality, retail, services, manufacturing, and online — ready to acquire.",
    icon: "briefcase",
    href: "/invest/buy-business/listings",
    color: "from-slate-700 to-slate-900",
    accent: "bg-slate-100 text-slate-700",
  },
  {
    slug: "mining",
    title: "Mining Opportunities",
    description:
      "Direct project investments in lithium, gold, copper, iron ore, and rare earth projects across Australia.",
    icon: "trending-up",
    href: "/invest/mining/opportunities",
    color: "from-amber-700 to-amber-900",
    accent: "bg-amber-100 text-amber-700",
  },
  {
    slug: "farmland",
    title: "Farmland & Agriculture",
    description:
      "Cropping, grazing, dairy, and horticulture properties across Australia with FIRB guidance for foreign buyers.",
    icon: "leaf",
    href: "/invest/farmland/listings",
    color: "from-green-700 to-green-900",
    accent: "bg-green-100 text-green-700",
  },
  {
    slug: "commercial_property",
    title: "Commercial Property",
    description:
      "Office, industrial, retail, and hotel assets with yield data across Sydney, Melbourne, Brisbane, and Perth.",
    icon: "building",
    href: "/invest/commercial-property/listings",
    color: "from-blue-700 to-blue-900",
    accent: "bg-blue-100 text-blue-700",
  },
  {
    slug: "franchise",
    title: "Franchise Opportunities",
    description:
      "Join proven franchise systems in food, fitness, automotive, education, and cleaning with known investment levels.",
    icon: "star",
    href: "/invest/franchise/listings",
    color: "from-purple-700 to-purple-900",
    accent: "bg-purple-100 text-purple-700",
  },
  {
    slug: "energy",
    title: "Renewable Energy Projects",
    description:
      "Solar, wind, battery storage, and hydrogen projects seeking co-investment partners across Australia.",
    icon: "zap",
    href: "/invest/renewable-energy/projects",
    color: "from-teal-700 to-teal-900",
    accent: "bg-teal-100 text-teal-700",
  },
  {
    slug: "fund",
    title: "Investment Funds (incl. SIV)",
    description:
      "ASIC-regulated managed funds including SIV-complying funds for Significant Investor Visa applicants.",
    icon: "dollar-sign",
    href: "/invest/funds",
    color: "from-indigo-700 to-indigo-900",
    accent: "bg-indigo-100 text-indigo-700",
  },
  {
    slug: "startup",
    title: "Startups & Crowdfunding",
    description:
      "Early-stage Australian startups raising capital, including ESIC-qualifying companies for tax incentives.",
    icon: "trending-up",
    href: "/invest/startups/opportunities",
    color: "from-rose-700 to-rose-900",
    accent: "bg-rose-100 text-rose-700",
  },
];

export default async function ListingsHubPage() {
  const supabase = await createClient();

  // Fetch counts for each vertical
  const countResults = await Promise.all(
    VERTICALS.map(async (v) => {
      const { count } = await supabase
        .from("investment_listings")
        .select("id", { count: "exact", head: true })
        .eq("vertical", v.slug)
        .eq("status", "active");
      return { slug: v.slug, count: count ?? 0 };
    })
  );

  const countMap: Record<string, number> = {};
  countResults.forEach(({ slug, count }) => {
    countMap[slug] = count;
  });

  const totalCount = Object.values(countMap).reduce((a, b) => a + b, 0);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Browse Listings" },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden">
        <div className="container-custom py-6 md:py-10 lg:py-12">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Browse Listings</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              {totalCount > 0 ? `${totalCount} Active Listings` : `Updated ${CURRENT_YEAR}`}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 leading-[1.1] mb-3 tracking-tight">
            Browse Australian Investment Opportunities
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mb-6">
            From businesses for sale to mining tenements, farmland, and SIV-complying funds — every investment opportunity in one place.
          </p>

          {/* FIRB CTA */}
          <Link
            href="/invest/listings?firb=true"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Icon name="globe" size={15} />
            Browse FIRB-Eligible Listings &rarr;
          </Link>
        </div>
      </section>

      {/* Category Grid */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="All categories"
            title="Choose Your Investment Category"
            sub="Each category includes curated listings with detailed information, pricing, and direct enquiry."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VERTICALS.map((v) => {
              const count = countMap[v.slug] ?? 0;
              return (
                <Link
                  key={v.slug}
                  href={v.href}
                  className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
                >
                  {/* Colour bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${v.color}`} />
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    {/* Icon + count */}
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon name={v.icon} size={20} className="text-slate-600" />
                      </div>
                      {count > 0 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v.accent}`}>
                          {count} listing{count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors mb-1">
                        {v.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {v.description}
                      </p>
                    </div>

                    <div className="flex items-center text-amber-600 text-xs font-semibold gap-1 mt-auto">
                      Browse
                      <Icon name="arrow-right" size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FIRB Banner */}
      <section className="py-10 bg-blue-50">
        <div className="container-custom">
          <div className="bg-blue-600 rounded-xl p-8 text-white flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <Icon name="globe" size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-1">Investing from Overseas?</h2>
              <p className="text-sm text-blue-100 leading-relaxed">
                Many listings on our platform are FIRB-eligible — meaning foreign investors can acquire them with Australian government approval. Browse FIRB-eligible opportunities across all categories.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/invest/listings?firb=true"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors hover:bg-blue-50 whitespace-nowrap"
              >
                FIRB-Eligible Listings
                <Icon name="arrow-right" size={14} />
              </Link>
              <Link
                href="/foreign-investment"
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
              >
                FIRB Guide
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* List Your Opportunity CTA */}
      <section className="py-14 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Icon name="star" size={24} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">List Your Investment Opportunity</h2>
              <p className="text-sm text-slate-600">
                Advisors, brokers, and fund managers can list investment opportunities directly on Invest.com.au and reach qualified investors.
              </p>
            </div>
            <Link
              href="/invest/list"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              List an opportunity
              <Icon name="arrow-right" size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
