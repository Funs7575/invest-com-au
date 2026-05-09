"use client";

/**
 * Cross-page comparison cart hook (CMP W1-B foundation).
 *
 * Composes the existing useShortlist (broker-only, DB-backed) with a
 * localStorage layer for non-broker items (advisors, ETFs, scenarios).
 * Returns a unified CartItem[] view that the floating drawer + matrix
 * page consume. Cap = 6 across all kinds.
 *
 * Why compose rather than extract a shared store today: useShortlist is
 * 622 lines and powers the existing /shortlist page in production. A clean
 * extract is a separate refactor (CMP W1-B-EXTRACT in the queue). For
 * now the cart hook is a thin overlay that doesn't risk regressing
 * shortlist behaviour.
 *
 * Anonymous → claimed: non-broker cart items (stored in localStorage by
 * this hook) get claimed via the existing claimAnonymousSaves path, which
 * already handles bookmark_type='etf'/'advisor'/'scenario'. See
 * lib/bookmarks.ts:158.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useShortlist } from "./useShortlist";

export type CartItemKind = "broker" | "advisor" | "etf" | "scenario";

export interface CartItem {
  kind: CartItemKind;
  /** Slug or ticker — unique within (kind). */
  ref: string;
  /** Optional pre-computed display label so the drawer can render fast. */
  label?: string;
  /** ISO timestamp when added — used for stable ordering in the drawer. */
  addedAt: string;
}

export const CART_MAX_TOTAL = 6;
const NON_BROKER_KEY = "invest_cart_non_broker";

interface CartHook {
  items: CartItem[];
  count: number;
  isFull: boolean;
  add(item: Omit<CartItem, "addedAt">): { ok: boolean; reason?: string };
  remove(item: Pick<CartItem, "kind" | "ref">): void;
  has(item: Pick<CartItem, "kind" | "ref">): boolean;
  clear(): void;
}

function readNonBrokerCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NON_BROKER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem =>
        typeof i === "object" &&
        i !== null &&
        typeof (i as CartItem).ref === "string" &&
        typeof (i as CartItem).addedAt === "string" &&
        ["advisor", "etf", "scenario"].includes((i as CartItem).kind),
    );
  } catch {
    return [];
  }
}

function writeNonBrokerCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NON_BROKER_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded / private browsing — silent
  }
}

export function useComparisonCart(): CartHook {
  const shortlist = useShortlist();
  const [nonBroker, setNonBroker] = useState<CartItem[]>([]);

  // Hydrate non-broker items on mount.
  useEffect(() => {
    setNonBroker(readNonBrokerCart());
    // React to localStorage changes from other tabs.
    const onStorage = (e: StorageEvent) => {
      if (e.key === NON_BROKER_KEY) setNonBroker(readNonBrokerCart());
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
  }, []);

  // Compose unified CartItem[] from broker shortlist + non-broker layer.
  const items = useMemo<CartItem[]>(() => {
    const brokerSlugs: string[] = Array.isArray(
      (shortlist as unknown as { slugs?: unknown }).slugs,
    )
      ? ((shortlist as unknown as { slugs: string[] }).slugs)
      : [];
    const brokerItems: CartItem[] = brokerSlugs.map((slug) => ({
      kind: "broker",
      ref: slug,
      // The shortlist hook doesn't currently expose per-slug addedAt. Use a
      // stable synthetic timestamp so ordering is deterministic; the real
      // value travels with the DB row on the /shortlist page.
      addedAt: "1970-01-01T00:00:00Z",
    }));
    return [...brokerItems, ...nonBroker];
  }, [shortlist, nonBroker]);

  const count = items.length;
  const isFull = count >= CART_MAX_TOTAL;

  const has = useCallback(
    (q: Pick<CartItem, "kind" | "ref">) =>
      items.some((i) => i.kind === q.kind && i.ref === q.ref),
    [items],
  );

  const add = useCallback(
    (item: Omit<CartItem, "addedAt">): { ok: boolean; reason?: string } => {
      if (has(item)) return { ok: true }; // idempotent
      if (count >= CART_MAX_TOTAL) {
        return { ok: false, reason: `Cart is full (max ${CART_MAX_TOTAL}).` };
      }
      const stamped: CartItem = { ...item, addedAt: new Date().toISOString() };
      if (item.kind === "broker") {
        // Delegate to shortlist hook's add path.
        const sl = shortlist as unknown as {
          add?: (slug: string) => void;
          toggle?: (slug: string) => void;
        };
        if (typeof sl.add === "function") sl.add(item.ref);
        else if (typeof sl.toggle === "function") sl.toggle(item.ref);
        return { ok: true };
      }
      const next = [...nonBroker, stamped];
      setNonBroker(next);
      writeNonBrokerCart(next);
      return { ok: true };
    },
    [count, has, nonBroker, shortlist],
  );

  const remove = useCallback(
    (q: Pick<CartItem, "kind" | "ref">) => {
      if (q.kind === "broker") {
        const sl = shortlist as unknown as {
          remove?: (slug: string) => void;
          toggle?: (slug: string) => void;
        };
        if (typeof sl.remove === "function") sl.remove(q.ref);
        else if (typeof sl.toggle === "function") sl.toggle(q.ref);
        return;
      }
      const next = nonBroker.filter(
        (i) => !(i.kind === q.kind && i.ref === q.ref),
      );
      setNonBroker(next);
      writeNonBrokerCart(next);
    },
    [nonBroker, shortlist],
  );

  const clear = useCallback(() => {
    // Clear non-broker only — broker shortlist has its own clear path on
    // /shortlist that requires explicit user action (preserves UX semantics).
    setNonBroker([]);
    writeNonBrokerCart([]);
  }, []);

  return { items, count, isFull, add, remove, has, clear };
}
