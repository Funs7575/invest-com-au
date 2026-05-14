import { NextRequest, NextResponse } from "next/server";

import { StartGetMatchedRequest } from "@/lib/api-schemas";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createPlan } from "@/lib/getmatched/action-plans";
import { getQuestions, nextQuestion } from "@/lib/getmatched/questions";
import { logEvent } from "@/lib/getmatched/events";
import { classifyGetMatchedError, errorResponse } from "@/lib/getmatched/errors";
import { logger } from "@/lib/logger";

const log = logger("get-matched:start");

export async function POST(request: NextRequest) {
  try {
    if (
      !(await isAllowed("gm_start", ipKey(request), { max: 20, refillPerSec: 0.2 }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = StartGetMatchedRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }
    const { session_id, mode, prefill, source_page } = parsed.data;

    // Try DB-backed plan creation. If the table isn't ready yet (fresh
    // Supabase project pre-migration), fall through to ephemeral mode —
    // the user can still answer questions and see their plan; saving is
    // disabled until migrations apply.
    let planId = 0;
    let shareToken: string | null = null;
    let ephemeral = false;
    let ephemeralReason: string | null = null;
    const initialAnswers = prefill ?? {};
    try {
      const plan = await createPlan({
        sessionId: session_id,
        initialAnswers,
      });
      planId = plan.id;
      shareToken = plan.share_token;
    } catch (err) {
      const classified = classifyGetMatchedError(err);
      // Database-related failures degrade to ephemeral mode. Anything else
      // (e.g. unexpected internal error) still bubbles up as a 500.
      if (
        classified.code === "database_not_ready" ||
        classified.code === "supabase_not_configured" ||
        classified.code === "supabase_unreachable"
      ) {
        ephemeral = true;
        ephemeralReason = classified.code;
        log.warn("createPlan failed — degrading to ephemeral mode", {
          code: classified.code,
          detail: classified.detail,
        });
      } else {
        throw err;
      }
    }

    const questions = await getQuestions(mode);
    const next = nextQuestion(questions, initialAnswers, mode);

    if (!ephemeral) {
      void logEvent({
        sessionId: session_id,
        eventType: "started",
        sourcePage: source_page,
        payload: { mode, plan_id: planId },
      });
    }

    return NextResponse.json({
      plan_id: planId,
      share_token: shareToken,
      session_id,
      next,
      ephemeral,
      ephemeral_reason: ephemeralReason,
    });
  } catch (err) {
    const classified = classifyGetMatchedError(err);
    log.error("start error", {
      err: classified.detail,
      code: classified.code,
    });
    return errorResponse(classified, "Failed to start Get Matched.");
  }
}
