import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { US_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: US_CONFIG.metadata.title,
  description: US_CONFIG.metadata.description,
  openGraph: {
    title: US_CONFIG.metadata.ogTitle,
    description: US_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${US_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(US_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(US_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${US_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function USAInvestingPage() {
  return <CountryHubTemplate config={US_CONFIG} />;
}
