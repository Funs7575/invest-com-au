import type { Metadata } from "next";
import SuburbsClient from "./SuburbsClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Suburb Research — Property Investment Data — invest.com.au",
  description:
    "Research Australian suburbs with median prices, rental yields, vacancy rates, capital growth, and population data. Data-driven property investment decisions.",
  openGraph: {
    title: "Suburb Research — invest.com.au",
    description: "Research suburbs with median prices, rental yields, and capital growth data.",
    url: "/property/suburbs",
  },
  alternates: { canonical: "/property/suburbs" },
};

export default function SuburbResearchPage() {
  return (
    <>
      <SuburbsClient />
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <ComplianceFooter variant="property" />
      </div>
    </>
  );
}
