import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

const log = logger("nps");

export const runtime = "nodejs";

/**
 * POST /api/nps
 *
 * Body: { respondent_type, respondent_id?, trigger, score, comment?, session_id? }
 *
 * Accepts NPS / CSAT scores from the NPSPrompt modal. Score must
 * be in [0, 10]. Rate limited per IP so a bot can't stuff the
 * dashboard.
 */
export async function POST(request: NextRequest) {
  if (!(await isAllowed("nps_submit", ipKey(request), { max: 5, refillPerSec: 5 / 3600 }))) {
    return NextResponse.json({ error: "Too many submissions" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const respondentType =
    typeof body.respondent_type === "string" ? body.respondent_type : null;
  const trigger = typeof body.trigger === "string" ? body.trigger : null;
  const score = Number(body.score);

  if (
    !respondentType ||
    !["user", "advisor", "broker"].includes(respondentType) ||
    !trigger ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 10
  ) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const ip = ipKey(request);
  const ipHash = crypto
    .createHash("sha256")
    .update(ip + (process.env.NPS_IP_SALT || "invest-com-au"))
    .digest("hex")
    .slice(0, 32);

  const supabase = createAdminClient();
  const { error } = await supabase.from("nps_responses").insert({
    respondent_type: respondentType,
    respondent_id:
      typeof body.respondent_id === "string" ? body.respondent_id.slice(0, 200) : null,
    trigger: trigger.slice(0, 64),
    score: Math.round(score),
    comment:
      typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : null,
    session_id:
      typeof body.session_id === "string" ? body.session_id.slice(0, 100) : null,
    user_agent: (request.headers.get("user-agent") || "").slice(0, 200),
    ip_hash: ipHash,
  });

  if (error) {
    log.warn("nps insert failed", { error: error.message });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
