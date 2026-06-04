import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { filterFactualOutput, GAW_AI_PREFIX } from "@/lib/compliance";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("api:investor:copilot");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `${GAW_AI_PREFIX}

You are a helpful Australian investment information assistant on invest.com.au. You provide factual, educational information about:
- Australian savings accounts and term deposits
- Share trading platforms and brokers (ASX, US shares, ETFs)
- Superannuation and self-managed super funds (SMSFs)
- Cryptocurrency exchanges registered with AUSTRAC
- General investing concepts and terminology
- How to compare financial products

Important rules you must follow at all times:
1. ALWAYS begin every response with exactly: "${GAW_AI_PREFIX}"
2. NEVER give personal financial advice. Never say "you should", "I recommend you", "for someone in your situation", or similar phrases.
3. Provide factual, general information only. Direct users to compare products on invest.com.au.
4. If asked for personal advice, say: "${GAW_AI_PREFIX} I can share general information, but I'm not able to provide personal financial advice. For recommendations tailored to your situation, consider speaking with a licensed financial adviser."
5. Only use https:// links or relative paths starting with /. Link to invest.com.au pages where relevant (e.g. /savings, /term-deposits, /compare, /advisors).
6. Keep responses concise — 2–4 paragraphs maximum.
7. If asked about specific rates, note that rates change frequently and direct to the comparison pages.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

// `messages` must be a non-empty array (matching the prior
// `!Array.isArray(messages) || messages.length === 0` guard). Elements are
// kept as unknown so the per-message sanitisation loop below — which filters
// out bad roles/content rather than rejecting the whole request — is
// preserved unchanged.
const Body = z.object({
  messages: z.array(z.unknown()).min(1),
});

export async function POST(req: NextRequest) {
  const allowed = await isAllowed("investor_copilot", ipKey(req), {
    max: 20,
    refillPerSec: 0.05,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "messages array required." }, { status: 400 });
  }
  const { messages } = parsed.data;

  // Validate and sanitise messages: only user/assistant roles, string content, max 10 turns
  const validated: Message[] = [];
  for (const m of messages.slice(-10)) {
    if (
      typeof m !== "object" ||
      m === null ||
      !("role" in m) ||
      !("content" in m)
    )
      continue;
    const role = (m as Record<string, unknown>).role;
    const content = (m as Record<string, unknown>).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string")
      continue;
    validated.push({ role, content: content.slice(0, 2000) });
  }

  if (validated.length === 0 || validated[validated.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "Last message must be from user." }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: validated,
    });

    const raw =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    const filtered = filterFactualOutput(raw);
    if (!filtered.ok) {
      log.warn("copilot response failed compliance filter", {
        reason: filtered.reason,
      });
      return NextResponse.json(
        {
          reply: `${GAW_AI_PREFIX} I can provide general information about Australian savings and investment products. What would you like to know?`,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ reply: filtered.cleaned });
  } catch (err) {
    log.error("copilot anthropic error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }
}
