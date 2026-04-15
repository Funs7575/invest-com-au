/**
 * Shared API request/response schemas.
 *
 * Every public API route that returns structured data should
 * export its response shape here and assert it with
 * `assertResponse(schema, json)`. The contract test then runs
 * the assertion against a live (or Playwright-mocked) response
 * and fails the build if a backend change breaks the frontend
 * contract.
 *
 * Why zod + a central file instead of per-route schemas:
 *   - Single source of truth, greppable
 *   - Lets us generate a JSON schema bundle for partners /
 *     OpenAPI-like docs later
 *   - Easy to import into the E2E test suite
 */

import { z } from "zod";

// ─── Primitive building blocks ────────────────────────────────────

export const OkResponse = z.object({
  ok: z.literal(true),
});

export const ErrorResponse = z.object({
  error: z.string(),
});

// ─── /api/form-event ───────────────────────────────────────────────

export const FormEventRequest = z.object({
  session_id: z.string().min(1).max(100),
  user_key: z.string().optional().nullable(),
  form_name: z.enum([
    "quiz",
    "advisor_enquiry",
    "advisor_signup",
    "advisor_apply",
    "broker_apply",
    "lead_form",
  ]),
  step: z.string().min(1).max(100),
  step_index: z.number().int().nonnegative().optional().nullable(),
  event: z.enum(["view", "interact", "complete", "abandon"]),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const FormEventResponse = OkResponse;

// ─── /api/attribution/touch ────────────────────────────────────────

export const AttributionTouchRequest = z.object({
  session_id: z.string().min(1).max(100),
  user_key: z.string().optional().nullable(),
  event: z.enum(["view", "click", "signup", "lead", "conversion"]),
  source: z.string().optional().nullable(),
  medium: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
  landing_path: z.string().optional().nullable(),
  page_path: z.string().optional().nullable(),
  vertical: z.string().optional().nullable(),
  value_cents: z.number().int().optional().nullable(),
});

// ─── /api/search-semantic ──────────────────────────────────────────

export const SearchHit = z.object({
  type: z.enum(["article", "broker", "advisor", "qa", "scenario"]),
  id: z.string(),
  title: z.string(),
  excerpt: z.string(),
  score: z.number().min(0).max(1),
});

export const SearchResponse = z.object({
  hits: z.array(SearchHit),
  provider: z.string().optional(),
  degraded: z.boolean().optional(),
  error: z.string().optional(),
});

// ─── /api/privacy/request ──────────────────────────────────────────

export const PrivacyRequestInput = z.object({
  email: z.string().email(),
  type: z.enum(["export", "delete"]),
});

export const PrivacyRequestResponse = z.object({
  ok: z.literal(true),
  message: z.string(),
});

// ─── /api/admin/automation/bulk ────────────────────────────────────

export const BulkActionRequest = z.object({
  feature: z.enum([
    "listing_scam",
    "text_moderation",
    "advisor_applications",
    "broker_data_changes",
    "marketplace_campaigns",
  ]),
  targetVerdict: z.string().min(1),
  rowIds: z.array(z.number().int()).min(1).max(500),
  reason: z.string().optional().nullable(),
  subSurface: z.enum(["broker_review", "advisor_review"]).optional(),
});

export const BulkActionResponse = z.object({
  ok: z.boolean(),
  updated: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z.array(z.string()),
});

// ─── Helper: assert a response matches a schema ────────────────────

/**
 * Validates a parsed JSON body against a zod schema. Throws if it
 * doesn't match so a contract test can see the exact diff.
 *
 * Usage in Playwright / unit tests:
 *
 *     const body = await response.json();
 *     assertContract(SearchResponse, body);
 */
export function assertContract<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new Error(`Contract mismatch:\n${msg}`);
  }
  return result.data;
}
