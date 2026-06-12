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
} from "@/lib/investment-listings-query";
import { getSubcategoryBySlug } from "@/lib/invest-categories";

export const revalidate = 300;

const CATEGORY_SLUG = "commercial-property";
const CATEGORY_LABEL = "Commercial Property";
const VERTICAL = "commercial_property" as const;

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
  if (!listing) return { title: `Commercial Property (${CURRENT_YEAR})` };
  const yld = (listing.key_metrics as Record<string, unknown>)?.yield_percent;
  const location = [listing.location_city, listing.location_state].filter(Boolean).join(", ");
  const title = `${listing.title}${yld ? ` — ${yld}% Yield` : ""}${location ? ` in ${location}` : ""} (${CURRENT_YEAR})`;
  return {
    title,
    description: listing.description?.slice(0, 160) ?? `Commercial property for sale. ${location}`,
    alternates: { canonical: `${SITE_URL}/invest/commercial-property/listings/${slug}` },
    openGraph: {
      title,
      description: listing.description?.slice(0, 160),
      url: `${SITE_URL}/invest/commercial-property/listings/${slug}`,
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

export default async function CommercialListingDetailPage({
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
  if (!listing) {
    return (
      <ListingsEmptyState
        categoryLabel={CATEGORY_LABEL}
        categorySlug={CATEGORY_SLUG}
      />
    );
  }

  const relatedListings = await fetchRelatedListings(VERTICAL, slug, null, 3);

  return (
    <ListingDetailView
      listing={listing as InvestmentListing}
      relatedListings={relatedListings as InvestmentListing[]}
      categorySlug={CATEGORY_SLUG}
      categoryLabel={CATEGORY_LABEL}
    />
  );
}
