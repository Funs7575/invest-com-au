import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { UK_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: UK_CONFIG.metadata.title,
  description: UK_CONFIG.metadata.description,
  openGraph: {
    title: UK_CONFIG.metadata.ogTitle,
    description: UK_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${UK_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(UK_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(UK_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${UK_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function UKInvestingPage() {
  return <CountryHubTemplate config={UK_CONFIG} />;
}
