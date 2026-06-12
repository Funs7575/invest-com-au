import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import ListingDetailView from "@/components/invest/ListingDetailView";
import ListingsEmptyState from "@/components/ListingsEmptyState";
import SubCategoryListingsView from "@/components/SubCategoryListingsView";
import { type InvestmentListing } from "@/components/ListingCard";
import {
  fetchListingBySlug,
  fetchListingsBySubCategory,
  fetchRelatedListings,
  INFRASTRUCTURE_SUB_CATEGORIES,
} from "@/lib/investment-listings-query";
import { getSubcategoryBySlug } from "@/lib/invest-categories";

export const revalidate = 300;

const CATEGORY_SLUG = "infrastructure";
const CATEGORY_LABEL = "Infrastructure";
const VERTICAL = "fund" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const subCat = getSubcategoryBySlug(CATEGORY_SLUG, slug);
  if (subCat) {
    return {
      title: subCat.title,
      description: subCat.metaDescription,
      alternates: { canonical: `${SITE_URL}/invest/${CATEGORY_SLUG}/listings/${slug}` },
      openGraph: {
        title: subCat.title,
        description: subCat.metaDescription,
        url: `${SITE_URL}/invest/${CATEGORY_SLUG}/listings/${slug}`,
      },
      twitter: { card: "summary_large_image" as const },
    };
  }

  const listing = await fetchListingBySlug(VERTICAL, slug);
  if (
    !listing ||
    !listing.sub_category ||
    !(INFRASTRUCTURE_SUB_CATEGORIES as readonly string[]).includes(listing.sub_category)
  ) {
    return { title: `Infrastructure Investments (${CURRENT_YEAR})` };
  }

  const title = `${listing.title} — Infrastructure Investment ${listing.location_state ? `in ${listing.location_state}` : "in Australia"} (${CURRENT_YEAR})`;
  return {
    title,
    description: listing.description?.slice(0, 160) ?? `Infrastructure investment opportunity. ${listing.price_display ?? ""}`,
    alternates: { canonical: `${SITE_URL}/invest/infrastructure/listings/${slug}` },
    openGraph: {
      title,
      description: listing.description?.slice(0, 160),
      url: `${SITE_URL}/invest/infrastructure/listings/${slug}`,
      images: [{
        url: `/api/og?title=${encodeURIComponent(listing.title)}&type=invest`,
        width: 1200,
        height: 630,
        alt: listing.title,
      }],
    },
    twitter: { card: "summary_large_image" as const },
  };
}

export default async function InfrastructureListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const subCat = getSubcategoryBySlug(CATEGORY_SLUG, slug);
  if (subCat) {
    const listings = await fetchListingsBySubCategory(VERTICAL, subCat.dbValue);
    return (
      <SubCategoryListingsView
        listings={listings}
        subCategory={subCat}
        categorySlug={CATEGORY_SLUG}
        categoryLabel={CATEGORY_LABEL}
      />
    );
  }

  const listing = await fetchListingBySlug(VERTICAL, slug);
  if (
    !listing ||
    !listing.sub_category ||
    !(INFRASTRUCTURE_SUB_CATEGORIES as readonly string[]).includes(listing.sub_category)
  ) {
    return (
      <ListingsEmptyState
        categoryLabel={CATEGORY_LABEL}
        categorySlug={CATEGORY_SLUG}
      />
    );
  }

  const relatedListings = await fetchRelatedListings(VERTICAL, slug, listing.sub_category, 3);

  return (
    <ListingDetailView
      listing={listing as InvestmentListing}
      relatedListings={relatedListings as InvestmentListing[]}
      categorySlug={CATEGORY_SLUG}
      categoryLabel={CATEGORY_LABEL}
    />
  );
}
