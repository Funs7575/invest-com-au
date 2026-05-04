import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { CN_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: CN_CONFIG.metadata.title,
  description: CN_CONFIG.metadata.description,
  openGraph: {
    title: CN_CONFIG.metadata.ogTitle,
    description: CN_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${CN_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(CN_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(CN_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${CN_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function ChinaInvestingPage() {
  return <CountryHubTemplate config={CN_CONFIG} />;
}
