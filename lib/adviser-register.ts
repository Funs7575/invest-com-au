/**
 * Adviser Register Atlas — typed access to the ASIC Financial Advisers
 * Register extract at data/adviser-register.json.
 *
 * The dataset is file-backed by design (mega-session #1): ~15k records ×
 * ~200 B loads once per server instance, needs no schema change, and the
 * weekly refresh is a one-command re-ingest (`npm run data:far`) that
 * ships as a normal PR diff — reviewable, revertable, and CDN-cacheable.
 *
 * While `meta.sample` is true the dataset is a synthetic preview: pages
 * must render the preview banner and emit `noindex` (see the routes) so
 * fictional records can never be mistaken for the live register or leak
 * into search engines. The real extract flips `sample` to false at
 * ingest time and everything switches on automatically.
 */

import registerData from "@/data/adviser-register.json";

export interface RegisterAdviser {
  /** ASIC adviser number, e.g. "1234567" — the stable identity. */
  number: string;
  name: string;
  /** URL slug: kebab-case name + adviser number (collision-proof). */
  slug: string;
  /** e.g. "Financial Adviser" | "Provisional Financial Adviser" */
  role: string;
  subType?: string;
  licenseeName: string;
  licenseeNumber?: string;
  /** Year the adviser first provided advice, when ASIC publishes it. */
  firstAdviceYear?: number;
  qualifications?: string[];
}

export interface RegisterMeta {
  /** ISO date of the source extract. */
  extractedAt: string;
  source: string;
  /** True while the bundled data is a synthetic preview, not the register. */
  sample: boolean;
  count: number;
}

interface RegisterFile {
  meta: RegisterMeta;
  advisers: RegisterAdviser[];
}

const data = registerData as RegisterFile;

export function registerMeta(): RegisterMeta {
  return data.meta;
}

export function allRegisterAdvisers(): RegisterAdviser[] {
  return data.advisers;
}

let slugIndex: Map<string, RegisterAdviser> | null = null;

export function adviserBySlug(slug: string): RegisterAdviser | null {
  if (!slugIndex) {
    slugIndex = new Map(data.advisers.map((a) => [a.slug, a]));
  }
  return slugIndex.get(slug) ?? null;
}

/** Other current advisers authorised under the same licensee. */
export function colleaguesOf(adviser: RegisterAdviser, limit = 6): RegisterAdviser[] {
  if (!adviser.licenseeName) return [];
  const out: RegisterAdviser[] = [];
  for (const a of data.advisers) {
    if (a.number === adviser.number) continue;
    if (a.licenseeName === adviser.licenseeName) {
      out.push(a);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export interface RegisterSearchResult {
  adviser: RegisterAdviser;
  /** Lower is better — used for ordering only. */
  rank: number;
}

export const REGISTER_SEARCH_MIN_QUERY = 2;
export const REGISTER_SEARCH_MAX_RESULTS = 20;

/**
 * Case-insensitive substring search over adviser name, number, and
 * licensee. Name prefix beats name substring beats licensee match —
 * simple, deterministic, and fast enough at register scale (~15k rows,
 * single linear pass).
 */
export function searchRegister(query: string): RegisterSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < REGISTER_SEARCH_MIN_QUERY) return [];
  const results: RegisterSearchResult[] = [];
  for (const adviser of data.advisers) {
    const name = adviser.name.toLowerCase();
    let rank: number | null = null;
    if (name.startsWith(q)) rank = 0;
    else if (name.includes(q)) rank = 1;
    else if (adviser.number === q) rank = 0;
    else if (adviser.licenseeName.toLowerCase().includes(q)) rank = 2;
    if (rank !== null) results.push({ adviser, rank });
  }
  results.sort((a, b) => a.rank - b.rank || a.adviser.name.localeCompare(b.adviser.name));
  return results.slice(0, REGISTER_SEARCH_MAX_RESULTS);
}

/** Licensees by current-adviser headcount, for the hub's browse module. */
export function topLicensees(limit = 12): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const a of data.advisers) {
    if (!a.licenseeName) continue;
    counts.set(a.licenseeName, (counts.get(a.licenseeName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}
