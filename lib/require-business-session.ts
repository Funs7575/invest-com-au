/**
 * Business-account session resolver (W2 Phase 3).
 *
 * JWT-only resolver for the business_owner AccountKind. Returns the
 * `business_accounts.id` when the JWT user has an active business account,
 * else null. Mirrors the require-advisor-session shape but skipping the
 * legacy-cookie fallback (no equivalent for business_accounts).
 *
 * Used by /business-portal/* layouts + any /api/business-* routes that
 * need to scope to the active business profile.
 *
 * RLS isolates rows by auth.uid() in `business_accounts`; this resolver
 * uses createClient() (user-scoped) so the policies fire and rejection
 * is automatic — no admin-client bypass needed.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("require-business-session");

export async function requireBusinessSession(): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("business_accounts")
      .select("id")
      .eq("auth_user_id", user.id)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (error) {
      log.warn("business session lookup failed", {
        userId: user.id,
        error: error.message,
      });
      return null;
    }
    return (data?.id as number | null) ?? null;
  } catch (err) {
    log.warn("requireBusinessSession threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
