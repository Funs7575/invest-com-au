import { Suspense } from "react";
import type { Metadata } from "next";
import ListingsClient from "./ListingsClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "New Developments & Property Listings — invest.com.au",
  description:
    "Browse off-the-plan apartments, townhouses, and house & land packages across Sydney, Melbourne, Brisbane, Perth, and Adelaide. Free enquiries, no obligation.",
  openGraph: {
    title: "New Developments & Property Listings — invest.com.au",
    description: "Browse new developments across Australia. Free enquiries, no obligation.",
    url: "/property/listings",
  },
  alternates: { canonical: "/property/listings" },
};

export default function PropertyListingsPage() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <ListingsClient />
      </Suspense>
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <ComplianceFooter variant="property" />
      </div>
    </>
  );
}
