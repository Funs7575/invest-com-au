import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { SG_CONFIG } from "@/lib/foreign-investment-country-data";
import CountryHubTemplate from "@/components/foreign-investment/CountryHubTemplate";

export const metadata: Metadata = {
  title: SG_CONFIG.metadata.title,
  description: SG_CONFIG.metadata.description,
  openGraph: {
    title: SG_CONFIG.metadata.ogTitle,
    description: SG_CONFIG.metadata.ogSub,
    url: `${SITE_URL}/foreign-investment/${SG_CONFIG.slug}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(SG_CONFIG.metadata.ogTitle)}&sub=${encodeURIComponent(SG_CONFIG.metadata.ogSub)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/${SG_CONFIG.slug}` },
};

export const revalidate = 86400;

export default function SingaporeInvestingPage() {
  return <CountryHubTemplate config={SG_CONFIG} />;
}
