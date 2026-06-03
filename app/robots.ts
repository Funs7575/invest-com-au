import type { MetadataRoute } from "next";

// Pure constant generation — no DB, no request state. Pin static so
// Next.js bakes the output at build time instead of re-running the
// function on every crawler hit.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/broker-portal/",
          "/advisor-portal/",
          "/auth/",
          "/account/",
          "/export/",
          "/unsubscribe/",
          "/dashboard/",
          "/shortlist?code=*",
          "/review/",
          "/invest/my-listings/",
          "/go/",
        ],
      },
    ],
    // Point crawlers directly at the 8 sitemap shards. The Next-generated index
    // at /sitemap.xml 404s on the @netlify/plugin-nextjs runtime (it serves each
    // shard at /sitemap/[id].xml but not the auto-index), so listing the shards
    // makes discovery work on both Netlify (now) and Vercel (at launch). Keep in
    // sync with generateSitemaps() in app/sitemap.ts (currently 8 shards: 0-7).
    sitemap: Array.from({ length: 8 }, (_, i) => `${baseUrl}/sitemap/${i}.xml`),
  };
}
