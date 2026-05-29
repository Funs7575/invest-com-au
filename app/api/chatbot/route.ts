import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed } from "@/lib/rate-limit-db";
import { respondToMessage, type ChatMessage } from "@/lib/chatbot";
import { filterFactualOutput, GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { logger } from "@/lib/logger";

const log = logger("chatbot");

export const runtime = "nodejs";

/**
 * POST /api/chatbot
 *
 * Body: { session_id, message, user_key? }
 *
 * Returns:
 *   { reply, retrieved: [...], flagged, flaggedReason }
 *
 * Rate limited to 20 messages per minute per session to keep
 * the provider bill bounded.
 */
export async function POST(request: NextRequest) {
  // eslint-disable-next-line invest/no-unvalidated-req-json -- body is validated below: session_id/message are typeof-string-guarded, message is length-capped at 2000, and unknown fields are ignored.
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;
  const message = typeof body.message === "string" ? body.message : null;
  const userKey = typeof body.user_key === "string" ? body.user_key : null;

  if (!sessionId || !message) {
    return NextResponse.json(
      { error: "Missing session_id or message" },
      { status: 400 },
    );
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  if (!(await isAllowed("chatbot", sessionId, { max: 20, refillPerSec: 20 / 60 }))) {
    return NextResponse.json({ error: "Too many messages" }, { status: 429 });
  }

  const supabase = createAdminClient();

  // Load the last 8 turns of conversation so the model has context
  const { data: priorTurns } = await supabase
    .from("chatbot_conversations")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(8);

  const conversation: ChatMessage[] = ((priorTurns || []) as Array<{
    role: string;
    content: string;
  }>)
    .reverse()
    .map((t) => ({
      role: t.role as ChatMessage["role"],
      content: t.content,
    }));

  const result = await respondToMessage(
    sessionId,
    message,
    userKey,
    conversation,
  );

  // V-NEW-02 — run the model reply through the deterministic compliance filter
  // (the gate every other AI surface uses). The chatbot reply is conversational
  // with a GAW *closer*, so the GAW-prefix and stat-citation rules don't fit its
  // format — we only BLOCK on the rules that matter for a chat reply: a
  // personal-advice phrase ("you should buy …") or an unsafe markdown link. On a
  // block we replace the reply with a compliant fallback rather than break the
  // chat. Other rejected rules are logged for audit, not blocked.
  const filter = filterFactualOutput(result.reply);
  let safeReply = result.reply;
  // rejectedSpans only exists on the failure variant. The chatbot's GAW-closer
  // format always trips the GAW-prefix rule, so filter.ok is ~always false; we
  // only BLOCK on a personal-advice phrase or unsafe link, logging the rest.
  if (!filter.ok) {
    const blockingSpans = filter.rejectedSpans.filter(
      (s) => s.rule === "personal-advice-phrase" || s.rule === "unsafe-markdown-link",
    );
    if (blockingSpans.length > 0) {
      log.warn("chatbot_reply_filtered", {
        sessionId,
        rules: [...new Set(blockingSpans.map((s) => s.rule))],
      });
      safeReply =
        "I can share factual, general information about brokers, fees, and investing concepts, " +
        "but I can't tell you what you personally should buy or do. " +
        GENERAL_ADVICE_WARNING +
        " For advice tailored to your situation, consider speaking with an ASIC-registered financial adviser.";
    }
  }

  // Persist both turns (user + assistant) for audit
  const baseRow = {
    session_id: sessionId,
    user_key: userKey,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("chatbot_conversations").insert([
    {
      ...baseRow,
      role: "user" as const,
      content: message,
      flagged: result.flagged,
      flagged_reason: result.flaggedReason,
    },
    {
      ...baseRow,
      role: "assistant" as const,
      content: safeReply,
      context: result.retrieved,
      model: result.model,
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
    },
  ]);
  if (error) {
    log.warn("chatbot_conversations insert failed", { error: error.message });
  }

  return NextResponse.json({
    reply: safeReply,
    retrieved: result.retrieved,
    flagged: result.flagged,
    flaggedReason: result.flaggedReason,
    provider: result.provider,
  });
}
