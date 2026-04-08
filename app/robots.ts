import type { MetadataRoute } from "next";

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
