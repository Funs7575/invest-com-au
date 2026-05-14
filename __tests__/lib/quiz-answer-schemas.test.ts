import { describe, it, expect } from "vitest";
import {
  QuizGoalSchema,
  QuizModeSchema,
  QuizExperienceSchema,
  QuizAmountSchema,
  QuizPrioritySchema,
  QuizAdvisorTypeSchema,
  QuizComplexitySchema,
  QuizLocationSchema,
  QuizPropertySubSchema,
  QuizInvestorGoalIntlSchema,
  UnifiedAnswersSchema,
} from "@/lib/quiz-answer-schemas";

describe("QuizGoalSchema", () => {
  it("accepts valid goal values", () => {
    expect(QuizGoalSchema.parse("grow")).toBe("grow");
    expect(QuizGoalSchema.parse("crypto")).toBe("crypto");
    expect(QuizGoalSchema.parse("help")).toBe("help");
  });

  it("returns undefined for unknown goal values", () => {
    expect(QuizGoalSchema.parse("unknown-goal")).toBeUndefined();
    expect(QuizGoalSchema.parse("GROW")).toBeUndefined();
  });

  it("returns undefined when field is absent", () => {
    expect(QuizGoalSchema.parse(undefined)).toBeUndefined();
  });
});

describe("QuizModeSchema", () => {
  it("accepts diy | help | unsure", () => {
    expect(QuizModeSchema.parse("diy")).toBe("diy");
    expect(QuizModeSchema.parse("help")).toBe("help");
    expect(QuizModeSchema.parse("unsure")).toBe("unsure");
  });

  it("rejects unknown mode with undefined", () => {
    expect(QuizModeSchema.parse("self")).toBeUndefined();
  });
});

describe("QuizExperienceSchema", () => {
  it("accepts beginner | intermediate | pro", () => {
    expect(QuizExperienceSchema.parse("beginner")).toBe("beginner");
    expect(QuizExperienceSchema.parse("pro")).toBe("pro");
  });

  it("rejects unknown with undefined", () => {
    expect(QuizExperienceSchema.parse("advanced")).toBeUndefined();
  });
});

describe("QuizAmountSchema", () => {
  it("accepts small | medium | large | whale", () => {
    expect(QuizAmountSchema.parse("small")).toBe("small");
    expect(QuizAmountSchema.parse("whale")).toBe("whale");
  });

  it("returns undefined for unknown amount key", () => {
    expect(QuizAmountSchema.parse("huge")).toBeUndefined();
  });
});

describe("QuizAdvisorTypeSchema", () => {
  it("accepts all advisor type keys", () => {
    expect(QuizAdvisorTypeSchema.parse("financial-planner")).toBe("financial-planner");
    expect(QuizAdvisorTypeSchema.parse("not-sure")).toBe("not-sure");
  });

  it("returns undefined for unknown advisor type", () => {
    expect(QuizAdvisorTypeSchema.parse("lawyer")).toBeUndefined();
  });
});

describe("UnifiedAnswersSchema", () => {
  it("parses a complete valid submission", () => {
    const result = UnifiedAnswersSchema.parse({
      location: "au",
      goal: "grow",
      mode: "diy",
      experience: "beginner",
      complexity: "simple",
      amount: "medium",
      priority: "fees",
    });
    expect(result?.goal).toBe("grow");
    expect(result?.mode).toBe("diy");
    expect(result?.experience).toBe("beginner");
  });

  it("coerces unknown field values to undefined rather than rejecting", () => {
    const result = UnifiedAnswersSchema.parse({
      goal: "not-a-real-goal",
      mode: "diy",
    });
    expect(result?.goal).toBeUndefined();
    expect(result?.mode).toBe("diy");
  });

  it("accepts undefined (optional schema)", () => {
    expect(UnifiedAnswersSchema.parse(undefined)).toBeUndefined();
  });

  it("passes through free-text investor_country and visa_status", () => {
    const result = UnifiedAnswersSchema.parse({
      investor_country: "US",
      visa_status: "temporary-resident",
    });
    expect(result?.investor_country).toBe("US");
    expect(result?.visa_status).toBe("temporary-resident");
  });

  it("truncates investor_country to max 10 chars", () => {
    const result = UnifiedAnswersSchema.parse({
      investor_country: "TOOLONGCODE",
    });
    expect(result?.investor_country).toBeUndefined();
  });
});
