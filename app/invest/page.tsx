import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_NAME,
} from "@/lib/seo";
import {
  getAllInvestCategories,
} from "@/lib/invest-categories";
import type { InvestCategory } from "@/lib/invest-categories";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";
import ScrollReveal from "@/components/ScrollReveal";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Australia — Investment Marketplace (${CURRENT_YEAR})`,
  description:
    `Browse Australia's investment marketplace. Businesses for sale, farmland, mining, commercial property, startups, franchises, renewable energy & more. Compare listings across ${getAllInvestCategories().length} categories.`,
  alternates: { canonical: "/invest" },
  openGraph: {
    title: `Invest in Australia — Investment Marketplace (${CURRENT_YEAR})`,
    description:
      "Browse Australia's investment marketplace. Businesses, farmland, mining, commercial property, startups & more.",
    url: absoluteUrl("/invest"),
  },
};

// ── Icon map (Lucide-style SVG paths) ──
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "buy-business": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
  ),
  mining: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
  ),
  farmland: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  "commercial-property": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
  ),
  franchise: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
  ),
  "renewable-energy": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  ),
  startups: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
  ),
  alternatives: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
  ),
  "private-credit": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  infrastructure: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
  ),
  funds: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  ),
};

// ── Color accent classes per category slug ──
const ACCENT_COLORS: Record<string, { card: string; badge: string; hover: string }> = {
  "buy-business": { card: "border-blue-200 hover:border-blue-400", badge: "bg-blue-100 text-blue-700", hover: "group-hover:text-blue-700" },
  mining: { card: "border-amber-200 hover:border-amber-400", badge: "bg-amber-100 text-amber-700", hover: "group-hover:text-amber-700" },
  farmland: { card: "border-green-200 hover:border-green-400", badge: "bg-green-100 text-green-700", hover: "group-hover:text-green-700" },
  "commercial-property": { card: "border-slate-200 hover:border-slate-400", badge: "bg-slate-100 text-slate-700", hover: "group-hover:text-slate-700" },
  franchise: { card: "border-purple-200 hover:border-purple-400", badge: "bg-purple-100 text-purple-700", hover: "group-hover:text-purple-700" },
  "renewable-energy": { card: "border-emerald-200 hover:border-emerald-400", badge: "bg-emerald-100 text-emerald-700", hover: "group-hover:text-emerald-700" },
  startups: { card: "border-indigo-200 hover:border-indigo-400", badge: "bg-indigo-100 text-indigo-700", hover: "group-hover:text-indigo-700" },
  alternatives: { card: "border-rose-200 hover:border-rose-400", badge: "bg-rose-100 text-rose-700", hover: "group-hover:text-rose-700" },
  "private-credit": { card: "border-teal-200 hover:border-teal-400", badge: "bg-teal-100 text-teal-700", hover: "group-hover:text-teal-700" },
  infrastructure: { card: "border-cyan-200 hover:border-cyan-400", badge: "bg-cyan-100 text-cyan-700", hover: "group-hover:text-cyan-700" },
  funds: { card: "border-violet-200 hover:border-violet-400", badge: "bg-violet-100 text-violet-700", hover: "group-hover:text-violet-700" },
};

const DEFAULT_ACCENT = { card: "border-slate-200 hover:border-slate-400", badge: "bg-slate-100 text-slate-700", hover: "group-hover:text-slate-700" };

// ── Category card descriptions ──
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "buy-business": "Cafes, agencies, e-commerce, professional practices & more.",
  mining: "Gold, lithium, copper, rare earths & coal exploration opportunities.",
  farmland: "Cropping, dairy, viticulture & horticulture land across Australia.",
  "commercial-property": "Office, industrial, retail, medical & childcare properties.",
  franchise: "Food, fitness, automotive & service franchise opportunities.",
  "renewable-energy": "Solar, wind, battery storage & hydrogen projects.",
  startups: "Fintech, healthtech, proptech & cleantech equity deals.",
  alternatives: "Wine, art, classic cars, watches, coins & whisky investments.",
  "private-credit": "Private lending, mezzanine debt & structured credit.",
  infrastructure: "Toll roads, airports, utilities & public-private partnerships.",
  funds: "Hedge funds, private credit funds, REITs & SIV-complying funds.",
};

