/**
 * GET /api/notifications — header-bell dropdown payload.
 *
 * Returns the calling user's unread count plus the 20 most-recent
 * notifications from `public.user_notifications`. This is the data
 * source for `NotificationDropdown.tsx` rendered behind the bell.
 *
 * The existing /api/account/notifications GET returns 50 rows for the
 * full inbox page; this endpoint deliberately returns a smaller window
 * (20) so the dropdown payload stays under a few KB and polling cost
 * is bounded.
 *
 * Auth: required (401 for anon).
 * Rate-limit: IP-keyed DB token bucket (per CLAUDE.md rate-limit policy
 * for new API routes).
 */
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:notifications:list");

export const runtime = "nodejs";

const DROPDOWN_LIMIT = 20;

interface DropdownRow {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  // IP rate-limit first — a logged-out poller hitting this endpoint
  // shouldn't be able to exhaust the DB connection pool before the
  // auth check rejects them.
  if (
    !(await isAllowed("notifications_list", ipKey(request), {
      max: 60,
      refillPerSec: 1,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // No body / query params on this route. The spec calls for Zod
  // validation of query params (none for now) — encoded as an explicit
  // no-params check so future params have a documented expansion point.
  // We don't bind a schema since there's nothing to parse; any future
  // ?limit= / ?since= should land here.

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const [{ count: unreadCount }, { data: rows, error }] = await Promise.all([
      admin
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
      admin
        .from("user_notifications")
        .select("id, type, title, body, link_url, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(DROPDOWN_LIMIT),
    ]);

    if (error) {
      log.warn("notifications list fetch failed", { error: error.message });
      return NextResponse.json(
        { error: "Failed to load notifications" },
        { status: 500 },
      );
    }

    // Map storage columns (`type`, `link_url`) → spec column names
    // (`kind`, `href`). Keeps the dropdown decoupled from the table's
    // legacy column naming (see lib/user-notifications.ts for context).
    const recent: DropdownRow[] = (rows ?? []).map((r) => ({
      id: r.id as number,
      kind: r.type as string,
      title: r.title as string,
      body: (r.body as string | null) ?? null,
      href: (r.link_url as string | null) ?? null,
      read_at: (r.read_at as string | null) ?? null,
      created_at: r.created_at as string,
    }));

    return NextResponse.json({
      unread_count: unreadCount ?? 0,
      recent,
    });
  } catch (err) {
    log.error("notifications GET threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
