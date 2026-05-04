import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { IN_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: IN_CONFIG.metadata.title,
  description: IN_CONFIG.metadata.description,
  openGraph: {
    title: IN_CONFIG.metadata.ogTitle,
    description: IN_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${IN_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(IN_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(IN_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${IN_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function IndiaInvestingPage() {
  return <CountryHubTemplate config={IN_CONFIG} />;
}
