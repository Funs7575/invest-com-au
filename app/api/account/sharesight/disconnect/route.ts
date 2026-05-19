import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("api:account:sharesight:disconnect");

export const runtime = "nodejs";

/**
 * DELETE /api/account/sharesight/disconnect — drop the user's stored
 * Sharesight tokens. Manually-imported holdings stay in place; we don't
 * touch `investor_holdings` here. To wipe sharesight-tagged holdings the
 * user can remove them individually on the holdings page (or we can ship
 * a "remove Sharesight-imported holdings" follow-up if support traffic
 * suggests it).
 */
export async function DELETE(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("sharesight_connections")
    .delete()
    .eq("auth_user_id", user.id);

  if (error) {
    log.warn("sharesight disconnect failed", { err: error.message });
    return NextResponse.json({ error: "disconnect_failed" }, { status: 500 });
  }

  log.info("sharesight disconnected", { user_id: user.id });
  return NextResponse.json({ ok: true });
}
