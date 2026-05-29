/**
 * Real LlmClient — wraps the Anthropic SDK.
 *
 * - Reads BOTS_ANTHROPIC_API_KEY (falls back to ANTHROPIC_API_KEY) so bot spend
 *   bills to its own line, separate from anything else.
 * - Prompt-caches the (stable) system prompt to cut cost on every turn.
 * - Coalesces consecutive same-role turns so the message list is always valid
 *   for the API, keeping the driver loop simple.
 * - Extracts the single JSON action from the model's reply; if it can't, it
 *   returns a malformed action and the driver's validate-and-retry loop handles
 *   it (the model is asked to correct itself).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ConversationTurn, LlmClient, LlmDecision } from "./types";

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export function resolveAiKey(): string | null {
  return process.env.BOTS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || null;
}

/** Merge consecutive same-role turns into single messages (API requires alternation). */
export function coalesceTurns(
  turns: ConversationTurn[],
): Array<{ role: "user" | "assistant"; content: string }> {
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const turn of turns) {
    const last = out[out.length - 1];
    if (last && last.role === turn.role) {
      last.content += `\n\n${turn.content}`;
    } else {
      out.push({ role: turn.role, content: turn.content });
    }
  }
  // The API requires the first message to be from the user.
  while (out.length > 0 && out[0]?.role !== "user") out.shift();
  return out;
}

/** Pull the first JSON object out of free text. */
export function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
}

export function makeAnthropicClient(opts: { model?: string } = {}): LlmClient {
  const apiKey = resolveAiKey();
  if (!apiKey) {
    throw new Error(
      "No Anthropic API key — set BOTS_ANTHROPIC_API_KEY to enable AI-driven bots.",
    );
  }
  const client = new Anthropic({ apiKey });
  const model = opts.model ?? process.env.BOTS_AI_MODEL ?? DEFAULT_MODEL;

  return async ({ system, turns }): Promise<LlmDecision> => {
    const resp = await client.messages.create({
      model,
      max_tokens: 1024,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: coalesceTurns(turns),
    });

    const parts: string[] = [];
    for (const block of resp.content) {
      if (block.type === "text") parts.push(block.text);
    }
    const text = parts.join("\n");
    const json = extractJsonObject(text);

    let rawAction: unknown;
    if (json) {
      try {
        rawAction = JSON.parse(json);
      } catch {
        rawAction = { type: "__unparseable__", raw: text.slice(0, 200) };
      }
    } else {
      rawAction = { type: "__unparseable__", raw: text.slice(0, 200) };
    }

    return {
      rawAction,
      usage: {
        inputTokens: resp.usage.input_tokens,
        outputTokens: resp.usage.output_tokens,
      },
      model,
    };
  };
}
