import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { claimAnonymousSaves } from "@/lib/bookmarks";
import { claimSessionQuizzes } from "@/lib/quiz-history";
import { logger } from "@/lib/logger";

const log = logger("api:account:claim-anonymous");

export const runtime = "nodejs";

/**
 * Body schema. `session_id` is the only field of interest; everything else
 * is silently dropped. Top-level `.catch({})` mirrors the previous
 * `.catch(() => ({}))` JSON-parse swallow so a malformed body still falls
 * through to the existing "Missing session_id" 400 below.
 */
const ClaimAnonymousSchema = z
  .object({
    session_id: z.string().optional().catch(undefined),
  })
  .catch({});

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

  const raw = await request.json().catch(() => ({}));
  const parsed = ClaimAnonymousSchema.parse(raw);
  const sessionId = parsed.session_id ? parsed.session_id.slice(0, 100) : null;
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
