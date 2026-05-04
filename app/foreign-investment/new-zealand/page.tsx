import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { NZ_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: NZ_CONFIG.metadata.title,
  description: NZ_CONFIG.metadata.description,
  openGraph: {
    title: NZ_CONFIG.metadata.ogTitle,
    description: NZ_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${NZ_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(NZ_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(NZ_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${NZ_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function NewZealandInvestingPage() {
  return <CountryHubTemplate config={NZ_CONFIG} />;
}
