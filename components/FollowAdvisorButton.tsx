"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  professionalId: number;
  initialFollowing: boolean;
  followerCount?: number;
}

/**
 * Follow / unfollow toggle for advisor profiles.
 * Unauthenticated clicks redirect to sign-in.
 * Optimistic UI with server reconciliation on error.
 */
export default function FollowAdvisorButton({
  professionalId,
  initialFollowing,
  followerCount: initialCount = 0,
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    if (loading) return;
    setLoading(true);

    const method = following ? "DELETE" : "POST";

    // Optimistic update
    setFollowing(!following);
    setCount((c) => (following ? Math.max(0, c - 1) : c + 1));

    try {
      const res = await fetch("/api/follows/advisor", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId }),
      });

      if (res.status === 401) {
        // Revert optimistic update and redirect to sign-in
        setFollowing(following);
        setCount(initialCount);
        router.push("/sign-in");
        return;
      }

      if (!res.ok) {
        // Revert on unexpected error
        setFollowing(following);
        setCount(initialCount);
      }
    } catch {
      // Network error — revert
      setFollowing(following);
      setCount(initialCount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {count > 0 && (
        <span className="text-xs text-slate-400 tabular-nums">
          {count.toLocaleString("en-AU")} follower{count !== 1 ? "s" : ""}
        </span>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-150 ${
          following
            ? "bg-slate-900 text-white border-slate-900 hover:bg-red-600 hover:border-red-600"
            : "bg-white text-slate-900 border-slate-300 hover:border-slate-900"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={following ? "Unfollow this advisor" : "Follow this advisor"}
        aria-pressed={following}
      >
        {loading ? (
          <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />
        ) : (
          <span aria-hidden>{following ? "✓" : "+"}</span>
        )}
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}
