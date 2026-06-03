/**
 * Runs once after all bot workers finish. Aggregates every session's shard into
 * one deduplicated finding set and writes the run report (HTML + JSON).
 *
 * Lives in a separate process from the workers, so it relies on the run id/dir
 * pinned into the environment by playwright.config.ts (see config.ts).
 */

import { loadConfig } from "./config";
import { aggregateShards, writeReport, type RunMeta } from "./findings/report";

export default async function globalTeardown(): Promise<void> {
  const config = loadConfig();
  const { findings, sessions, personas, cost } = await aggregateShards(config.runDir);

  const meta: RunMeta = {
    runId: config.runId,
    baseUrl: config.baseUrl,
    targetClass: config.targetClass,
    startedAt: process.env.BOTS_STARTED_AT ?? new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    sessions,
    personas,
    cost: cost.calls > 0 ? cost : undefined,
  };

  const { htmlPath, jsonPath } = await writeReport(config.runDir, findings, meta);

  console.log(
    `\n[bots] ${findings.length} distinct finding(s) across ${sessions} session(s).` +
      `\n[bots] report: ${htmlPath}` +
      `\n[bots] json:   ${jsonPath}\n`,
  );
}
