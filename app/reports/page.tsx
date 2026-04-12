import { createClient } from "@/lib/supabase/server";
import type { QuarterlyReport } from "@/lib/types";
import ReportsClient from "./ReportsClient";

export const revalidate = 3600; // 1 hour
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const metadata = {
  title: "Quarterly Platform Industry Reports — Australian Market Analysis",
  description:
    "Quarterly reports on the Australian investing platform landscape: fee changes, new entrants, market trends, and key findings for investors.",
  robots: { index: false },
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
  const { data } = await supabase
    .from("quarterly_reports")
    .select("*")
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
