import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/server/get-subscription";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

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

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Pro", url: absoluteUrl("/pro") },
    { name: "Research", url: absoluteUrl("/pro/research") },
    { name: report.title },
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
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

      {!isPro ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
          <h2 className="text-base font-semibold text-violet-900">
            {user ? "Upgrade to Pro to read the full report" : "Pro subscribers read the full report"}
          </h2>
          <p className="mt-1 text-sm text-violet-800">
            The summary above is the public preview. Pro subscribers get the full report body,
            underlying data tables, and a notification when next quarter&apos;s update drops.
          </p>
          <Link
            href={user ? "/account/upgrade" : "/login?next=/account/upgrade"}
            className="mt-3 inline-flex items-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
          >
            {user ? "Upgrade to Pro" : "Sign in and upgrade"} &rarr;
          </Link>
        </div>
      ) : (
        <article
          className="prose prose-slate max-w-none"
          // eslint-disable-next-line invest/no-unsafe-inner-html -- body_html is admin-authored only (RLS service-role write); the admin upload route will run through the same sanitizer as articles when it ships in the next PR. Until then, pre-launch reports are seeded by trusted editorial via SQL.
          dangerouslySetInnerHTML={{ __html: report.body_html }}
        />
      )}

      <p className="mt-10 text-xs text-slate-400">
        General information only — not personal advice. Pricing, fees, and rates change
        frequently; always verify against the provider&apos;s current PDS before acting.
      </p>
    </div>
  );
}
