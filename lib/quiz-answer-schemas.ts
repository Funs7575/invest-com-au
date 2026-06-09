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

// NOTE: the live quiz (app/quiz/page.tsx) emits `australia` for the
// resident option — NOT `au`. The old enum silently dropped every
// domestic location to `undefined` (nulling `quiz_leads.location`).
// Keep the legacy `au`/`au_expat` values too so older clients still
// degrade gracefully.
export const QuizLocationSchema = safeEnum([
  "australia",
  "international",
  "expat",
  "au",
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

// Readiness/stage. "learning" is the education-first exit; "under-contract"
// is the urgent tier (and feeds pickPrimary's settlement-clock rule).
export const QuizStageSchema = safeEnum([
  "under-contract",
  "ready",
  "exploring",
  "learning",
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
  "conveyancer",
  "financial-planner",
  "smsf-accountant",
  "tax-agent",
  "estate-planner",
  "commercial-property-agent",
  "not-sure",
]);

// Multi-select advisor need-set (the "who will you need?" question), stored as
// a comma-separated list of advisor-type keys. Kept as a bounded string here;
// deriveNeeds parses it and drops unknown tokens, so no enum is enforced.
export const QuizNeedsSchema = z.string().max(200).optional().catch(undefined);

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
    stage: QuizStageSchema,
    mode: QuizModeSchema,
    experience: QuizExperienceSchema,
    complexity: QuizComplexitySchema,
    amount: QuizAmountSchema,
    priority: QuizPrioritySchema,
    advisor_type: QuizAdvisorTypeSchema,
    needs: QuizNeedsSchema,
    property_sub: QuizPropertySubSchema,
    // Free-text fields: country code + visa status kept as bounded strings
    investor_country: z.string().max(10).optional().catch(undefined),
    visa_status: z.string().max(50).optional().catch(undefined),
    investor_goal_intl: QuizInvestorGoalIntlSchema,
  })
  .optional();

export type UnifiedAnswers = z.infer<typeof UnifiedAnswersSchema>;
