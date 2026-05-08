# ADR-0001: Stripe Webhook Handler Registry

**Status:** Accepted  
**Date:** 2026-03-15 (implemented in Stream J, iter 85–97)  
**Deciders:** Engineering (auto-remediation via audit Stream J)

---

## Context

The Stripe webhook route (`app/api/stripe/webhook/route.ts`) had grown to 1,197 LOC — a single monolithic `switch` statement handling 14 distinct Stripe event types, each with its own DB mutations, email dispatches, and error handling. Problems:

- Untestable in isolation: each handler path shared the route's Supabase client and Stripe instance, making unit tests impossible without spinning up full mocks of both.
- No idempotency: a crash mid-handler left no trace, so Stripe's retry would re-run the handler and potentially double-bill or double-send emails.
- No extensibility path: adding a new event type required editing the monolith, creating merge-conflict risk and review surface.
- Branch coverage near zero: the sheer number of event branches made the route effectively untestable.

---

## Decision

Split the webhook route into a **handler registry** (`lib/stripe-webhook/`) with the following structure:

```
lib/stripe-webhook/
  registry.ts          # Map<eventType, handler> + dispatch/register exports
  types.ts             # WebhookContext, WebhookHandler, DispatchResult
  handlers/
    index.ts           # Side-effect import — registers all handlers
    checkout-session-completed.ts
    customer-subscription.ts
    invoice.ts
    charge-refunded.ts
    charge-dispute-created.ts
    payment-intent-failed.ts
    payout-failed.ts
    radar-early-fraud-warning.ts
    customer-subscription-paused.ts
```

The route itself becomes ~165 LOC: signature verification, idempotency, and a single `dispatchEvent(event, ctx)` call.

### Handler contract

```typescript
type WebhookHandler = (
  event: Stripe.Event,
  ctx: WebhookContext,
) => Promise<WebhookHandlerResult>;

interface WebhookContext {
  admin: SupabaseClient<Database>; // service-role, injected once per event
  stripe: Stripe;
  log: Logger;
}

type WebhookHandlerResult =
  | { status: "done" }
  | { status: "partial"; reason: string }
  | { status: "error"; error: Error };
```

Handlers never call `createAdminClient()` or `getStripe()` directly — both are injected, making handlers pure functions over their context.

### Idempotency

Before dispatch, the route inserts a `stripe_webhook_events` row with `status: "processing"`. Duplicate-key on `event_id` means the event was already seen; the route checks the existing row's status and age:

- `status === "done"` → skip (already processed)
- `status === "processing"` and `started_at` within 5 minutes → skip (another worker owns it)
- `status === "processing"` and `started_at` older than 5 minutes → re-take (previous worker crashed)

On successful dispatch the row is updated to `status: "done"`. On handler error the row is updated to `status: "error"`, so Stripe's next retry re-takes the stale-processing path and re-runs.

### Registration

`handlers/index.ts` calls `registerHandler(eventType, handlerFn)` for each event type. The route imports this file for its side-effect (`import "@/lib/stripe-webhook/handlers"`), ensuring all handlers are registered before the first request is served.

`dispatchEvent()` returns `{ handled: false }` for unregistered event types (logged as informational, not an error). This enabled incremental migration: unregistered events fell through to a legacy stub until all types were migrated in J-01e.

### Test seams

`registry.ts` exports two test-only helpers (not part of the public API):

```typescript
export function _resetRegistry(): void;          // wipe Map between tests
export function _registeredEventTypes(): string[]; // introspect registrations
```

This makes the registry independently testable without touching the route.

---

## Consequences

**Good:**
- Each handler is independently unit-testable with a mock `WebhookContext`.
- Adding a new event type is a two-file change (new handler + one `registerHandler` call in `index.ts`).
- Idempotency is event-level, not handler-level — handlers don't need to be internally idempotent.
- ~80 unit and integration tests now cover registry dispatch, individual handler paths, and the idempotency state machine.

**Neutral:**
- The side-effect import in `route.ts` is unusual. It's the standard Node.js module-side-effect pattern (cf. `reflect-metadata` in TypeScript DI frameworks) and is documented in `registry.ts`.
- The `WebhookContext` type is webhook-specific — it is not a general "server context" type and should not be reused for non-webhook code.

**Bad / watch out:**
- Handler registration is global (module-level `Map`). Tests must call `_resetRegistry()` in `beforeEach` or they leak handler state between test files. All existing handler tests already do this.
- The `status: "partial"` return is not currently used but is reserved for handlers that do some work but need a retry (e.g., partial DB write before an external API failure). If used, the route would need to update `stripe_webhook_events.status` to `"error"` to allow Stripe's retry to re-run.

---

## Alternatives considered

**Keep the monolith, extract helpers:** Easier short-term but doesn't solve testability or the idempotency gap. Rejected.

**Each event type as a separate Next.js route (`/api/stripe/webhook/[event]`):** Stripe sends all events to a single URL — this would require a reverse-proxy or Stripe webhook fan-out configuration. Rejected as infra complexity with no benefit.

**Database-backed handler registry:** Store handler metadata in `feature_flags` or a dedicated table, enabling runtime enable/disable. Deferred — current use case doesn't require runtime flag toggling, and the complexity cost is high. Revisit if the platform needs per-tenant event routing.

---

## References

- `lib/stripe-webhook/registry.ts` — registry implementation
- `lib/stripe-webhook/types.ts` — shared types
- `lib/stripe-webhook/handlers/index.ts` — registration manifest
- `app/api/stripe/webhook/route.ts` — dispatch entry point
- `__tests__/lib/stripe-webhook/registry.test.ts` — registry unit tests
- `__tests__/api/stripe-webhook-idempotency.test.ts` — idempotency harness
- Stream J iteration logs: `docs/audits/REMEDIATION_QUEUE_LOG_ARCHIVE.md` iter 85–97
