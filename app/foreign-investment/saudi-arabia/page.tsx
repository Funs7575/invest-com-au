import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { SA_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: SA_CONFIG.metadata.title,
  description: SA_CONFIG.metadata.description,
  openGraph: {
    title: SA_CONFIG.metadata.ogTitle,
    description: SA_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${SA_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(SA_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(SA_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${SA_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function SaudiArabiaInvestingPage() {
  return <CountryHubTemplate config={SA_CONFIG} />;
}
