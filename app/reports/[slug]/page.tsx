import { createClient } from "@/lib/supabase/server";
import type { QuarterlyReport } from "@/lib/types";
import { notFound } from "next/navigation";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import ReportDetailClient from "./ReportDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("quarterly_reports").select("title, executive_summary").eq("slug", slug).eq("status", "published").single();
  if (!data) return { title: "Report Not Found" };
  return {
    title: `${data.title} — ${SITE_NAME}`,
    description: data.executive_summary || `Quarterly broker industry report: ${data.title}`,
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
  const report = data as QuarterlyReport;

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Quarterly Reports", url: absoluteUrl("/reports") },
    { name: report.title },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ReportDetailClient report={report} />
    </>
  );
}
