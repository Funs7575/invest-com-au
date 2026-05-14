import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getQuestionsForBrief } from "@/lib/pro-intake";
import type { BriefRow } from "@/lib/briefs/types";

import IntakeAnswerForm from "./IntakeAnswerForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Provide additional info — ${CURRENT_YEAR}`,
    robots: { index: false, follow: false },
    alternates: { canonical: `${SITE_URL}/briefs/${slug}/intake` },
  };
}

export default async function BriefIntakePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("advisor_auctions")
    .select("*")
    .eq("slug", slug)
    .eq("flow_type", "accept")
    .maybeSingle();

  if (!data) notFound();
  const brief = data as unknown as BriefRow;

  const questions = await getQuestionsForBrief(brief.id);
  const acceptedYet =
    brief.accepted_by_professional_id != null || brief.accepted_by_team_id != null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href={`/briefs/${slug}`} className="hover:text-slate-700">
            Brief status
          </Link>
          <span>/</span>
          <span className="text-slate-700">Additional info</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          A few extra details
        </h1>
        <p className="text-sm text-slate-600 mb-6">{brief.job_title}</p>

        {!acceptedYet && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold">Waiting on a provider</p>
            <p className="mt-1">
              We&apos;ll surface these questions once a verified provider accepts your
              brief. Check back from your{" "}
              <Link href={`/briefs/${slug}`} className="underline">
                brief status page
              </Link>
              .
            </p>
          </div>
        )}

        {acceptedYet && questions.length === 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <p className="font-semibold">You&apos;re all set.</p>
            <p className="mt-1">
              Your provider didn&apos;t request any extra info. They&apos;ll be in
              touch directly.{" "}
              <Link href={`/briefs/${slug}`} className="underline">
                Back to brief status
              </Link>
              .
            </p>
          </div>
        )}

        {acceptedYet && questions.length > 0 && (
          <IntakeAnswerForm slug={brief.slug} questions={questions} />
        )}
      </div>
    </div>
  );
}
