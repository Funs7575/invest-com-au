"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type AlertType = "open" | "close" | "listing" | "prospectus";

interface Props {
  ipoId: number;
  alertType?: AlertType;
  className?: string;
}

/**
 * Bell-icon toggle for subscribing/unsubscribing from IPO alerts.
 * Defaults to "listing" alert type — the most universally relevant trigger.
 * Unauthenticated users are redirected to /login.
 */
export default function IpoWatchlistButton({
  ipoId,
  alertType = "listing",
  className = "",
}: Props) {
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      if (!user) {
        setChecked(true);
        return;
      }
      supabase
        .from("ipo_watchlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("ipo_id", ipoId)
        .eq("alert_type", alertType)
        .maybeSingle()
        .then(({ data }) => {
          setWatching(!!data);
          setChecked(true);
        });
    });
  }, [ipoId, alertType]);

  async function toggle() {
    if (!userId) {
      window.location.href = "/auth/login?next=/invest/ipo-calendar";
      return;
    }
    if (loading) return;

    setLoading(true);
    const prev = watching;
    setWatching(!prev);

    try {
      const res = await fetch("/api/account/ipo-watchlist", {
        method: prev ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipo_id: ipoId, alert_type: alertType }),
      });
      if (!res.ok) setWatching(prev);
    } catch {
      setWatching(prev);
    } finally {
      setLoading(false);
    }
  }

  const label = !checked
    ? "Loading…"
    : watching
      ? "Watching — click to remove alert"
      : userId
        ? "Get alert for this IPO"
        : "Sign in for IPO alerts";

  return (
    <button
      onClick={toggle}
      disabled={loading || !checked}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 ${
        watching
          ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      } ${className}`}
    >
      {watching ? (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )}
    </button>
  );
}
