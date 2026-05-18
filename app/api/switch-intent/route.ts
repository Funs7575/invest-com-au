import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { isSuppressed } from "@/lib/email-suppression";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

const log = logger("switch-intent");

// FIN_NOTEBOOK Revenue #2 — switching-as-a-service capture endpoint.
// Drops a row into switch_intents + sends a double-opt-in email. The
// partner-side fulfilment (actually executing the rollover / transfer)
// is BD-blocked; this endpoint is the inbound queue so we can build
// the user list now and route to partners as integrations come online.

const SubmitSchema = z.object({
  product_kind: z.enum(["super_fund", "savings_account", "broker", "home_loan"]),
  from_provider: z.string().max(200).optional(),
  to_provider: z.string().max(200).optional(),
  email: z.string().email().max(254),
  phone: z.string().max(40).optional(),
  estimated_balance: z.number().int().nonnegative().max(100_000_000_00).optional(),
  reason: z.enum(["fees", "performance", "features", "consolidation", "other"]).default("fees"),
  notes: z.string().max(2000).optional(),
  // Honeypot
  website: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isAllowed("switch_intent", ipKey(request), { max: 5, refillPerSec: 0.083 })) {
    // 5 per minute per IP; allow burst.
  }
  if (await isAllowed("switch_intent_capacity", "global", { max: 200, refillPerSec: 0.1 })) {
    // Global rate limit so a misbehaving form can't flood the table.
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.website && data.website.length > 0) {
    return NextResponse.json({ success: true });
  }
  if (!isValidEmail(data.email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  if (isDisposableEmail(data.email)) {
    return NextResponse.json({ error: "Please use a real email address." }, { status: 400 });
  }
  if (await isSuppressed(data.email)) {
    log.info("switch-intent blocked: suppressed", { email: data.email, ip });
    return NextResponse.json({ success: true });
  }

  const supabase = await createClient();
  const verifyToken = randomBytes(24).toString("hex");
  const unsubscribeToken = randomBytes(24).toString("hex");

  const { error: insertErr } = await supabase
    .from("switch_intents")
    .insert({
      product_kind: data.product_kind,
      from_provider: data.from_provider ?? null,
      to_provider: data.to_provider ?? null,
      email: data.email.toLowerCase(),
      phone: data.phone ?? null,
      estimated_balance_cents: data.estimated_balance != null ? data.estimated_balance * 100 : null,
      reason: data.reason,
      notes: data.notes ?? "",
      verify_token: verifyToken,
      unsubscribe_token: unsubscribeToken,
    });

  if (insertErr) {
    log.error("switch-intent insert failed", { err: insertErr.message });
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }

  // Double-opt-in email — fire-and-forget.
  const siteUrl = getSiteUrl();
  const productLabel = {
    super_fund: "super-fund switch",
    savings_account: "savings-account switch",
    broker: "broker transfer",
    home_loan: "home-loan refinance",
  }[data.product_kind];

  void sendEmail({
    to: data.email,
    subject: `Confirm your ${productLabel} request`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;color:#334155">
        <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:18px">Switch request</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <p style="font-size:15px;margin-top:0">Thanks — we've received your ${productLabel} request.</p>
          <p style="font-size:14px;color:#64748b">Confirm your email below and we'll route you to a partner who can actually execute the switch. No commitment, no hard credit pull.</p>
          <div style="text-align:center;margin:20px 0">
            <a href="${siteUrl}/switch/confirm?token=${verifyToken}"
               style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
              Confirm switch request &rarr;
            </a>
          </div>
          <p style="font-size:11px;color:#94a3b8">
            Didn't mean to submit?
            <a href="${siteUrl}/switch/unsubscribe?token=${unsubscribeToken}" style="color:#64748b">Cancel</a>.
            General information only — not personal advice. Always read the relevant PDS before switching.
          </p>
        </div>
      </div>
    `,
  }).catch((err) => {
    log.warn("switch-intent verify email failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  });

  return NextResponse.json({ success: true });
}
