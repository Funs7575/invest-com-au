/**
 * Site-wide default Twitter card image.
 *
 * Re-uses the OpenGraph image generator so Twitter and other social
 * platforms render identical cards. Twitter's `summary_large_image`
 * card is 1200×630, same as OpenGraph, so a single asset works.
 *
 * Per the 2026-04-26 audit (§8.6, P0-6): without `app/twitter-image.tsx`,
 * Twitter falls back to favicon-tier cards on any page that doesn't
 * explicitly set `twitter.images` in its metadata.
 */
export { default, alt, size, contentType, runtime } from "./opengraph-image";
