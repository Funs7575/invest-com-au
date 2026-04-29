/**
 * Stripe webhook handler registry (J-01 scaffold).
 *
 * Maps `event.type` strings (e.g., `charge.dispute.created`) to handler
 * functions. The dispatch flow:
 *
 *   1. webhook route resolves event + builds `WebhookContext`
 *   2. calls `dispatchEvent(event, ctx)`
 *   3. registry returns `{ handled: true, result }` if a handler exists,
 *      or `{ handled: false }` so the route can fall through to the
 *      legacy switch (the migration is incremental — see J-01b/c)
 *
 * Adding a handler is one line in `handlers/index.ts`. Removing one is
 * deleting that line. Tests in `__tests__/lib/stripe-webhook/` exercise
 * each handler in isolation against a mock `WebhookContext`.
 */

import type Stripe from "stripe";
import type { WebhookContext, WebhookHandler, WebhookHandlerResult } from "./types";

/**
 * Internal registry. Populated by `handlers/index.ts` at import time;
 * intentionally not exported (callers go through `dispatchEvent`).
 */
const handlers = new Map<string, WebhookHandler>();

/**
 * Register a handler for a Stripe event type. Idempotent — registering
 * the same type twice replaces the prior handler (useful in tests).
 */
export function registerHandler(eventType: string, handler: WebhookHandler): void {
  handlers.set(eventType, handler);
}

/**
 * Dispatch result. `handled: false` is the signal to fall through to
 * the legacy switch in `app/api/stripe/webhook/route.ts` while the
 * migration is incremental.
 */
export type DispatchResult =
  | { handled: true; result: WebhookHandlerResult }
  | { handled: false };

/**
 * Look up the handler for `event.type` and invoke it. Returns
 * `{ handled: false }` if no handler is registered (caller falls
 * through to legacy logic).
 */
export async function dispatchEvent(
  event: Stripe.Event,
  ctx: WebhookContext,
): Promise<DispatchResult> {
  const handler = handlers.get(event.type);
  if (!handler) return { handled: false };

  try {
    const result = await handler(event, ctx);
    return { handled: true, result };
  } catch (err) {
    return {
      handled: true,
      result: {
        status: "error",
        error: err instanceof Error ? err : new Error(String(err)),
      },
    };
  }
}

/**
 * Test seam: clear the registry so each test starts from a clean
 * state. Production code should not call this.
 */
export function _resetRegistry(): void {
  handlers.clear();
}

/**
 * Test seam: report which event types are currently registered.
 */
export function _registeredEventTypes(): string[] {
  return Array.from(handlers.keys()).sort();
}
