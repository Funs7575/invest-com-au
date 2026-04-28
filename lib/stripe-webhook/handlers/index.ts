/**
 * Stripe webhook handler registration.
 *
 * Imports each event-family handler and registers it against the
 * registry. The webhook route imports this module for its side effect
 * (registration) before calling `dispatchEvent`.
 *
 * Adding a new handler:
 *   1. Create `<event-family>.ts` in this directory.
 *   2. Add the `import` + `registerHandler` line below.
 *   3. (J-01d) Add a test in `__tests__/lib/stripe-webhook/<event-family>.test.ts`.
 *
 * Removing one is the inverse — the registry uses `Map.set` so
 * unregistered events fall through to the legacy switch (which logs
 * "unknown event type" and returns 200, per Stripe's expectation).
 */

import { registerHandler } from "../registry";
import { handleChargeDisputeCreated } from "./charge-dispute-created";
import { handleChargeRefunded } from "./charge-refunded";
import {
  handleCustomerSubscriptionCreated,
  handleCustomerSubscriptionDeleted,
  handleCustomerSubscriptionUpdated,
} from "./customer-subscription";
import {
  handleInvoicePaidEvent,
  handleInvoicePaymentFailedEvent,
} from "./invoice";

registerHandler("charge.dispute.created", handleChargeDisputeCreated);
registerHandler("charge.refunded", handleChargeRefunded);
registerHandler("customer.subscription.created", handleCustomerSubscriptionCreated);
registerHandler("customer.subscription.updated", handleCustomerSubscriptionUpdated);
registerHandler("customer.subscription.deleted", handleCustomerSubscriptionDeleted);
registerHandler("invoice.paid", handleInvoicePaidEvent);
registerHandler("invoice.payment_failed", handleInvoicePaymentFailedEvent);

// Subsequent handlers will be added here as J-01c-2 lands:
// registerHandler("checkout.session.completed", handleCheckoutSessionCompleted);
