import type { Metadata } from "next";
import SponsoredClient from "./SponsoredClient";

export const metadata: Metadata = {
  title: "Sponsored Content — Reach Your Ideal Clients",
  description:
    "Promote your advisory practice with sponsored articles, calculator sponsorships, and featured directory placement on Invest.com.au.",
  alternates: { canonical: "/for-advisors/sponsored" },
};

export default function SponsoredPage() {
  return <SponsoredClient />;
}
