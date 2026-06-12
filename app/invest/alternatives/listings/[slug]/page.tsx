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
  ALTERNATIVES_SUB_CATEGORIES,
} from "@/lib/investment-listings-query";
import { getSubcategoryBySlug } from "@/lib/invest-categories";

export const revalidate = 300;

const CATEGORY_SLUG = "alternatives";
const CATEGORY_LABEL = "Alternative Investments";
const VERTICAL = "fund" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Sub-category metadata takes precedence — if the slug names a
  // known sub-category (e.g. "coins"), use the sub-category's own
  // title/meta rather than trying a DB lookup that would miss.
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

  // Otherwise look up the listing. We restrict the query to
  // alternatives-eligible sub_categories so a fund that isn't
  // really an alternative can't steal the URL.
  const listing = await fetchListingBySlug(VERTICAL, slug);
  if (
    !listing ||
    !listing.sub_category ||
    !(ALTERNATIVES_SUB_CATEGORIES as readonly string[]).includes(listing.sub_category)
  ) {
    return { title: `Alternative Investments (${CURRENT_YEAR})` };
  }

  const title = `${listing.title} — Alternative Investment ${listing.location_state ? `in ${listing.location_state}` : "in Australia"} (${CURRENT_YEAR})`;
  return {
    title,
    description: listing.description?.slice(0, 160) ?? `Alternative investment opportunity. ${listing.price_display ?? ""}`,
    alternates: { canonical: `${SITE_URL}/invest/${CATEGORY_SLUG}/listings/${slug}` },
    openGraph: {
      title,
      description: listing.description?.slice(0, 160),
      url: `${SITE_URL}/invest/${CATEGORY_SLUG}/listings/${slug}`,
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

export default async function AlternativesListingDetailPage({
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
    !(ALTERNATIVES_SUB_CATEGORIES as readonly string[]).includes(listing.sub_category)
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
