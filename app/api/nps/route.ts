import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
const NpsBody = z.object({
  respondent_type: z.enum(["user", "advisor", "broker"]),
  trigger: z.string().max(64),
  score: z.number().min(0).max(10),
  comment: z.string().max(2000).optional(),
  session_id: z.string().max(100).optional(),
  respondent_id: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  if (!(await isAllowed("nps_submit", ipKey(request), { max: 5, refillPerSec: 5 / 3600 }))) {
    return NextResponse.json({ error: "Too many submissions" }, { status: 429 });
  }

  const rawBody = await request.json().catch(() => null);
  const bodyResult = NpsBody.safeParse(rawBody);
  if (!bodyResult.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }
  const { respondent_type: respondentType, trigger, score, comment, session_id, respondent_id } = bodyResult.data;

  const ip = ipKey(request);
  const ipHash = crypto
    .createHash("sha256")
    .update(ip + (process.env.NPS_IP_SALT || "invest-com-au"))
    .digest("hex")
    .slice(0, 32);

  const supabase = createAdminClient();
  const { error } = await supabase.from("nps_responses").insert({
    respondent_type: respondentType,
    respondent_id: respondent_id ?? null,
    trigger: trigger.slice(0, 64),
    score: Math.round(score),
    comment: comment?.trim().slice(0, 2000) ?? null,
    session_id: session_id ?? null,
    user_agent: (request.headers.get("user-agent") || "").slice(0, 200),
    ip_hash: ipHash,
  });

  if (error) {
    log.warn("nps insert failed", { error: error.message });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
