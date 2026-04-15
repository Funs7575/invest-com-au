import Image from "next/image";

interface ListingImageGalleryProps {
  images?: string[] | null;
  alt: string;
}

/**
 * Image gallery for investment listing detail pages.
 * Shows a hero image with up to 4 thumbnails.
 * Renders nothing if there are no images.
 */
export default function ListingImageGallery({ images, alt }: ListingImageGalleryProps) {
  if (!images || images.length === 0) return null;

  const hero = images[0];
  const thumbs = images.slice(1, 5);

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
      {/* Thumbnails grid (only if there are more images) */}
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
