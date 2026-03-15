import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/seo";
import ScoreClient from "./ScoreClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Financial Health Score — Free 2-Minute Assessment (2026)",
  description:
    "Take our free 2-minute financial health quiz and get a personalised score out of 100. Discover your strengths, weaknesses, and next steps.",
  alternates: { canonical: "/score" },
  openGraph: {
    title: `Financial Health Score — Free 2-Minute Assessment | ${SITE_NAME}`,
    description:
      "Rate your financial health across savings, debt, super, insurance, investing, and planning. Get personalised recommendations.",
    images: [
      {
        url: "/api/og?title=Financial+Health+Score&subtitle=Free+2-Minute+Assessment&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function ScorePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `Financial Health Score — ${SITE_NAME}`,
    description:
      "Free 2-minute financial health assessment. Get a personalised score out of 100 with actionable recommendations.",
    url: "https://invest.com.au/score",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScoreClient />
    </>
  );
}
