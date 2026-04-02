import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import type { InvestmentListing } from "@/components/ListingCard";
import FranchiseListingsClient from "./FranchiseListingsClient";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("investment_listings")
    .select("id", { count: "exact", head: true })
    .eq("vertical", "franchise")
    .eq("status", "active");

  const countLabel = count && count > 0 ? `${count} ` : "";
  return {
    title: `Franchise Opportunities Australia — ${countLabel}Available Territories (${CURRENT_YEAR})`,
    description:
      "Browse available franchise territories in Australia. Filter by industry (food, fitness, cleaning, automotive, retail, education) and investment level.",
    alternates: { canonical: `${SITE_URL}/invest/franchise/listings` },
    openGraph: {
      title: `Franchise Opportunities Australia — ${countLabel}Available Territories`,
      url: `${SITE_URL}/invest/franchise/listings`,
    },
  };
}

export default async function FranchiseListingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("vertical", "franchise")
    .eq("status", "active")
    .order("listing_type", { ascending: false })
    .order("created_at", { ascending: false });

  const listings: InvestmentListing[] = (data ?? []) as InvestmentListing[];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Franchise", url: `${SITE_URL}/invest/franchise` },
    { name: "Listings" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <FranchiseListingsClient listings={listings} />
    </>
  );
}
