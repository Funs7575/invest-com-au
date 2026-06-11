/**
 * Super Fund Performance Explorer — typed access to the APRA fund-level
 * statistics extract at data/super-funds.json.
 *
 * Same file-backed pattern as lib/adviser-register.ts (mega-session #1):
 * a few hundred records load once per server instance, no schema change,
 * refresh ships as a reviewable PR diff via `npm run data:apra`.
 *
 * While `meta.sample` is true the dataset is a synthetic preview: pages
 * must render the preview banner and emit `noindex` so placeholder funds
 * can never be indexed or mistaken for APRA-reported data.
 */

import fundsData from "@/data/super-funds.json";

export interface SuperFund {
  /** Fund ABN — the stable identity. */
  abn: string;
  name: string;
  slug: string;
  /** APRA fund type: Industry | Retail | Public Sector | Corporate. */
  fundType: string;
  /** RSE licensee (trustee). */
  trustee?: string;
  /** Total assets in $ billions. */
  totalAssetsBn?: number;
  memberAccounts?: number;
  /** Net rate of return, 1 year, % (fund-level, APRA-reported). */
  ror1yr?: number;
  /** Net rate of return, 5 years, % p.a. */
  ror5yr?: number;
  /** Net rate of return, 10 years, % p.a. */
  ror10yr?: number;
  /** Operating expense ratio, %. */
  expenseRatioPct?: number;
}

export interface SuperFundsMeta {
  extractedAt: string;
  source: string;
  /** Reporting period, e.g. "year ended 30 June 2025". */
  period: string;
  /** True while the bundled data is a synthetic preview. */
  sample: boolean;
  count: number;
}

interface SuperFundsFile {
  meta: SuperFundsMeta;
  funds: SuperFund[];
}

const data = fundsData as SuperFundsFile;

export function superFundsMeta(): SuperFundsMeta {
  return data.meta;
}

export function allSuperFunds(): SuperFund[] {
  return data.funds;
}

let slugIndex: Map<string, SuperFund> | null = null;

export function fundBySlug(slug: string): SuperFund | null {
  if (!slugIndex) {
    slugIndex = new Map(data.funds.map((f) => [f.slug, f]));
  }
  return slugIndex.get(slug) ?? null;
}

export const FUND_SEARCH_MIN_QUERY = 2;
export const FUND_SEARCH_MAX_RESULTS = 20;

/** Case-insensitive name/trustee/ABN search; name prefix ranks first. */
export function searchSuperFunds(query: string): SuperFund[] {
  const q = query.trim().toLowerCase();
  if (q.length < FUND_SEARCH_MIN_QUERY) return [];
  const ranked: { fund: SuperFund; rank: number }[] = [];
  for (const fund of data.funds) {
    const name = fund.name.toLowerCase();
    let rank: number | null = null;
    if (name.startsWith(q)) rank = 0;
    else if (name.includes(q)) rank = 1;
    else if (fund.abn.replace(/\s/g, "") === q.replace(/\s/g, "")) rank = 0;
    else if ((fund.trustee ?? "").toLowerCase().includes(q)) rank = 2;
    if (rank !== null) ranked.push({ fund, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.fund.name.localeCompare(b.fund.name));
  return ranked.slice(0, FUND_SEARCH_MAX_RESULTS).map((r) => r.fund);
}

/** Funds of the same type, ordered by closest asset size — for "similar funds". */
export function similarFunds(fund: SuperFund, limit = 5): SuperFund[] {
  const peers = data.funds.filter((f) => f.abn !== fund.abn && f.fundType === fund.fundType);
  const size = fund.totalAssetsBn ?? 0;
  return peers
    .sort((a, b) => Math.abs((a.totalAssetsBn ?? 0) - size) - Math.abs((b.totalAssetsBn ?? 0) - size))
    .slice(0, limit);
}

/** Distinct fund types with counts, largest first. */
export function fundTypeCounts(): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const f of data.funds) {
    counts.set(f.fundType, (counts.get(f.fundType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}
