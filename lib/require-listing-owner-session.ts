/**
 * Listing-owner session resolver (W2 Phase 4).
 *
 * Two-tier auth:
 *   1. JWT (full Supabase Auth): user has a `listing_owner_accounts` row.
 *      Returned shape: `{ kind: "jwt", userId, accountId }`.
 *   2. OTP cookie fallback (legacy at `/invest/my-listings`): the existing
 *      `iv_listing_owner_otp` HMAC-signed cookie issued by /api/listings/
 *      my-listings/verify is still valid. Returned shape:
 *      `{ kind: "otp", email }`.
 *   3. Neither → null.
 *
 * The dual-auth pattern lets us promote the OTP cookie to a full account
 * over a 60-day rollout without breaking existing OTP-verified users.
 * Phase 4b deprecates the cookie path once dual-write metrics show ≥80%
 * conversion.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("require-listing-owner-session");

export type ListingOwnerSession =
  | { kind: "jwt"; userId: string; accountId: number }
  | { kind: "otp"; email: string };

export async function requireListingOwnerSession(): Promise<ListingOwnerSession | null> {
  // 1. Try JWT first.
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("listing_owner_accounts")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) {
        log.warn("listing-owner JWT lookup failed", {
          userId: user.id,
          error: error.message,
        });
      } else if (data) {
        return { kind: "jwt", userId: user.id, accountId: data.id as number };
      }
    }
  } catch (err) {
    log.warn("requireListingOwnerSession JWT path threw", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Try OTP cookie fallback. The cookie helper is sync; we read the
  // cookie via next/headers and pass the value in.
  try {
    const { cookies } = await import("next/headers");
    const { verifyListingOwnerCookie, LISTING_OWNER_COOKIE_NAME } = await import(
      "@/lib/listing-owner-cookie"
    );
    const c = await cookies();
    const value = c.get(LISTING_OWNER_COOKIE_NAME)?.value;
    if (value) {
      const result = verifyListingOwnerCookie(value);
      if (result.ok && result.email) {
        return { kind: "otp", email: result.email };
      }
    }
  } catch (err) {
    log.debug("OTP cookie fallback failed (non-fatal)", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return null;
}
