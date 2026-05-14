"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import NotificationDropdown, {
  type DropdownNotification,
} from "@/components/notifications/NotificationDropdown";

/**
 * Header bell + dropdown (C1 / mm06). Hidden for logged-out users so
 * we don't nag anonymous visitors. Polls `/api/notifications` every
 * 60s while the tab is visible to keep the unread badge fresh.
 *
 * Why `setTimeout` recursion instead of `setInterval`? CLAUDE.md test
 * patterns prefer self-clearing timers; recursive `setTimeout` is
 * easier to reason about under React 18's strict-mode double-mount and
 * the cleanup function can no-op a pending timer cleanly. The earlier
 * `components/NotificationBell.tsx` used `setInterval` and a `cancelled`
 * flag — same idea, different shape.
 *
 * Important: this component lives at `components/notifications/`. The
 * legacy `components/NotificationBell.tsx` is still wired into
 * `components/Header.tsx` and continues to serve the count-only header
 * link to `/account/notifications` — this new component supersedes it
 * once the Header switches over. Wiring change is co-located in this PR.
 */
export default function NotificationBell() {
  const { user, loading } = useUser();
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<DropdownNotification[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        unread_count?: number;
        recent?: DropdownNotification[];
      };
      if (cancelledRef.current) return;
      if (typeof json.unread_count === "number") setUnread(json.unread_count);
      if (Array.isArray(json.recent)) setRecent(json.recent);
    } catch {
      /* silent — bell must never crash the header */
    }
  }, []);

  // Polling lifecycle. Each scheduled tick is cleared on unmount so
  // there are no leaks, per the spec.
  useEffect(() => {
    cancelledRef.current = false;
    if (loading || !user) {
      // Auth flipped to logged-out / loading — reset the cached
      // dropdown state so the bell hides cleanly. Intentional
      // set-state-in-effect: this synchronises React to external
      // (auth) state, not a render-derived value.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnread(0);
      setRecent([]);
      return undefined;
    }

    const scheduleNext = () => {
      if (cancelledRef.current) return;
      timerRef.current = setTimeout(async () => {
        if (cancelledRef.current) return;
        if (
          typeof document === "undefined" ||
          document.visibilityState === "visible"
        ) {
          await fetchData();
        }
        scheduleNext();
      }, 60_000);
    };

    void fetchData();
    scheduleNext();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user, loading, fetchData]);

  const markOneRead = useCallback(
    async (id: number) => {
      // Optimistic: stamp `read_at` locally and decrement the badge so
      // the dropdown reflects the click instantly. Refresh on success
      // to pick up any concurrent server-side changes.
      setRecent((prev) =>
        prev.map((n) =>
          n.id === id && n.read_at === null
            ? { ...n, read_at: new Date().toISOString() }
            : n,
        ),
      );
      setUnread((u) => Math.max(0, u - 1));
      try {
        await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      } catch {
        /* silent — next poll will reconcile */
      }
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    const nowIso = new Date().toISOString();
    setRecent((prev) =>
      prev.map((n) => (n.read_at === null ? { ...n, read_at: nowIso } : n)),
    );
    setUnread(0);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      /* silent — next poll will reconcile */
    }
  }, []);

  if (loading || !user) return null;

  const label =
    unread > 0 ? `Notifications (${unread} unread)` : "Notifications";

  return (
    <div className="relative">
      <button
        type="button"
        data-tour="inbox"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
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
      </button>
      <NotificationDropdown
        open={open}
        onClose={() => setOpen(false)}
        recent={recent}
        unreadCount={unread}
        onMarkAllRead={() => void markAllRead()}
        onMarkOneRead={(id) => void markOneRead(id)}
      />
    </div>
  );
}
