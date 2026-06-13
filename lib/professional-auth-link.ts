// eslint-disable-next-line no-restricted-imports -- self-heal links a professionals row that has no auth_user_id yet, so it cannot be scoped to auth.uid() and RLS would deny the write (CLAUDE.md §"Two Supabase clients")
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("professional-auth-link");

/**
 * Self-heal the link between a Supabase auth user and their `professionals` row.
 *
 * Professional rows created through the application/approval flow
 * (`/advisor-apply`, admin approval, legacy imports) carry a NULL
 * `auth_user_id` — they were never connected to a Supabase auth user. But the
 * portal gate (`enforcePortalKind`) and the `account_kind_membership` view both
 * key off `auth_user_id`, so an unlinked professional can authenticate yet
 * appear to hold *zero* workspace kinds and get bounced straight out of their
 * own portal. As of 2026-06, ~177 of 180 active advisors (98%) were unlinked —
 * i.e. locked out of `/advisor-portal` and every revenue action behind it.
 *
 * This links the row on a verified-email match so the membership view starts
 * reporting the kind. Call it at the auth boundary — the login callback and the
 * portal gate — right before kinds are resolved.
 *
 * Safety:
 *  - Only ever fills a NULL `auth_user_id`; it never re-points an existing link,
 *    so it cannot transfer one professional's identity onto another account.
 *  - Matches on the email Supabase already verified for this session
 *    (magic-link click / password / signup), so email ownership is proven.
 *  - `professionals.email` is effectively unique and the partial unique index
 *    `professionals_auth_user_id_unique` guards `auth_user_id`, so at most one
 *    row is linked per call (a unique-violation just fails the write closed).
 *  - Idempotent and best-effort: safe to call on every request; never throws.
 *
 * Mirrors the inline self-heal that already exists in
 * `app/api/advisor-auth/session/route.ts` — hoisted into a shared helper so it
 * also runs at the boundaries that fire *before* that endpoint is ever reached.
 *
 * @returns the number of rows newly linked (0 when already linked / no match).
 */
export async function linkProfessionalAuthUser(
  userId: string | null | undefined,
  email: string | null | undefined,
): Promise<number> {
  if (!userId || !email) return 0;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("professionals")
      .update({
        auth_user_id: userId,
        last_login_at: new Date().toISOString(),
      })
      .is("auth_user_id", null)
      .eq("email", email)
      .in("status", ["active", "pending"])
      .select("id");
    if (error) {
      log.warn("linkProfessionalAuthUser update failed", {
        userId,
        error: error.message,
      });
      return 0;
    }
    const linked = data?.length ?? 0;
    if (linked > 0) {
      log.info("self-healed professional auth link on login", { userId, linked });
    }
    return linked;
  } catch (err) {
    log.warn("linkProfessionalAuthUser threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}
