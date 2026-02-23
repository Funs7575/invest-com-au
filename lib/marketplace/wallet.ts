import { createClient } from "@supabase/supabase-js";
import type { BrokerWallet, WalletTransaction } from "@/lib/types";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get the wallet for a broker. Creates one if it doesn't exist.
 */
export async function getOrCreateWallet(brokerSlug: string): Promise<BrokerWallet> {
  const supabase = getAdminClient();

  const { data: existing } = await supabase
    .from("broker_wallets")
    .select("*")
    .eq("broker_slug", brokerSlug)
    .maybeSingle();

  if (existing) return existing as BrokerWallet;

  const { data: created, error } = await supabase
    .from("broker_wallets")
    .insert({ broker_slug: brokerSlug })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create wallet: ${error.message}`);
  return created as BrokerWallet;
}

/**
 * Get wallet balance in cents.
 */
export async function getWalletBalance(brokerSlug: string): Promise<number> {
  const wallet = await getOrCreateWallet(brokerSlug);
  return wallet.balance_cents;
}

/**
 * Credit (add funds to) a broker's wallet.
 * Creates an immutable transaction record and updates the balance.
 */
export async function creditWallet(
  brokerSlug: string,
  amountCents: number,
  description: string,
  reference?: { type: string; id: string; stripe_payment_intent_id?: string },
  createdBy?: string
): Promise<WalletTransaction> {
  if (amountCents <= 0) throw new Error("Credit amount must be positive");

  const supabase = getAdminClient();
  const wallet = await getOrCreateWallet(brokerSlug);

  const newBalance = wallet.balance_cents + amountCents;

  // Update wallet balance + lifetime deposited
  const { error: updateErr } = await supabase
    .from("broker_wallets")
    .update({
      balance_cents: newBalance,
      lifetime_deposited_cents: wallet.lifetime_deposited_cents + amountCents,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id);

  if (updateErr) throw new Error(`Wallet credit failed: ${updateErr.message}`);

  // Insert immutable transaction
  const { data: txn, error: txnErr } = await supabase
    .from("wallet_transactions")
    .insert({
      broker_slug: brokerSlug,
      type: "deposit",
      amount_cents: amountCents,
      balance_after_cents: newBalance,
      description,
      reference_type: reference?.type || null,
      reference_id: reference?.id || null,
      stripe_payment_intent_id: reference?.stripe_payment_intent_id || null,
      created_by: createdBy || "system",
    })
    .select("*")
    .single();

  if (txnErr) throw new Error(`Transaction insert failed: ${txnErr.message}`);
  return txn as WalletTransaction;
}

/**
 * Debit (spend from) a broker's wallet.
 * Checks sufficient balance before proceeding.
 */
export async function debitWallet(
  brokerSlug: string,
  amountCents: number,
  description: string,
  reference?: { type: string; id: string }
): Promise<WalletTransaction> {
  if (amountCents <= 0) throw new Error("Debit amount must be positive");

  const supabase = getAdminClient();
  const wallet = await getOrCreateWallet(brokerSlug);

  if (wallet.balance_cents < amountCents) {
    throw new Error("Insufficient wallet balance");
  }

  const newBalance = wallet.balance_cents - amountCents;

  // Optimistic concurrency: only update if balance hasn't changed
  const { data: updated, error: updateErr } = await supabase
    .from("broker_wallets")
    .update({
      balance_cents: newBalance,
      lifetime_spent_cents: wallet.lifetime_spent_cents + amountCents,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id)
    .eq("balance_cents", wallet.balance_cents) // Optimistic lock
    .select("*")
    .maybeSingle();

  if (updateErr || !updated) {
    throw new Error("Wallet debit failed — balance may have changed concurrently");
  }

  // Insert immutable transaction
  const { data: txn, error: txnErr } = await supabase
    .from("wallet_transactions")
    .insert({
      broker_slug: brokerSlug,
      type: "spend",
      amount_cents: amountCents,
      balance_after_cents: newBalance,
      description,
      reference_type: reference?.type || null,
      reference_id: reference?.id || null,
      created_by: "system",
    })
    .select("*")
    .single();

  if (txnErr) throw new Error(`Transaction insert failed: ${txnErr.message}`);

  // Check if auto-topup should be triggered
  checkAutoTopup(brokerSlug, newBalance).catch((err) =>
    console.error("Auto-topup check failed:", err)
  );

  return txn as WalletTransaction;
}

/**
 * Refund a previous debit to a broker's wallet.
 */
export async function refundWallet(
  brokerSlug: string,
  amountCents: number,
  description: string,
  reference?: { type: string; id: string }
): Promise<WalletTransaction> {
  if (amountCents <= 0) throw new Error("Refund amount must be positive");

  const supabase = getAdminClient();
  const wallet = await getOrCreateWallet(brokerSlug);
  const newBalance = wallet.balance_cents + amountCents;

  const { error: updateErr } = await supabase
    .from("broker_wallets")
    .update({
      balance_cents: newBalance,
      lifetime_spent_cents: Math.max(0, wallet.lifetime_spent_cents - amountCents),
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id);

  if (updateErr) throw new Error(`Wallet refund failed: ${updateErr.message}`);

  const { data: txn, error: txnErr } = await supabase
    .from("wallet_transactions")
    .insert({
      broker_slug: brokerSlug,
      type: "refund",
      amount_cents: amountCents,
      balance_after_cents: newBalance,
      description,
      reference_type: reference?.type || null,
      reference_id: reference?.id || null,
      created_by: "system",
    })
    .select("*")
    .single();

  if (txnErr) throw new Error(`Transaction insert failed: ${txnErr.message}`);
  return txn as WalletTransaction;
}

/**
 * Admin manual adjustment (can be positive or negative).
 */
export async function adjustWallet(
  brokerSlug: string,
  amountCents: number,
  description: string,
  adminEmail: string
): Promise<WalletTransaction> {
  const supabase = getAdminClient();
  const wallet = await getOrCreateWallet(brokerSlug);
  const newBalance = wallet.balance_cents + amountCents;

  if (newBalance < 0) throw new Error("Adjustment would result in negative balance");

  const updates: Record<string, any> = {
    balance_cents: newBalance,
    updated_at: new Date().toISOString(),
  };
  if (amountCents > 0) {
    updates.lifetime_deposited_cents = wallet.lifetime_deposited_cents + amountCents;
  } else {
    updates.lifetime_spent_cents = wallet.lifetime_spent_cents + Math.abs(amountCents);
  }

  const { error: updateErr } = await supabase
    .from("broker_wallets")
    .update(updates)
    .eq("id", wallet.id);

  if (updateErr) throw new Error(`Wallet adjustment failed: ${updateErr.message}`);

  const { data: txn, error: txnErr } = await supabase
    .from("wallet_transactions")
    .insert({
      broker_slug: brokerSlug,
      type: "adjustment",
      amount_cents: amountCents,
      balance_after_cents: newBalance,
      description,
      created_by: adminEmail,
    })
    .select("*")
    .single();

  if (txnErr) throw new Error(`Transaction insert failed: ${txnErr.message}`);
  return txn as WalletTransaction;
}

/**
 * Check if auto-topup should be triggered after a debit.
 * Fire-and-forget — never blocks the debit operation.
 */
async function checkAutoTopup(brokerSlug: string, currentBalance: number): Promise<void> {
  const supabase = getAdminClient();

  const { data: wallet } = await supabase
    .from("broker_wallets")
    .select("auto_topup_enabled, auto_topup_threshold_cents, auto_topup_amount_cents, stripe_payment_method_id")
    .eq("broker_slug", brokerSlug)
    .maybeSingle();

  if (
    !wallet?.auto_topup_enabled ||
    !wallet.stripe_payment_method_id ||
    !wallet.auto_topup_threshold_cents ||
    !wallet.auto_topup_amount_cents
  ) {
    return;
  }

  if (currentBalance > wallet.auto_topup_threshold_cents) {
    return; // Balance still above threshold
  }

  // Trigger auto top-up via Stripe off-session payment
  try {
    const { getStripe } = await import("@/lib/stripe");
    const stripe = getStripe();

    // Find or get the Stripe customer for this broker
    const { data: account } = await supabase
      .from("broker_accounts")
      .select("email, company_name")
      .eq("broker_slug", brokerSlug)
      .limit(1)
      .maybeSingle();

    // Create invoice record first
    const { data: invoice } = await supabase
      .from("marketplace_invoices")
      .insert({
        broker_slug: brokerSlug,
        amount_cents: wallet.auto_topup_amount_cents,
        type: "wallet_topup",
        status: "pending",
        description: `Auto top-up — $${(wallet.auto_topup_amount_cents / 100).toFixed(2)}`,
        broker_company_name: account?.company_name || null,
        broker_email: account?.email || null,
      })
      .select("id")
      .single();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: wallet.auto_topup_amount_cents,
      currency: "aud",
      payment_method: wallet.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      metadata: {
        type: "auto_topup",
        broker_slug: brokerSlug,
        invoice_id: invoice?.id ? String(invoice.id) : "",
      },
    });

    console.log(
      `Auto top-up triggered for ${brokerSlug}: $${(wallet.auto_topup_amount_cents / 100).toFixed(2)}, PI: ${paymentIntent.id}`
    );
  } catch (err) {
    console.error(`Auto top-up payment failed for ${brokerSlug}:`, err);
    // Don't throw — this is fire-and-forget
  }
}
