import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/server/get-subscription";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ProPaywall from "@/components/ProPaywall";

// FIN_NOTEBOOK Revenue #10: Premium research subscription.
//
// The Stripe + Pro-tier infrastructure (lib/stripe.ts, app/pro/, the
// subscriptions table, the getSubscription helper) already shipped. This
// page is the gated content surface for the "premium research"
// entitlement: an index of deep-dive research reports backed by the
// pro_research_reports table (migration 20260518070000), with the report
// bodies gated behind the existing isPro check in [slug]/page.tsx.
//
// The entitlement is binary today (any active subscription unlocks the
// reports). The table keeps a `tier` column so we can stratify later
// (research-only vs full pro) without a schema change.

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Premium Research — ${SITE_NAME}`,
  description:
    "Deep-dive research reports on Australian investing platforms, super funds, and structural-economy themes. Available to Investor Pro subscribers.",
  alternates: { canonical: "/pro/research" },
  // Pro-gated surface — keep out of the index like the rest of /pro/*.
  robots: { index: false, follow: false },
  openGraph: {
    title: `Premium Research — ${SITE_NAME}`,
    description:
      "Pro-subscriber deep-dive research reports — fee audits, super-fund deep-dives, sector outlooks.",
    url: absoluteUrl("/pro/research"),
    images: [
      {
        url: "/api/og?title=Premium+Research&subtitle=Deep-dive+reports+for+Pro+subscribers&type=article",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

// Always-shown teaser cards for reports that haven't been written yet.
// Once a report with the same slug lands in pro_research_reports the
// real row takes precedence (we filter teasers by published slug below).
const TEASER_REPORTS = [
  {
    slug: "super-fund-investment-mix-2026",
    title: "Super Fund Investment-Mix Audit — 2026",
    summary:
      "Every default super-fund option deconstructed: equities / fixed-income / property / cash allocation, geographic split, hedged vs unhedged, and what each fund's MySuper Dashboard says vs the actual holdings disclosures.",
    publishedLabel: "Coming soon",
    badge: "Super Audit",
  },
  {
    slug: "cross-border-tax-cost-deep-dive",
    title: "Cross-Border Tax Cost Deep-Dive",
    summary:
      "End-to-end cost modelling for the 4 highest-volume corridors (UK→AU, US→AU, India→AU, AU→USD-denominated wealth). Includes FATCA / FBAR / QROPS / DASP / FIRB / non-resident-mortgage premiums broken down per AUD$1m of cross-border wealth.",
    publishedLabel: "Coming soon",
    badge: "Cross-Border",
  },
];

interface PublishedReport {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  reading_time_minutes: number;
  published_at: string;
}

export default async function PremiumResearchPage() {
  const { user, isPro } = await getSubscription();

  // Pull published reports from the DB. Suspense not necessary — this
  // is a small, lightly-cached SELECT. Only summary/card columns are
  // read here; body_html is never selected on the index.
  const supabase = await createClient();
  const { data: reportRows } = await supabase
    .from("pro_research_reports")
    .select("slug, title, kicker, summary, reading_time_minutes, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(20);

  const published = (reportRows ?? []) as PublishedReport[];
  const publishedSlugs = new Set(published.map((r) => r.slug));
  const teasers = TEASER_REPORTS.filter((t) => !publishedSlugs.has(t.slug));

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Pro", url: absoluteUrl("/pro") },
    { name: "Research" },
  ]);

  // Signed-out visitors go through login first, then land back here;
  // signed-in non-subscribers go straight to the Pro upgrade page.
  const upgradeHref = user ? "/pro" : "/auth/login?next=/pro/research";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
          Pro · Premium Research
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Deep-dive research, written for serious investors
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600">
          Quarterly fee audits, super-fund deconstructions, and cross-border cost models —
          the analysis the comparison pages can&apos;t fit. New reports drop monthly;
          archives stay accessible for the life of your subscription.
        </p>
      </header>

      {!isPro && (
        <div className="mb-8">
          <ProPaywall
            variant="inline"
            title={
              user
                ? "Upgrade to Pro to read full reports"
                : "Pro subscribers read the full reports"
            }
            description="Each report runs 15–40 pages, with the underlying data tables you can sort and filter. Cancel any time — no contract."
            ctaLabel={user ? "Upgrade to Pro" : "Sign in & subscribe"}
            ctaHref={upgradeHref}
          />
        </div>
      )}

      <section aria-label="Available research" className="space-y-4">
        {published.map((report) => (
          <article
            key={report.slug}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              {report.kicker && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700">
                  {report.kicker}
                </span>
              )}
              <span className="text-xs text-slate-400">
                Published {new Date(report.published_at).toLocaleDateString("en-AU")} · ~{report.reading_time_minutes} min read
              </span>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{report.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{report.summary}</p>
            {isPro ? (
              <Link
                href={`/pro/research/${report.slug}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
              >
                Read full report &rarr;
              </Link>
            ) : (
              <Link
                href={`/pro/research/${report.slug}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
              >
                Preview &amp; unlock with Pro &rarr;
              </Link>
            )}
          </article>
        ))}

        {teasers.map((report) => (
          <article
            key={report.slug}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-semibold text-violet-700">
                {report.badge}
              </span>
              <span className="text-xs text-slate-400">{report.publishedLabel}</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{report.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{report.summary}</p>
            {isPro ? (
              <div className="mt-4 inline-flex rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500">
                Report not yet published — Pro subscribers get an email when it drops.
              </div>
            ) : (
              <Link
                href={upgradeHref}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
              >
                Unlock with Pro &rarr;
              </Link>
            )}
          </article>
        ))}
      </section>

      <p className="mt-10 text-xs text-slate-400">{GENERAL_ADVICE_WARNING}</p>
    </div>
  );
}
