/**
 * Small helpers for consistent page metadata defaults.
 *
 * Use `portalMetadata()` for gated pages (advisor portal, broker
 * portal, dashboard) that should never be indexed.
 *
 * Use `publicMetadata()` for public pages that need proper SEO
 * — title + description + OG + canonical — so we stop shipping
 * pages with generic site-level fallbacks.
 */

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export interface PublicMetadataOptions {
  title: string;
  description: string;
  path: string; // e.g. "/fee-alerts"
  ogImage?: string | null;
}

export function publicMetadata(opts: PublicMetadataOptions): Metadata {
  const fullTitle = opts.title.includes("invest.com.au")
    ? opts.title
    : `${opts.title} — invest.com.au`;
  return {
    title: fullTitle,
    description: opts.description,
    alternates: { canonical: opts.path },
    robots: { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description: opts.description,
      url: `${SITE_URL}${opts.path}`,
      type: "website",
      images: opts.ogImage
        ? [{ url: opts.ogImage, width: 1200, height: 630 }]
        : [
            {
              url: `/api/og?title=${encodeURIComponent(opts.title)}&type=default`,
              width: 1200,
              height: 630,
            },
          ],
    },
    twitter: { card: "summary_large_image" as const },
  };
}

export function portalMetadata(title: string, description = "Private portal"): Metadata {
  return {
    title: `${title} — invest.com.au`,
    description,
    robots: { index: false, follow: false, nocache: true },
  };
}
