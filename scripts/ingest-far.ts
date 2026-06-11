/**
 * Ingest the ASIC Financial Advisers Register extract into
 * data/adviser-register.json (the file the Adviser Register Atlas
 * serves from — see lib/adviser-register.ts).
 *
 * Usage:
 *   npx tsx scripts/ingest-far.ts [--url <csv-url>] [--file <local.csv>]
 *   npm run data:far
 *
 * Source: ASIC publishes the register weekly through data.gov.au
 * (dataset "financial-advisers-register"). The resource URL moves
 * occasionally — override with --url or FAR_CSV_URL when it does. The
 * script refuses to write when the response isn't parseable CSV with
 * the expected columns, so a moved/blocked URL can never corrupt the
 * dataset. Run it anywhere with open egress (it is NOT wired into a
 * cron here — the refresh lands as a reviewable PR diff).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseFarCsv } from "../lib/adviser-register-ingest";

const DEFAULT_URL =
  process.env.FAR_CSV_URL ??
  "https://data.gov.au/data/dataset/financial-advisers-register/resource/download/financial_advisers_register.csv";

const OUT_PATH = "data/adviser-register.json";

async function main() {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf("--url");
  const fileIdx = args.indexOf("--file");

  let csvText: string;
  let source: string;

  if (fileIdx >= 0 && args[fileIdx + 1]) {
    source = args[fileIdx + 1]!;
    csvText = readFileSync(source, "utf8");
  } else {
    source = urlIdx >= 0 && args[urlIdx + 1] ? args[urlIdx + 1]! : DEFAULT_URL;
    console.log(`Downloading FAR extract from ${source} …`);
    const res = await fetch(source, {
      headers: { "user-agent": "invest-com-au adviser-register ingest" },
    });
    if (!res.ok) {
      throw new Error(`Download failed: HTTP ${res.status}. Pass --url with the current resource URL from the data.gov.au "financial-advisers-register" dataset page.`);
    }
    csvText = await res.text();
    if (csvText.trimStart().startsWith("<")) {
      throw new Error("Got HTML instead of CSV — the resource URL has moved. Find the CSV resource on data.gov.au and pass it via --url.");
    }
  }

  const { advisers, skipped, headersFound } = parseFarCsv(csvText);
  if (advisers.length < 1000 && !source.endsWith(".csv") === false) {
    console.warn(`⚠ Only ${advisers.length} current advisers parsed — verify the source covers the full register before shipping.`);
  }

  const payload = {
    meta: {
      extractedAt: new Date().toISOString().slice(0, 10),
      source,
      sample: false,
      count: advisers.length,
    },
    advisers,
  };

  writeFileSync(OUT_PATH, JSON.stringify(payload));
  console.log(
    `Wrote ${OUT_PATH}: ${advisers.length} current advisers ` +
      `(skipped ${skipped.ceased} ceased, ${skipped.missingFields} incomplete). ` +
      `Headers: ${headersFound.slice(0, 6).join(", ")}…`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
