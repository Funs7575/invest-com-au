import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getQuestionsForBrief } from "@/lib/pro-intake";
import type { BriefRow } from "@/lib/briefs/types";
import Icon from "@/components/Icon";

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
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-10 md:pt-5">
        {/* Compact light header (B13) */}
        <nav aria-label="Breadcrumb" className="mb-1.5 text-[11px] md:text-xs text-slate-500">
          <Link href={`/briefs/${slug}`} className="hover:text-slate-700">
            Brief status
          </Link>
          <span className="mx-1.5" aria-hidden>/</span>
          <span className="text-slate-600">Additional info</span>
        </nav>

        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[1.9rem]">
          A few extra details
        </h1>
        <p className="mt-1 max-w-2xl text-[12.5px] leading-snug text-slate-500 md:text-[13.5px]">
          {brief.job_title}
        </p>

        <div className="mt-4">
          {!acceptedYet && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <Icon name="clock" size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
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
            </div>
          )}

          {acceptedYet && questions.length === 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <Icon name="check-circle" size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
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
            </div>
          )}

          {acceptedYet && questions.length > 0 && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                <Icon name="clipboard-list" size={12} className="shrink-0" />
                {questions.length} {questions.length === 1 ? "question" : "questions"} from your provider
              </span>
              <div className="mt-3">
                <IntakeAnswerForm slug={brief.slug} questions={questions} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
