/**
 * Ingest the ATO postcode-level taxation statistics into
 * data/postcode-atlas.json (see lib/postcode-atlas.ts).
 *
 * Usage:
 *   npx tsx scripts/ingest-ato-postcodes.ts --file <table6b.csv> --income-year "2023–24"
 *   npm run data:postcodes -- --file <table6b.csv> --income-year "2023–24"
 *
 * Source: the ATO publishes "Taxation statistics — individuals" postcode
 * tables annually via data.gov.au (CSV). The parser is alias-driven and
 * fails loudly on unrecognised columns. `--income-year` is required —
 * every page displays it. The national median for comparison lines is
 * computed from the extract itself (median of postcode medians weighted
 * is overkill; we use the simple median and label it as such).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parsePostcodeCsv } from "../lib/postcode-atlas-ingest";

const OUT_PATH = "data/postcode-atlas.json";

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const incomeYear = flag("income-year") ?? process.env.ATO_INCOME_YEAR;
  if (!incomeYear) {
    throw new Error('Missing --income-year (e.g. --income-year "2023–24") — pages display it.');
  }

  let csvText: string;
  let source: string;
  const file = flag("file");
  const url = flag("url") ?? process.env.ATO_POSTCODE_CSV_URL;

  if (file) {
    source = file;
    csvText = readFileSync(file, "utf8");
  } else if (url) {
    source = url;
    console.log(`Downloading ATO postcode statistics from ${url} …`);
    const res = await fetch(url, { headers: { "user-agent": "invest-com-au postcode-atlas ingest" } });
    if (!res.ok) {
      throw new Error(`Download failed: HTTP ${res.status}. Download the CSV from data.gov.au and use --file instead.`);
    }
    csvText = await res.text();
    if (csvText.trimStart().startsWith("<")) {
      throw new Error("Got HTML instead of CSV — use --file with a local download.");
    }
  } else {
    throw new Error("Pass --file <table.csv> or --url <csv-url>.");
  }

  const { postcodes, skipped, headersFound } = parsePostcodeCsv(csvText);
  if (postcodes.length < 1500) {
    console.warn(`⚠ Only ${postcodes.length} postcodes parsed — Australia has ~2,600 with ATO stats; verify the source table.`);
  }

  const medians = postcodes
    .map((p) => p.medianTaxableIncome)
    .filter((v): v is number => v !== undefined)
    .sort((a, b) => a - b);
  const nationalMedian = medians.length > 0 ? medians[Math.floor(medians.length / 2)] : undefined;

  const payload = {
    meta: {
      extractedAt: new Date().toISOString().slice(0, 10),
      source,
      incomeYear,
      sample: false,
      count: postcodes.length,
      ...(nationalMedian !== undefined ? { nationalMedianTaxableIncome: nationalMedian } : {}),
    },
    postcodes,
  };

  writeFileSync(OUT_PATH, JSON.stringify(payload));
  console.log(
    `Wrote ${OUT_PATH}: ${postcodes.length} postcodes for ${incomeYear} ` +
      `(skipped ${skipped.badPostcode} bad postcodes, ${skipped.noStats} stat-less). ` +
      `Headers: ${headersFound.slice(0, 6).join(", ")}…`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
