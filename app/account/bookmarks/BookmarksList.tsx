"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface BookmarkItem {
  id: number;
  bookmark_type: string;
  ref: string;
  label: string | null;
  note: string | null;
  created_at: string;
}

interface Props {
  initialItems: BookmarkItem[];
}

const TYPE_LABEL: Record<string, string> = {
  article: "Articles",
  broker: "Brokers",
  advisor: "Advisors",
  scenario: "Scenarios",
  calculator: "Calculators",
};

const TYPE_ORDER = ["broker", "advisor", "article", "scenario", "calculator"];

function linkFor(type: string, ref: string): string {
  switch (type) {
    case "article":
      return `/article/${ref}`;
    case "broker":
      return `/broker/${ref}`;
    case "advisor":
      return `/advisor/${ref}`;
    case "scenario":
      return `/scenario/${ref}`;
    case "calculator":
      return `/calculators/${ref}`;
    default:
      return "#";
  }
}

export default function BookmarksList({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const buckets: Record<string, BookmarkItem[]> = {};
    for (const it of items) {
      (buckets[it.bookmark_type] = buckets[it.bookmark_type] || []).push(it);
    }
    return buckets;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <div className="text-4xl mb-2" aria-hidden>
          🔖
        </div>
        <p className="text-sm text-slate-600">
          Nothing saved yet — tap the bookmark icon on any article,
          broker or advisor to save it here.
        </p>
        <Link
          href="/compare"
          className="mt-4 inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Start comparing →
        </Link>
      </div>
    );
  }

  const remove = async (item: BookmarkItem) => {
    setRemoving(item.id);
    setError(null);
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      const res = await fetch("/api/account/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: item.bookmark_type,
          ref: item.ref,
        }),
      });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setItems(snapshot);
      setError("Couldn't remove that bookmark. Try again?");
    } finally {
      setRemoving(null);
    }
  };

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

      {TYPE_ORDER.filter((t) => grouped[t] && grouped[t].length > 0).map(
        (type) => (
          <section key={type} className="mb-6">
            <h2 className="text-[0.7rem] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
              {TYPE_LABEL[type] || type}
            </h2>
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {grouped[type].map((item) => {
                const when = new Date(item.created_at).toLocaleDateString(
                  "en-AU",
                  { day: "numeric", month: "short", year: "numeric" },
                );
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        href={linkFor(item.bookmark_type, item.ref)}
                        className="text-sm font-semibold text-slate-900 hover:text-primary truncate block"
                      >
                        {item.label || item.ref}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Saved {when}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={removing === item.id}
                      className="text-xs font-medium text-slate-500 hover:text-red-600 disabled:text-slate-300"
                    >
                      {removing === item.id ? "Removing…" : "Remove"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
