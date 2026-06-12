/**
 * ASX Ghost Tickers — typed access to the removed-companies extract at
 * data/ghost-tickers.json. Third instance of the file-backed dataset
 * pattern (see lib/adviser-register.ts, lib/super-funds.ts).
 *
 * While `meta.sample` is true the dataset is a synthetic preview: pages
 * must render the preview banner and emit `noindex` so placeholder
 * companies can never be indexed or mistaken for real market history.
 */

import tickersData from "@/data/ghost-tickers.json";

export type GhostEvent = "delisted" | "renamed" | "merged" | "acquired" | "failed";

export interface GhostTicker {
  /** Former ASX code at removal, e.g. "ABC". */
  code: string;
  name: string;
  slug: string;
  event: GhostEvent;
  /** ISO date of removal from the official list. */
  eventDate: string;
  /** The exchange's stated reason, verbatim. */
  detail?: string;
  successorCode?: string;
  successorName?: string;
}

export interface GhostTickersMeta {
  extractedAt: string;
  source: string;
  sample: boolean;
  count: number;
}

interface GhostTickersFile {
  meta: GhostTickersMeta;
  tickers: GhostTicker[];
}

const data = tickersData as GhostTickersFile;

export function ghostTickersMeta(): GhostTickersMeta {
  return data.meta;
}

export function allGhostTickers(): GhostTicker[] {
  return data.tickers;
}

let slugIndex: Map<string, GhostTicker> | null = null;

export function ghostTickerBySlug(slug: string): GhostTicker | null {
  if (!slugIndex) {
    slugIndex = new Map(data.tickers.map((t) => [t.slug, t]));
  }
  return slugIndex.get(slug) ?? null;
}

export const GHOST_SEARCH_MIN_QUERY = 2;
export const GHOST_SEARCH_MAX_RESULTS = 20;

/** Code exact > code prefix > name prefix > name substring. */
export function searchGhostTickers(query: string): GhostTicker[] {
  const q = query.trim().toLowerCase();
  if (q.length < GHOST_SEARCH_MIN_QUERY) return [];
  const ranked: { t: GhostTicker; rank: number }[] = [];
  for (const t of data.tickers) {
    const code = t.code.toLowerCase();
    const name = t.name.toLowerCase();
    let rank: number | null = null;
    if (code === q) rank = 0;
    else if (code.startsWith(q)) rank = 1;
    else if (name.startsWith(q)) rank = 2;
    else if (name.includes(q)) rank = 3;
    if (rank !== null) ranked.push({ t, rank });
  }
  ranked.sort(
    (a, b) => a.rank - b.rank || b.t.eventDate.localeCompare(a.t.eventDate) || a.t.code.localeCompare(b.t.code),
  );
  return ranked.slice(0, GHOST_SEARCH_MAX_RESULTS).map((r) => r.t);
}

/** Most recent removals first. */
export function recentGhostTickers(limit = 30): GhostTicker[] {
  return [...data.tickers].sort((a, b) => b.eventDate.localeCompare(a.eventDate)).slice(0, limit);
}

/** Removals from the same calendar year, excluding the given ticker. */
export function sameYearGhostTickers(ticker: GhostTicker, limit = 6): GhostTicker[] {
  const year = ticker.eventDate.slice(0, 4);
  const out: GhostTicker[] = [];
  for (const t of data.tickers) {
    if (t.slug === ticker.slug) continue;
    if (t.eventDate.startsWith(year)) {
      out.push(t);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Year → removal count, newest first — the hub's browse module. */
export function ghostTickerYearCounts(): { year: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of data.tickers) {
    const year = t.eventDate.slice(0, 4);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year.localeCompare(a.year));
}

export const GHOST_EVENT_LABELS: Record<GhostEvent, string> = {
  delisted: "Delisted",
  renamed: "Renamed",
  merged: "Merged",
  acquired: "Acquired",
  failed: "Failed / wound up",
};
