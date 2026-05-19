/**
 * POST /api/admin/afsl-register/upload
 *
 * Admin-only CSV upload that idempotently upserts rows into
 * `public.afsl_register`. Pre-launch fill path before we sign a paid
 * vendor contract.
 *
 * Expected CSV header (case-insensitive, comma-separated):
 *   afsl_number, licensee_name, status, address, effective_date, cancelled_date
 *
 * Status is normalised against the migration's CHECK constraint
 * ('current' | 'cancelled' | 'suspended' | 'ceased' | 'unknown').
 * Unknown / blank statuses fall back to 'unknown'.
 *
 * Returns:
 *   { inserted: number; updated: number; skipped: number; errors: string[] }
 *
 * Body shape:
 *   { csv: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { normaliseAfslNumber, type AfslStatus } from "@/lib/afsl-register";
import { logger } from "@/lib/logger";

const log = logger("admin-afsl-upload");

const BodySchema = z.object({
  csv: z.string().min(1).max(2_000_000), // ~2MB hard cap; 6k rows is well under.
});

const VALID_STATUSES: ReadonlySet<AfslStatus> = new Set([
  "current",
  "cancelled",
  "suspended",
  "ceased",
  "unknown",
]);

type ParsedRow = {
  afsl_number: string;
  licensee_name: string;
  status: AfslStatus;
  address: string | null;
  effective_date: string | null;
  cancelled_date: string | null;
};

/**
 * Minimal CSV parser. We avoid a dependency for ~20 lines of code; the
 * input is a known shape (ASIC export). Handles double-quoted fields
 * containing commas, escaped quotes ("") and \r\n line endings.
 */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch === "\r") {
        // skip; \n handles row end
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function normaliseStatus(raw: string): AfslStatus {
  const s = raw.trim().toLowerCase();
  if (VALID_STATUSES.has(s as AfslStatus)) return s as AfslStatus;
  return "unknown";
}

function normaliseDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  // Accept ISO YYYY-MM-DD or DD/MM/YYYY (the ASIC export format).
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const dm = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dm) {
    const [, d, m, y] = dm;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body must be { csv: string }." },
      { status: 400 },
    );
  }

  const grid = parseCsv(parsed.data.csv);
  if (grid.length < 2) {
    return NextResponse.json(
      { error: "CSV needs a header row and at least one data row." },
      { status: 400 },
    );
  }

  const header = grid[0]!.map((h) => h.trim().toLowerCase());
  const colIndex = (name: string) => header.indexOf(name);
  const iNum = colIndex("afsl_number");
  const iName = colIndex("licensee_name");
  if (iNum < 0 || iName < 0) {
    return NextResponse.json(
      {
        error:
          "CSV is missing required columns. Expected afsl_number and licensee_name in the header row.",
      },
      { status: 400 },
    );
  }
  const iStatus = colIndex("status");
  const iAddress = colIndex("address");
  const iEffective = colIndex("effective_date");
  const iCancelled = colIndex("cancelled_date");

  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  for (let r = 1; r < grid.length; r++) {
    const cols = grid[r]!;
    const num = normaliseAfslNumber(cols[iNum] ?? "");
    const name = (cols[iName] ?? "").trim();
    if (!num || !name) {
      errors.push(`Row ${r + 1}: missing afsl_number or licensee_name.`);
      continue;
    }
    rows.push({
      afsl_number: num,
      licensee_name: name,
      status: iStatus >= 0 ? normaliseStatus(cols[iStatus] ?? "") : "unknown",
      address: iAddress >= 0 ? (cols[iAddress]?.trim() || null) : null,
      effective_date: iEffective >= 0 ? normaliseDate(cols[iEffective] ?? "") : null,
      cancelled_date: iCancelled >= 0 ? normaliseDate(cols[iCancelled] ?? "") : null,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows after parsing.", errors },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { error: upsertError, count } = await supabase
    .from("afsl_register")
    .upsert(
      rows.map((r) => ({
        ...r,
        source: "admin_csv",
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "afsl_number", count: "exact" },
    );

  if (upsertError) {
    log.error("AFSL upsert failed", { err: upsertError.message });
    return NextResponse.json(
      { error: "Database upsert failed.", detail: upsertError.message },
      { status: 500 },
    );
  }

  log.info("AFSL register CSV upload", {
    admin: guard.email,
    rows: rows.length,
    errors: errors.length,
  });

  return NextResponse.json({
    ok: true,
    rows: rows.length,
    upserted: count ?? rows.length,
    skipped: errors.length,
    errors,
  });
}
