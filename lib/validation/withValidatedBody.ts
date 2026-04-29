/**
 * `withValidatedBody` — request-body Zod validation wrapper for API routes.
 *
 * Author a route handler that takes a *parsed*, *typed* body and let the
 * wrapper deal with JSON-parse errors, schema validation, and the 400
 * response envelope. Lets every callsite drop ~10 lines of try/catch +
 * field guards.
 *
 * Usage:
 *
 *   import { z } from "zod";
 *   import { withValidatedBody } from "@/lib/validation/withValidatedBody";
 *
 *   const Body = z.object({
 *     email: z.string().email(),
 *     plan: z.enum(["free", "pro"]),
 *   });
 *
 *   export const POST = withValidatedBody(Body, async (req, body) => {
 *     // body is fully typed: { email: string; plan: "free" | "pro" }
 *     return NextResponse.json({ ok: true });
 *   });
 *
 * Response shape on failure (matches the established error envelope across
 * `app/api/*` routes — single `{ error }` field with status 400 — extended
 * with a stable `code` discriminator and the raw Zod issues array so client
 * code can render field-level errors when it wants to):
 *
 *   - Invalid JSON body  →  400 { error: "Invalid JSON body" }
 *   - Schema mismatch    →  400 {
 *       error: "<first human-readable issue>",
 *       code: "validation_error",
 *       issues: ZodIssue[],
 *     }
 *
 * The helper deliberately does **not** log. Logging is the route's job
 * (and several routes already log JSON-parse failures with their own
 * scoped `logger("<route>")`). Keeping the wrapper transparent means it
 * composes with edge runtime, node runtime, cron auth wrappers, and so on
 * without surprising side-effects.
 *
 * Handler errors are *not* swallowed — if the handler throws, the wrapper
 * re-throws so Sentry / Next's default error boundary still fire. This is
 * the same contract the un-wrapped routes have today.
 */

import type { NextRequest, NextResponse } from "next/server";
import { NextResponse as NextResponseImpl } from "next/server";
import type { z } from "zod";

/** Stable error code for schema-validation 400s. */
export const VALIDATION_ERROR_CODE = "validation_error" as const;

export interface ValidationErrorBody {
  error: string;
  code: typeof VALIDATION_ERROR_CODE;
  issues: z.core.$ZodIssue[];
}

export interface InvalidJsonBody {
  error: "Invalid JSON body";
}

/**
 * Wraps a route handler so it receives a parsed, schema-validated body.
 *
 * - The schema is constrained to `z.ZodType` so `z.infer<typeof schema>`
 *   resolves to the schema's exact output type — the handler's `body`
 *   parameter is fully typed without the caller having to specify a
 *   generic explicitly.
 * - Falls through to a 400 with a stable error envelope on JSON-parse
 *   failure or schema mismatch; never invokes the handler in those cases.
 */
export function withValidatedBody<Schema extends z.ZodType>(
  schema: Schema,
  handler: (
    req: NextRequest,
    body: z.infer<Schema>,
  ) => Promise<NextResponse> | NextResponse,
): (req: NextRequest) => Promise<NextResponse> {
  return async function validatedRoute(req: NextRequest): Promise<NextResponse> {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponseImpl.json<InvalidJsonBody>(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues;
      // Surface the first issue as the human-readable summary. Clients that
      // want field-level rendering use the `issues` array directly.
      const firstIssue = issues[0];
      const path = firstIssue?.path?.join(".") ?? "";
      const message = firstIssue?.message ?? "Invalid request body";
      const error = path ? `${path}: ${message}` : message;
      return NextResponseImpl.json<ValidationErrorBody>(
        {
          error,
          code: VALIDATION_ERROR_CODE,
          issues,
        },
        { status: 400 },
      );
    }

    // `parsed.data` is `z.infer<Schema>`; the handler's `body` parameter
    // type is preserved end-to-end without a cast.
    return handler(req, parsed.data);
  };
}
