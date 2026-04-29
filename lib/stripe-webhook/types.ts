/**
 * Shared types for the Stripe webhook handler registry (J-01).
 *
 * The 1197-line `app/api/stripe/webhook/route.ts` was a single switch
 * statement that mixed dispatch, idempotency, email helpers, and 7
 * event-specific handlers. This module introduces a typed registry so
 * handlers can be moved to one-file-per-event-family — each handler
 * becomes independently testable, the dispatch loop becomes a 3-line
 * lookup, and adding new event types (J-03..J-10) becomes a one-file
 * change instead of a 100-line edit to the central switch.
 */

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "@/lib/logger";
import type { Database } from "@/lib/database.types";

/**
 * Read-only context passed to every webhook handler. Each handler
 * receives the same context instance per event so they can share the
 * already-constructed admin client + a scoped logger. Adding a field
 * here is the only way to share infra across handlers — handlers must
 * never reach for `createAdminClient()` directly (keeps the test seams
 * predictable).
 */
export interface WebhookContext {
  /** Service-role Supabase client; bypasses RLS. */
  admin: SupabaseClient<Database>;
  /** Stripe SDK instance configured with the project's API key. */
  stripe: Stripe;
  /** Logger scoped to the dispatch context (`stripe-webhook` ctx). */
  log: Logger;
}

/**
 * Result of a handler. `done` means the event was fully processed and
 * the idempotency row should be marked `done`. `partial` means some
 * side-effect succeeded but a follow-up step is required (e.g., email
 * couldn't be sent — the row stays `processing` until a retry handler
 * confirms). `error` means the handler failed; the dispatch loop will
 * mark the row `error` and Stripe will retry.
 */
export type WebhookHandlerResult =
  | { status: "done" }
  | { status: "partial"; reason: string }
  | { status: "error"; error: Error };

/**
 * Per-event-family handler. The `event` is already type-narrowed to
 * the family by the registry (e.g., `charge.dispute.created` handlers
 * receive the parsed `Stripe.Dispute` via `event.data.object`).
 */
export type WebhookHandler = (
  event: Stripe.Event,
  ctx: WebhookContext,
) => Promise<WebhookHandlerResult>;
