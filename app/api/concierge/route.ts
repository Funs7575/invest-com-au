import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";
import {
  loadConciergeConfig,
  preCheckCaps,
  recordUsage,
  capRejectionPayload,
} from "@/lib/ai-cost-caps";
import { sendCap80Alert } from "@/lib/ai-cost-alerts";
import { embedText } from "@/lib/embeddings";
import { classifyUserMessage } from "@/lib/chatbot";
import {
  buildConciergeSystemPrompt,
  validateNoHallucinations,
  type ConciergeRetrievedDoc,
} from "@/lib/concierge-retrieval";
import { isFinderKey, type FinderKey } from "@/lib/concierge-seeds";

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
const RAG_TOP_K = 6;

interface Body {
  message: string;
  session_id?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  finder?: FinderKey;
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
  const finder = isFinderKey(b.finder) ? (b.finder as FinderKey) : undefined;
  return { ok: true, data: { message, session_id, history, finder } };
}

/**
 * Vector-search the user's message against `search_embeddings`.
 * Best-effort: failures (missing OPENAI_API_KEY in dev, KNN RPC
 * timeout) return [] rather than throwing, so the concierge still
 * answers — just without retrieval grounding.
 */
async function retrieveContext(
  message: string,
  limit = RAG_TOP_K,
): Promise<ConciergeRetrievedDoc[]> {
  try {
    const embedding = await embedText(message);
    if (!embedding) return [];
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("search_embeddings_knn", {
      query_embedding: embedding.vector,
      match_limit: limit,
      match_type: null,
    });
    if (error) {
      log.warn("rag_retrieval_failed", { err: error.message });
      return [];
    }
    return (data || []).map(
      (r: {
        document_type: string;
        document_id: string;
        title: string | null;
        body_excerpt: string | null;
        distance: number;
      }) => ({
        document_type: r.document_type,
        document_id: r.document_id,
        title: r.title || "",
        body_excerpt: r.body_excerpt || "",
        score: Math.max(0, 1 - (r.distance || 0)),
      }),
    );
  } catch (err) {
    log.warn("rag_retrieval_threw", { err: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

function ensureSessionId(session_id?: string): string {
  if (session_id && /^[a-zA-Z0-9_-]{8,120}$/.test(session_id)) return session_id;
  return crypto.randomUUID();
}

export async function POST(req: NextRequest) {
  // Launch-ops kill switch: flip `ai_generation` off in
  // /admin/automation/flags to halt all AI calls (runaway cost,
  // model regression, hallucinated compliance copy). Distinct from
  // the per-route ai-cost-caps gate below — this one trips the
  // entire AI surface at once. See docs/ops/launch-ops-plan.md §4
  // and docs/ops/ai-cost-caps.md.
  if (!(await isFlagEnabled("ai_generation"))) {
    return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 });
  }

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
    // eslint-disable-next-line invest/no-unvalidated-req-json -- validated via parse() below
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const v = parse(raw);
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  // Defensive classifier — refuses prompt-injection + frames
  // personal-advice asks with a compliant template before any
  // Anthropic call. Same rules as /api/chatbot.
  const classification = classifyUserMessage(v.data.message);
  if (classification.flagged) {
    return NextResponse.json(
      {
        error: "blocked",
        reason: classification.reason,
      },
      { status: 400 },
    );
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

  // V-NEW-06: per-IP and global daily cost caps. Cap is enforced
  // BEFORE the Anthropic call so a runaway loop can't burn through
  // the global budget in a single request.
  const capCfg = loadConciergeConfig();
  const subjectId = ipKey(req);
  const verdict = await preCheckCaps(subjectId, capCfg);
  if (!verdict.allowed) {
    const rej = capRejectionPayload(verdict, capCfg);
    return NextResponse.json(rej.body, {
      status: rej.status,
      headers: rej.headers,
    });
  }

  const session_id = ensureSessionId(v.data.session_id);
  const client = new Anthropic({ apiKey });

  // Retrieve before streaming — the model needs the context block
  // in its system prompt. Failure is non-fatal (returns []).
  const retrieved = await retrieveContext(v.data.message);
  const systemPrompt = buildConciergeSystemPrompt(retrieved);

  // Persist the user message first so we have a record even if
  // streaming fails halfway through.
  const supabase = createAdminClient();
  void supabase.from("chatbot_conversations").insert({
    session_id,
    role: "user",
    content: v.data.message,
    model: MODEL,
    context: { finder: v.data.finder ?? null, retrieved_count: retrieved.length },
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

      // Stream retrieval citations so the UI can render "Sources" under
      // the reply as it arrives. Trimmed shape — full body_excerpt isn't
      // needed client-side.
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "retrieved",
            docs: retrieved.map((d) => ({
              type: d.document_type,
              id: d.document_id,
              title: d.title,
              score: d.score,
            })),
          })}\n\n`,
        ),
      );

      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
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
        // Persist the assistant reply + retrieval context (best-effort;
        // never blocks the stream closure). Hallucination guardrail
        // runs warn-only pre-launch — gives us real-world signal on
        // how often the model invents slugs before we promote to
        // refuse + retry. See lib/concierge-retrieval.ts.
        if (assembledAssistant) {
          const hallucinated = validateNoHallucinations(assembledAssistant, retrieved);
          if (hallucinated.length > 0) {
            log.warn("concierge_hallucinated_slugs", {
              session_id,
              finder: v.data.finder ?? null,
              hallucinated,
              retrieved_count: retrieved.length,
            });
          }
          void supabase.from("chatbot_conversations").insert({
            session_id,
            role: "assistant",
            content: assembledAssistant,
            model: MODEL,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            context: {
              retrieved: retrieved.map((d) => ({
                type: d.document_type,
                id: d.document_id,
                title: d.title,
              })),
              hallucinated_slugs: hallucinated,
            },
            flagged: hallucinated.length > 0,
            flagged_reason: hallucinated.length > 0 ? "hallucinated_slug" : null,
          });
        }
        // V-NEW-06: post-record usage + 80% alert. Fire-and-forget;
        // never blocks the stream closure.
        if (tokensIn > 0 || tokensOut > 0) {
          void recordUsage({
            subjectId,
            cfg: capCfg,
            model: MODEL,
            tokensIn,
            tokensOut,
          }).then((r) => {
            if (r.crossed80Subject) {
              void sendCap80Alert({
                routeLabel: capCfg.label,
                subjectId,
                subjectType: capCfg.subjectType,
                newSubjectMicros: r.subjectMicros,
                capMicros: capCfg.perSubjectMicros,
              });
            }
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

/**
 * GET /api/concierge?session_id=…
 *
 * Returns prior-turn history for the supplied session so the UI can
 * rehydrate a conversation after a page refresh. Ordered oldest-first
 * and capped at the last 40 turns.
 */
export async function GET(req: NextRequest) {
  const session_id = req.nextUrl.searchParams.get("session_id") ?? "";
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(session_id)) {
    return NextResponse.json({ messages: [] });
  }
  if (!(await isAllowed("concierge_read", ipKey(req), { max: 60, refillPerSec: 1 }))) {
    return new Response("Too many requests", { status: 429 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chatbot_conversations")
    .select("role, content, created_at")
    .eq("session_id", session_id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    log.error("history_fetch_failed", { err: error.message });
    return NextResponse.json({ messages: [] });
  }

  const messages = (data ?? [])
    .slice()
    .reverse()
    .filter((r): r is { role: "user" | "assistant"; content: string; created_at: string } =>
      (r.role === "user" || r.role === "assistant") && typeof r.content === "string",
    )
    .map((r) => ({ role: r.role, content: r.content }));

  return NextResponse.json({ messages });
}

/**
 * DELETE /api/concierge?session_id=…
 *
 * Clears the session's stored history so the user can start over.
 */
export async function DELETE(req: NextRequest) {
  const session_id = req.nextUrl.searchParams.get("session_id") ?? "";
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(session_id)) {
    return NextResponse.json({ ok: false, error: "invalid session" }, { status: 400 });
  }
  if (!(await isAllowed("concierge_delete", ipKey(req), { max: 10, refillPerSec: 0.1 }))) {
    return new Response("Too many requests", { status: 429 });
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("chatbot_conversations")
    .delete()
    .eq("session_id", session_id);
  if (error) {
    log.error("history_delete_failed", { err: error.message });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
