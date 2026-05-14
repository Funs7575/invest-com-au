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

    // Try DB-backed plan creation. ANY failure (database not ready, env
    // vars missing, network gone, unknown internal error) degrades to
    // ephemeral mode so the user always sees a working page. The actual
    // error is logged for operator visibility but never surfaced.
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
      ephemeral = true;
      ephemeralReason = classified.code;
      log.warn("createPlan failed — degrading to ephemeral mode", {
        code: classified.code,
        detail: classified.detail,
      });
    }

    // getQuestions has its own try/catch + code-defined fallback list.
    // nextQuestion is a pure function. Neither can throw. So everything
    // after this point is safe — no path back to the outer catch.
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
    // Truly catastrophic — should never happen given the defensive paths
    // above. Even here, degrade gracefully: return a synthetic ephemeral
    // start payload so the page renders. The error is logged for debug.
    const classified = classifyGetMatchedError(err);
    log.error("start error (catastrophic fallback to ephemeral)", {
      err: classified.detail,
      code: classified.code,
    });
    try {
      const questions = await getQuestions("both");
      const next = nextQuestion(questions, {}, "both");
      return NextResponse.json({
        plan_id: 0,
        share_token: null,
        session_id: "ephemeral",
        next,
        ephemeral: true,
        ephemeral_reason: classified.code,
      });
    } catch {
      // If even the fallback path fails, surface the original error.
      return errorResponse(classified, "Failed to start Get Matched.");
    }
  }
}
