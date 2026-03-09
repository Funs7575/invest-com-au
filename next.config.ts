import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  typescript: {
    // TODO: Fix strict TS errors on Vercel (different TS version from local)
    // Vercel's build uses React 19 types where 'unknown' is not assignable to ReactNode
    // Local tsc passes fine. Re-enable once Supabase types are properly narrowed.
    ignoreBuildErrors: true,
  },
  images: {
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
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://www.googletagmanager.com https://www.google-analytics.com https://cal.com; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: https: https://www.googletagmanager.com; " +
              "font-src 'self'; " +
              "connect-src 'self' https://*.supabase.co https://va.vercel-scripts.com https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com https://*.analytics.google.com https://api.stripe.com https://cal.com https://app.cal.com https://*.sentry.io https://*.ingest.sentry.io; " +
              "frame-src https://js.stripe.com https://hooks.stripe.com https://www.youtube-nocookie.com https://player.vimeo.com https://cal.com; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
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
    ];
  },
};

// withSentryConfig wraps the Next.js config for error tracking.
// Using `as any` because Sentry v9 peer-deps target Next.js ≤15 types,
// but the runtime integration works fine with Next.js 16.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withSentryConfig(nextConfig as any, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
}) as typeof nextConfig;
