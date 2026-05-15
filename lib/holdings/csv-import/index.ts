/**
 * Registry of broker CSV parsers.
 *
 * Adding a new broker is intentionally a one-file addition: write a new
 * parser module under `lib/holdings/csv-import/<broker>.ts` exporting a
 * `BrokerCsvParser`, then register its slug here. The UI dropdown and
 * the API route both pull from this registry, so no other call site
 * needs to change.
 *
 * Slugs match `brokers.slug` so we can FK-soft-link from
 * `investor_holdings.broker_slug` back to a known broker in the DB.
 */
import { parseCommSecCsv } from "./commsec";
import { parseIbkrCsv } from "./ibkr";
import { parseNabTradeCsv } from "./nabtrade";
import { parseSelfWealthCsv } from "./selfwealth";
import { parseStakeCsv } from "./stake";
import type { BrokerCsvParser } from "./types";

export const SUPPORTED_BROKER_SLUGS = [
  "commsec",
  "stake",
  "selfwealth",
  "nabtrade",
  "ibkr",
] as const;
export type SupportedBrokerSlug = (typeof SUPPORTED_BROKER_SLUGS)[number];

export const CSV_IMPORT_PARSERS: Readonly<Record<SupportedBrokerSlug, BrokerCsvParser>> = {
  commsec: parseCommSecCsv,
  stake: parseStakeCsv,
  selfwealth: parseSelfWealthCsv,
  nabtrade: parseNabTradeCsv,
  ibkr: parseIbkrCsv,
};

export function getCsvImportParser(slug: SupportedBrokerSlug): BrokerCsvParser {
  return CSV_IMPORT_PARSERS[slug];
}

export type { BrokerCsvParser, CsvParseError, CsvParseResult, ParsedHoldingRow } from "./types";
