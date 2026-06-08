"use client";

import { useState } from "react";

interface Props {
  slug: string;
  initialFollowing: boolean;
  isAuthenticated: boolean;
}

export default function ListFollowButton({ slug, initialFollowing, isAuthenticated }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!isAuthenticated) {
      window.location.href = `/auth/login?next=/lists/${slug}`;
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/user-lists/${slug}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      if (res.ok) setFollowing((f) => !f);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={() => { void toggle(); }}
      disabled={busy}
      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors
        ${following
          ? "bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700 border border-slate-200"
          : "bg-violet-600 text-white hover:bg-violet-700"}
        disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-pressed={following}
    >
      {busy ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}
