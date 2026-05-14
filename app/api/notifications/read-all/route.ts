/**
 * POST /api/notifications/read-all — mark every unread notification as
 * read for the calling user.
 *
 * Used by the "Mark all read" button in `NotificationDropdown.tsx`.
 *
 * Auth: required.
 * Rate-limit: IP-keyed, tight cap — this is a bulk write.
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { markAllRead } from "@/lib/notifications";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:notifications:read-all");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("notifications_read_all", ipKey(request), {
      max: 20,
      refillPerSec: 0.2,
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

  // No body — this route has no schema input. Documenting the empty
  // contract so the rate-limit + auth audit stays explicit.
  try {
    await markAllRead(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("mark-all-read threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
