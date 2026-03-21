import type { Metadata } from "next";
import ListingsClient from "./ListingsClient";

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
  return <ListingsClient />;
}
