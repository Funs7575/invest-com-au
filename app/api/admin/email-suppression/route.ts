import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { suppress, unsuppress } from "@/lib/email-suppression";
 
// service_role-only RLS (see migration 20260518000000) — same exception
// as lib/email-suppression.ts. Admin route reading via admin client.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("admin:email-suppression");

// FIN_NOTEBOOK item 18 — admin UI surface over lib/email-suppression.
// The library helpers (isSuppressed/suppress/unsuppress) shipped in
// PR #908 but no UI exists, so unsuppressing a falsely-bounced address
// required SQL access. This route fixes that.
//
// GET: paginated list of suppression_list rows, with optional ?q=
//      substring filter and ?reason= filter. Returns just the new
//      table (not the legacy `email_suppression_list`) since that one
//      is bounce-managed by Resend webhooks and shouldn't be touched
//      by hand.
//
// POST: { email, reason, metadata? } — manually suppress an address.
//
// DELETE: ?email=... — remove from suppression list.

const SuppressBody = z.object({
  email: z.string().email().max(320),
  reason: z.enum([
    "hard_bounce",
    "soft_bounce_ladder_exhausted",
    "complaint",
    "manual_unsubscribe",
    "admin",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const reason = url.searchParams.get("reason")?.trim() ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500);

  const admin = createAdminClient();
  let query = admin
    .from("suppression_list")
    .select("id, contact_email, reason, suppressed_at, metadata", { count: "exact" })
    .order("suppressed_at", { ascending: false })
    .limit(limit);

  if (q.length > 0) {
    query = query.ilike("contact_email", `%${q.toLowerCase()}%`);
  }
  if (reason.length > 0) {
    query = query.eq("reason", reason);
  }

  const { data, error, count } = await query;
  if (error) {
    log.error("list failed", { err: error.message });
    return NextResponse.json({ error: "Failed to load suppression list" }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [], total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = SuppressBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, reason, metadata } = parsed.data;
  const result = await suppress(email, reason, {
    metadata: { ...metadata, by_admin: guard.email },
  });
  log.info("manual suppress", { by: guard.email, email, reason, inserted: result.inserted });
  return NextResponse.json({ ok: true, inserted: result.inserted, reason: result.reason });
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ error: "Missing ?email" }, { status: 400 });
  }

  const result = await unsuppress(email);
  log.info("manual unsuppress", { by: guard.email, email, removed: result.removed });
  return NextResponse.json({ ok: true, removed: result.removed });
}
