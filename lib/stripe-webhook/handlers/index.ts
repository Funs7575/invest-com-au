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
import { handleCheckoutSessionCompleted } from "./checkout-session-completed";
import {
  handleCustomerSubscriptionCreated,
  handleCustomerSubscriptionDeleted,
  handleCustomerSubscriptionTrialWillEnd,
  handleCustomerSubscriptionUpdated,
} from "./customer-subscription";
import { handleCustomerSubscriptionPaused } from "./customer-subscription-paused";
import {
  handleInvoicePaidEvent,
  handleInvoicePaymentActionRequiredEvent,
  handleInvoicePaymentFailedEvent,
} from "./invoice";
import { handlePaymentIntentPaymentFailed } from "./payment-intent-failed";
import { handlePayoutFailed } from "./payout-failed";
import { handleRadarEarlyFraudWarning } from "./radar-early-fraud-warning";

registerHandler("charge.dispute.created", handleChargeDisputeCreated);
registerHandler("charge.refunded", handleChargeRefunded);
registerHandler("checkout.session.completed", handleCheckoutSessionCompleted);
registerHandler("customer.subscription.created", handleCustomerSubscriptionCreated);
registerHandler("customer.subscription.updated", handleCustomerSubscriptionUpdated);
registerHandler("customer.subscription.deleted", handleCustomerSubscriptionDeleted);
registerHandler("customer.subscription.paused", handleCustomerSubscriptionPaused);
registerHandler("customer.subscription.trial_will_end", handleCustomerSubscriptionTrialWillEnd);
registerHandler("invoice.paid", handleInvoicePaidEvent);
registerHandler("invoice.payment_action_required", handleInvoicePaymentActionRequiredEvent);
registerHandler("invoice.payment_failed", handleInvoicePaymentFailedEvent);
registerHandler("payment_intent.payment_failed", handlePaymentIntentPaymentFailed);
registerHandler("payout.failed", handlePayoutFailed);
registerHandler("radar.early_fraud_warning.created", handleRadarEarlyFraudWarning);
