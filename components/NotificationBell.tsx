"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";

/**
 * Header bell with unread count. Hidden entirely for logged-out
 * users so it doesn't nag anonymous visitors. Polls every 60s
 * while the tab is visible so new notifications from crons
 * (price-drop, fee-change, reply) show up without a refresh.
 */
export default function NotificationBell() {
  const { user, loading } = useUser();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (loading || !user) {
      setUnread(0);
      return;
    }

    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/account/notifications?count=1", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { unread?: number };
        if (!cancelled && typeof json.unread === "number") {
          setUnread(json.unread);
        }
      } catch {
        /* silent — header bell should never crash */
      }
    };

    fetchCount();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchCount();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user, loading]);

  if (loading || !user) return null;

  const label =
    unread > 0 ? `Notifications (${unread} unread)` : "Notifications";

  return (
    <Link
      href="/account/notifications"
      aria-label={label}
      title={label}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/40"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unread > 0 && (
        <span
          className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
          aria-hidden
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
