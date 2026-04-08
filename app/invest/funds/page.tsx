import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import type { InvestmentListing } from "@/components/ListingCard";
import FundsPageClient from "./FundsPageClient";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Australian Investment Fund Directory — SIV Complying Funds (${CURRENT_YEAR})`,
  description:
    "Browse ASIC-regulated Australian investment funds including SIV-complying funds for Significant Investor Visa applicants. Mining, agricultural, property, and infrastructure funds.",
  alternates: { canonical: `${SITE_URL}/invest/funds` },
  openGraph: {
    title: `Australian Investment Fund Directory — SIV Complying Funds (${CURRENT_YEAR})`,
    description:
      "Browse ASIC-regulated Australian investment funds including SIV-complying funds for Significant Investor Visa applicants.",
    url: `${SITE_URL}/invest/funds`,
  },
};

export default async function FundsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("vertical", "fund")
    .eq("status", "active")
    .order("siv_complying", { ascending: false })
    .order("listing_type", { ascending: false })
    .order("created_at", { ascending: false });

  const listings: InvestmentListing[] = (data ?? []) as InvestmentListing[];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Investment Funds" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <Suspense fallback={<div className="min-h-screen" />}>
        <FundsPageClient listings={listings} />
      </Suspense>
    </>
  );
}
