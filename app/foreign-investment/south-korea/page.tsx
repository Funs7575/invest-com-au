import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { KR_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: KR_CONFIG.metadata.title,
  description: KR_CONFIG.metadata.description,
  openGraph: {
    title: KR_CONFIG.metadata.ogTitle,
    description: KR_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${KR_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(KR_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(KR_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${KR_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function SouthKoreaInvestingPage() {
  return <CountryHubTemplate config={KR_CONFIG} />;
}
