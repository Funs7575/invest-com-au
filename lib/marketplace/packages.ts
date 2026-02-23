import { createClient } from "@supabase/supabase-js";
import type { BrokerPackage } from "@/lib/types";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get all active package tiers.
 */
export async function getPackageTiers(): Promise<BrokerPackage[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("broker_packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data || []) as BrokerPackage[];
}

/**
 * Get the package assigned to a broker (via broker_accounts.package_id).
 */
export async function getBrokerPackage(
  brokerSlug: string
): Promise<BrokerPackage | null> {
  const supabase = getAdminClient();

  const { data: account } = await supabase
    .from("broker_accounts")
    .select("package_id")
    .eq("broker_slug", brokerSlug)
    .limit(1)
    .maybeSingle();

  if (!account?.package_id) return null;

  const { data: pkg } = await supabase
    .from("broker_packages")
    .select("*")
    .eq("id", account.package_id)
    .maybeSingle();

  return (pkg as BrokerPackage) || null;
}

/**
 * Get the effective CPC rate after package discount.
 * Returns the rate in cents.
 */
export function getEffectiveCpcRate(
  baseRateCents: number,
  pkg: BrokerPackage | null
): number {
  if (!pkg || pkg.cpc_rate_discount_pct <= 0) return baseRateCents;
  const discount = Math.round(baseRateCents * (pkg.cpc_rate_discount_pct / 100));
  return Math.max(baseRateCents - discount, 0);
}

/**
 * Assign a package to a broker account.
 */
export async function assignPackage(
  brokerSlug: string,
  packageId: number
): Promise<void> {
  const supabase = getAdminClient();
  await supabase
    .from("broker_accounts")
    .update({
      package_id: packageId,
      package_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("broker_slug", brokerSlug);
}
