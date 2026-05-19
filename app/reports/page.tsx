import { createClient } from "@/lib/supabase/server";
import type { QuarterlyReport } from "@/lib/types";
import ReportsClient from "./ReportsClient";

export const revalidate = 3600; // 1 hour
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const metadata = {
  title: "Quarterly Platform Industry Reports — Australian Market Analysis",
  description:
    "Quarterly reports on the Australian investing platform landscape: fee changes, new entrants, market trends, and key findings for investors.",
  // noindex: backing table (quarterly_reports) has 0 rows — remove this once content is seeded
  robots: { index: false, follow: true },
  openGraph: {
    title: "Quarterly Industry Reports",
    description: "In-depth quarterly analysis of the Australian investing platform industry.",
    images: [{ url: "/api/og?title=Quarterly+Reports&subtitle=Australian+Platform+Industry+Analysis&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/reports" },
};

export default async function ReportsPage() {
  const supabase = await createClient();
  // Explicit non-premium column list — `sections`, `fee_changes_summary`,
  // and `new_entrants` are revoked from anon/authenticated at the column-
  // GRANT layer (see migration
  // 20260517_w2_17_premium_content_column_grants.sql). `select("*")` would
  // 403 here; the list page only renders summary fields anyway.
  const { data } = await supabase
    .from("quarterly_reports")
    .select(
      "id, title, slug, quarter, year, cover_image_url, executive_summary, key_findings, status, published_at, created_at, updated_at",
    )
    .eq("status", "published")
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Quarterly Reports" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ReportsClient reports={(data as QuarterlyReport[]) || []} />
    </>
  );
}
