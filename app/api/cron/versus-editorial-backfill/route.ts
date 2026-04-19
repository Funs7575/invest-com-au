import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { generateVersusPairs } from "@/lib/versus-pairs";
import type { PlatformType } from "@/lib/types";

const log = logger("cron:versus-editorial-backfill");

export const maxDuration = 60;

/**
 * AI-generated versus editorial backfill.
 *
 * For every within-platform-type broker pair that lacks a row in
 * versus_editorials, call Claude once with a strict prompt and insert
 * the result. Idempotent — skips pairs that already have editorial so
 * re-running burns no tokens.
 *
 * Runs N pairs per invocation (default 5, override with ?max=N) so the
 * cron stays well under its 60s budget and token costs are predictable.
 * Daily runs would complete the backfill of 400 pairs in ~80 days; a
 * one-off manual trigger with ?max=40 batches it through faster.
 */

const MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_PAIRS = 5;

interface BrokerRow {
  id: number;
  slug: string;
  name: string;
  rating: number | null;
  platform_type: PlatformType;
  asx_fee: string | null;
  asx_fee_value: number | null;
  us_fee: string | null;
  us_fee_value: number | null;
  fx_rate: number | null;
  chess_sponsored: boolean | null;
  smsf_support: boolean | null;
  min_deposit: string | null;
  markets: string[] | null;
  tagline: string | null;
}

