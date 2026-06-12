/**
 * POST /api/bookmarks/toggle — add or remove a bookmark for the signed-in user.
 * GET  /api/bookmarks/toggle?type=article&ref=slug — check if a specific item is bookmarked.
 *
 * Auth: session-authenticated via createClient() from lib/supabase/server.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { addBookmark, removeBookmark } from "@/lib/bookmarks";
import { awardIfEligible } from "@/lib/quests-server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:bookmarks-toggle");

export const runtime = "nodejs";

const Body = z.object({
  type: z.enum(["article", "broker", "advisor", "scenario", "calculator"]),
  ref: z.string().trim().min(1).max(300),
  label: z.string().trim().max(300).optional(),
  action: z.enum(["add", "remove"]),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ bookmarked: false });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const ref = searchParams.get("ref");
  if (!type || !ref) return NextResponse.json({ bookmarked: false });

  const { data } = await supabase
    .from("user_bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("bookmark_type", type)
    .eq("ref", ref)
    .maybeSingle();

  return NextResponse.json({ bookmarked: !!data });
}

export const POST = withValidatedBody(Body, async (req: NextRequest, body) => {
  if (!(await isAllowed("bookmarks_toggle", ipKey(req), { max: 60, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { type, ref, label, action } = body;

  if (action === "add") {
    const ok = await addBookmark({ userId: user.id, type, ref, label });
    if (!ok) {
      log.error("bookmark add failed", { type, ref });
      return NextResponse.json({ error: "Failed to save bookmark" }, { status: 500 });
    }
    // Quest: first-bookmark. Fire-and-forget — flag-gated + fail-soft.
    void awardIfEligible(user.id, "first-bookmark");
    return NextResponse.json({ bookmarked: true });
  }

  const ok = await removeBookmark({ userId: user.id, type, ref });
  if (!ok) {
    log.error("bookmark remove failed", { type, ref });
    return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
  }
  return NextResponse.json({ bookmarked: false });
});
