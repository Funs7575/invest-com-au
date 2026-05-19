import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { SHARESIGHT_PROVIDER } from "@/lib/sharesight/sync";

const log = logger("api:account:holdings:sharesight:disconnect");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/holdings/sharesight/disconnect
 *
 * Deletes the Sharesight OAuth connection row for the current user. The
 * sharesight-sourced rows in `investor_holdings` are left in place — the
 * user explicitly imported them, and disconnect should not silently
 * destroy data the user has accepted into their portfolio.
 *
 * Returns 200 with `{ disconnected: true }` whether or not a row existed
 * (idempotent — the UI shouldn't have to know).
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
    .eq("provider", SHARESIGHT_PROVIDER);
  if (error) {
    log.warn("sharesight disconnect failed", {
      userId: user.id,
      error: error.message,
    });
    return NextResponse.json(
      { error: "disconnect_failed", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ disconnected: true });
}
