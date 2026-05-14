import { describe, it, expect } from "vitest";
import { nextQuestion, shownIfMatches } from "@/lib/getmatched/questions";
import type { QuestionDef } from "@/lib/getmatched/types";

function q(over: Partial<QuestionDef>): QuestionDef {
  return {
    id: 1,
    slug: "s",
    step: 1,
    kind: "select",
    prompt: "p",
    subtitle: null,
    options: [],
    shown_if: {},
    maps_to: "s",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 100,
    ...over,
  };
}

describe("shownIfMatches", () => {
  it("returns true when no conditions", () => {
    expect(shownIfMatches(q({}), {})).toBe(true);
  });

  it("returns true when condition matches", () => {
    expect(
      shownIfMatches(
        q({ shown_if: { intent: ["smsf_property"] } }),
        { intent: "smsf_property" },
      ),
    ).toBe(true);
  });

  it("returns false when intent does not match", () => {
    expect(
      shownIfMatches(
        q({ shown_if: { intent: ["smsf_property"] } }),
        { intent: "compare_platform" },
      ),
    ).toBe(false);
  });

  it("returns false when required answer missing", () => {
    expect(
      shownIfMatches(
        q({ shown_if: { intent: ["smsf_property"] } }),
        {},
      ),
    ).toBe(false);
  });
});

describe("nextQuestion", () => {
  const questions = [
    q({ slug: "starting_point", step: 1, maps_to: "starting_point" }),
    q({ slug: "goal", step: 2, maps_to: "intent" }),
    q({
      slug: "smsf_situation",
      step: 3,
      shown_if: { intent: ["smsf_property"] },
      maps_to: "smsf_status",
    }),
    q({
      slug: "opportunity_situation",
      step: 3,
      shown_if: { intent: ["opportunity_assessment"] },
      maps_to: "opportunity_context",
    }),
    q({ slug: "budget", step: 5, maps_to: "budget_band" }),
  ];

  it("returns the first eligible unanswered question", () => {
    const result = nextQuestion(questions, {});
    expect(result.done).toBe(false);
    if (!result.done) {
      expect(result.question.slug).toBe("starting_point");
      expect(result.currentStep).toBe(1);
    }
  });

  it("skips over already-answered questions", () => {
    const result = nextQuestion(questions, {
      starting_point: "australia",
      intent: "smsf_property",
      smsf_situation: "smsf_property",
      smsf_status: "smsf_property",
    });
    if (!result.done) {
      expect(result.question.slug).toBe("budget");
    }
  });

  it("skips questions whose shown_if is not satisfied", () => {
    const result = nextQuestion(questions, {
      starting_point: "australia",
      intent: "compare_platform",
    });
    if (!result.done) {
      expect(result.question.slug).toBe("budget");
      // smsf_situation and opportunity_situation are skipped
    }
  });

  it("returns done when all eligible questions are answered", () => {
    const result = nextQuestion(questions, {
      starting_point: "australia",
      intent: "compare_platform",
      budget: "10k_100k",
      budget_band: "10k_100k",
    });
    expect(result.done).toBe(true);
  });
});
