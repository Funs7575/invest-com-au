/**
 * Ingest the ASX removed-companies list into data/ghost-tickers.json
 * (the file the Ghost Tickers pages serve from — see lib/ghost-tickers.ts).
 *
 * Usage:
 *   npx tsx scripts/ingest-asx-removed.ts --file <removed.csv>
 *   npx tsx scripts/ingest-asx-removed.ts --url <csv-url>
 *   npm run data:asx-removed -- --file <removed.csv>
 *
 * Source: the ASX publishes removed/delisted companies on asx.com.au
 * (paginated tables; export or scrape to CSV with columns like
 * "ASX code, Company name, Removal date, Reason for removal"). The
 * parser is alias-driven and fails loudly on unrecognised columns, so a
 * reshaped export can never corrupt the dataset.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseGhostCsv } from "../lib/ghost-tickers-ingest";

const OUT_PATH = "data/ghost-tickers.json";

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };

  let csvText: string;
  let source: string;
  const file = flag("file");
  const url = flag("url") ?? process.env.ASX_REMOVED_CSV_URL;

  if (file) {
    source = file;
    csvText = readFileSync(file, "utf8");
  } else if (url) {
    source = url;
    console.log(`Downloading removed-companies list from ${url} …`);
    const res = await fetch(url, { headers: { "user-agent": "invest-com-au ghost-tickers ingest" } });
    if (!res.ok) {
      throw new Error(`Download failed: HTTP ${res.status}. Export the list from asx.com.au and use --file instead.`);
    }
    csvText = await res.text();
    if (csvText.trimStart().startsWith("<")) {
      throw new Error("Got HTML instead of CSV — use --file with a local export.");
    }
  } else {
    throw new Error("Pass --file <removed.csv> or --url <csv-url>.");
  }

  const { tickers, skipped, headersFound } = parseGhostCsv(csvText);
  if (tickers.length < 200) {
    console.warn(`⚠ Only ${tickers.length} removals parsed — decades of ASX history run to thousands; verify the export covers the full period you want.`);
  }

  const payload = {
    meta: {
      extractedAt: new Date().toISOString().slice(0, 10),
      source,
      sample: false,
      count: tickers.length,
    },
    tickers,
  };

  writeFileSync(OUT_PATH, JSON.stringify(payload));
  console.log(
    `Wrote ${OUT_PATH}: ${tickers.length} removed companies ` +
      `(skipped ${skipped.missingFields} incomplete, ${skipped.badDates} bad dates). ` +
      `Headers: ${headersFound.join(", ")}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
