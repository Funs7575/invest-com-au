import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger("admin:automation:bulk");

/**
 * POST /api/admin/automation/bulk
 *
 * Bulk override endpoint for the drill-down pages. Lets an admin
 * approve/reject many rows at once instead of clicking one row at a
 * time. Every row acted on gets its admin_overridden_at + _by
 * stamped, and a single summary row is written to admin_action_log
 * with the list of target ids in `context.row_ids`.
 *
 * Body: {
 *   feature:    'lead_disputes' | 'listing_scam' | 'text_moderation'
 *             | 'advisor_applications' | 'broker_data_changes',
 *   targetVerdict: feature-specific,
 *   rowIds:        number[],
 *   reason?:       string,
 *   subSurface?:   'broker_review' | 'advisor_review' (text_moderation only)
 * }
 *
 * Returns: { ok, updated, failed, errors: [...] }
 *
 * For safety:
 *   - Max 500 rows per request (reject request otherwise)
 *   - Money-movement features (lead_disputes) are NOT bulk-actionable
 *     via this endpoint — those must go through per-row override so
 *     the credit balance recalculation runs correctly
 */
const MAX_BULK_ROWS = 500;

const BULK_ALLOWED_FEATURES = new Set([
  "listing_scam",
  "text_moderation",
  "advisor_applications",
  "broker_data_changes",
  "marketplace_campaigns",
]);

type AdminClient = ReturnType<typeof createAdminClient>;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const feature: string | null = typeof body.feature === "string" ? body.feature : null;
  const targetVerdict: string | null =
    typeof body.targetVerdict === "string" ? body.targetVerdict : null;
  const rowIds: number[] = Array.isArray(body.rowIds)
    ? body.rowIds.filter((v: unknown) => typeof v === "number")
    : [];
  const reason: string | null = typeof body.reason === "string" ? body.reason : null;
  const subSurface: string | undefined =
    typeof body.subSurface === "string" ? body.subSurface : undefined;

  if (!feature || !targetVerdict || rowIds.length === 0) {
    return NextResponse.json(
      { error: "Missing feature / targetVerdict / rowIds" },
      { status: 400 },
    );
  }
  if (!BULK_ALLOWED_FEATURES.has(feature)) {
    return NextResponse.json(
      { error: `Feature ${feature} is not bulk-actionable (use single override)` },
      { status: 400 },
    );
  }
  if (rowIds.length > MAX_BULK_ROWS) {
    return NextResponse.json(
      { error: `Bulk request exceeds ${MAX_BULK_ROWS} rows` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const auditPatch = {
    admin_overridden_at: nowIso,
    admin_overridden_by: user.email,
  };

  let updated = 0;
  const errors: string[] = [];

  try {
    switch (feature) {
      case "listing_scam":
        updated = await bulkUpdate(admin, "investment_listings", rowIds, {
          status: targetVerdict,
          ...auditPatch,
        });
        break;
      case "text_moderation": {
        const table = subSurface === "advisor_review" ? "professional_reviews" : "user_reviews";
        updated = await bulkUpdate(admin, table, rowIds, {
          status: targetVerdict,
          ...auditPatch,
        });
        break;
      }
      case "advisor_applications":
        updated = await bulkUpdate(admin, "advisor_applications", rowIds, {
          status: targetVerdict,
          reviewed_at: nowIso,
          reviewed_by: user.email,
          ...auditPatch,
        });
        break;
      case "broker_data_changes":
        updated = await bulkUpdate(admin, "broker_data_changes", rowIds, {
          auto_applied_at: nowIso,
          ...auditPatch,
        });
        break;
      case "marketplace_campaigns":
        updated = await bulkUpdate(admin, "campaigns", rowIds, {
          status: targetVerdict,
          ...auditPatch,
        });
        break;
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    log.error("Bulk override failed", { feature, err: errors[0] });
  }

  // Audit log — single row summarising the whole bulk action
  await admin
    .from("admin_action_log")
    .insert({
      admin_email: user.email,
      feature,
      action: "bulk",
      target_row_id: null,
      target_verdict: targetVerdict,
      reason,
      context: {
        row_ids: rowIds,
        row_count: rowIds.length,
        sub_surface: subSurface,
        updated,
        errors,
      },
    })
    .then(({ error }) => {
      if (error) {
        log.warn("admin_action_log insert failed", { error: error.message });
      }
    });

  return NextResponse.json({
    ok: errors.length === 0,
    updated,
    failed: rowIds.length - updated,
    errors,
  });
}

/**
 * Do a batched update. Supabase JS has no built-in bulk update by
 * id list so we just use .in('id', ...) which the PG engine expands
 * into a single SQL UPDATE.
 */
async function bulkUpdate(
  admin: AdminClient,
  table: string,
  rowIds: number[],
  patch: Record<string, unknown>,
): Promise<number> {
  // Chunk into groups of 100 to keep the IN list small and predictable
  let total = 0;
  for (let i = 0; i < rowIds.length; i += 100) {
    const chunk = rowIds.slice(i, i + 100);
    const { error, count } = await admin
      .from(table)
      .update(patch, { count: "exact" })
      .in("id", chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
    total += count || chunk.length;
  }
  return total;
}
