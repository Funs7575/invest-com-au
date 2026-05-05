import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";

const log = logger("quiz-submit");

export const runtime = "nodejs";

/**
 * POST /api/quiz/submit
 *
 * Body: { answers: Record<string, string | string[]>, email: string, name?: string }
 *
 * Writes a quiz_leads row and returns the top-3 broker matches
 * weighted by the answer heuristics below.
 *
 * Rate-limited 3 per 10 minutes per IP. Minimal heuristic matching
 * (trading interest, experience level, investment amount) — the
 * larger quiz system in /app/quiz has a more sophisticated matcher;
 * this endpoint exists for external embeds / landing pages that
 * submit compact payloads without the full wizard state.
 */

interface Body {
  answers: Record<string, unknown>;
  email: string;
  name?: string;
}

interface BrokerRow {
  id: number;
  slug: string;
  name: string;
  rating: number | string | null;
  is_crypto: boolean | null;
  platform_type: string | null;
  chess_sponsored: boolean | null;
  smsf_support: boolean | null;
  asx_fee_value: number | string | null;
  us_fee_value: number | string | null;
  fx_rate: number | string | null;
  status: string | null;
}

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function parse(input: unknown): { ok: true; data: Body } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const b = input as Record<string, unknown>;
  const answers = b.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return { ok: false, error: "answers must be an object" };
  }
  const email = typeof b.email === "string" ? b.email.trim() : "";
  if (!isValidEmail(email)) {
    return { ok: false, error: "Invalid email" };
  }
  const name =
    typeof b.name === "string" && b.name.length <= 120
      ? b.name.trim()
      : undefined;
  return {
    ok: true,
    data: {
      answers: answers as Record<string, unknown>,
      email,
      name,
    },
  };
}

function scoreBroker(
  broker: BrokerRow,
  answers: Record<string, unknown>,
): number {
  let score = 0;
  const rating = toNumber(broker.rating) ?? 0;
  score += rating * 2; // baseline rating weight — max +10

  const trading = String(answers.trading_interest ?? answers.interest ?? "").toLowerCase();
  const experience = String(answers.experience_level ?? answers.experience ?? "").toLowerCase();
  const amount = String(answers.investment_range ?? answers.amount ?? "").toLowerCase();
  const smsfAnswer = answers.smsf === true || answers.smsf === "yes";

  // Trading interest alignment
  if (trading.includes("crypto") && broker.is_crypto) score += 5;
  if (trading.includes("crypto") && !broker.is_crypto) score -= 3;
  if (trading.includes("shares") && !broker.is_crypto) score += 3;
  if (trading.includes("etf") && broker.chess_sponsored) score += 2;
  if (trading.includes("us") || trading.includes("international")) {
    const usFee = toNumber(broker.us_fee_value);
    if (usFee !== null && usFee < 5) score += 4;
    const fx = toNumber(broker.fx_rate);
    if (fx !== null && fx < 0.6) score += 3;
  }
  if (trading.includes("cfd") && broker.platform_type === "cfd_forex") score += 4;

  // Experience: beginners penalised if CFD-only
  if (experience.includes("begin") && broker.platform_type === "cfd_forex")
    score -= 4;

  // Fees favoured when amount is small
  if (
    amount.includes("under") ||
    amount.includes("small") ||
    amount.includes("5000")
  ) {
    const asxFee = toNumber(broker.asx_fee_value);
    if (asxFee !== null) score -= asxFee * 0.5; // cheaper = better
  }

  // SMSF gating
  if (smsfAnswer && broker.smsf_support) score += 5;
  if (smsfAnswer && !broker.smsf_support) score -= 6;

  return score;
}

async function topMatches(
  answers: Record<string, unknown>,
): Promise<Array<{ slug: string; name: string; score: number }>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("brokers")
    .select(
      "id, slug, name, rating, is_crypto, platform_type, chess_sponsored, smsf_support, asx_fee_value, us_fee_value, fx_rate, status",
    )
    .eq("status", "active");
  const rows = (data as BrokerRow[] | null) ?? [];
  return rows
    .map((b) => ({
      slug: b.slug,
      name: b.name,
      score: scoreBroker(b, answers),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export async function POST(req: NextRequest) {
  if (
    !(await isAllowed("quiz_submit", ipKey(req), {
      max: 3,
      refillPerSec: 3 / 600,
    }))
  ) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const v = parse(raw);
  if (!v.ok) {
    return NextResponse.json(
      { ok: false, error: v.error },
      { status: 400 },
    );
  }

  const matches = await topMatches(v.data.answers);

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("quiz_leads").insert({
      email: v.data.email,
      name: v.data.name ?? null,
      answers: v.data.answers,
      top_match_slug: matches[0]?.slug ?? null,
      captured_at: new Date().toISOString(),
    });
    if (error) {
      log.error("insert_failed", { error: error.message });
      return NextResponse.json(
        { ok: false, error: "Database error" },
        { status: 500 },
      );
    }
  } catch (err) {
    log.error("unexpected_error", { err: String(err) });
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    matches: matches.map((m) => m.slug),
    matchDetails: matches,
  });
}