export default async function InvestHubPage() {
  const categories = getAllInvestCategories();
  const supabase = await createClient();

  // Fetch listing counts per vertical
  const { data: countRows } = await supabase
    .from("investment_listings")
    .select("vertical")
    .eq("status", "active");

  // Count per vertical
  const verticalCounts: Record<string, number> = {};
  if (countRows) {
    for (const row of countRows) {
      const v = row.vertical as string;
      verticalCounts[v] = (verticalCounts[v] || 0) + 1;
    }
  }

  // Map DB verticals to category listing counts
  function getCategoryCount(cat: InvestCategory): number {
    return cat.dbVerticals.reduce((sum, v) => sum + (verticalCounts[v] || 0), 0);
  }

  const totalListings = countRows?.length || 0;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Invest</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/50 rounded-2xl p-4 md:p-8 mb-4 md:mb-6">
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              Investment Marketplace
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-3 leading-relaxed">
              Browse verified investment opportunities across Australia. From businesses for sale
              and farmland to mining exploration, commercial property, startups, and alternative
              assets — find and compare listings in one place.
            </p>
            <p className="text-[0.56rem] md:text-xs text-slate-400">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>

          {/* General Advice Warning */}
          <div className="hidden md:block bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-[0.69rem] text-slate-500 leading-relaxed">
            <strong className="text-slate-600">General Advice Warning:</strong>{" "}
            {GENERAL_ADVICE_WARNING}
          </div>
          <div className="md:hidden mb-4">
            <details className="bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="px-3 py-2 text-[0.62rem] text-slate-500 font-medium cursor-pointer flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                General advice only — not a personal recommendation.
              </summary>
              <p className="px-3 pb-2.5 text-[0.62rem] text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING}
              </p>
            </details>
          </div>

          {/* Browse All CTA */}
          <div className="flex justify-center mb-6 md:mb-8">
            <Link
              href="/invest/listings"
              className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors text-sm md:text-base"
            >
              Browse All Listings ({totalListings})
            </Link>
          </div>

          {/* Category Grid */}
          <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">
            Browse by Category
          </h2>
          <ScrollReveal animation="scroll-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-12">
              {categories.map((cat) => {
                const accent = ACCENT_COLORS[cat.slug] || DEFAULT_ACCENT;
                const count = getCategoryCount(cat);
                const description = CATEGORY_DESCRIPTIONS[cat.slug] || cat.intro.slice(0, 80);
                const icon = CATEGORY_ICONS[cat.slug];

                return (
                  <Link
                    key={cat.slug}
                    href={`/invest/${cat.slug}/listings`}
                    className={`group relative block rounded-xl border bg-white p-3 md:p-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.01] ${accent.card}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`shrink-0 p-1.5 rounded-lg ${accent.badge}`}>
                        {icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-bold text-sm md:text-base text-slate-900 transition-colors ${accent.hover}`}>
                          {cat.label}
                        </h3>
                        <span className="text-[0.62rem] md:text-xs font-semibold text-slate-400">
                          {count} {count === 1 ? "listing" : "listings"}
                        </span>
                      </div>
                    </div>
                    <p className="text-[0.62rem] md:text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </ScrollReveal>

          {/* Bottom CTA */}
          <div className="bg-slate-50 rounded-xl p-4 md:p-6 text-center">
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-2">
              Looking for something specific?
            </h3>
            <p className="text-xs md:text-sm text-slate-600 mb-3">
              Browse the full marketplace or use category filters to narrow your search.
            </p>
            <Link
              href="/invest/listings"
              className="inline-block px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors text-sm"
            >
              Browse All Listings
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
