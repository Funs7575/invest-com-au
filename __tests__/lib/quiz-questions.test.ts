import { describe, it, expect } from "vitest";
import { z } from "zod";

import { UNIFIED_QUESTIONS, type QuizOption } from "@/lib/quiz-questions";
import type { QuestionId } from "@/lib/quiz-flow";
import {
  QuizLocationSchema,
  QuizGoalSchema,
  QuizStageSchema,
  QuizModeSchema,
  QuizExperienceSchema,
  QuizComplexitySchema,
  QuizAmountSchema,
  QuizPrioritySchema,
  QuizAdvisorTypeSchema,
  QuizPropertySubSchema,
  QuizInvestorGoalIntlSchema,
  QuizInvestorCountrySchema,
  QuizVisaStatusSchema,
} from "@/lib/quiz-answer-schemas";

// Each persisted question maps to the schema that validates its answer. The
// `stack_*` questions feed the in-session vertical scorer and aren't persisted
// via UnifiedAnswersSchema, so they intentionally have no row here.
const QUESTION_SCHEMA: Partial<Record<QuestionId, z.ZodTypeAny>> = {
  location: QuizLocationSchema,
  goal: QuizGoalSchema,
  stage: QuizStageSchema,
  mode: QuizModeSchema,
  experience: QuizExperienceSchema,
  complexity: QuizComplexitySchema,
  amount: QuizAmountSchema,
  priority: QuizPrioritySchema,
  advisor_type: QuizAdvisorTypeSchema,
  property_sub: QuizPropertySubSchema,
  investor_country: QuizInvestorCountrySchema,
  visa_status: QuizVisaStatusSchema,
  investor_goal_intl: QuizInvestorGoalIntlSchema,
};

describe("quiz question ↔ answer-schema contract", () => {
  // The load-bearing assertion. Every schema uses `.catch(undefined)`, so a
  // value the schema rejects (unknown enum member, or a string over the max)
  // silently degrades to `undefined` on persist — exactly P0 #1, where the
  // domestic `location` and over-long country keys nulled the lead column.
  for (const [id, schema] of Object.entries(QUESTION_SCHEMA) as [QuestionId, z.ZodTypeAny][]) {
    it(`every "${id}" option survives its schema (no silent null)`, () => {
      for (const opt of UNIFIED_QUESTIONS[id].options) {
        expect(schema.parse(opt.key)).toBe(opt.key);
      }
    });
  }

  it("regression guards: the keys that previously nulled out now validate", () => {
    // insurance-broker can be the allocated lead type from the multi-select.
    expect(QuizAdvisorTypeSchema.parse("insurance-broker")).toBe("insurance-broker");
    // The longest country keys exceeded the old max(10) → undefined.
    for (const key of ["new_zealand", "south_korea", "saudi_arabia"]) {
      expect(QuizInvestorCountrySchema.parse(key)).toBe(key);
    }
  });

  it("every question is well-formed (text, unique keys, labelled options)", () => {
    for (const id of Object.keys(UNIFIED_QUESTIONS) as QuestionId[]) {
      const q = UNIFIED_QUESTIONS[id];
      expect(q.text.length, `${id} has question text`).toBeGreaterThan(0);
      const keys = q.options.map((o: QuizOption) => o.key);
      expect(new Set(keys).size, `${id} keys are unique`).toBe(keys.length);
      for (const o of q.options) {
        expect(o.key.length, `${id} option has a key`).toBeGreaterThan(0);
        expect(o.label.length, `${id} "${o.key}" has a label`).toBeGreaterThan(0);
      }
    }
  });
});
