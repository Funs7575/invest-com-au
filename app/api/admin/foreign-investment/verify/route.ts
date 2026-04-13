/**
 * POST /api/admin/foreign-investment/verify
 *
 * Marks a foreign-investment data category as verified by the
 * current admin. Updates last_verified_at and status, writes an
 * audit log entry, and busts the fi-data cache.
 *
 * Body: { categoryKey: string; adminEmail: string; note?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger("admin-fi-verify");

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  // See notes in /admin/foreign-investment/update — require a verified
  // Supabase session and derive `adminEmail` from that, never from the
  // request body. This prevents audit-log impersonation.
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = getAdminEmails();
  const authedEmail = user.email.toLowerCase();
  if (!adminEmails.includes(authedEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { categoryKey: string; note?: string };
  try {
    body = await req.json();
  } catch (err) {
    log.warn("FI verify invalid JSON", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { categoryKey, note } = body;

  if (!categoryKey) {
    return NextResponse.json(
      { error: "categoryKey is required" },
      { status: 400 }
    );
  }

  const adminEmail = authedEmail;

  const supabase = createAdminClient();

  // ── Update category ────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from("fi_data_categories")
    .update({
      last_verified_at: new Date().toISOString(),
      verified_by: adminEmail,
      status: "current",
      updated_at: new Date().toISOString(),
    })
    .eq("category_key", categoryKey);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // ── Audit log ──────────────────────────────────────────────
  await supabase.from("fi_change_log").insert({
    category_key: categoryKey,
    action: "verify",
    changed_by: adminEmail,
    note: note ?? `Manually verified by ${adminEmail}`,
  });

  // ── Bust cache ─────────────────────────────────────────────
  revalidateTag("fi-data", {});
  revalidateTag("fi-data-categories", {});

  return NextResponse.json({ ok: true, categoryKey, verifiedBy: adminEmail });
}
