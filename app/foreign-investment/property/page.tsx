import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

/**
 * /foreign-investment/property — Canonical property page for the foreign investment hub.
 *
 * The main FIRB content lives at /property/foreign-investment (well-established, high SEO value).
 * This page redirects there rather than duplicating content, preserving SEO equity.
 *
 * When enough time has passed and /foreign-investment/property accumulates its own authority,
 * the redirect can be inverted and /property/foreign-investment can redirect here.
 */
export const metadata: Metadata = {
  title: "Foreign Property Investment in Australia — FIRB Guide",
  description:
    "FIRB approval process, eligible property types, state stamp duty surcharges (7–8%), application fees, and everything foreign investors need to know before buying Australian property. Updated March 2026.",
  alternates: { canonical: `${SITE_URL}/property/foreign-investment` },
};

export default function ForeignInvestmentPropertyPage() {
  redirect("/property/foreign-investment");
}
