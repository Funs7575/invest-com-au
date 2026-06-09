import { describe, it, expect } from "vitest";
import {
  isInternational,
  resolveTrack,
  getNextId,
  shouldShowStackQuestions,
  getTotalSteps,
  inferAdvisorType,
  toScoringAnswers,
  type UnifiedAnswers,
} from "@/lib/quiz-flow";

describe("isInternational", () => {
  it("true for international/expat, false otherwise", () => {
    expect(isInternational({ location: "international" })).toBe(true);
    expect(isInternational({ location: "expat" })).toBe(true);
    expect(isInternational({ location: "australia" })).toBe(false);
    expect(isInternational({})).toBe(false);
  });
});

describe("resolveTrack", () => {
  it("international when overseas/expat", () => {
    expect(resolveTrack({ location: "international" })).toBe("international");
    expect(resolveTrack({ location: "expat" })).toBe("international");
  });
  it("advisor for help/home goal, mode=help, or physical property", () => {
    expect(resolveTrack({ location: "australia", goal: "help" })).toBe("advisor");
    expect(resolveTrack({ location: "australia", goal: "home" })).toBe("advisor");
    expect(resolveTrack({ location: "australia", mode: "help" })).toBe("advisor");
    expect(resolveTrack({ location: "australia", property_sub: "physical" })).toBe("advisor");
  });
  it("diy otherwise", () => {
    expect(resolveTrack({ location: "australia", goal: "grow", mode: "diy" })).toBe("diy");
  });
});

describe("getNextId", () => {
  it("international flow: location → country → visa → goal_intl → amount → advisor_type → end", () => {
    const a: UnifiedAnswers = { location: "international" };
    expect(getNextId("location", a)).toBe("investor_country");
    expect(getNextId("investor_country", a)).toBe("visa_status");
    expect(getNextId("visa_status", a)).toBe("investor_goal_intl");
    expect(getNextId("investor_goal_intl", a)).toBe("amount");
    expect(getNextId("amount", a)).toBe("advisor_type");
    expect(getNextId("advisor_type", a)).toBeNull();
  });

  it("domestic DIY (no stack): location → goal → mode → experience → amount → priority → end", () => {
    const a: UnifiedAnswers = { location: "australia", goal: "crypto", mode: "diy" };
    expect(getNextId("location", a)).toBe("goal");
    expect(getNextId("goal", a)).toBe("mode");
    expect(getNextId("mode", a)).toBe("experience");
    expect(getNextId("experience", a)).toBe("amount");
    expect(getNextId("amount", a)).toBe("priority");
    expect(getNextId("priority", a)).toBeNull(); // crypto not a stack goal
  });

  it("DIY stack-goal appends the three wealth-stack questions", () => {
    const g: UnifiedAnswers = { location: "australia", goal: "grow", mode: "diy" };
    expect(getNextId("priority", g)).toBe("stack_risk");
    expect(getNextId("stack_risk", g)).toBe("stack_super");
    expect(getNextId("stack_super", g)).toBe("stack_savings");
    expect(getNextId("stack_savings", g)).toBeNull();
  });

  it("advisor flow (help): goal → complexity → amount → advisor_type → end", () => {
    const adv: UnifiedAnswers = { location: "australia", goal: "help" };
    expect(getNextId("location", adv)).toBe("goal");
    expect(getNextId("goal", adv)).toBe("complexity");
    expect(getNextId("complexity", adv)).toBe("amount");
    expect(getNextId("amount", adv)).toBe("advisor_type");
    expect(getNextId("advisor_type", adv)).toBeNull();
  });
});

describe("shouldShowStackQuestions", () => {
  it("true for stack goals on the DIY path", () => {
    expect(shouldShowStackQuestions({ goal: "grow", mode: "diy" })).toBe(true);
    expect(shouldShowStackQuestions({ goal: "super", mode: "diy" })).toBe(true);
  });
  it("false for non-stack goals or the advisor path", () => {
    expect(shouldShowStackQuestions({ goal: "crypto", mode: "diy" })).toBe(false);
    expect(shouldShowStackQuestions({ goal: "grow", mode: "help" })).toBe(false);
  });
});

describe("getTotalSteps", () => {
  it("counts each path", () => {
    expect(getTotalSteps({ location: "international" })).toBe(6);
    expect(getTotalSteps({ location: "australia", goal: "crypto", mode: "diy" })).toBe(6);
    expect(getTotalSteps({ location: "australia", goal: "help" })).toBe(5);
    expect(getTotalSteps({ location: "australia", goal: "grow", mode: "diy" })).toBe(9);
  });
});

describe("inferAdvisorType", () => {
  it("respects an explicit (non-'not-sure') choice", () => {
    expect(inferAdvisorType({ advisor_type: "tax-agent" })).toBe("tax-agent");
  });
  it("infers domestic types from goal/property/amount", () => {
    expect(inferAdvisorType({ location: "australia", goal: "home" })).toBe("mortgage-broker");
    expect(inferAdvisorType({ location: "australia", goal: "super" })).toBe("smsf-accountant");
    expect(inferAdvisorType({ location: "australia", property_sub: "physical" })).toBe("buyers-agent");
    expect(inferAdvisorType({ location: "australia", amount: "whale" })).toBe("financial-planner");
  });
  it("infers international types from the cross-border goal", () => {
    expect(inferAdvisorType({ location: "international", investor_goal_intl: "property" })).toBe("buyers-agent");
    expect(inferAdvisorType({ location: "international", investor_goal_intl: "shares" })).toBe("tax-agent");
  });
});

describe("toScoringAnswers", () => {
  it("flattens [goal, experience, amount, priority, property_sub], dropping falsy", () => {
    expect(toScoringAnswers({ goal: "grow", experience: "beginner", amount: "medium", priority: "fees" })).toEqual([
      "grow", "beginner", "medium", "fees",
    ]);
    expect(toScoringAnswers({ goal: "grow", amount: "medium" })).toEqual(["grow", "medium"]);
  });
});
