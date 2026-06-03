/**
 * The action model for AI-driven bots.
 *
 * An AI bot observes a page, then emits ONE action. This module defines the
 * closed set of actions it may take and validates the model's output into a
 * typed, safe action. Pure module (no Playwright / SDK) so it's fully unit
 * tested — the driver (ai/driver.ts) executes whatever this approves.
 *
 * Safety: the action set is deliberately small. There is no "run arbitrary
 * script" or "go to arbitrary URL" action — `navigate` takes a same-site path
 * only, and the page-level safety net still intercepts any side-effecting
 * request the actions trigger.
 */

import type { Severity, FindingCategory } from "../findings/types";

export type BotAction =
  | { type: "click"; ref: string; note?: string }
  | { type: "type"; ref: string; text: string; note?: string }
  | { type: "navigate"; path: string; note?: string }
  | { type: "scroll"; direction: "up" | "down"; note?: string }
  | {
      type: "report_issue";
      severity: Severity;
      category: ReportableCategory;
      title: string;
      detail: string;
    }
  | { type: "finish"; outcome: "success" | "blocked" | "gave_up"; note?: string };

export type BotActionType = BotAction["type"];

/**
 * Categories an AI bot is allowed to raise. The automated checks own the
 * mechanical ones (console/network/a11y/http); the AI owns judgement calls.
 */
export const REPORTABLE_CATEGORIES = [
  "ux",
  "compliance",
  "flow-failure",
  "dead-end",
] as const satisfies readonly FindingCategory[];

export type ReportableCategory = (typeof REPORTABLE_CATEGORIES)[number];

const SEVERITIES: readonly Severity[] = ["critical", "high", "medium", "low", "info"];
const OUTCOMES = ["success", "blocked", "gave_up"] as const;
const MAX_TEXT = 2000;

export type ParsedAction =
  | { ok: true; action: BotAction }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/**
 * Validate a raw model output (an object, e.g. a tool-use input) into a typed
 * BotAction. Returns a structured error rather than throwing so the driver can
 * feed the message back to the model and let it correct itself.
 */
export function parseAction(input: unknown): ParsedAction {
  if (!isRecord(input)) return { ok: false, error: "action must be an object" };
  const type = str(input.type);
  if (!type) return { ok: false, error: "action.type is required" };

  switch (type) {
    case "click": {
      const ref = str(input.ref);
      if (!ref) return { ok: false, error: "click requires a string `ref`" };
      return { ok: true, action: { type, ref, note: str(input.note) ?? undefined } };
    }
    case "type": {
      const ref = str(input.ref);
      const text = str(input.text);
      if (!ref) return { ok: false, error: "type requires a string `ref`" };
      if (text === null) return { ok: false, error: "type requires a string `text`" };
      return {
        ok: true,
        action: { type, ref, text: text.slice(0, MAX_TEXT), note: str(input.note) ?? undefined },
      };
    }
    case "navigate": {
      const path = str(input.path);
      if (!path) return { ok: false, error: "navigate requires a string `path`" };
      if (!path.startsWith("/") || path.startsWith("//")) {
        return { ok: false, error: "navigate `path` must be a same-site path starting with '/'" };
      }
      return { ok: true, action: { type, path, note: str(input.note) ?? undefined } };
    }
    case "scroll": {
      const direction = str(input.direction);
      if (direction !== "up" && direction !== "down") {
        return { ok: false, error: "scroll `direction` must be 'up' or 'down'" };
      }
      return { ok: true, action: { type, direction, note: str(input.note) ?? undefined } };
    }
    case "report_issue": {
      const severity = str(input.severity);
      const category = str(input.category);
      const title = str(input.title);
      const detail = str(input.detail);
      if (!severity || !SEVERITIES.includes(severity as Severity)) {
        return { ok: false, error: `report_issue.severity must be one of ${SEVERITIES.join(", ")}` };
      }
      if (!category || !REPORTABLE_CATEGORIES.includes(category as ReportableCategory)) {
        return {
          ok: false,
          error: `report_issue.category must be one of ${REPORTABLE_CATEGORIES.join(", ")}`,
        };
      }
      if (!title) return { ok: false, error: "report_issue requires a `title`" };
      return {
        ok: true,
        action: {
          type,
          severity: severity as Severity,
          category: category as ReportableCategory,
          title: title.slice(0, 200),
          detail: (detail ?? "").slice(0, MAX_TEXT),
        },
      };
    }
    case "finish": {
      const outcome = str(input.outcome) ?? "success";
      if (!OUTCOMES.includes(outcome as (typeof OUTCOMES)[number])) {
        return { ok: false, error: `finish.outcome must be one of ${OUTCOMES.join(", ")}` };
      }
      return {
        ok: true,
        action: {
          type,
          outcome: outcome as "success" | "blocked" | "gave_up",
          note: str(input.note) ?? undefined,
        },
      };
    }
    default:
      return { ok: false, error: `unknown action type: ${type}` };
  }
}
