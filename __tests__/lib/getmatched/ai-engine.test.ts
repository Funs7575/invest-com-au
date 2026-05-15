/**
 * Unit tests for the AI-driven Get Matched 3.0 picker.
 *
 * The engine is fail-safe by design — any non-happy-path returns
 * `{shouldResolve: false, confidence: 0}` so callers fall through
 * to the rule-based walker. Every branch below verifies that
 * contract is honoured.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiQuestionContext } from "@/lib/getmatched/ai-engine";

const { mockAdminInsertThen } = vi.hoisted(() => ({
  mockAdminInsertThen: vi.fn(() => Promise.resolve({ error: null })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({ then: mockAdminInsertThen }),
    }),
  }),
}));

import { pickNextQuestionAI } from "@/lib/getmatched/ai-engine";

const SLUGS: AiQuestionContext[] = [
  { slug: "starting_point", prompt: "Where are you starting from?", step: 1, mapsTo: "starting_point" },
  { slug: "goal", prompt: "What's your goal?", step: 2, mapsTo: "intent" },
  { slug: "budget", prompt: "Budget?", step: 5, mapsTo: "budget_band" },
];

function mockClaudeResponse(payload: unknown, opts?: { ok?: boolean; throws?: Error }): void {
  globalThis.fetch = vi.fn(async () => {
    if (opts?.throws) throw opts.throws;
    return new Response(
      JSON.stringify({
        content: [
          {
            type: "text",
            text: typeof payload === "string" ? payload : JSON.stringify(payload),
          },
        ],
        usage: { input_tokens: 320, output_tokens: 45 },
      }),
      {
        status: opts?.ok === false ? 500 : 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001");
  mockAdminInsertThen.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("pickNextQuestionAI", () => {
  it("returns fail-safe when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const result = await pickNextQuestionAI({}, "both", SLUGS);
    expect(result).toEqual({ shouldResolve: false, confidence: 0 });
  });

  it("returns fail-safe when no slugs are supplied", async () => {
    const result = await pickNextQuestionAI({}, "both", []);
    expect(result).toEqual({ shouldResolve: false, confidence: 0 });
  });

  it("parses a well-formed model response and returns the chosen slug", async () => {
    mockClaudeResponse({
      next_question_slug: "budget",
      generated_prompt: "How much are you starting with?",
      should_resolve_plan: false,
      confidence: 0.82,
      reasoning: "user has starting_point + intent already",
    });
    const result = await pickNextQuestionAI(
      { starting_point: "australia", intent: "smsf_property" },
      "both",
      SLUGS,
      { userKey: "sess-1" },
    );
    expect(result.slug).toBe("budget");
    expect(result.generatedPrompt).toBe("How much are you starting with?");
    expect(result.shouldResolve).toBe(false);
    expect(result.confidence).toBeCloseTo(0.82, 5);
  });

  it("honours should_resolve_plan=true and emits no slug", async () => {
    mockClaudeResponse({
      next_question_slug: null,
      generated_prompt: null,
      should_resolve_plan: true,
      confidence: 0.9,
      reasoning: "enough info",
    });
    const result = await pickNextQuestionAI({}, "both", SLUGS);
    expect(result.shouldResolve).toBe(true);
    expect(result.slug).toBeUndefined();
    expect(result.confidence).toBe(0.9);
  });

  it("strips markdown fences before JSON parsing", async () => {
    mockClaudeResponse(
      '```json\n{"next_question_slug":"goal","should_resolve_plan":false,"confidence":0.7,"reasoning":"r"}\n```',
    );
    const result = await pickNextQuestionAI({}, "both", SLUGS);
    expect(result.slug).toBe("goal");
  });

  it("falls back when the model picks an unknown slug", async () => {
    mockClaudeResponse({
      next_question_slug: "not-a-real-slug",
      should_resolve_plan: false,
      confidence: 0.5,
      reasoning: "hallucinated",
    });
    const result = await pickNextQuestionAI({}, "both", SLUGS);
    expect(result).toEqual({ shouldResolve: false, confidence: 0 });
  });

  it("falls back on malformed (non-JSON) model output", async () => {
    mockClaudeResponse("totally not JSON, just prose");
    const result = await pickNextQuestionAI({}, "both", SLUGS);
    expect(result).toEqual({ shouldResolve: false, confidence: 0 });
  });

  it("falls back when the fetch call throws (timeout / network)", async () => {
    mockClaudeResponse(null, { throws: new Error("abort") });
    const result = await pickNextQuestionAI({}, "both", SLUGS);
    expect(result).toEqual({ shouldResolve: false, confidence: 0 });
  });

  it("falls back on non-2xx response", async () => {
    mockClaudeResponse({ error: "server" }, { ok: false });
    const result = await pickNextQuestionAI({}, "both", SLUGS);
    expect(result).toEqual({ shouldResolve: false, confidence: 0 });
  });

  it("clamps confidence outside 0..1 to 0", async () => {
    mockClaudeResponse({
      next_question_slug: "goal",
      should_resolve_plan: false,
      confidence: 1.7,
      reasoning: "over-confident",
    });
    const result = await pickNextQuestionAI({}, "both", SLUGS);
    expect(result.confidence).toBe(0);
    expect(result.slug).toBe("goal");
  });
});
