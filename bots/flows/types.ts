/**
 * Flow + step types for deterministic scripted bot journeys.
 *
 * A Flow is an ordered list of Steps. Each step receives a context bundle
 * (page, finding store, persona name, run config) and either completes or
 * throws. The runner catches throws and records them as flow-regression
 * findings rather than crashing the whole test — partial failures are still
 * useful signal.
 */

import type { Page } from "@playwright/test";
import type { FindingStore } from "../findings/store";
import type { BotConfig } from "../config";

export interface FlowStepContext {
  page: Page;
  store: FindingStore;
  persona: string;
  config: BotConfig;
}

export interface FlowStepResult {
  name: string;
  status: "pass" | "fail" | "skip";
  detail?: string;
}

export interface FlowStep {
  name: string;
  run: (ctx: FlowStepContext) => Promise<void>;
}

export interface Flow {
  name: string;
  description: string;
  steps: FlowStep[];
}
