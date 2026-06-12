/**
 * Self-contained, flag-gated account tile for Cohort Challenges.
 *
 * Renders nothing when the `cohort_challenges` flag is off (fail-closed) so it
 * can be dropped into the account page as a single isolated block without any
 * other coupling. When on, it shows the user's active enrolments with progress,
 * or — if they have none — a lightweight discover CTA.
 *
 * It does its own auth + data fetch so the host page doesn't have to thread
 * anything through; all reads are RLS-scoped (the user's own enrolments) plus
 * the public challenges read.
 */

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  challengesEnabled,
  type ChallengeRow,
  type EnrolmentRow,
} from "@/lib/challenges/data";
import { getCurriculum, percentComplete } from "@/lib/challenges/progress";

const log = logger("account:challenges-tile");

interface ActiveEnrolment {
  slug: string;
  title: string;
  status: EnrolmentRow["status"];
  percent: number;
  hasCertificate: boolean;
}

export default async function ChallengesAccountTile() {
  if (!(await challengesEnabled())) return null;

  let enrolments: ActiveEnrolment[] = [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // The user's enrolments (RLS-scoped) joined to their challenge.
    const { data, error } = await supabase
      .from("challenge_enrolments")
      .select(
        "id, status, certificate_id, challenges(slug, title, curriculum_key)",
      )
      .eq("user_id", user.id)
      .order("enrolled_at", { ascending: false })
      .limit(6);
    if (error) {
      log.warn("challenges tile enrolments failed", { error: error.message });
      return null;
    }

    // The PostgREST embed `challenges(...)` is a to-one relation here (joined
    // via challenge_id), but the generated client types it as an array — cast
    // through `unknown` to the single-object shape we actually receive.
    const rows =
      (data as unknown as
        | {
            id: string;
            status: EnrolmentRow["status"];
            certificate_id: string | null;
            challenges:
              | Pick<ChallengeRow, "slug" | "title" | "curriculum_key">
              | null;
          }[]
        | null) ?? [];

    // Per-enrolment completion counts (RLS-scoped) to compute progress.
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const ch = row.challenges;
        if (!ch) return null;
        const curriculum = getCurriculum(ch.curriculum_key);
        if (!curriculum) return null;
        const { data: comp } = await supabase
          .from("challenge_task_completions")
          .select("task_key")
          .eq("enrolment_id", row.id);
        const keys = ((comp as { task_key: string }[] | null) ?? []).map(
          (c) => c.task_key,
        );
        return {
          slug: ch.slug,
          title: ch.title,
          status: row.status,
          percent: percentComplete(curriculum, keys),
          hasCertificate: !!row.certificate_id,
        } satisfies ActiveEnrolment;
      }),
    );
    enrolments = enriched.filter((x): x is ActiveEnrolment => x !== null);
  } catch (err) {
    log.warn("challenges tile threw (tables likely absent)", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">Your challenges</h2>
        <Link
          href="/challenges"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Browse all →
        </Link>
      </div>

      {enrolments.length === 0 ? (
        <p className="text-sm text-slate-500">
          Join a guided, time-boxed program — daily tasks and a completion
          certificate.{" "}
          <Link href="/challenges" className="font-semibold text-blue-600">
            See open challenges →
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {enrolments.map((e) => (
            <li key={e.slug}>
              <Link
                href={
                  e.hasCertificate
                    ? `/challenges/${e.slug}/certificate`
                    : `/challenges/${e.slug}`
                }
                className="block rounded-xl border border-slate-100 px-3 py-2.5 hover:border-blue-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {e.title}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-slate-500">
                    {e.status === "waitlisted" ? "Waitlisted" : `${e.percent}%`}
                  </span>
                </div>
                {e.status === "enrolled" && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${e.percent}%` }}
                    />
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      </section>
    </div>
  );
}
