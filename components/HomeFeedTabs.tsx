"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  FEED_TAB_LABELS,
  feedEventHref,
  type FeedEvent,
  type FeedTab,
} from "@/lib/feed-ranking";

interface Props {
  initialEvents: FeedEvent[];
  initialCursor: string | null;
}

const TABS: FeedTab[] = ["for_you", "markets", "community", "advisors"];

interface TabState {
  events: FeedEvent[];
  cursor: string | null;
  loading: boolean;
  hasMore: boolean;
  loaded: boolean;
}

const DEFAULT_TAB_STATE: TabState = {
  events: [],
  cursor: null,
  loading: false,
  hasMore: true,
  loaded: false,
};

function eventIcon(type: FeedEvent["event_type"]): string {
  switch (type) {
    case "rate_change":
      return "📈";
    case "advisor_post":
      return "💬";
    case "community_thread":
      return "🗣️";
    case "article":
      return "📄";
    case "deal":
      return "🎁";
  }
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function FeedEventCard({ event }: { event: FeedEvent }) {
  const href = feedEventHref(event);
  return (
    <Link
      href={href}
      className="block group px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">
          {eventIcon(event.event_type)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700 leading-snug line-clamp-2">
            {event.headline}
          </p>
          {event.summary && event.event_type === "advisor_post" && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              {event.summary}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {event.actor_name && (
              <span className="text-[11px] text-slate-400 font-medium">
                {event.actor_name}
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {timeAgo(event.published_at)}
            </span>
          </div>
        </div>
        <span className="text-slate-300 group-hover:text-blue-400 shrink-0 mt-1" aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}

export default function HomeFeedTabs({ initialEvents, initialCursor }: Props) {
  const [activeTab, setActiveTab] = useState<FeedTab>("for_you");
  const [tabs, setTabs] = useState<Record<FeedTab, TabState>>(() => {
    const initial: Record<FeedTab, TabState> = {
      for_you: { events: initialEvents, cursor: initialCursor, loading: false, hasMore: !!initialCursor, loaded: true },
      markets: { ...DEFAULT_TAB_STATE },
      community: { ...DEFAULT_TAB_STATE },
      advisors: { ...DEFAULT_TAB_STATE },
    };
    return initial;
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(
    async (tab: FeedTab) => {
      const state = tabs[tab];
      if (!state || state.loading || !state.hasMore) return;

      setTabs((prev) => ({
        ...prev,
        [tab]: { ...prev[tab]!, loading: true },
      }));

      try {
        const cursor = state.cursor ?? new Date().toISOString();
        const res = await fetch(
          `/api/feed?tab=${tab}&cursor=${encodeURIComponent(cursor)}&limit=20`,
        );
        if (!res.ok) return;
        const { events, nextCursor } = (await res.json()) as {
          events: FeedEvent[];
          nextCursor: string | null;
        };
        setTabs((prev) => ({
          ...prev,
          [tab]: {
            events: [...(prev[tab]?.events ?? []), ...events],
            cursor: nextCursor,
            loading: false,
            hasMore: !!nextCursor,
            loaded: true,
          },
        }));
      } catch {
        setTabs((prev) => ({
          ...prev,
          [tab]: { ...prev[tab]!, loading: false },
        }));
      }
    },
    [tabs],
  );

  const switchTab = useCallback(
    (tab: FeedTab) => {
      setActiveTab(tab);
      if (!tabs[tab]?.loaded) {
        void loadMore(tab);
      }
    },
    [tabs, loadMore],
  );

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadMore(activeTab);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, loadMore]);

  const currentTab = tabs[activeTab];
  const events = currentTab?.events ?? [];
  const loading = currentTab?.loading ?? false;
  const hasMore = currentTab?.hasMore ?? true;

  return (
    <section className="container-custom max-w-2xl my-6">
      {/* Tab bar */}
      <div className="flex gap-0.5 mb-0 bg-slate-100 rounded-xl p-1" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => switchTab(tab)}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {FEED_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Feed events */}
      <div
        className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-2 shadow-sm"
        role="tabpanel"
      >
        {events.length === 0 && !loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            {currentTab?.loaded
              ? "Nothing here yet — check back soon."
              : "Loading…"}
          </div>
        ) : (
          <>
            {events.map((event) => (
              <FeedEventCard key={event.id} event={event} />
            ))}
            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="h-1" aria-hidden="true" />
            )}
          </>
        )}
        {loading && (
          <div className="px-4 py-3 text-xs text-slate-400 text-center border-t border-slate-100">
            Loading…
          </div>
        )}
        {!hasMore && events.length > 0 && (
          <div className="px-4 py-3 text-xs text-slate-400 text-center border-t border-slate-100">
            You&apos;re all caught up.
          </div>
        )}
      </div>
    </section>
  );
}
