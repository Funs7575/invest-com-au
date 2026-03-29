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
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import { getAdminEmails } from "@/lib/admin";

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (token !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { categoryKey: string; adminEmail: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { categoryKey, adminEmail, note } = body;

  if (!categoryKey || !adminEmail) {
    return NextResponse.json(
      { error: "categoryKey and adminEmail are required" },
      { status: 400 }
    );
  }

  // Confirm the caller is a known admin
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(adminEmail.toLowerCase())) {
    return NextResponse.json({ error: "Not an admin email" }, { status: 403 });
  }

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
  revalidateTag("fi-data");
  revalidateTag("fi-data-categories");

  return NextResponse.json({ ok: true, categoryKey, verifiedBy: adminEmail });
}
