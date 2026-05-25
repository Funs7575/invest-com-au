import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Advisor Plans & Pricing",
  description:
    "Choose the right plan for your advisory practice. Get qualified leads, priority matching, and premium placement on Invest.com.au.",
  alternates: { canonical: "/for-advisors/pricing" },
};

export default function PricingPage() {
  return <PricingClient />;
}
