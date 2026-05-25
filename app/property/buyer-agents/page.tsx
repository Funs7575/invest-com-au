import type { Metadata } from "next";
import BuyerAgentsClient from "./BuyerAgentsClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

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
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Property", url: absoluteUrl("/properties") },
    { name: "Buyer's Agents" },
  ]);
  return (
    <>
      <JsonLd data={breadcrumb} testId="buyer-agents-jsonld" />
      <BuyerAgentsClient />
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <ComplianceFooter variant="property" />
      </div>
    </>
  );
}
