/**
 * Forum moderation actions (Phase 2.4).
 *
 * Backs the /api/admin/forum-moderation endpoint and any future moderator
 * UI surfaces. Each public function:
 *   1. Verifies the actor is a moderator (forum_user_profiles.is_moderator)
 *   2. Performs the underlying mutation via service_role
 *   3. Appends a row to forum_moderation_actions for audit trail
 *
 * The is_moderator flag was promised by the original forum schema
 * (20260426_wave_launch_readiness.sql) but had no actual powers until
 * this module. Mod surfaces stay capability-gated rather than admin-only
 * so trusted community members can be promoted without giving away
 * the rest of the admin scope.
 */

// eslint-disable-next-line no-restricted-imports -- cross-user / service-role-managed reads with no per-user JWT path (see CLAUDE.md § "Two Supabase clients").
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getPrincipalForAuthUser } from "@/lib/principals";
import { recordAudit } from "@/lib/audit";

const log = logger("forum-moderation");

export type ModAction =
  | "lock_thread"
  | "unlock_thread"
  | "hide_post"
  | "unhide_post"
  | "hide_thread"
  | "unhide_thread"
  | "ban_user"
  | "unban_user"
  | "suspend_user"
  | "pin_thread"
  | "unpin_thread";

export type ModTargetType = "thread" | "post" | "user";

export interface ModResult {
  ok: boolean;
  error?: string;
}

/**
 * Returns true if the calling auth.users row is a forum moderator.
 */
export async function isModerator(authUserId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("forum_user_profiles")
      .select("is_moderator")
      .eq("user_id", authUserId)
      .maybeSingle();
    if (error || !data) return false;
    return data.is_moderator === true;
  } catch (err) {
    log.warn("isModerator threw", {
      authUserId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

async function recordAction(opts: {
  authUserId: string;
  action: ModAction;
  targetType: ModTargetType;
  targetId: string | number;
  reason?: string | null;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    const principal = await getPrincipalForAuthUser(opts.authUserId);
    await supabase.from("forum_moderation_actions").insert({
      actor_principal_id: principal?.id ?? null,
      actor_user_id: opts.authUserId,
      action: opts.action,
      target_type: opts.targetType,
      target_id: String(opts.targetId),
      reason: opts.reason ?? null,
    });
    // Also emit to the unified audit trail (#11). Best-effort; the domain
    // table above stays the moderation system-of-record.
    void recordAudit({
      actorPrincipalId: principal?.id ?? null,
      actorKind: "human",
      action: `forum.${opts.action}`,
      resourceType: opts.targetType,
      resourceId: opts.targetId,
      summary: opts.reason ?? null,
    });
  } catch (err) {
    log.warn("recordAction failed", {
      ...opts,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

async function ensureModerator(authUserId: string): Promise<ModResult | null> {
  if (!(await isModerator(authUserId))) {
    return { ok: false, error: "not_a_moderator" };
  }
  return null;
}

export async function lockThread(opts: {
  authUserId: string;
  threadId: number;
  locked: boolean;
  reason?: string | null;
}): Promise<ModResult> {
  const denied = await ensureModerator(opts.authUserId);
  if (denied) return denied;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("forum_threads")
    .update({ is_locked: opts.locked })
    .eq("id", opts.threadId);
  if (error) {
    log.warn("lockThread update failed", { ...opts, error: error.message });
    return { ok: false, error: error.message };
  }
  await recordAction({
    authUserId: opts.authUserId,
    action: opts.locked ? "lock_thread" : "unlock_thread",
    targetType: "thread",
    targetId: opts.threadId,
    reason: opts.reason,
  });
  return { ok: true };
}

export async function hideThread(opts: {
  authUserId: string;
  threadId: number;
  hidden: boolean;
  reason?: string | null;
}): Promise<ModResult> {
  const denied = await ensureModerator(opts.authUserId);
  if (denied) return denied;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("forum_threads")
    .update({ is_removed: opts.hidden })
    .eq("id", opts.threadId);
  if (error) {
    log.warn("hideThread update failed", { ...opts, error: error.message });
    return { ok: false, error: error.message };
  }
  await recordAction({
    authUserId: opts.authUserId,
    action: opts.hidden ? "hide_thread" : "unhide_thread",
    targetType: "thread",
    targetId: opts.threadId,
    reason: opts.reason,
  });
  return { ok: true };
}

export async function hidePost(opts: {
  authUserId: string;
  postId: number;
  hidden: boolean;
  reason?: string | null;
}): Promise<ModResult> {
  const denied = await ensureModerator(opts.authUserId);
  if (denied) return denied;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("forum_posts")
    .update({ is_removed: opts.hidden })
    .eq("id", opts.postId);
  if (error) {
    log.warn("hidePost update failed", { ...opts, error: error.message });
    return { ok: false, error: error.message };
  }
  await recordAction({
    authUserId: opts.authUserId,
    action: opts.hidden ? "hide_post" : "unhide_post",
    targetType: "post",
    targetId: opts.postId,
    reason: opts.reason,
  });
  return { ok: true };
}

export async function pinThread(opts: {
  authUserId: string;
  threadId: number;
  pinned: boolean;
  reason?: string | null;
}): Promise<ModResult> {
  const denied = await ensureModerator(opts.authUserId);
  if (denied) return denied;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("forum_threads")
    .update({ is_pinned: opts.pinned })
    .eq("id", opts.threadId);
  if (error) return { ok: false, error: error.message };
  await recordAction({
    authUserId: opts.authUserId,
    action: opts.pinned ? "pin_thread" : "unpin_thread",
    targetType: "thread",
    targetId: opts.threadId,
    reason: opts.reason,
  });
  return { ok: true };
}

export async function banUser(opts: {
  authUserId: string;
  targetUserId: string;
  durationMs?: number | null;
  reason?: string | null;
}): Promise<ModResult> {
  const denied = await ensureModerator(opts.authUserId);
  if (denied) return denied;
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const status = opts.durationMs ? "suspended" : "banned";
  const bannedUntil = opts.durationMs
    ? new Date(Date.now() + opts.durationMs).toISOString()
    : null;
  const { error } = await supabase
    .from("forum_user_profiles")
    .update({
      status,
      banned_at: now,
      banned_until: bannedUntil,
      ban_reason: opts.reason ?? null,
    })
    .eq("user_id", opts.targetUserId);
  if (error) {
    log.warn("banUser update failed", { ...opts, error: error.message });
    return { ok: false, error: error.message };
  }
  await recordAction({
    authUserId: opts.authUserId,
    action: opts.durationMs ? "suspend_user" : "ban_user",
    targetType: "user",
    targetId: opts.targetUserId,
    reason: opts.reason,
  });
  return { ok: true };
}

export async function unbanUser(opts: {
  authUserId: string;
  targetUserId: string;
  reason?: string | null;
}): Promise<ModResult> {
  const denied = await ensureModerator(opts.authUserId);
  if (denied) return denied;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("forum_user_profiles")
    .update({
      status: "active",
      banned_at: null,
      banned_until: null,
      ban_reason: null,
    })
    .eq("user_id", opts.targetUserId);
  if (error) return { ok: false, error: error.message };
  await recordAction({
    authUserId: opts.authUserId,
    action: "unban_user",
    targetType: "user",
    targetId: opts.targetUserId,
    reason: opts.reason,
  });
  return { ok: true };
}
