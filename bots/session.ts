/**
 * BotSession — one simulated user. Wraps a Playwright browser context with the
 * safety net + check collectors, exposes navigation/audit helpers, and persists
 * its findings as a shard for the run-level aggregator (findings/report.ts).
 *
 * Both deterministic scripted flows and the (future) AI-driven driver build on
 * this: create a session, drive the page, persist, close.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import type { BotConfig } from "./config";
import { FindingStore } from "./findings/store";
import { installSafetyNet, type SafetyNet } from "./safety/intercept";
import { attachConsole } from "./checks/console";
import { attachNetwork } from "./checks/network";
import { runAxe } from "./checks/a11y";
import { checkInternalLinks } from "./checks/links";
import { CostLedger } from "./ai/cost";
import { PlaywrightPageDriver } from "./ai/playwright-page-driver";
import { makeAnthropicClient } from "./ai/anthropic-client";
import { runAiSession, type AiSessionResult } from "./ai/driver";
import { runFlow } from "./flows/runner";
import type { Flow, FlowStepResult } from "./flows/types";

export interface SessionOptions {
  persona: string;
  /** Storage-state file for an authenticated persona (reuses e2e auth states). */
  storageStateFile?: string;
}

export class BotSession {
  readonly store = new FindingStore();
  private readonly checkedLinks = new Set<string>();
  private net: SafetyNet | null = null;
  private ledger: CostLedger | null = null;

  private constructor(
    readonly context: BrowserContext,
    readonly page: Page,
    private readonly config: BotConfig,
    private readonly persona: string,
  ) {}

  static async create(browser: Browser, config: BotConfig, opts: SessionOptions): Promise<BotSession> {
    const context = await browser.newContext({
      ...(opts.storageStateFile ? { storageState: opts.storageStateFile } : {}),
      ...(config.ignoreHttpsErrors ? { ignoreHTTPSErrors: true } : {}),
    });
    const page = await context.newPage();
    const session = new BotSession(context, page, config, opts.persona);
    session.net = await installSafetyNet(page, config);
    attachConsole(page, session.store, opts.persona);
    attachNetwork(page, config, session.store, opts.persona);
    return session;
  }

  /** Navigate to a route (relative to baseUrl) and record load problems. */
  async visit(route: string): Promise<number> {
    const target = this.config.baseUrl.replace(/\/$/, "") + route;
    let status = 0;
    try {
      const res = await this.page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
      status = res?.status() ?? 0;
      await this.page.waitForLoadState("load", { timeout: 30_000 }).catch(() => undefined);
      await this.page.waitForTimeout(600);
    } catch (err) {
      this.store.add({
        severity: "high",
        category: "dead-end",
        title: `navigation failed: ${route}`,
        detail: `goto(${route}) threw: ${(err as Error).message}`,
        url: target,
        persona: this.persona,
        signatureKey: `nav-failed:${route}`,
      });
      return status;
    }

    if (status >= 400) {
      this.store.add({
        severity: status >= 500 ? "critical" : "high",
        category: "http-error",
        title: `${status} on ${route}`,
        detail: `Navigating to ${route} returned HTTP ${status}.`,
        url: target,
        persona: this.persona,
        signatureKey: `nav:${status}:${route}`,
      });
    }

    // Dead-end heuristic: a 2xx page that rendered almost nothing.
    const bodyText = await this.page
      .locator("main, body")
      .first()
      .innerText()
      .catch(() => "");
    if (status > 0 && status < 400 && bodyText.trim().length < 20) {
      this.store.add({
        severity: "medium",
        category: "dead-end",
        title: `empty page: ${route}`,
        detail: `Route ${route} returned ${status} but rendered ${bodyText.trim().length} chars of text.`,
        url: target,
        persona: this.persona,
        signatureKey: `empty:${route}`,
      });
    }
    return status;
  }

  /** Run the cross-cutting checks on whatever is currently on screen. */
  async audit(opts: { links?: boolean } = {}): Promise<void> {
    await runAxe(this.page, this.store, this.persona);
    if (opts.links) {
      await checkInternalLinks(this.page, this.config, this.store, this.persona, {
        checked: this.checkedLinks,
      });
    }
  }

  /**
   * Let an AI bot pursue a goal on this session's page. Findings (including the
   * AI's judgement calls) land in the same store; spend is bounded by a
   * per-session cost ledger. Requires an Anthropic key (caller should gate on
   * that). Cross-cutting checks still apply via the page collectors.
   */
  async runAiGoal(goal: string, startPath: string): Promise<AiSessionResult> {
    const driver = new PlaywrightPageDriver(this.page, this.config.baseUrl);
    const llm = makeAnthropicClient();
    if (!this.ledger) this.ledger = new CostLedger(this.config.aiCostBudgetUsd);
    return runAiSession({
      persona: this.persona,
      goal,
      startPath,
      driver,
      llm,
      store: this.store,
      ledger: this.ledger,
      maxSteps: this.config.maxStepsPerSession,
    });
  }

  /**
   * Run a deterministic scripted flow against this session's page. Each step
   * failure is recorded as a finding and execution continues so partial runs
   * still produce useful signal. Returns a result array — one entry per step.
   */
  async runFlow(flow: Flow): Promise<FlowStepResult[]> {
    return runFlow(flow, this.page, this.store, this.persona, this.config);
  }

  /** Persist this session's findings as a shard for run-level aggregation. */
  async persist(): Promise<void> {
    if (this.net && this.net.intercepted.length > 0) {
      this.store.add({
        severity: "info",
        category: "safety",
        title: `safety net intercepted ${this.net.intercepted.length} side-effecting call(s)`,
        detail: `Breakdown (category:action → count): ${JSON.stringify(this.net.summary())}`,
        url: "(fleet)",
        persona: this.persona,
        signatureKey: "safety-summary",
      });
    }
    const shardsDir = path.join(this.config.runDir, "shards");
    await fs.mkdir(shardsDir, { recursive: true });
    const safePersona = this.persona.replace(/[^a-z0-9-]/gi, "-");
    const rand = Math.random().toString(36).slice(2, 8);
    const file = path.join(shardsDir, `${safePersona}-${rand}.json`);
    await fs.writeFile(
      file,
      JSON.stringify(
        {
          persona: this.persona,
          findings: this.store.all(),
          cost: this.ledger ? this.ledger.totals : undefined,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  async close(): Promise<void> {
    await this.context.close().catch(() => undefined);
  }
}
