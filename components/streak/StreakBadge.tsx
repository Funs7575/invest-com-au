"use client";

import { useEffect, useState } from "react";
import StreakSheet, { isStreakMuted } from "@/components/streak/StreakSheet";

/**
 * Curiosity-streak chip (RETAIL_UX_NORTHSTAR §5 D6).
 * Shows the live research streak from /api/checkin and opens the streak
 * sheet (what counts, grace, mute switch). Renders nothing for streak 0,
 * signed-out users (the API returns 0), or when the user has muted streaks.
 *
 * The streak counts RESEARCH actions only (reading, calculators, quizzes,
 * watchlist checks — see /api/checkin sources). Never wire it to outbound
 * clicks or enquiries (§9 firewall).
 */
export default function StreakBadge() {
  const [streak, setStreak] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStreakMuted()) return;
    fetch("/api/checkin")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { streak: number };
        if (data.streak > 0) setStreak(data.streak);
      })
      .catch(() => {});
  }, []);

  if (!streak) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={`${streak}-day curiosity streak`}
        aria-label={`${streak}-day curiosity streak — open streak details`}
        className="inline-flex items-center gap-0.5 text-[11px] font-bold leading-none px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition-colors"
      >
        <span aria-hidden>🔥</span>
        {streak}
      </button>
      <StreakSheet
        open={open}
        streak={streak}
        onClose={() => setOpen(false)}
        onMuted={() => {
          setOpen(false);
          setStreak(null);
        }}
      />
    </>
  );
}
