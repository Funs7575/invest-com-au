/**
 * Get the production site URL, safely handling the case where
 * NEXT_PUBLIC_SITE_URL is set to localhost (common in dev).
 * Falls back to the Vercel deployment URL.
 */
export function getSiteUrl(requestHost?: string | null): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && !envUrl.includes("localhost")) return envUrl;
  if (requestHost && !requestHost.includes("localhost")) {
    return `https://${requestHost}`;
  }
  return "https://invest-com-au.vercel.app";
}
