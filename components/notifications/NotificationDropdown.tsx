"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Dropdown that lists the 10 most-recent notifications behind the
 * header bell. Click outside / Esc closes; "Mark all read" hits
 * /api/notifications/read-all; "View all" links to the existing
 * /account/notifications page.
 *
 * The bell owns the polled `recent` / `unreadCount` state and passes
 * it down — that avoids two pollers (one for the bell, one for this
 * dropdown) competing for /api/notifications.
 */

export interface DropdownNotification {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  recent: DropdownNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkOneRead: (id: number) => void;
}

/**
 * Render a compact time-ago label. Avoids pulling in date-fns / Intl
 * RelativeTimeFormat polyfill weight for a five-line helper.
 */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3_600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3_600)}h ago`;
  if (diffSec < 604_800) return `${Math.floor(diffSec / 86_400)}d ago`;
  return `${Math.floor(diffSec / 604_800)}w ago`;
}

export default function NotificationDropdown({
  open,
  onClose,
  recent,
  unreadCount,
  onMarkAllRead,
  onMarkOneRead,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [busyMarkAll, setBusyMarkAll] = useState(false);

  // Close on outside click / Esc — keep the dropdown light without
  // pulling in a Popover lib.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Show 10 most-recent per spec — the API returns up to 20.
  const items = recent.slice(0, 10);

  async function handleMarkAllRead() {
    setBusyMarkAll(true);
    try {
      onMarkAllRead();
    } finally {
      setBusyMarkAll(false);
    }
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Notifications"
      // Constrain width to viewport on small screens so the dropdown
      // never overflows past the right edge of the header. 2rem accounts
      // for the parent container's px-4 (16px) on each side.
      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">
          Notifications
          {unreadCount > 0 ? (
            <span className="ml-2 inline-block bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => void handleMarkAllRead()}
          disabled={busyMarkAll || unreadCount === 0}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:text-slate-300 transition-colors"
        >
          {busyMarkAll ? "Marking…" : "Mark all read"}
        </button>
      </div>

      <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
        {items.length === 0 ? (
          <li className="px-4 py-8 text-center text-xs text-slate-400">
            You&apos;re all caught up.
          </li>
        ) : (
          items.map((n) => {
            const isUnread = n.read_at === null;
            const body = (
              <div
                className={`px-4 py-3 transition-colors ${
                  isUnread ? "bg-amber-50/50 hover:bg-amber-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  {isUnread ? (
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0"
                    />
                  ) : (
                    <span aria-hidden className="mt-1.5 h-2 w-2 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {n.title}
                    </p>
                    {n.body ? (
                      <p className="text-xs text-slate-600 line-clamp-2">{n.body}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
            const onClick = () => {
              if (isUnread) onMarkOneRead(n.id);
              onClose();
            };
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} onClick={onClick} className="block">
                    {body}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onClick}
                    className="w-full text-left"
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>

      <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50">
        <Link
          href="/account/notifications"
          onClick={onClose}
          className="block text-center text-xs font-bold text-slate-700 hover:text-slate-900"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}
