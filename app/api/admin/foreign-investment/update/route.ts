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
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import { getAdminEmails } from "@/lib/admin";

const ALLOWED_TABLES = [
  "fi_tax_brackets",
  "fi_dta_countries",
  "fi_dasp_rates",
  "fi_withholding_rates",
  "fi_property_rules",
] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

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
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (token !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    table: string;
    id: string;
    updates: Record<string, unknown>;
    adminEmail: string;
    categoryKey: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { table, id, updates, adminEmail, categoryKey, note } = body;

  if (!table || !id || !updates || !adminEmail || !categoryKey) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(adminEmail.toLowerCase())) {
    return NextResponse.json({ error: "Not an admin email" }, { status: 403 });
  }

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

  // ── Bust relevant cache tags ───────────────────────────────
  revalidateTag(TABLE_CACHE_TAGS[table as AllowedTable], {});
  // Also bust specific tags so cached functions pick up the new data
  revalidateTag("fi-data", {});
  revalidateTag(`fi-${table.replace("fi_", "").replace("_", "-")}`, {});

  return NextResponse.json({ ok: true, table, id });
}
