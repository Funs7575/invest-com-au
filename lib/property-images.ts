/**
 * Hardcoded property listing images — curated Unsplash photos.
 * Used as a fallback when the database `images` column is empty.
 * This ensures listings always display real property photos on the site.
 */

export const LISTING_IMAGES: Record<string, string[]> = {
  "the-operetta-paramatta": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  "botanical-residences-south-melbourne": [
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  "riverview-terrace-newstead": [
    "https://images.unsplash.com/photo-1558036519-cf2b9e65b7d5?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  "elara-marsden-park": [
    "https://images.unsplash.com/photo-1448630905060-59d64ae04aab?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  "yarra-one-south-yarra": [
    "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  "west-village-west-end": [
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  "haven-crows-nest": [
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  "aurora-melbourne-central": [
    "https://images.unsplash.com/photo-1474823397925-4b4a4faedee5?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1527176930608-09cb256ab504?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
};

/** Generic fallback images by property type when slug is not in the map */
export const TYPE_FALLBACK_IMAGES: Record<string, string[]> = {
  apartment: [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  townhouse: [
    "https://images.unsplash.com/photo-1558036519-cf2b9e65b7d5?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  house_land: [
    "https://images.unsplash.com/photo-1448630905060-59d64ae04aab?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
};

/** Get images for a listing, falling back to hardcoded data if DB images are empty */
export function getListingImages(
  slug: string,
  dbImages: string[] | null | undefined,
  propertyType?: string,
): string[] {
  if (dbImages && dbImages.length > 0) return dbImages;
  if (LISTING_IMAGES[slug]) return LISTING_IMAGES[slug];
  if (propertyType && TYPE_FALLBACK_IMAGES[propertyType]) return TYPE_FALLBACK_IMAGES[propertyType];
  return TYPE_FALLBACK_IMAGES.apartment;
}
