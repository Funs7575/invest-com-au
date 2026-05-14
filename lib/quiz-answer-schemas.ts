/**
 * Server-side Zod schemas for quiz answer validation (QQ-01).
 *
 * Uses `.catch(undefined)` on each field so unknown or legacy values
 * degrade to undefined rather than causing 400 errors — the quiz-lead
 * submission is revenue-critical and must tolerate old app versions.
 *
 * Keep the enum values in sync with QUESTIONS in app/quiz/page.tsx.
 */
import { z } from "zod";

const safeEnum = <T extends string>(values: [T, ...T[]]) =>
  z.enum(values).optional().catch(undefined);

export const QuizLocationSchema = safeEnum([
  "au",
  "international",
  "expat",
  "au_expat",
]);

export const QuizGoalSchema = safeEnum([
  "grow",
  "income",
  "crypto",
  "trade",
  "automate",
  "super",
  "property",
  "home",
  "alt-assets",
  "royalties",
  "pre-ipo",
  "help",
  "other",
]);

export const QuizModeSchema = safeEnum(["diy", "help", "unsure"]);

export const QuizExperienceSchema = safeEnum([
  "beginner",
  "intermediate",
  "pro",
]);

export const QuizComplexitySchema = safeEnum([
  "simple",
  "moderate",
  "complex",
]);

export const QuizAmountSchema = safeEnum([
  "small",
  "medium",
  "large",
  "whale",
]);

export const QuizPrioritySchema = safeEnum([
  "fees",
  "safety",
  "tools",
  "simple",
]);

export const QuizAdvisorTypeSchema = safeEnum([
  "mortgage-broker",
  "buyers-agent",
  "financial-planner",
  "smsf-accountant",
  "tax-agent",
  "not-sure",
]);

export const QuizPropertySubSchema = safeEnum([
  "physical",
  "property-reit",
  "property-super",
]);

export const QuizInvestorGoalIntlSchema = safeEnum([
  "property",
  "shares",
  "savings",
  "business",
]);

export const UnifiedAnswersSchema = z
  .object({
    location: QuizLocationSchema,
    goal: QuizGoalSchema,
    mode: QuizModeSchema,
    experience: QuizExperienceSchema,
    complexity: QuizComplexitySchema,
    amount: QuizAmountSchema,
    priority: QuizPrioritySchema,
    advisor_type: QuizAdvisorTypeSchema,
    property_sub: QuizPropertySubSchema,
    // Free-text fields: country code + visa status kept as bounded strings
    investor_country: z.string().max(10).optional().catch(undefined),
    visa_status: z.string().max(50).optional().catch(undefined),
    investor_goal_intl: QuizInvestorGoalIntlSchema,
  })
  .optional();

export type UnifiedAnswers = z.infer<typeof UnifiedAnswersSchema>;
