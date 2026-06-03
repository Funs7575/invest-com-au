import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";

const log = logger("quick-audit");

// Email is validated by isValidEmail and the numeric context fields are
// clamped individually below. The schema is permissive (everything optional,
// `.passthrough()`) so it never rejects a body the old destructure accepted;
// invalid JSON is still caught above and returns the same 400.
const Body = z
  .object({
    email: z.string().optional(),
    current_broker: z.string().optional(),
    trades_per_year: z.number().optional(),
    avg_trade_size: z.number().optional(),
  })
  .passthrough();

/**
 * POST /api/quick-audit
 *
 * Captures email from the Quick Audit tool along with trading context.
 * Stores in email_captures table with source "quick_audit".
 */
export async function POST(request: NextRequest) {
  // Per-IP rate limit — blocks automated scrapers pumping the endpoint
  // to bloat email_captures or cause DB pressure.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`quick_audit_ip:${ip}`, 10, 60)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  const { email, current_broker, trades_per_year, avg_trade_size } = parsed.success
    ? parsed.data
    : {};

  // Validate email
  if (!isValidEmail(email as string)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const sanitizedEmail = (email as string).trim().toLowerCase().slice(0, 254);

  // Per-email rate limit — stops an attacker rotating IPs to spam a
  // single target address through the funnel.
  if (await isRateLimited(`quick_audit_email:${sanitizedEmail}`, 1, 60 * 24)) {
    return NextResponse.json(
      { error: "This email already submitted recently. Please check your inbox." },
      { status: 429 }
    );
  }

  const supabase = createAdminClient();

  // Check for existing email — prevent duplicates
  const { data: existing } = await supabase
    .from("email_captures")
    .select("id")
    .eq("email", sanitizedEmail)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, alreadySubscribed: true });
  }

  // Build context from trading inputs
  const context: Record<string, unknown> = {};
  if (current_broker && typeof current_broker === "string") {
    context.current_broker = current_broker.slice(0, 100);
  }
  if (typeof trades_per_year === "number" && trades_per_year > 0) {
    context.trades_per_year = Math.min(trades_per_year, 1000);
  }
  if (typeof avg_trade_size === "number" && avg_trade_size > 0) {
    context.avg_trade_size = Math.min(avg_trade_size, 1000000);
  }

  const { error } = await supabase.from("email_captures").insert({
    email: sanitizedEmail,
    source: "quick_audit",
    ...(Object.keys(context).length > 0 ? { context } : {}),
  });

  if (error) {
    log.error("quick-audit email insert error", { error: error.message });
    return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
