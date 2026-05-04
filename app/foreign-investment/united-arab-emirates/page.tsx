import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { AE_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: AE_CONFIG.metadata.title,
  description: AE_CONFIG.metadata.description,
  openGraph: {
    title: AE_CONFIG.metadata.ogTitle,
    description: AE_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${AE_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(AE_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(AE_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${AE_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function UAEInvestingPage() {
  return <CountryHubTemplate config={AE_CONFIG} />;
}
