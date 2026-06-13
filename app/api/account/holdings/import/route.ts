import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { getCurrentPricesBatch } from "@/lib/holdings/value";
import { MAX_IMPORT_ROWS } from "@/lib/holdings/import";
import { awardIfEligible } from "@/lib/quests-server";

const log = logger("api:account:holdings:import");

export const runtime = "nodejs";

/**
 * POST /api/account/holdings/import — confirm step of the CSV-import
 * wizard. The browser parsed + previewed the file; this route persists
 * the user's confirmed plan:
 *
 *   inserts — new holdings (rows the dedupe step classed "new" or
 *             "add as new lot")
 *   updates — existing holdings whose units/avg price the user chose to
 *             overwrite ("already tracked — update units")
 *
 * All-or-nothing semantics without a DB transaction primitive (PostgREST
 * has none): updates are applied first while remembering prior values,
 * then the inserts run as ONE bulk insert (atomic — a single statement).
 * If any step fails, previously-applied updates are compensated back to
 * their prior values, so a failed import leaves the portfolio untouched.
 * Zod mirrors every DB CHECK constraint, which makes mid-flight DB
 * rejections (the only window where compensation runs) extremely rare.
 *
 * Auth: user-scoped supabase client; RLS scopes reads/writes to
 * auth.uid(). Never service-role for holdings writes. The price-cache
 * warm afterwards reuses lib/holdings/value.ts — the same cache-first
 * hydrate the holdings page runs on render.
 *
 * Responses:
 *   200 { inserted, updated }
 *   400 validation / duplicate update ids
 *   401 no session
 *   404 update target not found (not yours / already deleted)
 *   429 rate limited
 *   500 { error: "import_failed" } — nothing was kept
 */

const EXCHANGES = [
  "ASX", "NASDAQ", "NYSE", "LSE", "HKEX", "SGX", "TYO", "KRX", "CRYPTO", "OTHER",
] as const;

// Field caps mirror the manual-add route (app/api/account/holdings) and
// the investor_holdings CHECK constraints exactly.
const InsertRow = z.object({
  ticker: z.string().trim().min(1).max(30),
  exchange: z.enum(EXCHANGES),
  shares: z.number().positive().max(1e12),
  cost_basis_per_share_cents: z.number().int().min(0).max(1e15),
  acquired_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD required"),
  broker_slug: z.string().max(100).nullish(),
  notes: z.string().max(500).nullish(),
});

const UpdateRow = z.object({
  id: z.number().int().positive(),
  shares: z.number().positive().max(1e12),
  cost_basis_per_share_cents: z.number().int().min(0).max(1e15),
});

const ImportBody = z
  .object({
    inserts: z.array(InsertRow).max(MAX_IMPORT_ROWS).default([]),
    updates: z.array(UpdateRow).max(MAX_IMPORT_ROWS).default([]),
  })
  .superRefine((body, ctx) => {
    const total = body.inserts.length + body.updates.length;
    if (total === 0) {
      ctx.addIssue({ code: "custom", message: "Nothing to import" });
    } else if (total > MAX_IMPORT_ROWS) {
      ctx.addIssue({
        code: "custom",
        message: `Too many rows — max ${MAX_IMPORT_ROWS} per import`,
      });
    }
  });

interface PriorValues {
  id: number;
  shares: number;
  cost_basis_per_share_cents: number;
}

