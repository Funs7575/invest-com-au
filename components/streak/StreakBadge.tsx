"use client";

import { useEffect, useState } from "react";

export default function StreakBadge() {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/checkin")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json() as { streak: number };
        if (data.streak > 0) setStreak(data.streak);
      })
      .catch(() => {});
  }, []);

  if (!streak) return null;

  return (
    <span
      title={`${streak}-day streak`}
      aria-label={`${streak}-day investing streak`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 11,
        fontWeight: 700,
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fde68a",
        borderRadius: 99,
        padding: "2px 7px",
        lineHeight: 1,
      }}
    >
      🔥{streak}
    </span>
  );
}
