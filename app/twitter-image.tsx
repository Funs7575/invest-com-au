import OpenGraphImage from "./opengraph-image";

/**
 * Site-wide default Twitter card image.
 *
 * Re-uses the OpenGraph image generator so Twitter and other social
 * platforms render identical cards. Twitter's `summary_large_image`
 * card is 1200×630, same as OpenGraph, so a single rendered asset
 * works.
 *
 * NOTE on the export shape: Next.js 16 / Turbopack requires the
 * route-segment config (`runtime`, `alt`, `size`, `contentType`) to
 * be statically parseable in EACH file — re-exporting via
 * `export { runtime } from "./opengraph-image"` fails the build with
 * "Next.js can't recognize the exported `runtime` field". So we
 * redeclare each metadata constant inline (cheap — strings + a tiny
 * object) and only delegate the actual `Image()` rendering function.
 *
 * Per the 2026-04-26 audit (§8.6, P0-6): without this file, Twitter
 * falls back to favicon-tier cards on any page that doesn't
 * explicitly set `twitter.images` in its metadata.
 */

export const runtime = "edge";
export const alt = "Invest.com.au — Compare Australian Investing Platforms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TwitterImage() {
  return OpenGraphImage();
}
