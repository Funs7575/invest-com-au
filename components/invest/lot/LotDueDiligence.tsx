"use client";

import { useMemo, useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import { dueDiligenceForCategory } from "@/lib/listings/due-diligence";

/**
 * Buyer-side due-diligence checklist (idea #21). Personal state — ticks
 * live in localStorage keyed by listing slug, never on the server.
 * localStorage is treated as a real external store (useSyncExternalStore
 * with a storage-event subscription + a manual dispatch for same-tab
 * writes), so SSR renders the unticked server snapshot and hydration
 * never mismatches.
 */
function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function useTickedSet(storageKey: string): [Set<string>, (next: Set<string>) => void] {
  const raw = useSyncExternalStore(
    subscribeToStorage,
    () => {
      try {
        return localStorage.getItem(storageKey) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  const ticked = useMemo(() => {
    try {
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set<string>();
    }
  }, [raw]);
  const write = (next: Set<string>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      // Same-tab writes don't fire the storage event natively.
      window.dispatchEvent(new StorageEvent("storage", { key: storageKey }));
    } catch {
      /* storage unavailable — ticks just don't persist */
    }
  };
  return [ticked, write];
}
export default function LotDueDiligence({
  categorySlug,
  slug,
}: {
  categorySlug: string;
  slug: string;
}) {
  const { items, note } = dueDiligenceForCategory(categorySlug);
  const [done, writeDone] = useTickedSet(`inv_dd_${slug}`);

  if (items.length === 0) return null;

  const toggle = (id: string) => {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    writeDone(next);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Icon name="clipboard-list" size={16} className="text-slate-500" />
          <h2 className="text-base font-bold text-slate-900">Before you transact</h2>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {done.size}/{items.length} checked
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">{note}</p>

      <ul className="space-y-2.5">
        {items.map((item) => {
          const checked = done.has(item.id);
          return (
            <li key={item.id}>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span
                    className={`text-sm font-medium ${
                      checked ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.detail && (
                    <span className="block text-xs text-slate-500 mt-0.5">{item.detail}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => window.print()}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <Icon name="file-text" size={12} />
        Print this checklist
      </button>
    </div>
  );
}
