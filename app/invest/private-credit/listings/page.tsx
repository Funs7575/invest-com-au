import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import type { InvestmentListing } from "@/lib/types";
import { getAllInvestCategories, getInvestCategoryBySlug } from "@/lib/invest-categories";
import InvestListingsClient from "@/components/InvestListingsClient";
import SubCategoryNav from "@/components/SubCategoryNav";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("investment_listings")
    .select("id", { count: "exact", head: true })
    .eq("vertical", "private_credit")
    .eq("status", "active");

  const countLabel = count && count > 0 ? `${count} ` : "";
  return {
    title: `Private Credit Funds Australia — Browse ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Explore private credit investment opportunities in Australia. Senior secured, mezzanine, P2P lending, real estate debt and more.",
    alternates: { canonical: `${SITE_URL}/invest/private-credit/listings` },
    openGraph: {
      title: `Private Credit Funds Australia — ${countLabel}Active Listings`,
      description:
        "Explore private credit investment opportunities in Australia. Senior secured, mezzanine, P2P lending and more.",
      url: `${SITE_URL}/invest/private-credit/listings`,
    },
  };
}

export default async function PrivateCreditListingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("status", "active")
    .order("listing_type", { ascending: false })
    .order("created_at", { ascending: false });

  const listings: InvestmentListing[] = (data ?? []) as InvestmentListing[];
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("private-credit");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Private Credit", url: `${SITE_URL}/invest/private-credit` },
    { name: "Listings" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {category && (
        <div className="container-custom pt-6">
          <SubCategoryNav category={category} />
        </div>
      )}
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient listings={listings} categories={categoryTabs} initialCategory="private-credit" />
      </Suspense>
    </>
  );
}
