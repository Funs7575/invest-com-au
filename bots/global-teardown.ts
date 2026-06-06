/**
 * Runs once after all bot workers finish. Aggregates every session's shard into
 * one deduplicated finding set and writes the run report (HTML + JSON).
 *
 * Lives in a separate process from the workers, so it relies on the run id/dir
 * pinned into the environment by playwright.config.ts (see config.ts).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { loadConfig } from "./config";
import { aggregateShards, writeReport, type RunMeta } from "./findings/report";
import { evaluatePerfBudgets } from "./checks/perf";

export default async function globalTeardown(): Promise<void> {
  const config = loadConfig();
  const { findings, sessions, personas, cost, perf } = await aggregateShards(config.runDir);

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

  const { htmlPath, jsonPath, perfPath } = await writeReport(config.runDir, findings, meta, perf);

  // Evaluate perf budgets and write violations file so CI can gate on it.
  const violations = perf.length > 0 ? evaluatePerfBudgets(perf) : [];
  const violationsPath = path.join(config.runDir, "perf-violations.json");
  await fs.writeFile(violationsPath, JSON.stringify({ violations }, null, 2), "utf8");

  console.log(
    `\n[bots] ${findings.length} distinct finding(s) across ${sessions} session(s).` +
      `\n[bots] report: ${htmlPath}` +
      `\n[bots] json:   ${jsonPath}` +
      (perf.length > 0 ? `\n[bots] perf:   ${perfPath}` : "") +
      (violations.length > 0
        ? `\n[bots] ⚠️  ${violations.length} perf budget violation(s): ${violationsPath}`
        : `\n[bots] perf budgets: all clear`) +
      "\n",
  );
}
