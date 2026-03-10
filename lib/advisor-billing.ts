import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("advisor-billing");

/** Price per lead in cents after free tier is exhausted */
export const DEFAULT_LEAD_PRICE_CENTS = 3900; // A$39 per lead
export const FREE_LEAD_LIMIT = 3; // 3 free leads to prove value
export const DEFAULT_TOPUP_CENTS = 15000; // A$150 credit top-up (~4 leads)
export const ARTICLE_STANDARD_PRICE_CENTS = 19900; // A$199 standard article
export const ARTICLE_FEATURED_PRICE_CENTS = 39900; // A$399 featured article

/**
 * Get or create a Stripe customer for a professional advisor.
 * Stores the stripe_customer_id on the professionals row for future use.
 */
export async function getOrCreateStripeCustomer(
  professionalId: number,
  email: string,
  name: string,
): Promise<string> {
  const supabase = createAdminClient();
  const stripe = getStripe();

  // Check if advisor already has a Stripe customer ID
  const { data: pro } = await supabase
    .from("professionals")
    .select("stripe_customer_id")
    .eq("id", professionalId)
    .single();

  if (pro?.stripe_customer_id) {
    return pro.stripe_customer_id;
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      professional_id: String(professionalId),
      source: "invest_com_au_advisor",
    },
  });

  // Store the customer ID
  await supabase
    .from("professionals")
    .update({ stripe_customer_id: customer.id })
    .eq("id", professionalId);

  return customer.id;
}

/**
 * Create a Stripe invoice for a lead billing record.
 * This creates a draft invoice with a single line item, then finalises and sends it.
 */
export async function createLeadInvoice(billingId: number): Promise<string | null> {
  const supabase = createAdminClient();
  const stripe = getStripe();

  // Fetch billing record with professional info
  const { data: billing, error: billingError } = await supabase
    .from("advisor_billing")
    .select("id, professional_id, amount_cents, description, status, lead_id")
    .eq("id", billingId)
    .single();

  if (billingError || !billing) {
    log.error("Billing record not found", { billingId });
    return null;
  }

  if (billing.status !== "pending") {
    log.warn("Billing record not in pending state", { billingId, status: billing.status });
    return null;
  }

  const { data: pro } = await supabase
    .from("professionals")
    .select("id, name, email, stripe_customer_id")
    .eq("id", billing.professional_id)
    .single();

  if (!pro?.email) {
    log.error("Professional not found or missing email", { professionalId: billing.professional_id });
    return null;
  }

  try {
    const customerId = await getOrCreateStripeCustomer(pro.id, pro.email, pro.name);

    // Create invoice with a line item
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 14,
      metadata: {
        billing_id: String(billing.id),
        lead_id: String(billing.lead_id),
        professional_id: String(billing.professional_id),
        type: "advisor_lead",
      },
    });

    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: billing.amount_cents,
      currency: "aud",
      description: billing.description,
    });

    // Finalise and send the invoice
    const finalisedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // Send the invoice email
    await stripe.invoices.sendInvoice(invoice.id);

    // Update billing record with Stripe reference
    await supabase
      .from("advisor_billing")
      .update({
        stripe_invoice_id: finalisedInvoice.id,
        status: "invoiced",
        invoice_number: finalisedInvoice.number,
        updated_at: new Date().toISOString(),
      })
      .eq("id", billingId);

    log.info("Lead invoice created", {
      billingId,
      invoiceId: finalisedInvoice.id,
      amount: `$${(billing.amount_cents / 100).toFixed(2)}`,
    });

    return finalisedInvoice.id;
  } catch (err) {
    log.error("Failed to create lead invoice", {
      billingId,
      error: err instanceof Error ? err.message : String(err),
    });

    // Mark billing as failed so it can be retried
    await supabase
      .from("advisor_billing")
      .update({
        status: "invoice_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", billingId);

    return null;
  }
}

/**
 * Handle a successful invoice payment from Stripe webhook.
 * Updates the advisor_billing record to "paid".
 */
export async function handleInvoicePaid(
  stripeInvoiceId: string,
  paymentIntentId: string | null,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: billing, error } = await supabase
    .from("advisor_billing")
    .select("id, professional_id, amount_cents, lead_id")
    .eq("stripe_invoice_id", stripeInvoiceId)
    .single();

  if (error || !billing) {
    // Not an advisor billing invoice -- ignore
    return;
  }

  const { error: updateError } = await supabase
    .from("advisor_billing")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", billing.id);

  if (updateError) {
    log.error("Failed to update billing to paid", {
      billingId: billing.id,
      error: updateError.message,
    });
    return;
  }

  // Update the lead record
  if (billing.lead_id) {
    await supabase
      .from("professional_leads")
      .update({ billed: true, updated_at: new Date().toISOString() })
      .eq("id", billing.lead_id);
  }

  log.info("Advisor billing paid", {
    billingId: billing.id,
    amount: `$${(billing.amount_cents / 100).toFixed(2)}`,
  });
}

/**
 * Handle a failed invoice payment from Stripe webhook.
 * Updates the advisor_billing record to "payment_failed".
 */
export async function handleInvoicePaymentFailed(
  stripeInvoiceId: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: billing, error } = await supabase
    .from("advisor_billing")
    .select("id")
    .eq("stripe_invoice_id", stripeInvoiceId)
    .single();

  if (error || !billing) {
    // Not an advisor billing invoice -- ignore
    return;
  }

  await supabase
    .from("advisor_billing")
    .update({
      status: "payment_failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", billing.id);

  log.warn("Advisor billing payment failed", { billingId: billing.id });
}
