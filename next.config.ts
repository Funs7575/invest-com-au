import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  experimental: {
    // Reduce aggressive prefetching — only prefetch on hover, not on viewport
    optimisticClientCache: false,
    // Rewrites barrel imports (e.g. `import { X } from "@sentry/nextjs"`)
    // into deep path imports at build time, giving tree-shaking a chance
    // to drop unused exports. Measurable win on the heavier packages
    // below — Sentry + Supabase together were >100KB of dead weight
    // shipped to the client in prior bundles.
    optimizePackageImports: [
      "@sentry/nextjs",
      "@supabase/supabase-js",
      "@supabase/ssr",
    ],
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
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/v1/**",
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
          // K-05 (audit 2026-04-26 §7 SEC-05): X-Frame-Options and
          // Permissions-Policy were removed from this list because they
          // conflicted with the values in `proxy.ts` (DENY vs SAMEORIGIN
          // for X-Frame-Options; geolocation=(self) vs geolocation=()
          // for Permissions-Policy). Two simultaneous headers caused
          // browsers to pick most-restrictive, silently breaking
          // geolocation use. proxy.ts is now the single source of truth
          // for those two.
          //
          // Headers below remain duplicated with proxy.ts but the values
          // match exactly (no drift), and they cover the static-asset
          // paths excluded from the middleware matcher (`/_next/static/*`,
          // `/_next/image/*`, `/favicon.ico`).
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
      // /advisors/search retired 2026-05 — the inline filter panel on
      // /advisors now hosts every filter the standalone page had
      // (language, accepting-new-clients, with-intro-video) plus the
      // filters the standalone page lacked (location/proximity, firm,
      // min rating, specialty, shortlist). One filter UI, one result feed.
      {
        source: "/advisors/search",
        destination: "/advisors",
        permanent: true,
      },
      // /invest/listings retired — /invest IS the marketplace landing now (no
      // more two-step "category aggregator → click again to see deals"). Pre-
      // launch consolidation, no SEO equity to preserve. Permanent redirect
      // keeps any deep-linked /invest/listings working.
      {
        source: "/invest/listings",
        destination: "/invest",
        permanent: true,
      },
      // ── IA refactor 2026-05-07: Compare / Browse / Experts / Match / Request ──
      // /invest used to host platform-comparison categories (forex,
      // managed-funds) and near-duplicate IPO + dividend pages. The IA
      // now treats /invest as Browse-Opportunities only; the four URLs
      // below 301 to their canonical Compare or canonical-of-pair home.
      // The other 8 demoted categories (smsf, options-trading, reits,
      // bonds, hybrid-securities, crypto-staking, ipo-calendar,
      // commodities) stay live as `intent: "guide"` SEO/education pages
      // — hidden from /invest IA but reachable via search and direct
      // links. No directory deletes; revert by commenting these four
      // lines out.
      {
        source: "/invest/forex",
        destination: "/cfd",
        permanent: true,
      },
      {
        source: "/invest/managed-funds",
        destination: "/invest/funds",
        permanent: true,
      },
      {
        source: "/invest/dividend-investing",
        destination: "/dividends",
        permanent: true,
      },
      {
        source: "/invest/ipos",
        destination: "/invest/ipo-calendar",
        permanent: true,
      },
      // /start is retired — the unified quiz at /quiz serves both DIY and advisor tracks
      {
        source: "/start",
        destination: "/get-matched",
        permanent: false,
      },
      // /quiz fully replaced by /get-matched (pre-launch — no transition banner).
      {
        source: "/quiz",
        destination: "/get-matched",
        permanent: true,
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
      // ── Commodity pillar pages → canonical subcategory listings ──
      // /invest/uranium, /invest/gold, /invest/lithium etc. are SEO/education
      // pillar pages; the marketplace listings live under the parent category
      // (mining or renewable-energy) as `/listings/<commodity>` subpaths. Users
      // who land on the pillar and try /listings naturally hit a 404 — redirect
      // them to the canonical listings location. 308 so search engines update.
      {
        source: "/invest/uranium/listings",
        destination: "/invest/mining/listings/uranium",
        permanent: true,
      },
      {
        source: "/invest/gold/listings",
        destination: "/invest/mining/listings/gold",
        permanent: true,
      },
      {
        source: "/invest/lithium/listings",
        destination: "/invest/mining/listings/lithium",
        permanent: true,
      },
      {
        source: "/invest/hydrogen/listings",
        destination: "/invest/renewable-energy/listings/hydrogen",
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
      // ── GI-stream — /global-investing outbound hub consolidation ──
      // Wave 1 cornerstone /global-investing/shares/us shipped in PR #542;
      // GI-08 cloned /etfs/us-exposure → /global-investing/etfs/us and
      // /etfs/international → /global-investing/etfs/global in this PR.
      // 8 redirects below collapse fragmented authority into the canonical
      // hub URLs. Remaining 5 redirects (best/forex*, best/international-shares,
      // best/best-international-etfs) deferred until their target pages
      // (/global-investing/currency/best-fx-providers, /global-investing/shares,
      // /global-investing/etfs) ship in Waves 2-4. See
      // docs/audits/GLOBAL_INVESTING_PROGRAM.md §3 for the full canonical
      // redirect map and gating rationale.
      {
        source: "/best/us-shares",
        destination: "/global-investing/shares/us",
        permanent: true,
      },
      {
        source: "/best/cheapest-us-shares",
        destination: "/global-investing/shares/us",
        permanent: true,
      },
      {
        source: "/best/us-shares-5000",
        destination: "/global-investing/shares/us",
        permanent: true,
      },
      {
        source: "/best/us-shares-monthly",
        destination: "/global-investing/shares/us",
        permanent: true,
      },
      {
        source: "/best/us-fee",
        destination: "/global-investing/shares/us",
        permanent: true,
      },
      {
        source: "/best/invest-in-us-shares",
        destination: "/global-investing/shares/us",
        permanent: true,
      },
      {
        source: "/etfs/us-exposure",
        destination: "/global-investing/etfs/us",
        permanent: true,
      },
      {
        source: "/etfs/international",
        destination: "/global-investing/etfs/global",
        permanent: true,
      },
      // ── PMP-01: /quotes/post relocated to /briefs/new ──
      // The bid-auction Post-a-Request flow is replaced by the structured
      // Investor Brief flow at /briefs/new. Legacy /quotes/* job pages
      // remain live for previously-posted auction-style requests.
      {
        source: "/quotes/post",
        destination: "/briefs/new",
        permanent: true,
      },
      // ── W-14: /grants hub relocated to /startup/grants ──
      // Canonical URL moves so the grants hub sits inside the /startup
      // content cluster. Subroutes (/grants/eligibility-quiz, /grants/rd-tax-
      // incentive, /grants/emdg, /grants/industry-growth-program) keep their
      // current paths — only the hub index moves.
      {
        source: "/grants",
        destination: "/startup/grants",
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
const sentryWrapped: NextConfig = process.env.SENTRY_AUTH_TOKEN
  ? (withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
    }) as NextConfig)
  : nextConfig;

// Bundle analyzer wraps last so it sees the full Sentry-augmented config
const config = bundleAnalyzer(sentryWrapped);

export default config;