export const POST = withValidatedBody(ImportBody, async (_req, body) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Per-user throttle: imports are chunky writes; 10/hour is generous
    // for legitimate use (multiple broker files) and starves abuse.
    if (await isRateLimited(`holdings_import:${user.id}`, 10, 60)) {
      return NextResponse.json(
        { error: "rate_limited", detail: "Too many imports — try again later." },
        { status: 429 },
      );
    }

    const updateIds = body.updates.map((u) => u.id);
    if (new Set(updateIds).size !== updateIds.length) {
      return NextResponse.json(
        { error: "duplicate_update_targets" },
        { status: 400 },
      );
    }

    // Phase 1 — verify update targets exist AND belong to this user (the
    // RLS-scoped select only returns own rows), capturing prior values
    // for compensation.
    const priors = new Map<number, PriorValues>();
    if (updateIds.length > 0) {
      const { data: targets, error: targetsError } = await supabase
        .from("investor_holdings")
        .select("id, shares, cost_basis_per_share_cents")
        .in("id", updateIds);
      if (targetsError) {
        log.warn("import target fetch failed", { error: targetsError.message });
        return NextResponse.json({ error: "import_failed" }, { status: 500 });
      }
      for (const t of targets ?? []) {
        priors.set(Number(t.id), {
          id: Number(t.id),
          shares: Number(t.shares),
          cost_basis_per_share_cents: Number(t.cost_basis_per_share_cents),
        });
      }
      const missing = updateIds.filter((id) => !priors.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: "update_target_not_found", ids: missing },
          { status: 404 },
        );
      }
    }

    // Phase 2 — apply updates, remembering which succeeded.
    const applied: number[] = [];
    for (const update of body.updates) {
      const { error: updateError } = await supabase
        .from("investor_holdings")
        .update({
          shares: update.shares,
          cost_basis_per_share_cents: update.cost_basis_per_share_cents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", update.id);
      if (updateError) {
        log.warn("import update failed — compensating", {
          id: update.id,
          error: updateError.message,
        });
        await revertUpdates(supabase, applied, priors);
        return NextResponse.json(
          {
            error: "import_failed",
            detail: "A holding update failed — no changes were saved.",
          },
          { status: 500 },
        );
      }
      applied.push(update.id);
    }

    // Phase 3 — single atomic bulk insert.
    let inserted = 0;
    if (body.inserts.length > 0) {
      const payload = body.inserts.map((row) => ({
        auth_user_id: user.id,
        ticker: row.ticker.trim().toUpperCase(),
        exchange: row.exchange,
        shares: row.shares,
        cost_basis_per_share_cents: row.cost_basis_per_share_cents,
        acquired_at: row.acquired_at,
        broker_slug: row.broker_slug ?? null,
        notes: row.notes ?? null,
      }));
      const { error: insertError, count } = await supabase
        .from("investor_holdings")
        .insert(payload, { count: "exact" });
      if (insertError) {
        log.warn("import insert failed — compensating updates", {
          rowCount: payload.length,
          error: insertError.message,
        });
        await revertUpdates(supabase, applied, priors);
        return NextResponse.json(
          {
            error: "import_failed",
            detail: "Inserting the new holdings failed — no changes were saved.",
          },
          { status: 500 },
        );
      }
      inserted = typeof count === "number" ? count : payload.length;
    }

    // Phase 4 — warm the price cache for the imported instruments so the
    // holdings page shows prices immediately (same cache-first hydrate the
    // page itself runs). Best-effort: failures never fail the import.
    try {
      const pairs = uniquePairs(
        body.inserts.map((r) => ({
          ticker: r.ticker.trim().toUpperCase(),
          exchange: r.exchange,
        })),
      ).slice(0, 50);
      if (pairs.length > 0) await getCurrentPricesBatch(pairs);
    } catch (err) {
      log.warn("post-import price warm failed", err);
    }

    // Quests: first-csv-import, plus first-holding / three-holdings since
    // an import is the most common way a portfolio crosses these. All
    // fire-and-forget — flag-gated + fail-soft inside awardIfEligible, so
    // award bookkeeping never affects the committed import response.
    void (async () => {
      if (inserted > 0) {
        void awardIfEligible(user.id, "first-csv-import", { meta: { inserted } });
        void awardIfEligible(user.id, "first-holding");
      }
      const { count } = await supabase
        .from("investor_holdings")
        .select("id", { count: "exact", head: true });
      if (typeof count === "number" && count >= 3) {
        void awardIfEligible(user.id, "three-holdings", { count, meta: { holdings_count: count } });
      }
    })().catch(() => {
      /* fail-soft */
    });

    log.info("csv import committed", {
      inserted,
      updated: applied.length,
    });
    return NextResponse.json({ inserted, updated: applied.length });
  } catch (err) {
    log.error("csv import unexpected error", err);
    return NextResponse.json({ error: "import_failed" }, { status: 500 });
  }
});

/** Best-effort compensation: restore prior values for applied updates. */
async function revertUpdates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  applied: readonly number[],
  priors: ReadonlyMap<number, PriorValues>,
): Promise<void> {
  for (const id of applied) {
    const prior = priors.get(id);
    if (!prior) continue;
    const { error } = await supabase
      .from("investor_holdings")
      .update({
        shares: prior.shares,
        cost_basis_per_share_cents: prior.cost_basis_per_share_cents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      // The one state we can't unwind — surface loudly for ops follow-up.
      log.error("import compensation failed — holding left updated", {
        id,
        error: error.message,
      });
    }
  }
}

function uniquePairs(
  pairs: ReadonlyArray<{ ticker: string; exchange: string }>,
): Array<{ ticker: string; exchange: string }> {
  const seen = new Set<string>();
  const out: Array<{ ticker: string; exchange: string }> = [];
  for (const pair of pairs) {
    const key = `${pair.exchange}:${pair.ticker}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pair);
  }
  return out;
}
