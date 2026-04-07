import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import type { InvestmentListing } from "@/components/ListingCard";
import UnifiedListingsClient from "@/components/UnifiedListingsClient";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("investment_listings")
    .select("id", { count: "exact", head: true })
    .eq("vertical", "mining")
    .eq("status", "active");

  const countLabel = count && count > 0 ? `${count} ` : "";
  return {
    title: `Mining Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian mining investment opportunities. Filter by commodity (lithium, gold, copper, iron ore, rare earths), project stage, and state.",
    alternates: { canonical: `${SITE_URL}/invest/mining/opportunities` },
    openGraph: {
      title: `Mining Investment Opportunities Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/mining/opportunities`,
    },
  };
}

export default async function MiningOpportunitiesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("status", "active")
    .order("listing_type", { ascending: false })
    .order("created_at", { ascending: false });

  const listings: InvestmentListing[] = (data ?? []) as InvestmentListing[];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Mining", url: `${SITE_URL}/invest/mining` },
    { name: "Opportunities" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <UnifiedListingsClient listings={listings} defaultVertical="mining" />
      </Suspense>
    </>
  );
}
