import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { MY_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: MY_CONFIG.metadata.title,
  description: MY_CONFIG.metadata.description,
  openGraph: {
    title: MY_CONFIG.metadata.ogTitle,
    description: MY_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${MY_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(MY_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(MY_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${MY_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function MalaysiaInvestingPage() {
  return <CountryHubTemplate config={MY_CONFIG} />;
}
