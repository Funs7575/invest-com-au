import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import type { InvestmentListing } from "@/components/ListingCard";
import InfrastructureListingsClient from "./InfrastructureListingsClient";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("investment_listings")
    .select("id", { count: "exact", head: true })
    .eq("vertical", "infrastructure")
    .eq("status", "active");

  const countLabel = count && count > 0 ? `${count} ` : "";
  return {
    title: `Infrastructure Investments Australia — Browse ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Explore infrastructure investment opportunities in Australia. Toll roads, energy, airports, ports, utilities and social infrastructure.",
    alternates: { canonical: `${SITE_URL}/invest/infrastructure/listings` },
    openGraph: {
      title: `Infrastructure Investments Australia — ${countLabel}Active Listings`,
      description:
        "Explore infrastructure investment opportunities in Australia. Toll roads, energy, airports, ports and more.",
      url: `${SITE_URL}/invest/infrastructure/listings`,
    },
  };
}

export default async function InfrastructureListingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("vertical", "infrastructure")
    .eq("status", "active")
    .order("listing_type", { ascending: false })
    .order("created_at", { ascending: false });

  const listings: InvestmentListing[] = (data ?? []) as InvestmentListing[];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Infrastructure", url: `${SITE_URL}/invest/infrastructure` },
    { name: "Listings" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <InfrastructureListingsClient listings={listings} />
    </>
  );
}
