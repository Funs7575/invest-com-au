/**
 * /advisor-jobs/[id] — job detail page with apply form.
 *
 * Fetches the job post server-side. 404s if not found or not active.
 * The apply form is a client component that POSTs to /api/careers/jobs/apply.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";
import ApplyForm from "./ApplyForm";

export const revalidate = 300; // 5 min ISR

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  casual: "Casual",
};

interface JobRow {
  id: string;
  title: string;
  location: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
  advisor_firms: { firm_name: string; logo_url: string | null } | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_posts")
    .select("title, location, advisor_firms ( firm_name )")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (!data) {
    return { title: "Job not found — Invest.com.au" };
  }

  const firm = (data as unknown as JobRow).advisor_firms;
  const title = `${data.title}${firm ? ` at ${firm.firm_name}` : ""} — Invest.com.au`;

  return {
    title,
    description: `Apply for ${data.title} at ${firm?.firm_name ?? "an advisory firm"} — ${(data as { location?: string }).location ?? "Australia"}.`,
    alternates: { canonical: `${SITE_URL}/advisor-jobs/${id}` },
    robots: { index: true, follow: true },
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("job_posts")
    .select(
      `id, title, location, type, description, status, created_at,
       advisor_firms ( firm_name, logo_url )`,
    )
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (!data) notFound();

  const job = data as unknown as JobRow;
  const firm = job.advisor_firms;
  const postedDate = new Date(job.created_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Advisor Jobs", url: absoluteUrl("/advisor-jobs") },
    { name: job.title },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="bg-white min-h-screen">
        {/* Header */}
        <div className="bg-slate-900 text-white py-10 md:py-14 px-4">
          <div className="container-custom max-w-4xl">
            <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-3">
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="mx-1.5" aria-hidden="true">/</span>
              <Link href="/advisor-jobs" className="hover:text-white">
                Advisor Jobs
              </Link>
              <span className="mx-1.5" aria-hidden="true">/</span>
              <span className="text-slate-200">{job.title}</span>
            </nav>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-2">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              {firm && <span>{firm.firm_name}</span>}
              <span aria-hidden="true">&middot;</span>
              <span>{job.location}</span>
              <span aria-hidden="true">&middot;</span>
              <span className="bg-blue-600 text-white text-[0.65rem] font-semibold rounded-full px-2 py-0.5">
                {JOB_TYPE_LABELS[job.type] ?? job.type}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Posted {postedDate}</p>
          </div>
        </div>

        <div className="container-custom max-w-4xl py-8 px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Description */}
            <div className="md:col-span-2">
              <section aria-label="Job description">
                <h2 className="text-base font-bold text-slate-900 mb-3">
                  About this role
                </h2>
                <div className="prose prose-sm prose-slate max-w-none">
                  {job.description.split("\n").map((para, i) =>
                    para.trim() ? (
                      <p key={i} className="text-sm text-slate-700 mb-3">
                        {para}
                      </p>
                    ) : null,
                  )}
                </div>
              </section>

              <Link
                href="/advisor-jobs"
                className="mt-8 inline-block text-xs text-slate-500 hover:text-slate-700"
              >
                &larr; Back to all jobs
              </Link>
            </div>

            {/* Apply sidebar */}
            <aside aria-label="Apply for this position">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sticky top-6">
                <h2 className="text-base font-bold text-slate-900 mb-4">
                  Apply now
                </h2>
                <ApplyForm jobId={job.id} jobTitle={job.title} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
