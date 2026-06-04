import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/server/get-subscription";
import { absoluteUrl, breadcrumbJsonLd, ORGANIZATION_JSONLD, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { sanitizeHtml } from "@/lib/sanitize-html";
import ProPaywall from "@/components/ProPaywall";

export const revalidate = 3600;

interface ReportRow {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  body_html: string;
  tier: string;
  published_at: string | null;
  reading_time_minutes: number;
  tags: string[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadReport(slug: string): Promise<ReportRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pro_research_reports")
    .select("slug, title, kicker, summary, body_html, tier, published_at, reading_time_minutes, tags")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error || !data) return null;
  return data as ReportRow;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = await loadReport(slug);
  if (!report) return { title: `Report not found — ${SITE_NAME}` };
  return {
    title: `${report.title} — ${SITE_NAME}`,
    description: report.summary.slice(0, 160),
    alternates: { canonical: `/pro/research/${report.slug}` },
    robots: { index: false, follow: false },
  };
}

export default async function PremiumResearchReportPage({ params }: PageProps) {
  const { slug } = await params;
  const report = await loadReport(slug);
  if (!report) notFound();

  const { user, isPro } = await getSubscription();

  // Gate the body server-side: non-Pro readers never receive body_html
  // in the RSC payload (only the public summary above the fold). This
  // mirrors the strip-before-return pattern in lib/server/premium-content.ts
  // so premium content never reaches a non-entitled browser.
  const bodyHtml = isPro ? report.body_html : "";

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Pro", url: absoluteUrl("/pro") },
    { name: "Research", url: absoluteUrl("/pro/research") },
    { name: report.title },
  ]);

  // Gated-content Article schema: the body is behind the paywall, so we
  // declare isAccessibleForFree:false and point Google at the gated
  // region via [data-pro-gated] (same shape as /reports and /newsletter).
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: report.title,
    description: report.summary,
    datePublished: report.published_at ?? undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/pro/research/${report.slug}`),
    },
    publisher: ORGANIZATION_JSONLD,
    author: ORGANIZATION_JSONLD,
    isAccessibleForFree: false,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: "[data-pro-gated]",
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/pro/research" className="hover:text-slate-900">
          ← Premium research
        </Link>
      </nav>

      <header className="mb-8">
        {report.kicker && (
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            {report.kicker}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{report.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Published {new Date(report.published_at!).toLocaleDateString("en-AU")} · ~{report.reading_time_minutes} min read
        </p>
        {report.summary && (
          <p className="mt-3 text-base text-slate-700">{report.summary}</p>
        )}
      </header>

      {isPro ? (
        <article
          className="prose prose-slate max-w-none"
           
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyHtml) }}
        />
      ) : (
        <div data-pro-gated>
          <ProPaywall
            title={user ? "Upgrade to Pro to read the full report" : "Pro subscribers read the full report"}
            description="The summary above is the public preview. Pro subscribers get the full report body, the underlying data tables, and a notification when next quarter's update drops."
            bullets={[
              "Full report body & data tables",
              "Complete premium-research archive",
              "Email alert when each report updates",
              "Cancel anytime",
            ]}
            ctaLabel={user ? "Upgrade to Pro" : "Sign in & subscribe"}
            ctaHref={user ? "/pro" : "/auth/login?next=/pro/research"}
          />
        </div>
      )}

      <p className="mt-10 text-xs text-slate-500">{GENERAL_ADVICE_WARNING}</p>
    </div>
  );
}
