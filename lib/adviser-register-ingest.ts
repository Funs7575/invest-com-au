/**
 * Pure parsing/normalisation for the ASIC Financial Advisers Register
 * extract. Kept separate from scripts/ingest-far.ts (the network runner)
 * so the CSV handling is unit-testable without I/O.
 *
 * The extract's column headers have shifted over the years, so every
 * field is resolved through an alias list and the parser fails loudly —
 * naming the headers it DID find — when a required column is missing.
 */

import type { RegisterAdviser } from "@/lib/adviser-register";

/** Minimal RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
  }
  return rows;
}

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["ADV_NAME", "ADVISER NAME", "ADVISER_NAME", "NAME"],
  number: ["ADV_NUMBER", "ADVISER NUMBER", "ADVISER_NUMBER", "REP NUMBER"],
  role: ["ADV_ROLE", "ROLE", "ADVISER ROLE"],
  subType: ["ADV_SUB_TYPE", "SUB TYPE", "SUB_TYPE", "ADVISER SUB TYPE"],
  status: ["ROLE_STATUS", "STATUS", "ADV_ROLE_STATUS", "CURRENT"],
  licenseeName: ["LICENCE_NAME", "LICENSEE", "LICENCE NAME", "AFS LICENSEE", "LICENCE_HOLDER_NAME"],
  licenseeNumber: ["LICENCE_NUMBER", "LICENCE NUMBER", "AFSL", "AFS LICENCE NUMBER"],
  firstAdvice: ["ADV_FIRST_PROVIDED_ADVICE", "FIRST PROVIDED ADVICE", "FIRST_PROVIDED_ADVICE"],
  qualifications: ["QUALIFICATIONS_AND_TRAINING", "QUALIFICATIONS", "QUALIFICATIONS AND TRAINING"],
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

export function slugifyAdviser(name: string, number: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // The adviser number suffix makes every slug unique by construction —
  // the register has plenty of same-name advisers.
  return `${base || "adviser"}-${number}`;
}

function titleCaseName(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (!lower) return raw.trim();
  return lower
    .split(/\s+/)
    .map((w) =>
      w
        .split("-")
        .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
        .join("-"),
    )
    .join(" ")
    // Common particles ASIC stores upper-case: O'Brien, McDonald stay rough
    // but readable; full fidelity isn't worth a heuristics arms race.
    .replace(/\b([A-Z])'([a-z])/g, (_m, a: string, b: string) => `${a}'${b.toUpperCase()}`);
}

export interface FarParseResult {
  advisers: RegisterAdviser[];
  skipped: { ceased: number; missingFields: number };
  headersFound: string[];
}

/**
 * Normalise a raw FAR CSV into the registry shape: current advisers only,
 * collision-proof slugs, title-cased names, deduped by adviser number.
 * Throws with the discovered headers when required columns are missing.
 */
export function parseFarCsv(csvText: string): FarParseResult {
  const rows = parseCsv(csvText);
  const header = rows[0];
  if (!header || rows.length < 2) {
    throw new Error("FAR CSV appears empty — got no data rows");
  }
  const map = buildHeaderMap(header);
  for (const required of ["name", "number", "licenseeName"]) {
    if (!map.has(required)) {
      throw new Error(
        `FAR CSV is missing a recognisable "${required}" column. Headers found: ${header.join(", ")}`,
      );
    }
  }

  const get = (row: string[], field: string): string => {
    const idx = map.get(field);
    return idx === undefined ? "" : (row[idx] ?? "").trim();
  };

  const byNumber = new Map<string, RegisterAdviser>();
  let ceased = 0;
  let missingFields = 0;

  for (const row of rows.slice(1)) {
    const status = get(row, "status").toLowerCase();
    if (status && status !== "current") {
      ceased++;
      continue;
    }
    const name = titleCaseName(get(row, "name"));
    const number = get(row, "number").replace(/\D/g, "");
    const licenseeName = titleCaseName(get(row, "licenseeName"));
    if (!name || !number || !licenseeName) {
      missingFields++;
      continue;
    }
    const firstAdviceRaw = get(row, "firstAdvice");
    const yearMatch = firstAdviceRaw.match(/(19|20)\d{2}/);
    const qualsRaw = get(row, "qualifications");
    const adviser: RegisterAdviser = {
      number,
      name,
      slug: slugifyAdviser(name, number),
      role: get(row, "role") || "Financial Adviser",
      ...(get(row, "subType") ? { subType: get(row, "subType") } : {}),
      licenseeName,
      ...(get(row, "licenseeNumber").replace(/\D/g, "")
        ? { licenseeNumber: get(row, "licenseeNumber").replace(/\D/g, "") }
        : {}),
      ...(yearMatch ? { firstAdviceYear: parseInt(yearMatch[0], 10) } : {}),
      ...(qualsRaw
        ? {
            qualifications: qualsRaw
              .split(/;|\|/)
              .map((q) => q.trim())
              .filter(Boolean)
              .slice(0, 8),
          }
        : {}),
    };
    byNumber.set(number, adviser);
  }

  const advisers = [...byNumber.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { advisers, skipped: { ceased, missingFields }, headersFound: header };
}
