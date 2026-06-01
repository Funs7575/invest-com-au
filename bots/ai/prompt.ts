/**
 * Prompt construction for AI-driven bots. Pure — unit-tested.
 *
 * The system prompt is stable per (persona, goal) so the Anthropic client can
 * prompt-cache it; only the rolling page snapshots change between turns.
 */

import type { PageObservation } from "./types";

export function buildSystemPrompt(persona: string, goal: string): string {
  return [
    `You are an automated QA bot simulating a real visitor of invest.com.au, an`,
    `Australian investment-comparison website. Behave like a genuine user, not a`,
    `crawler.`,
    ``,
    `Persona: ${persona}`,
    `Your goal this session: ${goal}`,
    ``,
    `Each turn you are shown a compact snapshot of the current page's interactable`,
    `elements, each tagged with a [ref]. Respond with EXACTLY ONE action as a single`,
    `JSON object and nothing else.`,
    ``,
    `Allowed actions:`,
    `  {"type":"click","ref":"e3","note":"why"}`,
    `  {"type":"type","ref":"e4","text":"realistic fake value"}`,
    `  {"type":"scroll","direction":"down"}`,
    `  {"type":"navigate","path":"/same-site-path"}`,
    `  {"type":"report_issue","severity":"critical|high|medium|low","category":"ux|compliance|flow-failure|dead-end","title":"short","detail":"what & why"}`,
    `  {"type":"finish","outcome":"success|blocked|gave_up","note":"summary"}`,
    ``,
    `Rules:`,
    `- Pursue the goal step by step, like a real user would. Only use [ref]s shown`,
    `  in the LATEST snapshot.`,
    `- Use realistic but clearly fake test data for any form (e.g. "Test Bot",`,
    `  "bot@example.com"). Never enter real personal or payment details.`,
    `- Raise report_issue whenever something is broken, confusing, a dead end, or —`,
    `  importantly for a regulated financial site — when a required disclosure or`,
    `  disclaimer appears to be MISSING where you'd expect one (category`,
    `  "compliance").`,
    `- You can report more than one issue across the session, one action at a time.`,
    `- finish as soon as you've achieved the goal or are genuinely stuck. Be concise.`,
  ].join("\n");
}

export function formatObservation(obs: PageObservation): string {
  const lines: string[] = [
    `URL: ${obs.url}`,
    `TITLE: ${obs.title}`,
    `Interactable elements (${obs.elements.length}):`,
  ];
  for (const el of obs.elements) {
    const bits: string[] = [`[${el.ref}]`, el.role];
    if (el.name) bits.push(`"${el.name}"`);
    if (el.inputType) bits.push(`<${el.inputType}>`);
    if (el.value) bits.push(`= "${el.value}"`);
    lines.push("  " + bits.join(" "));
  }
  if (obs.elements.length === 0) {
    lines.push("  (none found — the page may be empty, broken, or still loading)");
  }
  return lines.join("\n");
}

export function firstUserTurn(obs: PageObservation): string {
  return `Here is the starting page. Take the first step toward your goal.\n\n${formatObservation(obs)}`;
}
