/**
 * Flow runner — executes each step in order, recording failures as findings
 * rather than crashing so partial runs still produce useful signal.
 */

import type { Page } from "@playwright/test";
import type { BotConfig } from "../config";
import type { FindingStore } from "../findings/store";
import type { Flow, FlowStepResult } from "./types";

export async function runFlow(
  flow: Flow,
  page: Page,
  store: FindingStore,
  persona: string,
  config: BotConfig,
): Promise<FlowStepResult[]> {
  const results: FlowStepResult[] = [];

  for (const step of flow.steps) {
    try {
      await step.run({ page, store, persona, config });
      results.push({ name: step.name, status: "pass" });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      store.add({
        severity: "high",
        category: "flow-failure",
        title: `[${flow.name}] step failed: ${step.name}`,
        detail,
        url: page.url(),
        persona,
        signatureKey: `flow:${flow.name}:${step.name}`,
      });
      results.push({ name: step.name, status: "fail", detail });
      // Continue to the next step — a broken earlier step gives us more
      // coverage than bailing out, and later steps may still pass.
    }
  }

  return results;
}

/**
 * Record a single roll-up finding summarising a flow's pass/fail/skip ratio,
 * so the report shows one line per flow run. Extracted so every flow's
 * entrypoint records its summary identically (the `label` keys the signature,
 * conventionally the flow's name).
 */
export function recordFlowRollup(
  store: FindingStore,
  persona: string,
  label: string,
  results: FlowStepResult[],
  url: string,
): void {
  const failed = results.filter((r) => r.status === "fail");
  const skipped = results.filter((r) => r.status === "skip");
  store.add({
    severity: failed.length > 0 ? "high" : "info",
    category: "flow-failure",
    title: `${label} flow: ${results.length - failed.length - skipped.length}/${results.length} steps passed`,
    detail: results
      .map(
        (r) =>
          `${r.status === "pass" ? "✓" : r.status === "skip" ? "⊘" : "✗"} ${r.name}${r.detail ? `: ${r.detail}` : ""}`,
      )
      .join("\n"),
    url,
    persona,
    signatureKey: `${label}:rollup:${persona}`,
  });
}
