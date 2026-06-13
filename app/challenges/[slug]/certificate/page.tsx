import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import {
  challengesEnabled,
  getChallengeBySlug,
  getMyEnrolment,
} from "@/lib/challenges/data";
import { formatCohortDate } from "@/lib/challenges/status";
import CertificatePrintButton from "./CertificatePrintButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: `Completion Certificate | ${SITE_NAME}`,
  robots: "noindex, nofollow",
};

export default async function ChallengeCertificatePage({ params }: PageProps) {
  const { slug } = await params;

  if (!(await challengesEnabled())) notFound();

  const data = await getChallengeBySlug(slug);
  if (!data) notFound();
  const { challenge, curriculum } = data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const enrolment = await getMyEnrolment(challenge.id);
  // The certificate is the user's own — only show it once it's been minted.
  if (!enrolment || !enrolment.certificate_id) notFound();

  // Holder name from the profile (falls back to a generic label).
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const holderName =
    (profile as { display_name: string | null } | null)?.display_name ||
    user.email ||
    "Certificate Holder";

  const issuedAt = enrolment.certificate_issued_at ?? enrolment.completed_at ?? "";

  return (
    <div className="container-custom max-w-2xl py-10 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/challenges/${slug}`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to the challenge
        </Link>
      </div>

      <div className="rounded-3xl border-4 border-emerald-600/20 bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          Certificate of Completion
        </p>
        <p className="mt-6 text-sm text-slate-500">This certifies that</p>
        <p className="mt-1 text-2xl font-extrabold text-slate-900">{holderName}</p>
        <p className="mt-4 text-sm text-slate-500">has completed the program</p>
        <p className="mt-1 text-xl font-bold text-slate-800">{challenge.title}</p>
        <p className="mx-auto mt-3 max-w-md text-xs text-slate-500">
          {curriculum.durationDays}-day guided investing program ·{" "}
          {curriculum.tasks.length} tasks completed
        </p>

        <div className="mx-auto mt-8 max-w-sm border-t border-slate-100 pt-4 text-[11px] text-slate-400">
          <p>
            Certificate no. <span className="font-mono">{enrolment.certificate_id}</span>
          </p>
          {issuedAt && <p>Issued {formatCohortDate(issuedAt.slice(0, 10))}</p>}
          <p className="mt-2">
            {SITE_NAME} · {CURRENT_YEAR}. General financial information only — this
            certificate recognises program completion, not financial advice or a
            qualification.
          </p>
        </div>
      </div>

      <div className="mt-6 text-center print:hidden">
        <CertificatePrintButton />
      </div>
    </div>
  );
}
