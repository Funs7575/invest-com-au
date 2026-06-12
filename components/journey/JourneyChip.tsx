"use client";

/**
 * Persistent journey identity in the header: a small chip showing the
 * visitor's current stage once they've reached their first milestone.
 * Invisible for brand-new visitors (no clutter before there's a story),
 * hydration-safe (renders nothing until mounted), and live — updates on
 * the `inv:journey` event fired whenever a milestone records.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { journeySnapshot } from "@/lib/journey";

export default function JourneyChip() {
  const [snap, setSnap] = useState<{ count: number; stageName: string; total: number } | null>(null);

  useEffect(() => {
    const read = () => {
      const s = journeySnapshot();
      setSnap(s.count > 0 ? { count: s.count, stageName: s.stage.name, total: 5 } : null);
    };
    read();
    window.addEventListener("inv:journey", read);
    return () => window.removeEventListener("inv:journey", read);
  }, []);

  if (!snap) return null;

  return (
    <Link
      href="/account/bookmarks"
      className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
      title={`Journey stage: ${snap.stageName} (${snap.count}/${snap.total} milestones)`}
    >
      <span aria-hidden>⭐</span>
      {snap.stageName}
    </Link>
  );
}
