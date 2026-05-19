/**
 * Post-signin orchestrator (Phase 2.5).
 *
 * One place to call from /auth/callback after a successful authentication:
 * runs every "after sign-up, link my pre-existing rows" task without the
 * auth callback needing to know about each one. Today calls:
 *
 *   - claimAllByEmail (lib/claim/by-email.ts) — 8 almost-account tables
 *     (quiz_leads, professional_leads, email_captures, etc.) get their
 *     email-matched rows linked to the new user
 *   - claimAnonymousSaves (lib/bookmarks.ts) — session-id-keyed anonymous
 *     bookmarks + calculator state get linked to the new user
 *
 * Fire-and-forget from the caller's perspective: errors are logged but
 * never thrown, so the auth callback always completes the redirect even
 * if a downstream table is temporarily unavailable. Idempotent — running
 * twice on the same user is a no-op for already-claimed rows.
 */

import { claimAllByEmail } from "@/lib/claim/by-email";
import { claimAnonymousSaves } from "@/lib/bookmarks";
import { getPrincipalForAuthUser } from "@/lib/principals";
import { logger } from "@/lib/logger";

const log = logger("post-signin");

export interface PostSigninContext {
  authUserId: string;
  email: string | null;
  /** Anonymous session id from the cookie, if any. */
  sessionId?: string | null;
}

export interface PostSigninReport {
  emailClaimed: number;
  sessionClaimed: number;
}

/**
 * Run the post-signin task list. Safe to call after every auth callback.
 * Returns counts for logging / instrumentation; the caller should not
 * gate its redirect on the return value.
 */
export async function runPostSignin(ctx: PostSigninContext): Promise<PostSigninReport> {
  const report: PostSigninReport = { emailClaimed: 0, sessionClaimed: 0 };

  // Resolve the principal once so claimByEmail can stamp principal_id
  // alongside auth_user_id when the registry entry asks for it.
  let principalId: string | null = null;
  try {
    const principal = await getPrincipalForAuthUser(ctx.authUserId);
    principalId = principal?.id ?? null;
  } catch (err) {
    log.warn("post-signin principal lookup failed", {
      authUserId: ctx.authUserId,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // Email-keyed claim across every CLAIMABLE_TABLES entry.
  if (ctx.email) {
    try {
      const results = await claimAllByEmail({
        email: ctx.email,
        authUserId: ctx.authUserId,
        principalId,
      });
      report.emailClaimed = results.reduce((sum, r) => sum + r.claimed, 0);
      const errored = results.filter((r) => r.error).map((r) => `${r.table}:${r.error}`);
      if (errored.length > 0) {
        log.warn("post-signin claimByEmail had per-table errors", {
          authUserId: ctx.authUserId,
          errored,
        });
      }
    } catch (err) {
      log.warn("post-signin claimAllByEmail threw", {
        authUserId: ctx.authUserId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Session-keyed claim for anonymous bookmarks + calculator state.
  if (ctx.sessionId) {
    try {
      report.sessionClaimed = await claimAnonymousSaves(ctx.sessionId, ctx.authUserId);
    } catch (err) {
      log.warn("post-signin claimAnonymousSaves threw", {
        authUserId: ctx.authUserId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (report.emailClaimed > 0 || report.sessionClaimed > 0) {
    log.info("post-signin claims complete", {
      authUserId: ctx.authUserId,
      emailClaimed: report.emailClaimed,
      sessionClaimed: report.sessionClaimed,
    });
  }

  return report;
}
