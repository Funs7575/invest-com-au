import { createClient } from "@/lib/supabase/server";
import type { QuarterlyReport } from "@/lib/types";
import { notFound } from "next/navigation";

// Per-request render (was ISR `revalidate = 3600`). The page now gates
// paid sections via `requirePro()` server-side — caching one variant
// across Pro and non-Pro viewers would either leak paid data into the
// CDN cache or never render the Pro variant. Reports are low-traffic
// enough that the loss of CDN caching is acceptable.
export const dynamic = "force-dynamic";

import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { gatePremiumData, requirePro } from "@/lib/server/get-subscription";
import ReportDetailClient from "./ReportDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("quarterly_reports").select("title, executive_summary").eq("slug", slug).eq("status", "published").single();
  if (!data) return { title: "Report Not Found" };
  return {
    title: data.title,
    description: data.executive_summary || `Quarterly platform industry report: ${data.title}`,
    alternates: { canonical: `/reports/${slug}` },
  };
}

export default async function ReportDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("quarterly_reports")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) notFound();
  const fullReport = data as QuarterlyReport;

  const { isPro } = await requirePro();

  // Strip paid fields server-side for non-Pro viewers. The CSS-blur
  // pattern in the prior client-only gating shipped the full data to
  // the browser — view-source revealed every paid section. Server-side
  // gating means the bytes never leave the server unless the viewer
  // qualifies.
  const report = gatePremiumData(fullReport, isPro, {
    sections: [],
    fee_changes_summary: [],
    new_entrants: [],
  });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Quarterly Reports", url: absoluteUrl("/reports") },
    { name: report.title },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ReportDetailClient
        report={report}
        isPro={isPro}
        totalSectionsCount={fullReport.sections?.length ?? 0}
      />
    </>
  );
}
