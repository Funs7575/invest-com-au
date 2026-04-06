import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import UnifiedListingsClient from "@/components/UnifiedListingsClient";
import type { InvestmentListing } from "@/components/ListingCard";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Browse Investment Opportunities in Australia (${CURRENT_YEAR})`,
  description:
    "Browse all Australian investment listings — businesses for sale, mining opportunities, farmland, commercial property, franchises, renewable energy, investment funds, startups, and more.",
  alternates: { canonical: `${SITE_URL}/invest/listings` },
  openGraph: {
    title: `Browse Investment Opportunities in Australia (${CURRENT_YEAR})`,
    description:
      "Browse all Australian investment listings — businesses for sale, mining, farmland, commercial property, alternatives, private credit, and infrastructure.",
    url: `${SITE_URL}/invest/listings`,
  },
};

export default async function ListingsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("status", "active")
    .order("listing_type", { ascending: false })
    .order("created_at", { ascending: false });

  const listings: InvestmentListing[] = (data ?? []) as InvestmentListing[];

  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading listings...</div>}>
      <UnifiedListingsClient listings={listings} />
    </Suspense>
  );
}
