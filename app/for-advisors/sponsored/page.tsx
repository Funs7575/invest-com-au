import type { Metadata } from "next";
import SponsoredClient from "./SponsoredClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sponsored Content — Reach Your Ideal Clients",
  description:
    "Promote your advisory practice with sponsored articles, calculator sponsorships, and featured directory placement on Invest.com.au.",
  alternates: { canonical: "/for-advisors/sponsored" },
  openGraph: {
    title: "Sponsored Content — Reach Your Ideal Clients",
    description:
      "Sponsored articles, calculator sponsorships, and featured placement for Australian financial advisers.",
    url: "/for-advisors/sponsored",
    images: [
      {
        url: "/api/og?title=Sponsored+Content&subtitle=Reach+Your+Ideal+Clients+on+Invest.com.au&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

export default function SponsoredPage() {
  return <SponsoredClient />;
}
