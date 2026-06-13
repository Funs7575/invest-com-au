/**
 * Dedupe planning: compare importable drafts against the user's existing
 * holdings and classify each row before anything is written.
 *
 *   "new"               — no existing holding with the same instrument
 *   "tracked"           — instrument already tracked; user picks
 *                         skip / update units / add as a new lot
 *   "duplicate-in-file" — an earlier row in this same file is identical
 *                         (instrument + units + price + date); default skip
 *
 * Matching is on the *normalised* instrument key, so an existing
 * "BHP.AX" row matches a CSV "ASX:BHP" row.
 *
 * Pure functions only.
 */

import { normaliseInstrument } from "./normalise";
import type { ImportRowDraft } from "./types";

export interface ExistingHoldingForDedupe {
  id: number;
  ticker: string;
  exchange: string;
  shares: number;
  costBasisPerShareCents: number;
  acquiredAt: string;
}

export type DedupeStatus = "new" | "tracked" | "duplicate-in-file";

export interface PlannedRow {
  draft: ImportRowDraft;
  /** Normalised `EXCHANGE:TICKER` identity key. */
  key: string;
  status: DedupeStatus;
  /** Existing holdings with the same key (empty for "new"). */
  matches: ExistingHoldingForDedupe[];
  /** For "duplicate-in-file": the source row this one repeats. */
  duplicateOfSourceRow: number | null;
}

export interface ImportPlan {
  planned: PlannedRow[];
  /** Drafts with issues — never importable, listed for transparency. */
  invalid: ImportRowDraft[];
}

/**
 * Canonical identity key for a holding. Normalises the ticker (stripping
 * exchange suffixes/prefixes) and prefers the exchange embedded in the
 * code over the stored column, mirroring how drafts were built.
 */
export function holdingKey(ticker: string, exchange: string): string {
  const instrument = normaliseInstrument(ticker);
  const code = instrument?.ticker ?? ticker.trim().toUpperCase();
  const market = instrument?.exchange ?? exchange.trim().toUpperCase();
  return `${market}:${code}`;
}

/** Classify importable drafts against existing holdings. */
export function planImport(
  drafts: readonly ImportRowDraft[],
  existing: readonly ExistingHoldingForDedupe[],
): ImportPlan {
  const invalid = drafts.filter((d) => d.issues.length > 0);
  const valid = drafts.filter((d) => d.issues.length === 0);

  const existingByKey = new Map<string, ExistingHoldingForDedupe[]>();
  for (const holding of existing) {
    const key = holdingKey(holding.ticker, holding.exchange);
    const bucket = existingByKey.get(key);
    if (bucket) bucket.push(holding);
    else existingByKey.set(key, [holding]);
  }

  // First occurrence of each exact (key, units, price, date) tuple wins;
  // repeats are flagged as in-file duplicates.
  const seenExact = new Map<string, number>();

  const planned: PlannedRow[] = valid.map((draft) => {
    const key = holdingKey(draft.ticker ?? "", draft.exchange ?? "OTHER");
    const exactKey = `${key}|${draft.shares}|${draft.costBasisPerShareCents}|${draft.acquiredAt}`;

    const earlierRow = seenExact.get(exactKey);
    if (earlierRow !== undefined) {
      return {
        draft,
        key,
        status: "duplicate-in-file" as const,
        matches: existingByKey.get(key) ?? [],
        duplicateOfSourceRow: earlierRow,
      };
    }
    seenExact.set(exactKey, draft.sourceRow);

    const matches = existingByKey.get(key) ?? [];
    return {
      draft,
      key,
      status: matches.length > 0 ? ("tracked" as const) : ("new" as const),
      matches,
      duplicateOfSourceRow: null,
    };
  });

  return { planned, invalid };
}
