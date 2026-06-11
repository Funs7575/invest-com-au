/**
 * Pure parsing/normalisation for the ATO postcode-level taxation
 * statistics ("Taxation statistics — individuals, table 6B" family).
 * Mirrors the other ingest libs: alias-driven headers, loud failure,
 * no I/O, shared CSV parser.
 */

import { parseCsv } from "@/lib/adviser-register-ingest";
import type { PostcodeRecord } from "@/lib/postcode-atlas";

const FIELD_ALIASES: Record<string, string[]> = {
  postcode: ["POSTCODE", "POST CODE", "POA", "POSTAL AREA"],
  state: ["STATE", "STATE/TERRITORY", "STATE OR TERRITORY", "ST"],
  suburbs: ["SUBURB", "SUBURBS", "LOCALITY", "LOCALITIES", "SUBURB/LOCALITY"],
  individuals: ["NUMBER OF INDIVIDUALS", "INDIVIDUALS", "INDIVIDUALS NO.", "COUNT OF INDIVIDUALS"],
  medianIncome: ["MEDIAN TAXABLE INCOME", "MEDIAN TAXABLE INCOME OR LOSS", "TAXABLE INCOME MEDIAN"],
  meanIncome: ["AVERAGE TAXABLE INCOME", "MEAN TAXABLE INCOME", "AVERAGE TAXABLE INCOME OR LOSS"],
  medianSuper: ["MEDIAN SUPER CONTRIBUTIONS", "MEDIAN EMPLOYER SUPER CONTRIBUTIONS", "SUPER CONTRIBUTIONS MEDIAN"],
};

const VALID_STATES = new Set(["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]);

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

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[,$\s]/g, "");
  if (!cleaned || cleaned === "-" || cleaned.toLowerCase() === "np" || cleaned.toLowerCase() === "na") {
    return undefined;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/** Postcode → state inference from the standard AU numbering ranges. */
export function stateForPostcode(postcode: string): string | null {
  const n = parseInt(postcode, 10);
  if (Number.isNaN(n)) return null;
  if ((n >= 1000 && n <= 2599) || (n >= 2619 && n <= 2899) || (n >= 2921 && n <= 2999)) return "NSW";
  if ((n >= 200 && n <= 299) || (n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920)) return "ACT";
  if ((n >= 3000 && n <= 3999) || (n >= 8000 && n <= 8999)) return "VIC";
  if ((n >= 4000 && n <= 4999) || (n >= 9000 && n <= 9799)) return "QLD";
  if (n >= 5000 && n <= 5999) return "SA";
  if (n >= 6000 && n <= 6999) return "WA";
  if (n >= 7000 && n <= 7999) return "TAS";
  if (n >= 800 && n <= 999) return "NT";
  return null;
}

export interface PostcodeParseResult {
  postcodes: PostcodeRecord[];
  skipped: { badPostcode: number; noStats: number };
  headersFound: string[];
}

/**
 * Normalise an ATO postcode CSV. Suburbs accumulate across rows for the
 * same postcode (the ATO file repeats the postcode per locality); state
 * comes from the file when present, else from the numbering ranges.
 */
export function parsePostcodeCsv(csvText: string): PostcodeParseResult {
  const rows = parseCsv(csvText);
  const header = rows[0];
  if (!header || rows.length < 2) {
    throw new Error("Postcode CSV appears empty — got no data rows");
  }
  const map = buildHeaderMap(header);
  for (const required of ["postcode"]) {
    if (!map.has(required)) {
      throw new Error(
        `Postcode CSV is missing a recognisable "${required}" column. Headers found: ${header.join(", ")}`,
      );
    }
  }

  const get = (row: string[], field: string): string => {
    const idx = map.get(field);
    return idx === undefined ? "" : (row[idx] ?? "").trim();
  };

  const byPostcode = new Map<string, PostcodeRecord>();
  let badPostcode = 0;
  let noStats = 0;

  for (const row of rows.slice(1)) {
    const postcode = get(row, "postcode").replace(/\D/g, "").padStart(4, "0");
    if (!/^\d{4}$/.test(postcode) || postcode === "0000") {
      badPostcode++;
      continue;
    }
    const stateRaw = get(row, "state").toUpperCase();
    const state = VALID_STATES.has(stateRaw) ? stateRaw : stateForPostcode(postcode);
    if (!state) {
      badPostcode++;
      continue;
    }
    const median = parseNumber(get(row, "medianIncome"));
    const mean = parseNumber(get(row, "meanIncome"));
    const individuals = parseNumber(get(row, "individuals"));
    const superMedian = parseNumber(get(row, "medianSuper"));
    const suburb = get(row, "suburbs");

    const existing = byPostcode.get(postcode);
    if (existing) {
      if (suburb && !existing.suburbs.includes(suburb)) existing.suburbs.push(suburb);
      // Stats repeat per locality row — keep the first non-empty values.
      if (existing.medianTaxableIncome === undefined && median !== undefined) existing.medianTaxableIncome = median;
      if (existing.meanTaxableIncome === undefined && mean !== undefined) existing.meanTaxableIncome = mean;
      if (existing.individualsCount === undefined && individuals !== undefined) existing.individualsCount = individuals;
      if (existing.medianSuperContribution === undefined && superMedian !== undefined)
        existing.medianSuperContribution = superMedian;
      continue;
    }

    if (median === undefined && mean === undefined && individuals === undefined) {
      noStats++;
      continue;
    }

    byPostcode.set(postcode, {
      postcode,
      state,
      suburbs: suburb ? [suburb] : [],
      ...(individuals !== undefined ? { individualsCount: individuals } : {}),
      ...(median !== undefined ? { medianTaxableIncome: median } : {}),
      ...(mean !== undefined ? { meanTaxableIncome: mean } : {}),
      ...(superMedian !== undefined ? { medianSuperContribution: superMedian } : {}),
    });
  }

  const postcodes = [...byPostcode.values()].sort((a, b) => a.postcode.localeCompare(b.postcode));
  return { postcodes, skipped: { badPostcode, noStats }, headersFound: header };
}
