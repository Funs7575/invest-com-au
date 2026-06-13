"use client";

import { useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/directory/EmptyState";

export interface WatchlistItem {
  id: number;
  item_type: string;
  item_slug: string;
  display_name: string | null;
  added_at: string;
  /**
   * Live headline rate (basis points) when this watched broker is a
   * savings_account or term_deposit. Populated server-side by the
   * watchlist page from savings_rate_snapshots; null otherwise.
   */
  current_rate_bps?: number | null;
  /** Whether this item is shared with the user's household (household_id set). */
  shared?: boolean;
}

function formatRatePct(bps: number): string {
  return `${(bps / 100).toFixed(2)}% p.a.`;
}

const TYPE_LABELS: Record<string, string> = {
  stock: "Stocks",
  etf: "ETFs",
  broker: "Brokers",
  fund: "Managed Funds",
  crypto: "Crypto",
};

const TYPE_ORDER = ["broker", "etf", "stock", "fund", "crypto"];

function itemHref(type: string, slug: string): string {
  switch (type) {
    case "broker": return `/brokers/${slug}`;
    case "etf": return `/etfs/${slug}`;
    case "stock": return `/stocks/${slug}`;
    case "fund": return `/funds/${slug}`;
    case "crypto": return `/crypto/${slug}`;
    default: return "#";
  }
}

interface Props {
  initialItems: WatchlistItem[];
  /** households flag on AND an accepted partner → show share toggles. */
  householdEnabled?: boolean;
}

export default function WatchlistClient({ initialItems, householdEnabled = false }: Props) {
  const [items, setItems] = useState(initialItems);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Optimistically flip an item's shared state via the share API. Owner-only
  // write — enforced server-side. Rolls back on failure.
  const toggleShare = async (id: number, shared: boolean) => {
    const snapshot = items;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, shared } : i)));
    try {
      const res = await fetch("/api/account/household/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "watchlist", item_id: id, shared }),
      });
      if (!res.ok) throw new Error("share failed");
    } catch {
      setItems(snapshot);
      setError("Couldn't update sharing. Please try again.");
    }
  };

  const removeItem = async (id: number) => {
    const snapshot = items;
    setRemovingIds((prev: Set<number>) => new Set(prev).add(id));
    setItems((prev: WatchlistItem[]) => prev.filter((i: WatchlistItem) => i.id !== id));

    try {
      const res = await fetch("/api/account/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("remove failed");
    } catch {
      setItems(snapshot);
      setError("Couldn't remove that item. Please try again.");
    } finally {
      setRemovingIds((prev: Set<number>) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon="eye"
        title="Your watchlist is empty"
        body="Add items by clicking the ♥ button on any broker, ETF, or stock page. Once you have items, you can enable price-change alerts below."
        ctas={[
          { label: "Browse brokers", href: "/brokers" },
          { label: "Explore ETFs", href: "/etfs", variant: "secondary" },
        ]}
      />
    );
  }

  const byType = TYPE_ORDER.reduce<Record<string, WatchlistItem[]>>((acc, t) => {
    const group = items.filter((i: WatchlistItem) => i.item_type === t);
    if (group.length > 0) acc[t] = group;
    return acc;
  }, {});

  // Append any unknown types at the end
  const unknownTypes = [...new Set(items.map((i: WatchlistItem) => i.item_type))].filter(
    (t: string) => !TYPE_ORDER.includes(t),
  );
  for (const t of unknownTypes) {
    byType[t] = items.filter((i: WatchlistItem) => i.item_type === t);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {Object.entries(byType).map(([type, group]) => (
        <div key={type}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            {TYPE_LABELS[type] ?? type} ({group.length})
          </h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
            {group.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between px-4 py-3 gap-3"
              >
                <Link
                  href={itemHref(item.item_type, item.item_slug)}
                  className="min-w-0 flex-1 hover:underline"
                >
                  <span className="block text-sm font-medium text-slate-900 truncate">
                    {item.display_name ?? item.item_slug}
                  </span>
                  <span className="block text-xs text-slate-500 truncate">
                    {item.item_slug}
                  </span>
                </Link>
                {typeof item.current_rate_bps === "number" && (
                  <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-800">
                    {formatRatePct(item.current_rate_bps)}
                  </span>
                )}
                {householdEnabled && (
                  <label
                    className="flex shrink-0 cursor-pointer items-center gap-1 text-[0.65rem] text-slate-500"
                    title="Share this with your household"
                  >
                    <input
                      type="checkbox"
                      checked={item.shared ?? false}
                      onChange={(e) => void toggleShare(item.id, e.target.checked)}
                      className="h-3 w-3 accent-violet-600"
                    />
                    <span className="hidden sm:inline">Share</span>
                  </label>
                )}
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={removingIds.has(item.id)}
                  aria-label={`Remove ${item.display_name ?? item.item_slug} from watchlist`}
                  className="shrink-0 text-xs text-slate-500 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {removingIds.has(item.id) ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
