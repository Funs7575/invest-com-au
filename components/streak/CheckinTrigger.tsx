"use client";

import { useEffect } from "react";
import { showToast } from "@/components/Toast";
import { celebrateMilestone } from "@/lib/celebrate";
import { isStreakMuted } from "@/components/streak/StreakSheet";

type CheckinSource =
  | "article_read"
  | "calculator"
  | "watchlist"
  | "quiz"
  | "feed_view"
  | "etf_view"
  | "broker_view"
  | "advisor_view";

interface Props {
  source: CheckinSource;
}

// Invisible client component — fires a checkin POST on mount.
// Drop onto any page to record that the user was active today.
//
// D6 (RETAIL_UX_NORTHSTAR): the first qualifying action of the day is the
// streak's increment moment — acknowledge it once, lightly. Streak
// milestones (3/7/30) celebrate via the milestone registry. Everything
// respects the user's mute switch (StreakSheet) and stays keyed to
// research actions only (§9 firewall).
export default function CheckinTrigger({ source }: Props) {
  useEffect(() => {
    fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    })
      .then(async (res) => {
        if (!res.ok || isStreakMuted()) return;
        const data = (await res.json()) as { streak?: number; isNew?: boolean };
        if (!data.isNew || !data.streak) return;
        if (data.streak === 3) {
          celebrateMilestone("streak_3");
        } else if (data.streak === 7) {
          celebrateMilestone("streak_7");
        } else if (data.streak === 30) {
          celebrateMilestone("streak_30");
        } else if (data.streak >= 2) {
          showToast(`Day ${data.streak} of learning something about your money`);
        }
      })
      .catch(() => {});
  }, [source]);

  return null;
}
