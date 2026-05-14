import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { SubmitIntakeAnswersRequest } from "@/lib/api-schemas";
import { IntakeError, submitAnswers } from "@/lib/pro-intake";
import { logger } from "@/lib/logger";

const log = logger("api:briefs:intake-answers");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (!(await isAllowed("intake_answers_submit", ipKey(request), { max: 10, refillPerSec: 0.1 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { slug } = await ctx.params;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = SubmitIntakeAnswersRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: brief } = await admin
      .from("advisor_auctions")
      .select("id, slug, contact_email")
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();

    if (!brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    const briefRow = brief as { id: number; contact_email: string | null };
    const expected = (briefRow.contact_email ?? "").toLowerCase().trim();
    const provided = parsed.data.email.toLowerCase().trim();
    if (!expected || expected !== provided) {
      return NextResponse.json(
        { error: "Email does not match brief owner." },
        { status: 403 },
      );
    }

    const saved = await submitAnswers({
      briefId: briefRow.id,
      answers: parsed.data.answers,
    });
    return NextResponse.json({ answers: saved });
  } catch (err) {
    if (err instanceof IntakeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log.error("submit intake answers failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to save answers." }, { status: 500 });
  }
}
