import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/server/get-subscription";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

// FIN_NOTEBOOK Revenue #10: Premium research subscription.
//
// 90% built per the audit — full Stripe + Pro tier infra (lib/stripe.ts,
// app/pro/, the subscriptions table, getSubscription helper) already
// landed. The missing piece is a gated content surface; this page is
// that surface for the "premium research" entitlement.
//
// Today the entitlement is binary (any active subscription unlocks the
// page); add tier checks later if we introduce stratified plans
// (research-only vs full pro).
//
// Content is intentionally scaffolding only — the first 3–5 actual
// reports are written outside engineering (editorial work) and dropped
// into a `pro_research_reports` table in a follow-on PR. The page is
// shipped now so the gate + funnel are testable end-to-end and the
// upgrade CTA has a real destination.

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Premium Research — ${SITE_NAME}`,
  description:
    "Deep-dive research reports on Australian investing platforms, super funds, and structural-economy themes. Available to Pro subscribers.",
  alternates: { canonical: "/pro/research" },
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
  // is a small, lightly-cached SELECT.
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

      {!isPro && <UpgradeBanner signedIn={!!user} />}

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
                href="/account/upgrade"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
              >
                Unlock with Pro &rarr;
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
                href="/account/upgrade"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
              >
                Unlock with Pro &rarr;
              </Link>
            )}
          </article>
        ))}
      </section>

      <p className="mt-10 text-xs text-slate-400">
        Reports are general information only — not personal advice. Pricing, fees, and
        rates change frequently; always verify against the provider&apos;s current PDS
        before acting.
      </p>
    </div>
  );
}

function UpgradeBanner({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mb-8 rounded-xl border border-violet-200 bg-violet-50 p-5">
      <h2 className="text-base font-semibold text-violet-900">
        {signedIn ? "Upgrade to Pro to read full reports" : "Pro subscribers read the full reports"}
      </h2>
      <p className="mt-1 text-sm text-violet-800">
        Each report runs 15–40 pages, with the underlying data tables you can sort + filter.
        Cancel any time — no contract.
      </p>
      <Link
        href={signedIn ? "/account/upgrade" : "/login?next=/account/upgrade"}
        className="mt-3 inline-flex items-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
      >
        {signedIn ? "Upgrade to Pro" : "Sign in and upgrade"} &rarr;
      </Link>
    </div>
  );
}
