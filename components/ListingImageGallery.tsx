import Image from "next/image";
import { getListingHeroImage } from "@/lib/listing-vertical-images";

interface ListingImageGalleryProps {
  images?: string[] | null;
  alt: string;
  /** Vertical of the listing — used to pick a seed hero when `images` is empty. */
  vertical?: string | null;
  /** Stable id (DB id or slug) — keeps the seed deterministic per listing. */
  listingId?: number | string;
  /** sub_category / commodity for finer-grained image selection. */
  subCategory?: string | null;
}

/**
 * Image gallery for investment listing detail pages.
 * Shows a hero image with up to 4 thumbnails.
 * When the DB has no images, falls back to a single seed hero
 * (no thumbnails) keyed on vertical + sub_category + id.
 */
export default function ListingImageGallery({
  images,
  alt,
  vertical,
  listingId,
  subCategory,
}: ListingImageGalleryProps) {
  const dbImages = images && images.length > 0 ? images : null;
  const hasDbImages = !!dbImages;

  const hero = hasDbImages
    ? dbImages[0]
    : listingId !== undefined
      ? getListingHeroImage(vertical, listingId, null, subCategory)
      : null;

  if (!hero) return null;

  const thumbs = hasDbImages ? dbImages.slice(1, 5) : [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Hero image */}
      <div className="relative aspect-[16/9] bg-slate-100">
        <Image
          src={hero}
          alt={alt}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 66vw"
        />
      </div>
      {/* Thumbnails grid (only when DB has multiple images) */}
      {thumbs.length > 0 && (
        <div className="grid grid-cols-4 gap-1 p-1">
          {thumbs.map((img, i) => (
            <div key={img + i} className="relative aspect-square bg-slate-100 rounded overflow-hidden">
              <Image
                src={img}
                alt={`${alt} — image ${i + 2}`}
                fill
                loading="lazy"
                className="object-cover"
                sizes="(max-width: 1024px) 25vw, 16vw"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
