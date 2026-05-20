/**
 * POST /api/admin/forum-moderation — single dispatch endpoint for the
 * forum moderation actions defined in lib/forum-moderation.
 *
 * Capability gate is "are you a forum moderator" (forum_user_profiles.
 * is_moderator), NOT the global admin allowlist — trusted community
 * members can be promoted without granting them admin scope on the
 * rest of the site.
 *
 * Body shape:
 *   { action: 'lock_thread' | ..., target_id: string|number, reason?: string,
 *     duration_ms?: number }
 *
 * Phase 2.4 of the account-architecture master plan.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import {
  banUser,
  hidePost,
  hideThread,
  lockThread,
  pinThread,
  unbanUser,
} from "@/lib/forum-moderation";
import { logger } from "@/lib/logger";

const log = logger("api:admin:forum-moderation");

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum([
    "lock_thread",
    "unlock_thread",
    "hide_thread",
    "unhide_thread",
    "hide_post",
    "unhide_post",
    "pin_thread",
    "unpin_thread",
    "ban_user",
    "unban_user",
    "suspend_user",
  ]),
  target_id: z.union([z.string(), z.number()]),
  reason: z.string().max(2000).optional(),
  duration_ms: z.number().int().positive().optional(),
});

export const POST = withValidatedBody(Body, async (_req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const targetIdNum = typeof body.target_id === "number"
    ? body.target_id
    : Number(body.target_id);

  switch (body.action) {
    case "lock_thread":
    case "unlock_thread": {
      const result = await lockThread({
        authUserId: user.id,
        threadId: targetIdNum,
        locked: body.action === "lock_thread",
        reason: body.reason,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 403 });
    }
    case "hide_thread":
    case "unhide_thread": {
      const result = await hideThread({
        authUserId: user.id,
        threadId: targetIdNum,
        hidden: body.action === "hide_thread",
        reason: body.reason,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 403 });
    }
    case "hide_post":
    case "unhide_post": {
      const result = await hidePost({
        authUserId: user.id,
        postId: targetIdNum,
        hidden: body.action === "hide_post",
        reason: body.reason,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 403 });
    }
    case "pin_thread":
    case "unpin_thread": {
      const result = await pinThread({
        authUserId: user.id,
        threadId: targetIdNum,
        pinned: body.action === "pin_thread",
        reason: body.reason,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 403 });
    }
    case "ban_user":
    case "suspend_user": {
      const result = await banUser({
        authUserId: user.id,
        targetUserId: String(body.target_id),
        durationMs: body.action === "suspend_user" ? body.duration_ms ?? null : null,
        reason: body.reason,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 403 });
    }
    case "unban_user": {
      const result = await unbanUser({
        authUserId: user.id,
        targetUserId: String(body.target_id),
        reason: body.reason,
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 403 });
    }
    default: {
      log.warn("unknown forum-moderation action", { action: body.action });
      return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
  }
});
