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
  QuizStackRiskSchema,
} from "@/lib/quiz-answer-schemas";

// Each persisted question maps to the schema that validates its answer.
// stack_risk is now included because QuizStackRiskSchema was added to
// catch the not_sure option key. stack_super / stack_savings remain out
// (their option keys are super_yes/super_no/savings_yes/savings_no — valid
// strings that degrade gracefully via the existing schema catch).
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
  stack_risk: QuizStackRiskSchema,
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

  it("offers a valid 'not sure' path on every subjective judgment question", () => {
    // The brief: "'not sure' is a valid path throughout." goal/mode/advisor_type
    // already had one (other/unsure/not-sure); all subjective judgment questions
    // now have a first-class not_sure exit. The key must survive its schema
    // (asserted by the contract loop above) so the answer persists as a neutral
    // no-signal rather than silently nulling.
    const notSureQuestions = [
      "experience", "complexity", "amount", "priority",
      "property_sub", "investor_goal_intl", "visa_status", "stack_risk",
    ] as const;
    for (const id of notSureQuestions) {
      const keys = UNIFIED_QUESTIONS[id].options.map((o) => o.key);
      expect(keys, `${id} offers a not_sure option`).toContain("not_sure");
      // It must be last so it doesn't anchor the real choices.
      expect(keys[keys.length - 1], `${id} not_sure is last`).toBe("not_sure");
    }
  });

  it("investor_country offers a not_sure option and it validates", () => {
    const keys = UNIFIED_QUESTIONS.investor_country.options.map((o) => o.key);
    expect(keys).toContain("not_sure");
    // Validates through the string-max schema (max 20 chars, "not_sure" = 8).
    expect(QuizInvestorCountrySchema.parse("not_sure")).toBe("not_sure");
  });

  it("CHESS sponsored sub-text includes the key protection claim", () => {
    const safety = UNIFIED_QUESTIONS.priority.options.find((o) => o.key === "safety");
    expect(safety?.sub).toContain("protected if the broker fails");
  });

  it("pre-IPO sub-text includes the wholesale investor threshold", () => {
    const preIpo = UNIFIED_QUESTIONS.goal.options.find((o) => o.key === "pre-ipo");
    expect(preIpo?.sub).toContain("wholesale investor");
  });

  it("conveyancer sub-text describes legal settlement role", () => {
    const conv = UNIFIED_QUESTIONS.advisor_type.options.find((o) => o.key === "conveyancer");
    expect(conv?.sub).toContain("settlement");
  });

  it("estate-planner sub-text mentions wills and trusts", () => {
    const ep = UNIFIED_QUESTIONS.advisor_type.options.find((o) => o.key === "estate-planner");
    expect(ep?.sub).toMatch(/will|trust/i);
  });

  it("aged-care-advisor sub-text mentions Centrelink", () => {
    const ac = UNIFIED_QUESTIONS.advisor_type.options.find((o) => o.key === "aged-care-advisor");
    expect(ac?.sub).toMatch(/centrelink/i);
  });

  it("debt-counsellor sub-text mentions reduce/manage debt", () => {
    const dc = UNIFIED_QUESTIONS.advisor_type.options.find((o) => o.key === "debt-counsellor");
    expect(dc?.sub).toMatch(/debt/i);
  });
});
