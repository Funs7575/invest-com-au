/**
 * Firm-wide seat subscription billing (Idea #13).
 *
 * Reader + seat-accounting helpers over firm_subscriptions. One bill per
 * firm, seats tracked against active firm membership. Stripe lifecycle is
 * driven by webhooks (handlers ship with the SKU); this module is the
 * app-side read + the seat-availability check used when adding advisors.
 */

// eslint-disable-next-line no-restricted-imports -- cross-user / service-role-managed reads with no per-user JWT path (see CLAUDE.md § "Two Supabase clients").
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("firm-subscriptions");

export interface FirmSubscription {
  firmId: number;
  pricingTierId: number | null;
  seats: number;
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  currentPeriodEnd: string | null;
}

export async function getFirmSubscription(firmId: number): Promise<FirmSubscription | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("firm_subscriptions")
      .select("firm_id, pricing_tier_id, seats, status, current_period_end")
      .eq("firm_id", firmId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      firmId: data.firm_id as number,
      pricingTierId: (data.pricing_tier_id as number | null) ?? null,
      seats: data.seats as number,
      status: data.status as FirmSubscription["status"],
      currentPeriodEnd: (data.current_period_end as string | null) ?? null,
    };
  } catch (err) {
    log.warn("getFirmSubscription threw", { firmId, err: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/**
 * Count active advisors attached to a firm (seats consumed).
 */
export async function countFirmSeatsUsed(firmId: number): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", firmId)
      .eq("status", "active");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export interface SeatAvailability {
  seats: number;
  used: number;
  available: number;
  hasActiveSubscription: boolean;
}

/**
 * Seat availability for a firm: subscribed seats vs active advisors. Used
 * to gate "invite another advisor" once seats are exhausted.
 */
export async function getFirmSeatAvailability(firmId: number): Promise<SeatAvailability> {
  const [sub, used] = await Promise.all([
    getFirmSubscription(firmId),
    countFirmSeatsUsed(firmId),
  ]);
  const seats = sub?.seats ?? 0;
  const active = sub?.status === "active" || sub?.status === "trialing";
  return {
    seats,
    used,
    available: Math.max(0, seats - used),
    hasActiveSubscription: active,
  };
}

/**
 * Pure: can the firm add another seat right now?
 */
export function canAddSeat(availability: SeatAvailability): boolean {
  return availability.hasActiveSubscription && availability.available > 0;
}
