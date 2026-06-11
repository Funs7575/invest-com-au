/**
 * Postcode Wealth Atlas — typed access to the ATO postcode-level taxation
 * statistics extract at data/postcode-atlas.json. Fourth instance of the
 * file-backed dataset pattern (adviser register, super funds, ghost
 * tickers).
 *
 * While `meta.sample` is true the dataset is a synthetic preview using
 * reserved 99xx postcodes and fictional suburb names: pages must render
 * the preview banner and emit `noindex` so placeholder figures can never
 * be attached to real places.
 */

import atlasData from "@/data/postcode-atlas.json";

export interface PostcodeRecord {
  /** Four-digit postcode — also the slug. */
  postcode: string;
  state: string;
  /** Suburbs/localities the postcode covers (display + search). */
  suburbs: string[];
  /** Individuals lodging returns (ATO). */
  individualsCount?: number;
  medianTaxableIncome?: number;
  meanTaxableIncome?: number;
  /** Median employer super contributions, $/yr (ATO). */
  medianSuperContribution?: number;
}

export interface PostcodeAtlasMeta {
  extractedAt: string;
  source: string;
  /** Income year, e.g. "2023–24". */
  incomeYear: string;
  sample: boolean;
  count: number;
  /** National medians for comparison lines, from the same extract. */
  nationalMedianTaxableIncome?: number;
}

interface PostcodeAtlasFile {
  meta: PostcodeAtlasMeta;
  postcodes: PostcodeRecord[];
}

const data = atlasData as PostcodeAtlasFile;

export function postcodeAtlasMeta(): PostcodeAtlasMeta {
  return data.meta;
}

export function allPostcodes(): PostcodeRecord[] {
  return data.postcodes;
}

let index: Map<string, PostcodeRecord> | null = null;

export function postcodeRecord(postcode: string): PostcodeRecord | null {
  if (!index) {
    index = new Map(data.postcodes.map((p) => [p.postcode, p]));
  }
  return index.get(postcode) ?? null;
}

export const POSTCODE_SEARCH_MIN_QUERY = 2;
export const POSTCODE_SEARCH_MAX_RESULTS = 20;

/** Postcode prefix > suburb prefix > suburb substring. */
export function searchPostcodes(query: string): PostcodeRecord[] {
  const q = query.trim().toLowerCase();
  if (q.length < POSTCODE_SEARCH_MIN_QUERY) return [];
  const ranked: { p: PostcodeRecord; rank: number }[] = [];
  for (const p of data.postcodes) {
    let rank: number | null = null;
    if (p.postcode.startsWith(q)) rank = 0;
    else {
      for (const s of p.suburbs) {
        const sl = s.toLowerCase();
        if (sl.startsWith(q)) {
          rank = 1;
          break;
        }
        if (sl.includes(q)) rank = rank === null ? 2 : rank;
      }
    }
    if (rank !== null) ranked.push({ p, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.p.postcode.localeCompare(b.p.postcode));
  return ranked.slice(0, POSTCODE_SEARCH_MAX_RESULTS).map((r) => r.p);
}

/** Numerically adjacent postcodes in the same state — "nearby" links. */
export function nearbyPostcodes(record: PostcodeRecord, limit = 6): PostcodeRecord[] {
  const n = parseInt(record.postcode, 10);
  return data.postcodes
    .filter((p) => p.postcode !== record.postcode && p.state === record.state)
    .sort((a, b) => Math.abs(parseInt(a.postcode, 10) - n) - Math.abs(parseInt(b.postcode, 10) - n))
    .slice(0, limit);
}

/** Highest median taxable income, for the hub's factual top list. */
export function topPostcodesByIncome(limit = 10): PostcodeRecord[] {
  return data.postcodes
    .filter((p) => p.medianTaxableIncome !== undefined)
    .sort((a, b) => (b.medianTaxableIncome ?? 0) - (a.medianTaxableIncome ?? 0))
    .slice(0, limit);
}

/** State → postcode count, for the hub's browse chips. */
export function postcodeStateCounts(): { state: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of data.postcodes) {
    counts.set(p.state, (counts.get(p.state) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));
}
