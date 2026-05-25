/**
 * /advisor-jobs — public browse page for the advisor careers / job board.
 *
 * Lists active job posts from advisory firms. Filterable by employment type
 * via query param (?type=full_time etc.). Server component with ISR (5 min)
 * so freshness is acceptable for a low-volume job board.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

export const revalidate = 300; // 5 min ISR

export const metadata: Metadata = {
  title: "Advisor Jobs — Invest.com.au",
  description:
    "Browse open positions at Australian financial advisory firms. Find financial planning, SMSF, mortgage broking, and wealth management roles.",
  alternates: { canonical: `${SITE_URL}/advisor-jobs` },
  openGraph: {
    title: "Advisor Jobs — Invest.com.au",
    description:
      "Open roles at Australian financial advisory firms — financial planning, SMSF, mortgage, and wealth management.",
    url: absoluteUrl("/advisor-jobs"),
  },
};

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  casual: "Casual",
};

const VALID_TYPES = ["full_time", "part_time", "contract", "casual"] as const;
type JobType = (typeof VALID_TYPES)[number];

interface JobRow {
  id: string;
  title: string;
  location: string;
  type: string;
  description: string;
  created_at: string;
  advisor_firms: { firm_name: string; logo_url: string | null } | null;
}

interface PageProps {
  searchParams: Promise<{ type?: string; q?: string }>;
}

export default async function AdvisorJobsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const typeFilter =
    params.type && (VALID_TYPES as readonly string[]).includes(params.type)
      ? (params.type as JobType)
      : null;
  const q = params.q?.trim() ?? null;

  const supabase = await createClient();

  let query = supabase
    .from("job_posts")
    .select(
      `id, title, location, type, description, created_at,
       advisor_firms ( firm_name, logo_url )`,
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data: jobs } = await query;
  const rows = (jobs ?? []) as unknown as JobRow[];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Advisor Jobs", url: absoluteUrl("/advisor-jobs") },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <div className="bg-slate-900 text-white py-10 md:py-16 px-4">
          <div className="container-custom max-w-4xl">
            <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-3">
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="mx-1.5" aria-hidden="true">/</span>
              <span className="text-slate-200">Advisor Jobs</span>
            </nav>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-3">
              Advisor Jobs
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-xl">
              Open positions at Australian financial advisory firms — find your
              next role in financial planning, SMSF, mortgage broking, or wealth
              management.
            </p>
          </div>
        </div>

        <div className="container-custom max-w-4xl py-8 px-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter by job type">
            <FilterLink href="/advisor-jobs" active={!typeFilter}>
              All types
            </FilterLink>
            {VALID_TYPES.map((t) => (
              <FilterLink
                key={t}
                href={`/advisor-jobs?type=${t}`}
                active={typeFilter === t}
              >
                {JOB_TYPE_LABELS[t]}
              </FilterLink>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              No open positions found
              {typeFilter ? ` for ${JOB_TYPE_LABELS[typeFilter]}` : ""}.
              {typeFilter && (
                <>
                  {" "}
                  <Link href="/advisor-jobs" className="text-blue-600 hover:underline">
                    View all types
                  </Link>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400 mb-4">
                {rows.length} position{rows.length !== 1 ? "s" : ""} available
              </p>
              <ul className="space-y-4" aria-label="Job listings">
                {rows.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/advisor-jobs/${job.id}`}
                      className="block border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {job.title}
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[0.65rem] font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                            {JOB_TYPE_LABELS[job.type] ?? job.type}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        {job.advisor_firms?.firm_name ?? "Advisory firm"} &middot;{" "}
                        {job.location}
                      </p>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {job.description}
                      </p>
                      <p className="mt-3 text-xs font-semibold text-blue-700 group-hover:underline">
                        View &amp; apply &rarr;
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Firm CTA */}
          <section className="mt-10 bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Hiring advisors?
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              Post your open roles to reach qualified financial advisors across
              Australia. Log in to your firm portal to get started.
            </p>
            <Link
              href="/firm-portal/jobs"
              className="inline-block text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
            >
              Manage job posts
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
      }`}
      aria-current={active ? "true" : undefined}
    >
      {children}
    </Link>
  );
}
