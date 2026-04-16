import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnreadCount, markRead, markAllRead } from "@/lib/notifications";
import { logger } from "@/lib/logger";

const log = logger("api:account:notifications");

export const runtime = "nodejs";

/**
 * GET   /api/account/notifications
 *   Returns the current user's inbox:
 *     { unread, items: [...last 50 rows sorted DESC] }
 *   Requires an authenticated supabase session.
 *
 * PATCH /api/account/notifications
 *   Body: { id?: number, all?: boolean }
 *   Marks one notification (or all) as read.
 */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true as const, user };
}

export async function GET(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  // Count-only mode for the header bell: avoids fetching 50 rows
  // every minute per authenticated user.
  const countOnly = request.nextUrl.searchParams.get("count") === "1";
  if (countOnly) {
    const unread = await getUnreadCount(guard.user.id);
    return NextResponse.json({ unread });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("user_notifications")
      .select("id, type, title, body, link_url, read_at, created_at")
      .eq("user_id", guard.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      // Log full error server-side, return generic message to client.
      // Surfacing error.message would leak schema details (column names,
      // RLS policy hints) that aid enumeration attacks.
      log.warn("notifications fetch failed", { error: error.message });
      return NextResponse.json(
        { error: "Failed to load notifications" },
        { status: 500 },
      );
    }
    const unread = await getUnreadCount(guard.user.id);
    return NextResponse.json({ unread, items: data || [] });
  } catch (err) {
    log.error("notifications GET threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  if (body.all === true) {
    await markAllRead(guard.user.id);
    return NextResponse.json({ ok: true });
  }
  if (typeof body.id === "number") {
    await markRead(guard.user.id, body.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Missing id or all" }, { status: 400 });
}
