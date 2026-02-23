import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { BrokerAccount, BrokerWallet } from "@/lib/types";

export interface BrokerSession {
  account: BrokerAccount;
  wallet: BrokerWallet;
}

/**
 * Get the current broker account + wallet if logged in.
 * Returns null if not authenticated or no broker account found.
 */
export async function getBrokerAccount(): Promise<BrokerSession | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: account } = await supabase
    .from("broker_accounts")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!account) return null;

  const { data: wallet } = await supabase
    .from("broker_wallets")
    .select("*")
    .eq("broker_slug", account.broker_slug)
    .maybeSingle();

  return {
    account: account as BrokerAccount,
    wallet: (wallet || {
      id: 0,
      broker_slug: account.broker_slug,
      balance_cents: 0,
      lifetime_deposited_cents: 0,
      lifetime_spent_cents: 0,
      currency: "AUD",
      updated_at: new Date().toISOString(),
    }) as BrokerWallet,
  };
}

/**
 * Require an active broker account. Redirects to login if not found.
 * Use in server components.
 */
export async function requireBrokerAccount(): Promise<BrokerSession> {
  const session = await getBrokerAccount();
  if (!session) {
    redirect("/broker-portal/login");
  }
  return session;
}

/**
 * Check if a user has a broker account (any status).
 * Useful for showing different UI based on whether someone is a broker rep.
 */
export async function isBrokerUser(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("broker_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return !!data;
}
