import { describe, it, expect } from "vitest";
import { pickSharpeningQuestions } from "@/lib/getmatched/sharpen";
import type { ActionPlanAnswers } from "@/lib/getmatched/types";

describe("pickSharpeningQuestions", () => {
  it("returns the first 2 unanswered priority questions (budget, location)", () => {
    const picks = pickSharpeningQuestions({});
    expect(picks).toHaveLength(2);
    expect(picks.map((q) => q.slug)).toEqual(["budget", "location_state"]);
  });

  it("skips an answered budget and moves to location + timeline", () => {
    const answers: ActionPlanAnswers = { budget_band: "10k_100k" };
    const picks = pickSharpeningQuestions(answers);
    expect(picks.map((q) => q.slug)).toEqual(["location_state", "timeline"]);
  });

  it("skips budget + location, surfaces only timeline", () => {
    const answers: ActionPlanAnswers = {
      budget_band: "100k_500k",
      location_state: "NSW",
    };
    const picks = pickSharpeningQuestions(answers);
    expect(picks.map((q) => q.slug)).toEqual(["timeline"]);
  });

  it("returns empty when all priority questions are answered", () => {
    const answers: ActionPlanAnswers = {
      budget_band: "1m_plus",
      location_state: "VIC",
      timeline: "now",
    };
    expect(pickSharpeningQuestions(answers)).toEqual([]);
  });

  it("respects the max argument", () => {
    expect(pickSharpeningQuestions({}, 1)).toHaveLength(1);
    expect(pickSharpeningQuestions({}, 1)[0]!.slug).toBe("budget");
    expect(pickSharpeningQuestions({}, 0)).toEqual([]);
  });

  it("treats empty string / empty array as unanswered", () => {
    const answers: ActionPlanAnswers = { budget_band: "", location_state: [] };
    const picks = pickSharpeningQuestions(answers);
    expect(picks.map((q) => q.slug)).toEqual(["budget", "location_state"]);
  });

  it("returned defs carry real option chips from FALLBACK_QUESTIONS", () => {
    const [budget] = pickSharpeningQuestions({}, 1);
    expect(budget!.options.length).toBeGreaterThan(0);
    expect(budget!.options.map((o) => o.value)).toContain("10k_100k");
    expect(budget!.maps_to).toBe("budget_band");
  });
});
