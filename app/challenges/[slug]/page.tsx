import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING, SUPER_WARNING } from "@/lib/compliance";
import {
  challengesEnabled,
  getChallengeBySlug,
  getMyEnrolment,
  getMyCompletedTaskKeys,
  getCohortAggregate,
} from "@/lib/challenges/data";
import {
  ADVICE_ADJACENT_CURRICULUM_KEYS,
} from "@/lib/challenges/curricula";
import { cohortDayAggregates } from "@/lib/challenges/progress";
import {
  cohortStatus,
  cohortCurrentDay,
  formatCohortDate,
} from "@/lib/challenges/status";
import ChallengeClient, { type ClientTask } from "./ChallengeClient";
import EnrolButton from "./EnrolButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!(await challengesEnabled())) return { title: `Challenge | ${SITE_NAME}` };
  const data = await getChallengeBySlug(slug);
  if (!data) return { title: `Challenge | ${SITE_NAME}` };
  return {
    title: `${data.challenge.title} — Investing Challenge | ${SITE_NAME}`,
    description: data.challenge.description ?? data.curriculum.summary,
    alternates: { canonical: `/challenges/${slug}` },
  };
}

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Fail-closed.
  if (!(await challengesEnabled())) notFound();

  const data = await getChallengeBySlug(slug);
  if (!data) notFound();
  const { challenge, curriculum } = data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const enrolment = user ? await getMyEnrolment(challenge.id) : null;
  const completedKeys = enrolment
    ? await getMyCompletedTaskKeys(enrolment.id)
    : new Set<string>();

  // Anonymised cohort aggregate (counts only; suppressed below n=5).
  const aggregateData = await getCohortAggregate(challenge, curriculum);
  const dayAggregates = cohortDayAggregates(
    curriculum,
    aggregateData.cohortSize,
    aggregateData.completionsByDay,
  );
  const cohortSuppressed = dayAggregates.some((d) => d.suppressed);
  const percentByDay = new Map<number, number | null>(
    dayAggregates.map((d) => [d.day, d.percent]),
  );

  const now = new Date();
  const status = cohortStatus(challenge, now);
  const currentDay = cohortCurrentDay(challenge, curriculum.durationDays, now);

  const clientTasks: ClientTask[] = curriculum.tasks.map((t) => ({
    key: t.key,
    day: t.day,
    title: t.title,
    description: t.description,
    href: t.href,
    actionLabel: t.actionLabel,
    completionTrigger: t.completionTrigger,
    cohortPercent: percentByDay.get(t.day) ?? null,
  }));

  const enrolState: "none" | "enrolled" | "waitlisted" = !enrolment
    ? "none"
    : enrolment.status;

  const adviceAdjacent = ADVICE_ADJACENT_CURRICULUM_KEYS.has(
    challenge.curriculum_key,
  );

  return (
    <div className="container-custom max-w-3xl py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: absoluteUrl("/") },
              { name: "Challenges", url: absoluteUrl("/challenges") },
              {
                name: challenge.title,
                url: absoluteUrl(`/challenges/${slug}`),
              },
            ]),
          ),
        }}
      />

      <nav className="mb-4 text-xs text-slate-400">
        <Link href="/challenges" className="hover:text-slate-600">
          Challenges
        </Link>{" "}
        / <span className="text-slate-500">{challenge.title}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
          {challenge.title}
        </h1>
        <p className="text-sm text-slate-600 mb-3">
          {challenge.description ?? curriculum.summary}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>{curriculum.durationDays}-day program</span>
          <span>{curriculum.tasks.length} daily tasks</span>
          {challenge.starts_at && (
            <span>Starts {formatCohortDate(challenge.starts_at)}</span>
          )}
          {challenge.ends_at && (
            <span>Ends {formatCohortDate(challenge.ends_at)}</span>
          )}
          {aggregateData.cohortSize >= 5 && (
            <span>{aggregateData.cohortSize} investors in this cohort</span>
          )}
        </div>
      </header>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 mb-6">
        {GENERAL_ADVICE_WARNING}
        {adviceAdjacent && (
          <span className="mt-2 block border-t border-amber-200 pt-2">
            {SUPER_WARNING}
          </span>
        )}
      </div>

      {/* Enrol / state */}
      {!user ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 mb-6">
          <p className="text-sm font-semibold text-blue-900 mb-1">
            Sign up to join this challenge
          </p>
          <p className="text-xs text-blue-800 mb-3">
            Create a free account to track your daily progress and earn a
            completion certificate.
          </p>
          <Link
            href={`/auth/login?next=/challenges/${slug}`}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create a free account
          </Link>
        </div>
      ) : (
        <div className="mb-6">
          <EnrolButton
            slug={slug}
            state={enrolState}
            enrolmentOpen={challenge.enrolment_open && status !== "ended"}
          />
        </div>
      )}

      {/* Day list + progress (interactive when enrolled) */}
      {user && enrolState === "enrolled" ? (
        <ChallengeClient
          slug={slug}
          tasks={clientTasks}
          initialCompleted={Array.from(completedKeys)}
          currentDay={currentDay}
          durationDays={curriculum.durationDays}
          enrolled
          certificateId={enrolment?.certificate_id ?? null}
          cohortSuppressed={cohortSuppressed}
        />
      ) : (
        /* Read-only preview of the curriculum for non-enrolled / waitlisted viewers */
        <section aria-label="Program tasks">
          <h2 className="text-sm font-bold text-slate-800 mb-3">
            What you&apos;ll do
          </h2>
          <ol className="space-y-2">
            {curriculum.tasks.map((t) => (
              <li
                key={t.key}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                    Day {t.day}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {t.title}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{t.description}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Community / club room. Investment-club creation isn't a cleanly reusable
          server helper (it's embedded in app/api/clubs), so we link the existing
          community space rather than auto-provision a club per cohort. */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-1">
          Stay accountable with others
        </h2>
        <p className="text-xs text-slate-600 mb-3">
          Share progress, ask questions, and compare notes with other members in
          the community. Information-sharing only — general information, not
          personal advice.
        </p>
        <Link
          href={challenge.club_id ? `/clubs/${challenge.club_id}` : "/clubs"}
          className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {challenge.club_id ? "Open the cohort club room" : "Discuss in the community"}{" "}
          →
        </Link>
      </section>
    </div>
  );
}
