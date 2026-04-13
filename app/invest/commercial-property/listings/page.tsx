import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import type { InvestmentListing } from "@/lib/types";
import { getAllInvestCategories } from "@/lib/invest-categories";
import InvestListingsClient from "@/components/InvestListingsClient";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("investment_listings")
    .select("id", { count: "exact", head: true })
    .eq("vertical", "commercial_property")
    .eq("status", "active");

  const countLabel = count && count > 0 ? `${count} ` : "";
  return {
    title: `Commercial Property for Sale Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian commercial properties for sale. Office, industrial, retail, and hotel assets with yield data. Filter by city, property type, and yield range.",
    alternates: { canonical: `${SITE_URL}/invest/commercial-property/listings` },
    openGraph: {
      title: `Commercial Property for Sale Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/commercial-property/listings`,
    },
  };
}

export default async function CommercialListingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("status", "active")
    .order("listing_type", { ascending: false })
    .order("created_at", { ascending: false });

  const listings: InvestmentListing[] = (data ?? []) as InvestmentListing[];
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Commercial Property", url: `${SITE_URL}/invest/commercial-property` },
    { name: "Listings" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient listings={listings} categories={categoryTabs} initialCategory="commercial-property" />
      </Suspense>
    </>
  );
}
