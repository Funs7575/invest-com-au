/**
 * POST /api/admin/foreign-investment/update
 *
 * Generic update route for any FI data table row. Fetches the current
 * row first (for the audit log), applies the update, writes a change-log
 * entry, and busts the fi-data cache.
 *
 * Body:
 * {
 *   table: "fi_tax_brackets" | "fi_dta_countries" | "fi_dasp_rates" |
 *           "fi_withholding_rates" | "fi_property_rules",
 *   id: string,            // uuid of the row to update
 *   updates: Record<string, unknown>,  // fields to update
 *   adminEmail: string,
 *   categoryKey: string,   // for the audit log
 *   note?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";
import { z } from "zod";

const log = logger("admin-fi-update");

const ALLOWED_TABLES = [
  "fi_tax_brackets",
  "fi_dta_countries",
  "fi_dasp_rates",
  "fi_withholding_rates",
  "fi_property_rules",
] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

const UpdateBody = z.object({
  table: z.enum(ALLOWED_TABLES),
  id: z.string().min(1),
  updates: z.record(z.unknown()),
  categoryKey: z.string().min(1),
  note: z.string().optional(),
});

// Map table → cache tag to bust
const TABLE_CACHE_TAGS: Record<AllowedTable, string> = {
  fi_tax_brackets: "fi-data",
  fi_dta_countries: "fi-data",
  fi_dasp_rates: "fi-data",
  fi_withholding_rates: "fi-data",
  fi_property_rules: "fi-data",
};

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  // Require a real Supabase session whose email is on the admin allowlist.
  // Previously this route accepted a shared INTERNAL_API_KEY and trusted
  // `adminEmail` from the request body, which meant anyone with the
  // environment token could:
  //   (a) impersonate any admin email in the audit log (accountability bypass)
  //   (b) stamp attribution on regulatory tax/rate updates that a specific
  //       admin never actually made
  // Derive the identity from the authenticated session instead.
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

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch (err) {
    log.warn("FI update invalid JSON", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateBody.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const isTableInvalid =
      issue?.path[0] === "table" && issue.code === "invalid_enum_value";
    return NextResponse.json(
      { error: isTableInvalid ? "Table not allowed" : "Missing required fields" },
      { status: 400 },
    );
  }
  const { table, id, updates, categoryKey, note } = parsed.data;

  // adminEmail is now derived from the verified session, not the request body
  const adminEmail = authedEmail;

  const supabase = createAdminClient();

  // ── Fetch current state for audit log ─────────────────────
  const { data: currentRow } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .single();

  // ── Apply update ──────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from(table)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // ── Audit log ──────────────────────────────────────────────
  await supabase.from("fi_change_log").insert({
    category_key: categoryKey,
    action: "update",
    changed_by: adminEmail,
    record_id: id,
    previous_value: currentRow ?? null,
    new_value: { ...currentRow, ...updates },
    note: note ?? `Updated ${table} row ${id}`,
  });

  await supabase.from("admin_audit_log").insert({
    action: "fi_data:updated",
    entity_type: table,
    entity_id: id,
    admin_email: adminEmail,
    details: { category_key: categoryKey, fields_updated: Object.keys(updates) },
  });

  // ── Bust relevant cache tags ───────────────────────────────
  revalidateTag(TABLE_CACHE_TAGS[table as AllowedTable], {});
  // Also bust specific tags so cached functions pick up the new data
  revalidateTag("fi-data", {});
  revalidateTag(`fi-${table.replace("fi_", "").replace("_", "-")}`, {});

  return NextResponse.json({ ok: true, table, id });
}
