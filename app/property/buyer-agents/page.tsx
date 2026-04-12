import type { Metadata } from "next";
import BuyerAgentsClient from "./BuyerAgentsClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Verified Buyer's Agents Australia — invest.com.au",
  description:
    "Find a verified buyer's agent in Sydney, Melbourne, Brisbane, Perth, Adelaide and beyond. Compare fees, specialities, and reviews. Free consultation, no obligation.",
  openGraph: {
    title: "Verified Buyer's Agents — invest.com.au",
    description: "Find a verified buyer's agent near you. Free consultation, no obligation.",
    url: "/property/buyer-agents",
  },
  alternates: { canonical: "/property/buyer-agents" },
};

export default function BuyerAgentsPage() {
  return <BuyerAgentsClient />;
}
