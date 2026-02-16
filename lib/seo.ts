export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

export const SITE_NAME = "Invest.com.au";

export const SITE_DESCRIPTION =
  "Compare Australia's best share trading platforms. Honest reviews, fee calculators, and CHESS-sponsored broker comparisons. No bank bias.";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Generate BreadcrumbList JSON-LD schema.
 * Last item should omit `url` (current page).
 */
export function breadcrumbJsonLd(
  items: { name: string; url?: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}
