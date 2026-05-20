/**
 * Unified audit trail (Idea #11).
 *
 * One place every privileged action records "who did what, when". Keyed by
 * the acting principal so the AFSL audit question — "who changed this?" —
 * has a single answer across admin mutations, moderation, deletions,
 * workspace switches, and (later) agent actions.
 *
 * Best-effort: recordAudit NEVER throws and NEVER blocks the underlying
 * action. A logging failure is logged and swallowed — losing an audit row
 * is bad, but failing the user's actual operation because the audit write
 * hiccuped is worse. Domain tables (forum_moderation_actions,
 * account_kind_switch_log) remain the system-of-record for their domain;
 * audit_events is the unified cross-domain read surface.
 *
 * See docs/audits/identity-platform-expansion-2026-05-20.md (Wave 1, #11).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getPrincipalForAuthUser } from "@/lib/principals";

const log = logger("audit");

export type ActorKind = "human" | "agent" | "partner_org" | "internal" | "system";

export interface AuditEventInput {
  /** The acting principal id, if known. */
  actorPrincipalId?: string | null;
  actorKind?: ActorKind;
  /** Dotted namespace: '<domain>.<verb>', e.g. 'forum.lock_thread'. */
  action: string;
  resourceType?: string | null;
  resourceId?: string | number | null;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Record one audit event. Best-effort — returns true on success, false on
 * any failure, never throws.
 */
export async function recordAudit(input: AuditEventInput): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_events").insert({
      actor_principal_id: input.actorPrincipalId ?? null,
      actor_kind: input.actorKind ?? (input.actorPrincipalId ? "human" : "system"),
      action: input.action,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId != null ? String(input.resourceId) : null,
      summary: input.summary ?? null,
      before_state: input.before ?? null,
      after_state: input.after ?? null,
      ip: input.ip ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) {
      log.warn("recordAudit insert failed", { action: input.action, error: error.message });
      return false;
    }
    return true;
  } catch (err) {
    log.warn("recordAudit threw", {
      action: input.action,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Convenience: record an audit event for an action taken by an authenticated
 * user, resolving their principal automatically. Use from API routes where
 * you have the auth user id but not the principal.
 */
export async function recordAuditForUser(
  authUserId: string,
  input: Omit<AuditEventInput, "actorPrincipalId" | "actorKind">,
): Promise<boolean> {
  let principalId: string | null = null;
  try {
    const principal = await getPrincipalForAuthUser(authUserId);
    principalId = principal?.id ?? null;
  } catch {
    // best-effort — fall through with null principal
  }
  return recordAudit({ ...input, actorPrincipalId: principalId, actorKind: "human" });
}
