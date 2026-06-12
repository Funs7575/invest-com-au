import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import {
  challengesEnabled,
  listChallenges,
  getEnrolledCount,
  type ChallengeWithCurriculum,
} from "@/lib/challenges/data";
import {
  cohortStatus,
  formatCohortDate,
  type CohortStatus,
} from "@/lib/challenges/status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Investing Challenges — Guided Group Programs | ${SITE_NAME}`,
  description:
    "Join a time-boxed, guided investing program — daily tasks, shared cohort progress, and a completion certificate. General information only, not personal advice.",
  alternates: { canonical: "/challenges" },
};

const STATUS_BADGE: Record<CohortStatus, { label: string; cls: string }> = {
  open: { label: "Open to join", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  upcoming: { label: "Starting soon", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  active: { label: "In progress", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ended: { label: "Completed", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

function ComingSoon() {
  return (
    <div className="container-custom max-w-2xl py-16 text-center">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
        Investing Challenges
      </h1>
      <p className="text-sm text-slate-600">
        Guided, time-boxed programs are coming soon. Check back shortly — we&apos;re
        lining up the first cohorts.
      </p>
    </div>
  );
}

export default async function ChallengesIndexPage() {
  // Fail-closed: feature dormant until the flag is enabled.
  if (!(await challengesEnabled())) {
    return <ComingSoon />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const challenges = await listChallenges();

  // Cohort sizes for the "N enrolled" line (cross-user counts, suppressed in UI
  // only as a raw count — not a per-user figure).
  const counts = await Promise.all(
    challenges.map((c) => getEnrolledCount(c.challenge.id)),
  );
  const sizeBySlug = new Map<string, number>();
  challenges.forEach((c, i) => sizeBySlug.set(c.challenge.slug, counts[i] ?? 0));

  const now = new Date();
  const visible = challenges.filter(
    (c) => cohortStatus(c.challenge, now) !== "ended",
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
            ]),
          ),
        }}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
          Investing Challenges
        </h1>
        <p className="text-sm text-slate-600">
          Guided, time-boxed programs with daily tasks and shared cohort progress.
          Learn by doing — set a goal, run a health check, build the habit.
        </p>
      </header>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 mb-6">
        {GENERAL_ADVICE_WARNING}
      </div>

      {!user && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 mb-6">
          <p className="text-sm font-semibold text-blue-900 mb-1">
            Sign up to join a challenge
          </p>
          <p className="text-xs text-blue-800 mb-3">
            Track your daily progress, see how your cohort is doing, and earn a
            completion certificate.
          </p>
          <Link
            href="/auth/login?next=/challenges"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create a free account
          </Link>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500">
          No open cohorts right now. Check back soon for the next intake.
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map(({ challenge, curriculum }: ChallengeWithCurriculum) => {
            const status = cohortStatus(challenge, now);
            const badge = STATUS_BADGE[status];
            const size = sizeBySlug.get(challenge.slug) ?? 0;
            return (
              <li key={challenge.id}>
                <Link
                  href={`/challenges/${challenge.slug}`}
                  className="block bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-700">
                      {challenge.title}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {challenge.description ?? curriculum.summary}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{curriculum.durationDays}-day program</span>
                    <span>{curriculum.tasks.length} daily tasks</span>
                    {challenge.starts_at && (
                      <span>Starts {formatCohortDate(challenge.starts_at)}</span>
                    )}
                    {size >= 5 && <span>{size} investors enrolled</span>}
                  </div>
                  <span className="mt-3 inline-flex items-center text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                    {status === "upcoming"
                      ? "Join the waitlist"
                      : "View program"}{" "}
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
