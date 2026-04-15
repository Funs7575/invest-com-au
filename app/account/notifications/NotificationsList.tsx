"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
}

interface Props {
  initialItems: NotificationItem[];
}

/**
 * Client list for /account/notifications.
 *
 * Optimistic mark-as-read: we stamp the row's read_at locally as
 * soon as the user clicks, then PATCH the API. If the API fails
 * we roll the change back and show an inline error banner — the
 * list never lies about what's been read.
 */
export default function NotificationsList({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const markOne = async (id: number) => {
    const snapshot = items;
    setItems((prev) =>
      prev.map((i) =>
        i.id === id && i.read_at == null
          ? { ...i, read_at: new Date().toISOString() }
          : i,
      ),
    );
    try {
      const res = await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("mark read failed");
    } catch {
      setItems(snapshot);
      setError("Couldn't mark that as read. Try again?");
    }
  };

  const markAll = () => {
    const snapshot = items;
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) => (i.read_at == null ? { ...i, read_at: now } : i)),
    );
    startTransition(async () => {
      try {
        const res = await fetch("/api/account/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        if (!res.ok) throw new Error("mark all failed");
      } catch {
        setItems(snapshot);
        setError("Couldn't mark all as read. Try again?");
      }
    });
  };

  const unreadCount = items.filter((i) => i.read_at == null).length;

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <div className="text-4xl mb-2" aria-hidden>
          📭
        </div>
        <p className="text-sm text-slate-600">No notifications yet.</p>
        <p className="text-xs text-slate-500 mt-1">
          We&rsquo;ll let you know about fee changes, replies and deals here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-end mb-3">
        <button
          type="button"
          onClick={markAll}
          disabled={isPending || unreadCount === 0}
          className="text-xs font-medium text-primary hover:underline disabled:text-slate-400 disabled:no-underline"
        >
          Mark all as read
        </button>
      </div>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {items.map((item) => {
          const isUnread = item.read_at == null;
          const row = (
            <div className="flex items-start gap-3">
              <span
                className={`mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                  isUnread ? "bg-primary" : "bg-slate-200"
                }`}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={`text-sm truncate ${
                      isUnread ? "font-semibold text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {item.title}
                  </p>
                  <time
                    dateTime={item.created_at}
                    className="text-[11px] text-slate-500 flex-shrink-0"
                  >
                    {formatRelative(item.created_at)}
                  </time>
                </div>
                {item.body && (
                  <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                    {item.body}
                  </p>
                )}
              </div>
            </div>
          );

          const handleClick = () => {
            if (isUnread) void markOne(item.id);
          };

          if (item.link_url) {
            return (
              <li key={item.id}>
                <Link
                  href={item.link_url}
                  onClick={handleClick}
                  className="block px-4 py-3 hover:bg-slate-50"
                >
                  {row}
                </Link>
              </li>
            );
          }
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={handleClick}
                className="block w-full text-left px-4 py-3 hover:bg-slate-50"
              >
                {row}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}
