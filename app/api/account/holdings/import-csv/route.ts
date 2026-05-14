import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";
import {
  CSV_IMPORT_PARSERS,
  SUPPORTED_BROKER_SLUGS,
  type SupportedBrokerSlug,
} from "@/lib/holdings/csv-import";

const log = logger("api:account:holdings:import-csv");

export const runtime = "nodejs";

/**
 * POST /api/account/holdings/import-csv — bulk-create holdings from a
 * broker CSV export.
 *
 * Request body:
 *   {
 *     broker_slug: "commsec" | ... (one of SUPPORTED_BROKER_SLUGS),
 *     csv_text: string  // up to 500 000 chars
 *   }
 *
 * Response:
 *   200 OK   — { inserted: number, errors: CsvParseError[] }
 *   400 BAD  — body validation / unknown broker
 *   401      — no session
 *   422      — every parsed row failed (errors[] non-empty, inserted=0)
 *   500      — supabase insert failure
 *
 * Auth: user-scoped supabase client. RLS on `investor_holdings` scopes
 * by `auth.uid()`; we still set `auth_user_id` explicitly on insert so
 * the WITH CHECK policy passes. Never service-role.
 */
const ImportCsvBody = z.object({
  broker_slug: z.enum(SUPPORTED_BROKER_SLUGS),
  csv_text: z.string().min(1).max(500_000),
});

export const POST = withValidatedBody(ImportCsvBody, async (_req, body) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const parser = CSV_IMPORT_PARSERS[body.broker_slug as SupportedBrokerSlug];
    if (!parser) {
      // Defensive — Zod enum already gates this. Keep so the response
      // shape stays consistent if the registry is ever out of sync.
      return NextResponse.json(
        { error: "unsupported_broker", broker_slug: body.broker_slug },
        { status: 400 },
      );
    }

    const { rows, errors } = parser(body.csv_text);

    if (rows.length === 0) {
      log.info("csv import produced no rows", {
        broker_slug: body.broker_slug,
        error_count: errors.length,
      });
      return NextResponse.json({ inserted: 0, errors }, { status: 422 });
    }

    // Bulk insert. RLS WITH CHECK fires per-row — `auth_user_id` must
    // match `auth.uid()` for each row, which it does because we set it
    // from the verified `user.id` server-side.
    const insertPayload = rows.map((r) => ({
      auth_user_id: user.id,
      ticker: r.ticker,
      exchange: r.exchange,
      shares: r.shares,
      cost_basis_per_share_cents: r.cost_basis_per_share_cents,
      acquired_at: r.acquired_at,
      broker_slug: r.broker_slug,
      notes: r.notes,
    }));

    const { error: insertError, count } = await supabase
      .from("investor_holdings")
      .insert(insertPayload, { count: "exact" });

    if (insertError) {
      log.warn("csv import insert failed", {
        broker_slug: body.broker_slug,
        rowCount: insertPayload.length,
        error: insertError.message,
      });
      return NextResponse.json(
        { error: "insert_failed", detail: insertError.message },
        { status: 500 },
      );
    }

    const inserted = typeof count === "number" ? count : insertPayload.length;
    log.info("csv import succeeded", {
      broker_slug: body.broker_slug,
      inserted,
      error_count: errors.length,
    });
    return NextResponse.json({ inserted, errors });
  } catch (err) {
    log.warn("csv import unexpected error", err);
    return NextResponse.json({ error: "import_failed" }, { status: 500 });
  }
});
