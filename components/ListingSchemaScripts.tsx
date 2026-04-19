import { listingProductJsonLd } from "@/lib/schema-markup";

interface ListingLike {
  slug: string;
  title: string;
  description?: string | null;
  images?: string[] | null;
  asking_price_cents?: number | null;
  price_display?: string | null;
  location_state?: string | null;
  location_city?: string | null;
}

interface Props {
  listing: ListingLike;
  vertical: string;
}

/**
 * Renders <script type="application/ld+json"> for a listing's
 * Product schema. Kept as a tiny server component so the 10+ vertical
 * listing-detail pages share a single canonical schema shape.
 */
export default function ListingSchemaScripts({ listing, vertical }: Props) {
  const priceAud =
    listing.asking_price_cents != null
      ? Math.round(listing.asking_price_cents / 100)
      : undefined;
  const product = listingProductJsonLd({
    slug: listing.slug,
    title: listing.title,
    description: listing.description ?? null,
    imageUrl: listing.images?.[0] ?? null,
    priceAud: priceAud ?? null,
    priceDisplay: listing.price_display ?? null,
    locationState: listing.location_state ?? null,
    locationCity: listing.location_city ?? null,
    vertical,
  });
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }}
    />
  );
}
