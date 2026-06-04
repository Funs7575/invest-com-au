import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { respondToMessage, type ChatMessage } from "@/lib/chatbot";
import { logger } from "@/lib/logger";

const log = logger("chatbot");

// Permissive: fields accepted as unknown and narrowed by the handler's own
// typeof-guards (which also enforce presence and the 2000-char message cap),
// matching the prior `.catch(() => ({}))` fall-through behaviour.
const Body = z
  .object({
    session_id: z.unknown(),
    message: z.unknown(),
    user_key: z.unknown(),
  })
  .partial()
  .passthrough();

export const runtime = "nodejs";

/**
 * POST /api/chatbot
 *
 * Body: { session_id, message, user_key? }
 *
 * Returns:
 *   { reply, retrieved: [...], flagged, flaggedReason }
 *
 * Rate limited per session (20/min, UX guard) AND per IP (40/min). The
 * IP limiter is the wallet-DoS backstop: `session_id` is client-supplied,
 * so an anon caller can rotate it per request and defeat the per-session
 * cap. Keying the second bucket on the request IP bounds the Anthropic
 * provider bill regardless of how many sessions a single client spins up.
 */
export async function POST(request: NextRequest) {
  const parsedBody = Body.safeParse(await request.json().catch(() => ({})));
  const body = parsedBody.success ? parsedBody.data : {};
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

  // IP-keyed backstop: caps the provider bill even when session_id is rotated
  // per request to slip past the per-session limit below.
  if (!(await isAllowed("chatbot_ip", ipKey(request), { max: 40, refillPerSec: 40 / 60 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
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
      content: result.reply,
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
    reply: result.reply,
    retrieved: result.retrieved,
    flagged: result.flagged,
    flaggedReason: result.flaggedReason,
    provider: result.provider,
  });
}
