/**
 * Tiny inline blur placeholders for next/image.
 *
 * next/image supports a `placeholder="blur"` mode that needs a
 * `blurDataURL` — typically a base64-encoded 8x5 JPEG. This helper
 * generates a deterministic SVG-based blur placeholder from a brand
 * colour so we don't have to run a build-time image processor for
 * every hero image.
 *
 * Why not `plaiceholder`: plaiceholder needs Node canvas / sharp
 * which we'd rather not ship. For hero images pulled from user
 * uploads (broker logos, advisor photos) we can't pre-process at
 * build time anyway. This helper gives us a "close enough" blur
 * colour so the layout shift is avoided even without a real
 * downsample.
 *
 * Usage:
 *
 *     import Image from "next/image";
 *     import { blurDataURL } from "@/lib/image-blur";
 *
 *     <Image
 *       src={broker.logo_url}
 *       alt={broker.name}
 *       width={64}
 *       height={64}
 *       placeholder="blur"
 *       blurDataURL={blurDataURL(broker.color || "#0f172a")}
 *     />
 */

/**
 * Generate a tiny SVG data URL whose sole content is a solid
 * rectangle of the given colour. Tiny enough that inlining in
 * next/image props is cheap.
 */
export function blurDataURL(color = "#e2e8f0"): string {
  const safe = isValidCssColor(color) ? color : "#e2e8f0";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 5"><rect width="8" height="5" fill="${safe}"/></svg>`;
  // Base64 so browsers treat it as a binary image — URL-encoding
  // can trip Firefox's strict SVG parser.
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(svg, "utf8").toString("base64")
      : btoa(svg);
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Gradient blur — two-stop diagonal gradient from color1 to color2.
 * Nice for hero banners where a solid rectangle looks too flat.
 */
export function gradientBlurDataURL(color1 = "#0f172a", color2 = "#334155"): string {
  const a = isValidCssColor(color1) ? color1 : "#0f172a";
  const b = isValidCssColor(color2) ? color2 : "#334155";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 5"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="8" height="5" fill="url(%23g)"/></svg>`;
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(svg, "utf8").toString("base64")
      : btoa(svg);
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Permissive but XSS-safe CSS colour check: allows #rgb / #rrggbb /
 * rgb() / rgba() / hsl() / hsla() / named colours. Rejects anything
 * with angle brackets or semicolons that would break our SVG
 * interpolation.
 */
function isValidCssColor(value: string): boolean {
  if (!value) return false;
  if (/[<>;"'`]/.test(value)) return false;
  return (
    /^#[0-9a-f]{3}$/i.test(value) ||
    /^#[0-9a-f]{6}$/i.test(value) ||
    /^rgba?\([\d.,\s/%]+\)$/.test(value) ||
    /^hsla?\([\d.,\s/%deg]+\)$/.test(value) ||
    /^[a-z]+$/i.test(value)
  );
}
