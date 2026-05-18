/**
 * /api/admin/promo-codes — admin-only mint / list endpoints for the
 * brief marketplace promo-code system.
 *
 *   POST { code, kind, value, max_uses, expires_at?, notes? } → mint
 *   GET → list every code newest-first
 *   DELETE ?id=N → remove a code (only if no redemptions reference it)
 *
 * Codes are admin-only because they affect marketplace pricing — anon
 * enumeration of codes would let scrapers grind for discounts. The
 * admin guard pulls from the standard ADMIN_EMAILS allow-list.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllPromoCodes } from "@/lib/briefs/promo-codes";
import { logger } from "@/lib/logger";

const log = logger("api:admin:promo-codes");

const MintBody = z.object({
  code: z
    .string()
    .min(3)
    .max(48)
    .regex(/^[A-Za-z0-9_-]+$/, "Codes can only contain letters, digits, _ or -."),
  kind: z.enum(["free_brief", "percent_off_accept", "fixed_credits"]),
  value: z.number().positive().optional(),
  max_uses: z.number().int().positive().max(10_000).default(1),
  expires_at: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const codes = await listAllPromoCodes();
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = MintBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  // Validation: free_brief ignores value; percent_off_accept needs 1..100;
  // fixed_credits needs positive integer.
  const { code, kind, value, max_uses, expires_at, notes } = parsed.data;
  if (kind !== "free_brief" && (value === undefined || value === null)) {
    return NextResponse.json(
      { error: "value is required for this code kind." },
      { status: 400 },
    );
  }
  if (kind === "percent_off_accept" && (!value || value <= 0 || value > 100)) {
    return NextResponse.json(
      { error: "percent_off_accept value must be 1..100." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("brief_promo_codes").insert({
    code: code.trim(),
    code_kind: kind,
    value: kind === "free_brief" ? null : (value ?? null),
    max_uses: max_uses,
    expires_at: expires_at ?? null,
    notes: notes ?? null,
    created_by_admin: guard.email,
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A code with that value already exists." },
        { status: 409 },
      );
    }
    log.error("promo-code mint failed", { error: error.message });
    return NextResponse.json(
      { error: "Failed to mint code." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const id = Number(new URL(req.url).searchParams.get("id") ?? "");
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const admin = createAdminClient();
  // Block deletes when redemptions exist — preserves the audit trail.
  const { data: redemptions } = await admin
    .from("brief_promo_redemptions")
    .select("id")
    .eq("promo_code_id", id)
    .limit(1);
  if (redemptions && redemptions.length > 0) {
    return NextResponse.json(
      {
        error:
          "This code has been redeemed and can't be deleted. Expire it instead by setting expires_at in the past.",
      },
      { status: 409 },
    );
  }

  const { error } = await admin
    .from("brief_promo_codes")
    .delete()
    .eq("id", id);
  if (error) {
    log.error("promo-code delete failed", { id, error: error.message });
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