interface GeneratedEditorial {
  title: string;
  meta_description: string;
  intro: string;
  choose_a: string;
  choose_b: string;
  sections: { heading: string; body: string }[];
  verdict: string;
  faqs: { question: string; answer: string }[];
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "ANTHROPIC_API_KEY missing" },
      { status: 503 },
    );
  }

  const max = Math.max(
    1,
    Math.min(40, Number(req.nextUrl.searchParams.get("max") ?? DEFAULT_MAX_PAIRS)),
  );

  const supabase = createAdminClient();

  const { data: brokers, error: brokersErr } = await supabase
    .from("brokers")
    .select(
      "id, slug, name, rating, platform_type, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, min_deposit, markets, tagline",
    )
    .eq("status", "active");

  if (brokersErr || !brokers) {
    return NextResponse.json({ ok: false, error: "broker fetch failed" }, { status: 500 });
  }

  const bySlug = new Map<string, BrokerRow>();
  for (const b of brokers as BrokerRow[]) bySlug.set(b.slug, b);

  const pairs = generateVersusPairs(
    (brokers as BrokerRow[]).map((b) => ({
      slug: b.slug,
      name: b.name,
      rating: b.rating,
      platform_type: b.platform_type,
    })),
  );

  const { data: existing } = await supabase
    .from("versus_editorials")
    .select("slug");
  const existingSlugs = new Set((existing ?? []).map((r) => r.slug));

  const missing = pairs.filter((p) => !existingSlugs.has(p.slug)).slice(0, max);

  if (missing.length === 0) {
    return NextResponse.json({ ok: true, generated: 0, reason: "all pairs have editorial" });
  }

  const client = new Anthropic({ apiKey });
  let generated = 0;
  let failed = 0;

  for (const pair of missing) {
    const [slugA, slugB] = pair.slug.split("-vs-");
    const a = bySlug.get(slugA!);
    const b = bySlug.get(slugB!);
    if (!a || !b) continue;

    try {
      const editorial = await generateEditorial(client, a, b);
      const { error: insertErr } = await supabase
        .from("versus_editorials")
        .insert({
          slug: pair.slug,
          broker_a_slug: a.slug,
          broker_b_slug: b.slug,
          title: editorial.title,
          meta_description: editorial.meta_description,
          intro: editorial.intro,
          choose_a: editorial.choose_a,
          choose_b: editorial.choose_b,
          sections: editorial.sections,
          verdict: editorial.verdict,
          faqs: editorial.faqs,
        });
      if (insertErr) {
        log.error("insert_failed", { pair: pair.slug, err: insertErr.message });
        failed++;
      } else {
        generated++;
      }
    } catch (err) {
      failed++;
      log.error("generation_failed", {
        pair: pair.slug,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    generated,
    failed,
    remaining: pairs.length - existingSlugs.size - generated,
  });
}

async function generateEditorial(
  client: Anthropic,
  a: BrokerRow,
  b: BrokerRow,
): Promise<GeneratedEditorial> {
  const platformLabel = a.platform_type === b.platform_type ? a.platform_type : "platform";

  const prompt = `You are writing a short, honest comparison for Australian investors.
Output STRICT JSON matching this schema:
{
  "title": "string (<70 chars, format: 'A vs B: Side-by-Side Comparison')",
  "meta_description": "string (120-160 chars, factual, no hype)",
  "intro": "string (2-3 sentences TL;DR, state the main difference)",
  "choose_a": "string (1 sentence completing 'Choose A if...')",
  "choose_b": "string (1 sentence completing 'Choose B if...')",
  "sections": [
    { "heading": "Fees head-to-head", "body": "2-3 sentences comparing specific fee numbers" },
    { "heading": "Platform & features", "body": "2-3 sentences comparing practical differences" },
    { "heading": "Who should pick which", "body": "2-3 sentences on fit by investor type" }
  ],
  "verdict": "string (2 sentences, neutral editorial verdict)",
  "faqs": [
    { "question": "string", "answer": "string (2-3 sentences)" },
    { "question": "string", "answer": "string (2-3 sentences)" }
  ]
}

Rules:
- Factual, not marketing. Do not say either is "best".
- Cite specific numbers from the data below wherever you can.
- Include "This is general information, not personal financial advice" language only in FAQ answers where it's genuinely relevant.
- Australian English. No emojis. No em-dashes.
- Return JSON only. No prose before or after.

A = ${a.name}:
  rating=${a.rating ?? "n/a"}
  platform_type=${a.platform_type}
  asx_fee=${a.asx_fee ?? "n/a"} (${a.asx_fee_value ?? "n/a"} per trade)
  us_fee=${a.us_fee ?? "n/a"} (${a.us_fee_value ?? "n/a"} per trade)
  fx_rate=${a.fx_rate ?? "n/a"}%
  chess_sponsored=${a.chess_sponsored ?? "n/a"}
  smsf_support=${a.smsf_support ?? "n/a"}
  min_deposit=${a.min_deposit ?? "n/a"}
  markets=${(a.markets ?? []).join(", ") || "n/a"}
  tagline=${a.tagline ?? ""}

B = ${b.name}:
  rating=${b.rating ?? "n/a"}
  platform_type=${b.platform_type}
  asx_fee=${b.asx_fee ?? "n/a"} (${b.asx_fee_value ?? "n/a"} per trade)
  us_fee=${b.us_fee ?? "n/a"} (${b.us_fee_value ?? "n/a"} per trade)
  fx_rate=${b.fx_rate ?? "n/a"}%
  chess_sponsored=${b.chess_sponsored ?? "n/a"}
  smsf_support=${b.smsf_support ?? "n/a"}
  min_deposit=${b.min_deposit ?? "n/a"}
  markets=${(b.markets ?? []).join(", ") || "n/a"}
  tagline=${b.tagline ?? ""}

${platformLabel === "platform" ? "" : `Context: both are Australian ${platformLabel} platforms.`}
`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content.find((c) => c.type === "text")?.text?.trim() ?? "";
  const jsonText = extractJson(text);
  const parsed = JSON.parse(jsonText) as GeneratedEditorial;
  validateEditorial(parsed);
  return parsed;
}

/** Strip optional markdown fences so `json ... ` round-trips cleanly. */
function extractJson(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  if (fenced) return fenced[1]!.trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text;
}

function validateEditorial(e: GeneratedEditorial): void {
  if (!e.title || e.title.length > 120) throw new Error("bad title");
  if (!e.intro || e.intro.length < 40) throw new Error("bad intro");
  if (!e.choose_a || !e.choose_b) throw new Error("missing choose_a/b");
  if (!Array.isArray(e.sections) || e.sections.length < 2)
    throw new Error("sections must have 2+ entries");
  if (!Array.isArray(e.faqs) || e.faqs.length < 2)
    throw new Error("faqs must have 2+ entries");
}
