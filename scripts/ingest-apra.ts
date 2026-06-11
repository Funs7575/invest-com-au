/**
 * Ingest APRA's annual fund-level superannuation statistics into
 * data/super-funds.json (the file the Super Fund Performance Explorer
 * serves from — see lib/super-funds.ts).
 *
 * Usage:
 *   npx tsx scripts/ingest-apra.ts --file <export.csv> --period "year ended 30 June 2025"
 *   npx tsx scripts/ingest-apra.ts --url <csv-url> --period "..."
 *   npm run data:apra -- --file <export.csv> --period "..."
 *
 * Source: APRA publishes the statistics at
 * apra.gov.au/annual-fund-level-superannuation-statistics as XLSX with a
 * CSV back-series. Export the fund-level profile sheet to CSV (or point
 * --url at the CSV resource) — the parser is alias-driven and fails
 * loudly when it can't recognise the columns, so a moved or reshaped
 * source can never corrupt the dataset. `--period` is required: every
 * page displays the reporting period and stale-labelling depends on it.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseApraCsv } from "../lib/super-funds-ingest";

const OUT_PATH = "data/super-funds.json";

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const period = flag("period") ?? process.env.APRA_PERIOD;
  if (!period) {
    throw new Error('Missing --period (e.g. --period "year ended 30 June 2025") — pages display it and it must be accurate.');
  }

  let csvText: string;
  let source: string;
  const file = flag("file");
  const url = flag("url") ?? process.env.APRA_CSV_URL;

  if (file) {
    source = file;
    csvText = readFileSync(file, "utf8");
  } else if (url) {
    source = url;
    console.log(`Downloading APRA fund-level statistics from ${url} …`);
    const res = await fetch(url, { headers: { "user-agent": "invest-com-au super-funds ingest" } });
    if (!res.ok) {
      throw new Error(`Download failed: HTTP ${res.status}. Export the fund-level CSV from apra.gov.au and use --file instead.`);
    }
    csvText = await res.text();
    if (csvText.trimStart().startsWith("<")) {
      throw new Error("Got HTML instead of CSV — the resource URL has moved. Use --file with a local CSV export.");
    }
  } else {
    throw new Error("Pass --file <export.csv> or --url <csv-url>.");
  }

  const { funds, skipped, headersFound } = parseApraCsv(csvText);
  if (funds.length < 50) {
    console.warn(`⚠ Only ${funds.length} funds parsed — APRA covers 100+ funds; verify the source sheet before shipping.`);
  }

  const payload = {
    meta: {
      extractedAt: new Date().toISOString().slice(0, 10),
      source,
      period,
      sample: false,
      count: funds.length,
    },
    funds,
  };

  writeFileSync(OUT_PATH, JSON.stringify(payload));
  console.log(
    `Wrote ${OUT_PATH}: ${funds.length} funds for ${period} ` +
      `(skipped ${skipped.aggregates} aggregate rows, ${skipped.missingFields} incomplete). ` +
      `Headers: ${headersFound.slice(0, 6).join(", ")}…`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
