/**
 * Sharesight sync dedup.
 *
 * After the API → ParsedHoldingRow mapping ships rows, we filter out
 * any that already exist in `investor_holdings`. "Already exist" means
 * matching (ticker, exchange, acquired_at) — Sharesight returns the
 * aggregate position per instrument so a re-sync of the same portfolio
 * always emits the same canonical row.
 *
 * Match keys are case-insensitive on the ticker side (defensive — both
 * paths upper-case but a stray manual entry could slip through), exact
 * on exchange + acquired_at.
 *
 * Pure module; no DB / network access. The route handler does the
 * existing-row lookup against `investor_holdings` and feeds it in.
 */
import type { ParsedHoldingRow } from "@/lib/holdings/csv-import";

export interface ExistingHolding {
  ticker: string;
  exchange: string;
  acquired_at: string;
}

export interface DedupResult {
  toInsert: ParsedHoldingRow[];
  skipped: ParsedHoldingRow[];
}

function keyOf(ticker: string, exchange: string, acquiredAt: string): string {
  return `${ticker.toUpperCase()}|${exchange}|${acquiredAt}`;
}

export function dedupAgainstExisting(
  parsed: readonly ParsedHoldingRow[],
  existing: readonly ExistingHolding[],
): DedupResult {
  const seen = new Set(
    existing.map((e) => keyOf(e.ticker, e.exchange, e.acquired_at)),
  );
  const toInsert: ParsedHoldingRow[] = [];
  const skipped: ParsedHoldingRow[] = [];
  for (const row of parsed) {
    const k = keyOf(row.ticker, row.exchange, row.acquired_at);
    if (seen.has(k)) {
      skipped.push(row);
      continue;
    }
    // Defensive: dedup within the parsed batch too. If Sharesight ever
    // returns the same logical position twice in one response, second
    // appearance is a skip.
    seen.add(k);
    toInsert.push(row);
  }
  return { toInsert, skipped };
}
