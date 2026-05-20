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
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
