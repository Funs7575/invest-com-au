/**
 * The AI bot loop: observe → decide → act → judge, until the goal is met, the
 * step limit is hit, or the spend budget trips.
 *
 * Depends only on the PageDriver + LlmClient abstractions (ai/types.ts), so it
 * is fully unit-testable with fakes. The page-level safety net (installed by
 * the session) still intercepts any side-effecting request these actions
 * trigger, so the AI cannot cause a real-world effect.
 */

import type { FindingStore } from "../findings/store";
import type { CostLedger } from "./cost";
import type { ConversationTurn, LlmClient, PageDriver, PageObservation } from "./types";
import { buildSystemPrompt, formatObservation, firstUserTurn } from "./prompt";
import { parseAction } from "./actions";

export interface AiSessionOptions {
  persona: string;
  goal: string;
  startPath: string;
  driver: PageDriver;
  llm: LlmClient;
  store: FindingStore;
  ledger: CostLedger;
  maxSteps: number;
  /** Keep at most this many recent turns in context (token control). */
  maxTurns?: number;
}

export type StopReason = "finished" | "budget" | "max_steps" | "error";

export interface AiSessionResult {
  steps: number;
  outcome: string;
  stopReason: StopReason;
  issuesReported: number;
}

function trimTurns(turns: ConversationTurn[], maxTurns: number): ConversationTurn[] {
  if (turns.length <= maxTurns) return turns;
  // Keep the first turn (the goal/starting context) plus the most recent ones.
  const head = turns[0];
  const tail = turns.slice(turns.length - (maxTurns - 1));
  return head ? [head, ...tail] : tail;
}

export async function runAiSession(opts: AiSessionOptions): Promise<AiSessionResult> {
  const { persona, goal, driver, llm, store, ledger, maxSteps } = opts;
  const maxTurns = opts.maxTurns ?? 12;
  const system = buildSystemPrompt(persona, goal);
  const turns: ConversationTurn[] = [];
  let issuesReported = 0;

  try {
    await driver.navigate(opts.startPath);
  } catch (err) {
    store.add({
      severity: "high",
      category: "flow-failure",
      title: `could not open ${opts.startPath}`,
      detail: `AI session start navigation failed: ${(err as Error).message}`,
      url: opts.startPath,
      persona,
      signatureKey: `ai-start-fail:${opts.startPath}`,
    });
    return { steps: 0, outcome: "blocked", stopReason: "error", issuesReported };
  }

  let firstTurn = true;
  for (let step = 0; step < maxSteps; step++) {
    if (ledger.exceededBudget()) {
      return { steps: step, outcome: "blocked", stopReason: "budget", issuesReported };
    }

    let observation: PageObservation;
    try {
      observation = await driver.observe();
    } catch (err) {
      store.add({
        severity: "medium",
        category: "flow-failure",
        title: "could not read the page",
        detail: `observe() failed: ${(err as Error).message}`,
        url: opts.startPath,
        persona,
        signatureKey: "ai-observe-fail",
      });
      return { steps: step, outcome: "blocked", stopReason: "error", issuesReported };
    }

    turns.push({
      role: "user",
      content: firstTurn ? firstUserTurn(observation) : formatObservation(observation),
    });
    firstTurn = false;

    const decision = await llm({ system, turns: trimTurns(turns, maxTurns) });
    ledger.record(decision.model, decision.usage);
    turns.push({ role: "assistant", content: JSON.stringify(decision.rawAction) });

    const parsed = parseAction(decision.rawAction);
    if (!parsed.ok) {
      turns.push({
        role: "user",
        content: `That was not a valid action (${parsed.error}). Reply with exactly one valid action as a JSON object.`,
      });
      continue;
    }
    const action = parsed.action;

    if (action.type === "finish") {
      return { steps: step + 1, outcome: action.outcome, stopReason: "finished", issuesReported };
    }

    if (action.type === "report_issue") {
      store.add({
        severity: action.severity,
        category: action.category,
        title: action.title,
        detail: action.detail,
        url: observation.url,
        persona,
        signatureKey: `ai:${action.category}:${action.title}`,
      });
      issuesReported += 1;
      turns.push({ role: "user", content: "Logged. Continue toward your goal." });
      continue;
    }

    try {
      if (action.type === "click") await driver.click(action.ref);
      else if (action.type === "type") await driver.fill(action.ref, action.text);
      else if (action.type === "scroll") await driver.scroll(action.direction);
      else if (action.type === "navigate") await driver.navigate(action.path);
    } catch (err) {
      turns.push({
        role: "user",
        content: `That action failed: ${(err as Error).message}. Try a different element or approach.`,
      });
    }
  }

  return { steps: maxSteps, outcome: "incomplete", stopReason: "max_steps", issuesReported };
}
