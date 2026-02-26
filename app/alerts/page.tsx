import { createClient } from "@/lib/supabase/server";
import type { RegulatoryAlert } from "@/lib/types";
import AlertsClient from "./AlertsClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = {
  title: "Regulatory & Tax Change Alerts — Australian Investing Updates",
  description:
    "Stay informed on ASIC regulations, ATO tax changes, superannuation rules, and reporting requirements that affect Australian investors and their broker accounts.",
  openGraph: {
    title: `Regulatory & Tax Alerts — ${SITE_NAME}`,
    description: "Curated ASIC, ATO, and Treasury changes that affect Australian investors.",
    images: [{ url: "/api/og?title=Regulatory+Alerts&subtitle=Tax+%26+Rule+Changes+for+Investors&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/alerts" },
};

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("regulatory_alerts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Regulatory Alerts" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <AlertsClient alerts={(data as RegulatoryAlert[]) || []} />
    </>
  );
}
