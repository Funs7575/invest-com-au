import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { HK_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: HK_CONFIG.metadata.title,
  description: HK_CONFIG.metadata.description,
  openGraph: {
    title: HK_CONFIG.metadata.ogTitle,
    description: HK_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${HK_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(HK_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(HK_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${HK_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function HongKongInvestingPage() {
  return <CountryHubTemplate config={HK_CONFIG} />;
}
