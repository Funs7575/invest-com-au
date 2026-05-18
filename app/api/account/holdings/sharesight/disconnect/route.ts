import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("api:account:holdings:sharesight:disconnect");

export const runtime = "nodejs";

/**
 * POST /api/account/holdings/sharesight/disconnect
 *
 * Deletes the user's Sharesight OAuth connection row. Imported
 * holdings stay in `investor_holdings` — disconnecting only severs
 * future syncs; the user can remove individual holdings via the
 * existing holdings UI. RLS scopes the delete to the caller's own
 * row.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("investor_oauth_connections")
    .delete()
    .eq("auth_user_id", user.id)
    .eq("provider", "sharesight");

  if (error) {
    log.warn("disconnect failed", { message: error.message });
    return NextResponse.json({ error: "disconnect_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
