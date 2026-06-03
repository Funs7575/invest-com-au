/**
 * Abstractions the AI driver loop depends on.
 *
 * The loop (ai/driver.ts) talks ONLY to these interfaces, so it can be
 * unit-tested with fakes — no Playwright, no Anthropic key. The real
 * implementations live in ai/playwright-page-driver.ts and
 * ai/anthropic-client.ts.
 */

import type { TokenUsage } from "./cost";

/** A single interactable element the bot can act on. */
export interface SnapshotElement {
  /** Stable handle the model references, e.g. "e5". */
  ref: string;
  /** Accessible role: link | button | textbox | checkbox | combobox … */
  role: string;
  /** Accessible name / visible text. */
  name: string;
  /** For inputs: the input type (text, email, radio…). */
  inputType?: string;
  /** Current value, if meaningful. */
  value?: string;
}

export interface PageObservation {
  url: string;
  title: string;
  elements: SnapshotElement[];
}

/** The browser surface the loop needs. Real impl wraps a Playwright Page. */
export interface PageDriver {
  observe(): Promise<PageObservation>;
  click(ref: string): Promise<void>;
  fill(ref: string, text: string): Promise<void>;
  scroll(direction: "up" | "down"): Promise<void>;
  navigate(path: string): Promise<void>;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface LlmDecision {
  /** The model's chosen action, to be validated by parseAction. */
  rawAction: unknown;
  usage: TokenUsage;
  model: string;
}

/** The model surface the loop needs. Real impl wraps the Anthropic SDK. */
export type LlmClient = (args: {
  system: string;
  turns: ConversationTurn[];
}) => Promise<LlmDecision>;
