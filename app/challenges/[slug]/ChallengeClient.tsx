"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface ClientTask {
  key: string;
  day: number;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  completionTrigger: string;
  /** Anonymised cohort completion for this task's day; null when suppressed. */
  cohortPercent: number | null;
}

interface Props {
  slug: string;
  tasks: ClientTask[];
  initialCompleted: string[];
  /** 1-based current day of the cohort, or 0 when not started; tasks beyond it are locked. */
  currentDay: number;
  durationDays: number;
  /** Whether the viewer holds an active 'enrolled' row (vs waitlisted / none). */
  enrolled: boolean;
  /** True when a completion certificate has already been minted. */
  certificateId: string | null;
  cohortSuppressed: boolean;
}

export default function ChallengeClient({
  slug,
  tasks,
  initialCompleted,
  currentDay,
  durationDays,
  enrolled,
  certificateId,
  cohortSuppressed,
}: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialCompleted),
  );
  const [cert, setCert] = useState<string | null>(certificateId);
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = tasks.length;
  const doneCount = tasks.filter((t) => completed.has(t.key)).length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const toggleTask = useCallback(
    (task: ClientTask, next: boolean) => {
      setBusyKey(task.key);
      setError(null);
      // Optimistic update.
      setCompleted((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(task.key);
        else copy.delete(task.key);
        return copy;
      });
      void (async () => {
        try {
          const res = await fetch("/api/challenges/task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, taskKey: task.key, done: next }),
          });
          if (!res.ok) throw new Error(String(res.status));
          const data = (await res.json()) as { certificateId?: string | null };
          if (data.certificateId) {
            setCert(data.certificateId);
            startTransition(() => router.refresh());
          }
        } catch {
          // Revert optimistic update on failure.
          setCompleted((prev) => {
            const copy = new Set(prev);
            if (next) copy.delete(task.key);
            else copy.add(task.key);
            return copy;
          });
          setError("Couldn't save that just now. Please try again.");
        } finally {
          setBusyKey(null);
        }
      })();
    },
    [router, slug],
  );

  return (
    <div>
      {/* Personal progress */}
      <section
        className="bg-white border border-slate-200 rounded-2xl p-5 mb-6"
        aria-label="Your progress"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-slate-800">Your progress</h2>
          <span className="text-sm font-semibold text-slate-700">
            {doneCount} / {total} tasks
          </span>
        </div>
        <div
          className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Personal completion"
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        {cert && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-900">
              Program complete — your certificate is ready.
            </p>
            <Link
              href={`/challenges/${slug}/certificate`}
              className="mt-1 inline-flex text-sm font-semibold text-emerald-700 underline"
            >
              View your certificate →
            </Link>
          </div>
        )}
      </section>

      {error && (
        <p className="mb-4 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      {/* Day list */}
      <ol className="space-y-3">
        {tasks.map((task) => {
          const isDone = completed.has(task.key);
          const locked = currentDay > 0 && task.day > currentDay;
          const checkboxId = `task-${task.key}`;
          return (
            <li
              key={task.key}
              className={`rounded-2xl border p-4 transition-colors ${
                isDone
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  id={checkboxId}
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                  checked={isDone}
                  disabled={!enrolled || locked || busyKey === task.key || pending}
                  onChange={(e) => toggleTask(task, e.target.checked)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                      Day {task.day}
                    </span>
                    <label
                      htmlFor={checkboxId}
                      className="text-sm font-semibold text-slate-900"
                    >
                      {task.title}
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {locked ? (
                      <span className="text-xs text-slate-400">
                        Unlocks on day {task.day}
                      </span>
                    ) : (
                      <Link
                        href={task.href}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {task.actionLabel} →
                      </Link>
                    )}
                    {!cohortSuppressed && task.cohortPercent !== null && (
                      <span className="text-xs text-slate-500">
                        {task.cohortPercent}% of this cohort finished day {task.day}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {currentDay > 0 && currentDay < durationDays && (
        <p className="mt-4 text-center text-xs text-slate-400">
          You&apos;re on day {currentDay} of {durationDays}. New tasks unlock each
          day.
        </p>
      )}
    </div>
  );
}
