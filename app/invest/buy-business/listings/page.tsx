import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import type { InvestmentListing } from "@/components/ListingCard";
import BusinessListingsClient from "./BusinessListingsClient";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("investment_listings")
    .select("id", { count: "exact", head: true })
    .eq("vertical", "business")
    .eq("status", "active");

  const countLabel = count && count > 0 ? `${count} ` : "";
  return {
    title: `Businesses for Sale Australia — Browse ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Search Australian businesses for sale. Filter by state, industry, and price range. Cafes, retail, services, manufacturing, online businesses and more.",
    alternates: { canonical: `${SITE_URL}/invest/buy-business/listings` },
    openGraph: {
      title: `Businesses for Sale Australia — ${countLabel}Active Listings`,
      description:
        "Search Australian businesses for sale. Filter by state, industry, and price range.",
      url: `${SITE_URL}/invest/buy-business/listings`,
    },
  };
}

export default async function BusinessListingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("vertical", "business")
    .eq("status", "active")
    .order("listing_type", { ascending: false })
    .order("created_at", { ascending: false });

  const listings: InvestmentListing[] = (data ?? []) as InvestmentListing[];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Buy a Business", url: `${SITE_URL}/invest/buy-business` },
    { name: "Listings" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <BusinessListingsClient listings={listings} />
    </>
  );
}
