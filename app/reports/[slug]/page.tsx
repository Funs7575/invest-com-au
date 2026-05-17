import { createClient } from "@/lib/supabase/server";
import type { QuarterlyReport } from "@/lib/types";
import { notFound } from "next/navigation";
import { requirePro, truncateText } from "@/lib/server/require-pro";

export const revalidate = 0;
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
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

  const gatedReport: QuarterlyReport = isPro
    ? fullReport
    : {
        ...fullReport,
        sections: (fullReport.sections ?? []).slice(0, 2).map((s) => ({
          heading: s.heading,
          body: truncateText(s.body, 240),
        })),
        fee_changes_summary: [],
        new_entrants: [],
      };

  const totalSections = (fullReport.sections ?? []).length;
  const totalFeeChanges = (fullReport.fee_changes_summary ?? []).length;
  const totalEntrants = (fullReport.new_entrants ?? []).length;

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Quarterly Reports", url: absoluteUrl("/reports") },
    { name: fullReport.title },
  ]);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fullReport.title,
    description: fullReport.executive_summary,
    datePublished: fullReport.published_at ?? fullReport.created_at,
    dateModified: fullReport.updated_at,
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/reports/${slug}`) },
    isAccessibleForFree: false,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: "[data-pro-gated]",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <ReportDetailClient
        report={gatedReport}
        isPro={isPro}
        totals={{ sections: totalSections, feeChanges: totalFeeChanges, newEntrants: totalEntrants }}
      />
    </>
  );
}
