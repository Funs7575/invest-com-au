import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getGatedReport } from "@/lib/server/premium-content";

export const revalidate = 0;
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import ReportDetailClient from "./ReportDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("quarterly_reports")
    .select("title, executive_summary")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  if (!data) return { title: "Report Not Found" };
  return {
    title: data.title,
    description: data.executive_summary || `Quarterly platform industry report: ${data.title}`,
    alternates: { canonical: `/reports/${slug}` },
  };
}

export default async function ReportDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { report, isPro, totals } = await getGatedReport(slug);
  if (!report) notFound();

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Quarterly Reports", url: absoluteUrl("/reports") },
    { name: report.title },
  ]);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: report.title,
    description: report.executive_summary,
    datePublished: report.published_at ?? report.created_at,
    dateModified: report.updated_at,
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
      <ReportDetailClient report={report} isPro={isPro} totals={totals} />
    </>
  );
}
