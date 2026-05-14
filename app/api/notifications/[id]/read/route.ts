/**
 * POST /api/notifications/[id]/read — mark a single notification as read.
 *
 * Idempotent: stamping `read_at` on an already-read row is a no-op (the
 * UPDATE still runs but the value the user sees is unchanged). We don't
 * fail when the row is already read or doesn't exist — clients treat the
 * call as best-effort.
 *
 * Auth: required.
 * Rate-limit: IP-keyed; tighter than the GET because a stuck client could
 * fire one per notification in a list.
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { markRead } from "@/lib/notifications";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:notifications:read");

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (
    !(await isAllowed("notifications_read", ipKey(request), {
      max: 60,
      refillPerSec: 2,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid notification id." }, { status: 400 });
  }

  try {
    // `markRead` scopes the UPDATE to `(user_id, id)` so a malicious
    // caller can't flip another user's row even with a guessed id.
    await markRead(user.id, numericId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("mark-read threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
