"use client";

import { useEffect } from "react";

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
export default function CheckinTrigger({ source }: Props) {
  useEffect(() => {
    fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    }).catch(() => {});
  }, [source]);

  return null;
}
