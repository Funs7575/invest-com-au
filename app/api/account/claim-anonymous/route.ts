import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimAnonymousSaves } from "@/lib/bookmarks";
import { claimSessionQuizzes } from "@/lib/quiz-history";
import { logger } from "@/lib/logger";

const log = logger("api:account:claim-anonymous");

export const runtime = "nodejs";

/**
 * POST /api/account/claim-anonymous
 *
 * Body: { session_id }
 *
 * Called by the client after a successful signup or sign-in to
 * migrate any anonymous bookmarks + quiz history that were
 * collected before the user authenticated. Idempotent — replay
 * is safe because the DB upserts.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sessionId =
    typeof body.session_id === "string" ? body.session_id.slice(0, 100) : null;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const [bookmarksClaimed, quizzesClaimed] = await Promise.all([
    claimAnonymousSaves(sessionId, user.id),
    claimSessionQuizzes(sessionId, user.id),
  ]);

  log.info("Anonymous state claimed", {
    userId: user.id,
    bookmarksClaimed,
    quizzesClaimed,
  });

  return NextResponse.json({
    ok: true,
    bookmarks_claimed: bookmarksClaimed,
    quizzes_claimed: quizzesClaimed,
  });
}
