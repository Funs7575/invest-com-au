/**
 * Pure parsing/normalisation for APRA's annual fund-level superannuation
 * statistics. Mirrors lib/adviser-register-ingest.ts: alias-driven header
 * resolution, loud failure naming the headers found, unit-testable
 * without I/O. The CSV parser is shared from the adviser-register ingest.
 *
 * APRA publishes the statistics as XLSX with a CSV export; column labels
 * shift between editions, so every field resolves through an alias list.
 * Asset figures are reported in $ millions — converted to $ billions here.
 */

import { parseCsv } from "@/lib/adviser-register-ingest";
import type { SuperFund } from "@/lib/super-funds";

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["FUND NAME", "RSE NAME", "FUND_NAME", "NAME"],
  abn: ["ABN", "FUND ABN", "RSE ABN", "FUND_ABN"],
  fundType: ["FUND TYPE", "RSE TYPE", "FUND_TYPE", "TYPE OF FUND"],
  trustee: ["RSE LICENSEE NAME", "RSE LICENSEE", "TRUSTEE", "LICENSEE NAME", "RSE_LICENSEE_NAME"],
  totalAssets: ["TOTAL ASSETS ($M)", "TOTAL ASSETS $M", "TOTAL ASSETS", "NET ASSETS ($M)", "NET ASSETS"],
  memberAccounts: ["NUMBER OF MEMBER ACCOUNTS", "TOTAL MEMBER ACCOUNTS", "MEMBER ACCOUNTS", "NUMBER OF MEMBERS"],
  ror1yr: ["ROR 1 YEAR (%)", "ONE YEAR ROR (%)", "1 YEAR ROR", "RATE OF RETURN 1 YEAR", "ROR 1YR"],
  ror5yr: ["ROR 5 YEARS (% P.A.)", "FIVE YEAR ROR (%)", "5 YEAR ROR", "RATE OF RETURN 5 YEARS", "ROR 5YR"],
  ror10yr: ["ROR 10 YEARS (% P.A.)", "TEN YEAR ROR (%)", "10 YEAR ROR", "RATE OF RETURN 10 YEARS", "ROR 10YR"],
  expenseRatio: ["OPERATING EXPENSE RATIO (%)", "TOTAL EXPENSE RATIO (%)", "EXPENSE RATIO", "OPERATING EXPENSE RATIO"],
};

function buildHeaderMap(headers: string[]): Map<string, number> {
  const canon = headers.map((h) => h.trim().toUpperCase().replace(/^﻿/, ""));
  const map = new Map<string, number>();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const idx = canon.indexOf(alias);
      if (idx >= 0) {
        map.set(field, idx);
        break;
      }
    }
  }
  return map;
}

export function slugifyFund(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "fund"
  );
}

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[,$%\s]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "*" || cleaned.toLowerCase() === "na" || cleaned.toLowerCase() === "n/a") {
    return undefined;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export interface ApraParseResult {
  funds: SuperFund[];
  skipped: { aggregates: number; missingFields: number };
  headersFound: string[];
}

/**
 * Normalise an APRA fund-level CSV into the explorer shape: real funds
 * only (aggregate "Total" rows skipped), deduped by ABN, slug collisions
 * resolved with an ABN suffix. Throws naming the headers found when the
 * required columns are missing.
 */
export function parseApraCsv(csvText: string): ApraParseResult {
  const rows = parseCsv(csvText);
  const header = rows[0];
  if (!header || rows.length < 2) {
    throw new Error("APRA CSV appears empty — got no data rows");
  }
  const map = buildHeaderMap(header);
  for (const required of ["name", "abn", "fundType"]) {
    if (!map.has(required)) {
      throw new Error(
        `APRA CSV is missing a recognisable "${required}" column. Headers found: ${header.join(", ")}`,
      );
    }
  }

  const get = (row: string[], field: string): string => {
    const idx = map.get(field);
    return idx === undefined ? "" : (row[idx] ?? "").trim();
  };

  const byAbn = new Map<string, SuperFund>();
  let aggregates = 0;
  let missingFields = 0;

  for (const row of rows.slice(1)) {
    const name = get(row, "name");
    const abn = get(row, "abn").replace(/\D/g, "");
    if (/^(total|all funds|industry total)/i.test(name)) {
      aggregates++;
      continue;
    }
    if (!name || !abn) {
      missingFields++;
      continue;
    }
    const assetsRaw = parseNumber(get(row, "totalAssets"));
    const fund: SuperFund = {
      abn,
      name,
      slug: slugifyFund(name),
      fundType: get(row, "fundType") || "Other",
      ...(get(row, "trustee") ? { trustee: get(row, "trustee") } : {}),
      // APRA reports assets in $ millions; the explorer displays $ billions.
      ...(assetsRaw !== undefined ? { totalAssetsBn: Math.round((assetsRaw / 1000) * 10) / 10 } : {}),
      ...(parseNumber(get(row, "memberAccounts")) !== undefined
        ? { memberAccounts: parseNumber(get(row, "memberAccounts")) }
        : {}),
      ...(parseNumber(get(row, "ror1yr")) !== undefined ? { ror1yr: parseNumber(get(row, "ror1yr")) } : {}),
      ...(parseNumber(get(row, "ror5yr")) !== undefined ? { ror5yr: parseNumber(get(row, "ror5yr")) } : {}),
      ...(parseNumber(get(row, "ror10yr")) !== undefined ? { ror10yr: parseNumber(get(row, "ror10yr")) } : {}),
      ...(parseNumber(get(row, "expenseRatio")) !== undefined
        ? { expenseRatioPct: parseNumber(get(row, "expenseRatio")) }
        : {}),
    };
    byAbn.set(abn, fund);
  }

  const funds = [...byAbn.values()].sort((a, b) => a.name.localeCompare(b.name));

  // Slug collisions (different ABNs, same normalised name) get an ABN suffix.
  const slugCounts = new Map<string, number>();
  for (const f of funds) slugCounts.set(f.slug, (slugCounts.get(f.slug) ?? 0) + 1);
  for (const f of funds) {
    if ((slugCounts.get(f.slug) ?? 0) > 1) f.slug = `${f.slug}-${f.abn.slice(-4)}`;
  }

  return { funds, skipped: { aggregates, missingFields }, headersFound: header };
}
