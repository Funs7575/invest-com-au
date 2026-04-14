import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    // Reduce aggressive prefetching — only prefetch on hover, not on viewport
    optimisticClientCache: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "guggzyqceattncjwvgyc.supabase.co",
        pathname: "/storage/**",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/fonts/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/logos/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/images/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // NOTE: Content-Security-Policy is set by proxy.ts per request
          // so it can carry a fresh nonce for inline scripts. Static
          // CSP is not used any more — the proxy value wins regardless.
        ],
      },
    ];
  },
  async redirects() {
    return [
      // /start is retired — the unified quiz at /quiz serves both DIY and advisor tracks
      {
        source: "/start",
        destination: "/quiz",
        permanent: false,
      },
      {
        source: "/course",
        destination: "/courses/investing-101",
        permanent: true,
      },
      {
        source: "/course/:slug",
        destination: "/courses/investing-101/:slug",
        permanent: true,
      },
      {
        source: "/learn",
        destination: "/articles",
        permanent: true,
      },
      {
        source: "/new-to-investing",
        destination: "/article/how-to-invest-australia",
        permanent: false,
      },
      // ── Investment marketplace URL standardisation ──
      // Redirect /opportunities and /projects to /listings for consistency
      {
        source: "/invest/:category/opportunities",
        destination: "/invest/:category/listings",
        permanent: true,
      },
      {
        source: "/invest/:category/opportunities/:subcategory",
        destination: "/invest/:category/listings/:subcategory",
        permanent: true,
      },
      {
        source: "/invest/:category/projects",
        destination: "/invest/:category/listings",
        permanent: true,
      },
      {
        source: "/invest/:category/projects/:subcategory",
        destination: "/invest/:category/listings/:subcategory",
        permanent: true,
      },
      // ── /invest/listing/[slug] catch-all (deleted route) ──
      // Old inbound links from before the listings system cleanup used
      // a flat `/invest/listing/[slug]` URL that no longer exists.
      // Google + Reddit + Twitter backlinks still point at these. Route
      // them to the new category-scoped URL — we can't reliably know the
      // vertical from the slug alone, so fall back to the category
      // homepage which has a search/filter onto the listing.
      {
        source: "/invest/listing/:slug",
        destination: "/invest/listings/:slug",
        permanent: true,
      },
      // ── Old mining/energy/startup URL shapes ──
      // These were previously under plural paths like `/mining/opportunities/`.
      // The slug-level redirects below cover the remaining shape variants
      // the generic :category/:path catch doesn't reach (e.g. the absence
      // of a category path param in the old URL).
      {
        source: "/mining/opportunities/:slug",
        destination: "/invest/mining/listings/:slug",
        permanent: true,
      },
      {
        source: "/renewable-energy/projects/:slug",
        destination: "/invest/renewable-energy/listings/:slug",
        permanent: true,
      },
      {
        source: "/startups/opportunities/:slug",
        destination: "/invest/startups/listings/:slug",
        permanent: true,
      },
      // ── Pre-IA-overhaul discovery-page redirects ──
      // Legacy /investments and /discover catch-alls that pre-date the
      // current /invest hierarchy.
      {
        source: "/investments",
        destination: "/invest",
        permanent: true,
      },
      {
        source: "/investments/:path*",
        destination: "/invest/:path*",
        permanent: true,
      },
      {
        source: "/discover",
        destination: "/invest",
        permanent: true,
      },
      {
        source: "/discover/:path*",
        destination: "/invest/:path*",
        permanent: true,
      },
    ];
  },
};

// withSentryConfig wraps the Next.js config for error tracking + source
// map upload. The upload step requires SENTRY_ORG, SENTRY_PROJECT AND
// SENTRY_AUTH_TOKEN to be set in the build environment. If any is
// missing, Sentry's CLI fails the build during the upload phase —
// silently on local builds (silent: true) but loudly on Vercel where
// CI=true flips the silent flag off.
//
// Until Sentry is fully configured in Vercel, make the wrap
// conditional: skip it entirely when SENTRY_AUTH_TOKEN isn't set, so
// the build ships as a plain Next.js app with no error tracking
// instead of failing. Once the env vars are added in Vercel, the
// wrap auto-re-engages on the next deploy with zero code changes.
//
// Using `as any` because Sentry v9 peer-deps target Next.js ≤15 types,
// but the runtime integration works fine with Next.js 16.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: NextConfig = process.env.SENTRY_AUTH_TOKEN
  ? (withSentryConfig(nextConfig as any, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
    }) as NextConfig)
  : nextConfig;

export default config;
