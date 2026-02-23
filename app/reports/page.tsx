import { createClient } from "@/lib/supabase/server";
import type { QuarterlyReport } from "@/lib/types";
import ReportsClient from "./ReportsClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const metadata = {
  title: "Quarterly Broker Industry Reports — Australian Market Analysis",
  description:
    "Quarterly reports on the Australian broker landscape: fee changes, new entrants, market trends, and key findings for investors.",
  openGraph: {
    title: `Quarterly Industry Reports — ${SITE_NAME}`,
    description: "In-depth quarterly analysis of the Australian broker industry.",
    images: [{ url: "/api/og?title=Quarterly+Reports&subtitle=Australian+Broker+Industry+Analysis&type=default", width: 1200, height: 630 }],
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
