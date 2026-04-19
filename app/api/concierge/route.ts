import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

const log = logger("concierge");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/concierge
 *
 * Body: { message: string, session_id?: string, history?: Array<{ role, content }> }
 *
 * Proxies to Anthropic (claude-sonnet-4-20250514) and returns a
 * streaming SSE response. Each request + response is persisted to
 * chatbot_conversations so Ops can audit and improve the concierge
 * over time.
 *
 * Rate-limited 30 requests / 10-minute window per IP. Graceful
 * failure if ANTHROPIC_API_KEY is absent.
 */

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1000;

const SYSTEM_PROMPT = `You are the invest.com.au investment concierge.
You help Australians find the right investment platforms, advisors,
and opportunities. You have access to Australia's leading comparison
platform.

Guidelines:
- Keep responses concise. Aim for 3-6 sentences per turn with actionable
  links where possible.
- Always include at least one relevant internal link when you mention a
  comparison, tool, or hub. Format: [Compare brokers](/compare).
- Never give personal financial advice. Recommend seeking a licensed
  AFSL-authorised adviser for personal situations.
- Never state a broker is "best" universally; frame recommendations as
  "best for X" scenarios and point to /best-for when appropriate.
- For SMSF questions, point to /smsf. For foreign investors, point to
  /foreign-investment. For funds, /invest/funds. For the energy sector,
  /invest/oil-gas / /invest/uranium / /invest/hydrogen.
- Decline questions about specific stocks or crypto trades — say we
  cover platforms and educational context only.

Platform: invest.com.au.`;

interface Body {
  message: string;
  session_id?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

function parse(input: unknown): { ok: true; data: Body } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid body" };
  const b = input as Record<string, unknown>;
  const message = typeof b.message === "string" ? b.message.trim() : "";
  if (!message || message.length > 4000) {
    return { ok: false, error: "Invalid message (1-4000 chars)" };
  }
  const session_id =
    typeof b.session_id === "string" && b.session_id.length <= 120
      ? b.session_id
      : undefined;
  const history: Body["history"] = [];
  if (Array.isArray(b.history)) {
    for (const raw of b.history) {
      if (!raw || typeof raw !== "object") continue;
      const h = raw as Record<string, unknown>;
      const role = h.role === "user" || h.role === "assistant" ? h.role : null;
      const content = typeof h.content === "string" ? h.content : null;
      if (role && content && content.length < 4000) {
        history.push({ role, content });
      }
    }
  }
  return { ok: true, data: { message, session_id, history } };
}

function ensureSessionId(session_id?: string): string {
  if (session_id && /^[a-zA-Z0-9_-]{8,120}$/.test(session_id)) return session_id;
  return crypto.randomUUID();
}

export async function POST(req: NextRequest) {
  if (
    !(await isAllowed("concierge", ipKey(req), {
      max: 30,
      refillPerSec: 30 / 600,
    }))
  ) {
    return new Response("Too many requests", { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const v = parse(raw);
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI concierge is not configured — ANTHROPIC_API_KEY env var is missing.",
      },
      { status: 503 },
    );
  }

  const session_id = ensureSessionId(v.data.session_id);
  const client = new Anthropic({ apiKey });

  // Persist the user message first so we have a record even if
  // streaming fails halfway through.
  const supabase = createAdminClient();
  void supabase.from("chatbot_conversations").insert({
    session_id,
    role: "user",
    content: v.data.message,
    model: MODEL,
  });

  // Build messages array — trim history to the last 10 turns to
  // control token cost.
  const trimmedHistory = (v.data.history ?? []).slice(-10);

  const encoder = new TextEncoder();
  let assembledAssistant = "";
  let tokensIn = 0;
  let tokensOut = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Always start with the session id so the client can persist it.
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "session", session_id })}\n\n`,
        ),
      );

      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: [
            ...trimmedHistory,
            { role: "user", content: v.data.message },
          ],
        });

        response.on("text", (text: string) => {
          assembledAssistant += text;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "delta", text })}\n\n`,
            ),
          );
        });

        const final = await response.finalMessage();
        tokensIn = final.usage?.input_tokens ?? 0;
        tokensOut = final.usage?.output_tokens ?? 0;

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              tokens_in: tokensIn,
              tokens_out: tokensOut,
            })}\n\n`,
          ),
        );
      } catch (err) {
        log.error("anthropic_stream_failed", { err: String(err) });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: "The concierge is temporarily unavailable. Please try again.",
            })}\n\n`,
          ),
        );
      } finally {
        // Persist the assistant reply (best-effort; never blocks the
        // stream closure).
        if (assembledAssistant) {
          void supabase.from("chatbot_conversations").insert({
            session_id,
            role: "assistant",
            content: assembledAssistant,
            model: MODEL,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
