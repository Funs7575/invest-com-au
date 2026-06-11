/**
 * Pure parsing/normalisation for the ASX removed-companies list. Mirrors
 * the other ingest libs: alias-driven headers, loud failure, no I/O.
 *
 * Event classification is heuristic over the exchange's free-text reason
 * column — conservative buckets, defaulting to plain "delisted" when the
 * wording doesn't clearly match anything stronger.
 */

import { parseCsv } from "@/lib/adviser-register-ingest";
import type { GhostEvent, GhostTicker } from "@/lib/ghost-tickers";

const FIELD_ALIASES: Record<string, string[]> = {
  code: ["ASX CODE", "CODE", "TICKER", "SECURITY CODE"],
  name: ["COMPANY NAME", "COMPANY", "ENTITY NAME", "NAME"],
  date: ["REMOVAL DATE", "DATE REMOVED", "EFFECTIVE DATE", "DATE", "DELISTED DATE"],
  reason: ["REASON FOR REMOVAL", "REASON", "REMOVAL REASON", "COMMENTS"],
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

export function classifyGhostEvent(reason: string): GhostEvent {
  const r = reason.toLowerCase();
  if (/(acquir|takeover|compulsor)/.test(r)) return "acquired";
  if (/(scheme of arrangement|merg)/.test(r)) return "merged";
  if (/(name change|renamed|change of name)/.test(r)) return "renamed";
  if (/(liquidat|receiver|administrat|wound up|deregister|failed)/.test(r)) return "failed";
  return "delisted";
}

/** "ACME LTD (RENAMED TO NEWCO LIMITED (NEW))" → successor extraction. */
export function extractSuccessor(reason: string): { code?: string; name?: string } {
  const m = reason.match(/(?:renamed to|now known as|became)\s+(.+?)\s*\(([A-Z0-9]{2,5})\)/i);
  if (m && m[1] && m[2]) return { name: m[1].trim(), code: m[2].toUpperCase() };
  return {};
}

export function slugifyGhost(code: string, name: string): string {
  const nameSlug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 5)
    .join("-");
  return `${code.toLowerCase()}-${nameSlug || "company"}`;
}

/** Accepts ISO, dd/mm/yyyy, or "d Month yyyy"; returns ISO or null. */
export function parseAuDate(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const dmy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  }
  const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const verbose = t.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (verbose) {
    const mi = MONTHS.findIndex((m) => m.startsWith(verbose[2]!.slice(0, 3)));
    if (mi >= 0) return `${verbose[3]}-${String(mi + 1).padStart(2, "0")}-${verbose[1]!.padStart(2, "0")}`;
  }
  return null;
}

export interface GhostParseResult {
  tickers: GhostTicker[];
  skipped: { missingFields: number; badDates: number };
  headersFound: string[];
}

/**
 * Normalise a removed-companies CSV. ASX codes get reused across decades,
 * so identity is code+date; slug collisions get a year suffix.
 */
export function parseGhostCsv(csvText: string): GhostParseResult {
  const rows = parseCsv(csvText);
  const header = rows[0];
  if (!header || rows.length < 2) {
    throw new Error("Removed-companies CSV appears empty — got no data rows");
  }
  const map = buildHeaderMap(header);
  for (const required of ["code", "name", "date"]) {
    if (!map.has(required)) {
      throw new Error(
        `Removed-companies CSV is missing a recognisable "${required}" column. Headers found: ${header.join(", ")}`,
      );
    }
  }

  const get = (row: string[], field: string): string => {
    const idx = map.get(field);
    return idx === undefined ? "" : (row[idx] ?? "").trim();
  };

  const byKey = new Map<string, GhostTicker>();
  let missingFields = 0;
  let badDates = 0;

  for (const row of rows.slice(1)) {
    const code = get(row, "code").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const name = get(row, "name");
    if (!code || !name) {
      missingFields++;
      continue;
    }
    const eventDate = parseAuDate(get(row, "date"));
    if (!eventDate) {
      badDates++;
      continue;
    }
    const reason = get(row, "reason");
    const successor = reason ? extractSuccessor(reason) : {};
    const ticker: GhostTicker = {
      code,
      name,
      slug: slugifyGhost(code, name),
      event: reason ? classifyGhostEvent(reason) : "delisted",
      eventDate,
      ...(reason ? { detail: reason } : {}),
      ...(successor.code ? { successorCode: successor.code } : {}),
      ...(successor.name ? { successorName: successor.name } : {}),
    };
    byKey.set(`${code}:${eventDate}`, ticker);
  }

  const tickers = [...byKey.values()].sort(
    (a, b) => b.eventDate.localeCompare(a.eventDate) || a.code.localeCompare(b.code),
  );

  const slugCounts = new Map<string, number>();
  for (const t of tickers) slugCounts.set(t.slug, (slugCounts.get(t.slug) ?? 0) + 1);
  for (const t of tickers) {
    if ((slugCounts.get(t.slug) ?? 0) > 1) t.slug = `${t.slug}-${t.eventDate.slice(0, 4)}`;
  }

  return { tickers, skipped: { missingFields, badDates }, headersFound: header };
}
