"use client";

import { useState } from "react";
import Link from "next/link";

export interface WatchlistItem {
  id: number;
  item_type: string;
  item_slug: string;
  display_name: string | null;
  added_at: string;
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
}

export default function WatchlistClient({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

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
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-slate-500 text-sm">Your watchlist is empty.</p>
        <p className="text-slate-400 text-xs mt-1">
          Browse{" "}
          <Link href="/brokers" className="underline hover:text-slate-600">
            brokers
          </Link>
          {" or "}
          <Link href="/etfs" className="underline hover:text-slate-600">
            ETFs
          </Link>{" "}
          and add items to track them here.
        </p>
      </div>
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
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
                  <span className="block text-xs text-slate-400 truncate">
                    {item.item_slug}
                  </span>
                </Link>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={removingIds.has(item.id)}
                  aria-label={`Remove ${item.display_name ?? item.item_slug} from watchlist`}
                  className="shrink-0 text-xs text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
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
