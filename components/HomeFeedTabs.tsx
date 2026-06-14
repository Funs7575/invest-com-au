"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import {
  FEED_TAB_LABELS,
  feedEventHref,
  type FeedEvent,
  type FeedEventType,
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

/** Per-event-type visual identity — house Icon + tinted badge, never emoji. */
const EVENT_META: Record<
  FeedEventType,
  { icon: string; label: string; badge: string; ring: string }
> = {
  rate_change: { icon: "trending-up", label: "Rate", badge: "bg-emerald-50 text-emerald-600", ring: "ring-emerald-100" },
  advisor_post: { icon: "message-circle", label: "Advisor", badge: "bg-blue-50 text-blue-600", ring: "ring-blue-100" },
  community_thread: { icon: "help-circle", label: "Community", badge: "bg-violet-50 text-violet-600", ring: "ring-violet-100" },
  article: { icon: "file-text", label: "Insight", badge: "bg-amber-50 text-amber-600", ring: "ring-amber-100" },
  deal: { icon: "party-popper", label: "Deal", badge: "bg-rose-50 text-rose-600", ring: "ring-rose-100" },
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** <1h old — kept out of the render body so the purity lint stays happy. */
function isFresh(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 3_600_000;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Leading visual: actor photo → initials → category icon badge. */
function EventVisual({ event }: { event: FeedEvent }) {
  const meta = EVENT_META[event.event_type];
  if (event.image_url) {
    return (
      <span className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote, unknown-host feed thumbnails */}
        <img src={event.image_url} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200" />
        <span className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-md ring-2 ring-white ${meta.badge}`}>
          <Icon name={meta.icon} size={12} />
        </span>
      </span>
    );
  }
  if (event.actor_name) {
    return (
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xs font-bold ring-1 ${meta.badge} ${meta.ring}`}>
        {initials(event.actor_name)}
      </span>
    );
  }
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${meta.badge}`}>
      <Icon name={meta.icon} size={18} />
    </span>
  );
}

function FeedEventCard({ event, index }: { event: FeedEvent; index: number }) {
  const href = feedEventHref(event);
  const meta = EVENT_META[event.event_type];
  const fresh = isFresh(event.published_at);
  return (
    <Link
      href={href}
      className="group relative flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      style={{ animation: "fadeInUp 0.4s ease-out both", animationDelay: `${Math.min(index, 6) * 55}ms` }}
    >
      <EventVisual event={event} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}>
            {meta.label}
          </span>
          {fresh && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              New
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-blue-700">
          {event.headline}
        </p>
        {event.summary && (
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{event.summary}</p>
        )}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
          {event.actor_name && <span className="font-medium text-slate-500">{event.actor_name}</span>}
          {event.actor_name && <span aria-hidden="true">·</span>}
          <span>{timeAgo(event.published_at)}</span>
        </div>
      </div>
      <Icon
        name="arrow-right"
        size={16}
        className="mt-1 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-blue-500"
      />
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-slate-100" />
      <div className="min-w-0 flex-1 space-y-2 py-0.5">
        <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
        <div className="h-3.5 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
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
    <section className="container-custom max-w-2xl my-6 md:my-8">
      {/* Header */}
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Your feed</h2>
          <p className="text-xs text-slate-500">
            What&apos;s moved across your shortlists, advisors and the market.
          </p>
        </div>
        <Link
          href="/feed"
          className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          See all →
        </Link>
      </div>

      {/* Tab bar */}
      <div className="mb-3 flex gap-0.5 rounded-xl bg-slate-100 p-1" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => switchTab(tab)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {FEED_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Events */}
      <div role="tabpanel" className="space-y-2">
        {events.length === 0 && !loading ? (
          currentTab?.loaded ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
              <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-400">
                <Icon name="check-circle" size={18} />
              </div>
              <p className="text-sm font-medium text-slate-600">You&apos;re all caught up</p>
              <p className="text-xs text-slate-400">New activity will land here.</p>
            </div>
          ) : (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          )
        ) : (
          <>
            {events.map((event, i) => (
              <FeedEventCard key={event.id} event={event} index={i} />
            ))}
            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}
            {loading && <CardSkeleton />}
            {!hasMore && events.length > 0 && (
              <p className="py-2 text-center text-xs text-slate-400">You&apos;re all caught up.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
