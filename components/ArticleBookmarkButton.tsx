"use client";

import { fireJourneyMoment } from "@/components/journey/journeyMoment";
import { useEffect, useState } from "react";

interface Props {
  slug: string;
  title: string;
}

export default function ArticleBookmarkButton({ slug, title }: Props) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<"saved" | "removed" | null>(null);

  useEffect(() => {
    fetch(`/api/bookmarks/toggle?type=article&ref=${encodeURIComponent(slug)}`)
      .then((r) => r.ok ? r.json() : { bookmarked: false })
      .then((d) => setBookmarked(d.bookmarked))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const toggle = async () => {
    if (loading) return;
    const next = !bookmarked;
    setBookmarked(next);
    setFlash(next ? "saved" : "removed");
    setTimeout(() => setFlash(null), 2000);

    try {
      const res = await fetch("/api/bookmarks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "article",
          ref: slug,
          label: title,
          action: next ? "add" : "remove",
        }),
      });
      if (res.ok && next) {
        fireJourneyMoment("first_save");
      }
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        setBookmarked(!next);
        setFlash(null);
      }
    } catch {
      setBookmarked(!next);
      setFlash(null);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-busy={loading}
      title={bookmarked ? "Remove bookmark" : "Save article for later"}
      aria-label={bookmarked ? "Remove from saved articles" : "Save article for later"}
      className={`flex items-center gap-1.5 px-3 py-1.5 min-h-9 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
        bookmarked
          ? "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
      }`}
    >
      <svg
        className={`w-3.5 h-3.5 transition-colors ${bookmarked ? "text-violet-600" : "text-slate-500"}`}
        fill={bookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      {flash === "saved" ? "Saved!" : flash === "removed" ? "Removed" : bookmarked ? "Saved" : "Save"}
    </button>
  );
}
