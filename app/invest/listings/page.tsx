import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  ORGANIZATION_JSONLD,
  SITE_NAME,
} from "@/lib/seo";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";
import { getAllInvestCategories } from "@/lib/invest-categories";
import type { InvestmentListing } from "@/lib/types";
import InvestListingsClient from "@/components/InvestListingsClient";

export const revalidate = 3600;

// ── Metadata ─────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: `Investment Listings — Buy Businesses, Farms, Property & More | ${SITE_NAME}`,
  description:
    "Browse Australian investment opportunities including businesses for sale, mining tenements, farmland, commercial property, franchises, renewable energy projects, startups, and funds.",
  alternates: { canonical: "/invest/listings" },
  openGraph: {
    title: `Investment Listings — Buy Businesses, Farms, Property & More | ${SITE_NAME}`,
    description:
      "Browse Australian investment opportunities including businesses for sale, mining tenements, farmland, commercial property, franchises, renewable energy projects, startups, and funds.",
    url: absoluteUrl("/invest/listings"),
  },
  twitter: { card: "summary_large_image" },
};

// ── Page ─────────────────────────────────────────────────────────────
export default async function InvestListingsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const listings: InvestmentListing[] = (data as InvestmentListing[]) ?? [];

  // Category tabs from invest-categories config
  const allCategories = getAllInvestCategories();
  const categoryTabs = allCategories.map((c) => ({
    slug: c.slug,
    label: c.label,
  }));

  // ── JSON-LD: ItemList ──
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Australian Investment Listings",
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 50).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: l.title,
      url: absoluteUrl(`/invest/listing/${l.slug}`),
    })),
  };

  // ── JSON-LD: BreadcrumbList ──
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "All Listings" },
  ]);

  // ── JSON-LD: WebPage ──
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Australian Investment Listings",
    description: metadata.description,
    url: absoluteUrl("/invest/listings"),
    publisher: ORGANIZATION_JSONLD,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-6xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/invest" className="hover:text-slate-900">
              Invest
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">All Listings</span>
          </nav>

          {/* Header */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/50 rounded-2xl p-4 md:p-6 mb-3 md:mb-4">
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              Australian Investment Listings
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-2">
              Browse verified investment opportunities across Australia — businesses for sale,
              mining tenements, farmland, commercial property, franchises, renewable energy
              projects, startups, and managed funds.
            </p>
            <p className="text-[0.56rem] md:text-xs text-slate-400">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>

          {/* General Advice Warning */}
          <div className="hidden md:block bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-[0.69rem] text-slate-500 leading-relaxed">
            <strong className="text-slate-600">General Advice Warning:</strong>{" "}
            {GENERAL_ADVICE_WARNING}
          </div>
          <div className="md:hidden mb-3">
            <details className="bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="px-3 py-2 text-[0.62rem] text-slate-500 font-medium cursor-pointer flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-amber-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                General advice only — not a personal recommendation.
              </summary>
              <p className="px-3 pb-2.5 text-[0.62rem] text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING}
              </p>
            </details>
          </div>
        </div>

        {/* Client component with filters + grid */}
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
        />
      </div>
    </>
  );
}
