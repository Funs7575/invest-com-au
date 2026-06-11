"use client";

import BottomSheet from "@/components/BottomSheet";
import { trackEvent } from "@/lib/tracking";

const MUTE_KEY = "iv_streak_quiet";

/** Whether the user has muted streak surfacing (badge + daily toasts). */
export function isStreakMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

interface StreakSheetProps {
  open: boolean;
  streak: number;
  onClose: () => void;
  onMuted: () => void;
}

const COUNTS = [
  "Reading a guide or article",
  "Running a calculator",
  "Taking or updating a quiz",
  "Checking your watchlist",
];

/**
 * Streak detail sheet (D6): what counts, the grace posture, and the mute
 * switch. Deliberately no loss-aversion mechanics — a missed day pauses
 * the streak, it doesn't shame you (§1.3 principle 6).
 */
export default function StreakSheet({ open, streak, onClose, onMuted }: StreakSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={`${streak}-day curiosity streak`}>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {streak === 1
          ? "You learned something about your money today."
          : `${streak} days in a row of learning something about your money.`}
      </p>
      <div className="mt-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          What counts
        </p>
        <ul className="mt-1.5 space-y-1">
          {COUNTS.map((c) => (
            <li key={c} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
              <svg
                className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {c}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Miss a day? The streak pauses — it&apos;ll be here when you&apos;re back. No guilt, no
        penalties.
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(MUTE_KEY, "1");
          } catch {
            /* ignore */
          }
          trackEvent("streak_muted", { at: streak });
          onMuted();
        }}
        className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        Mute streaks (hide the badge and daily notes)
      </button>
    </BottomSheet>
  );
}
