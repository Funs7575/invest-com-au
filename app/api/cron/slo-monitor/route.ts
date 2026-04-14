import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import {
  evaluateSlo,
  openIncident,
  resolveIncident,
  type SloDefinition,
} from "@/lib/slo";

const log = logger("cron:slo-monitor");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Every 15 minutes — reads each enabled SLO, measures the relevant
 * signal, and opens/resolves incidents accordingly.
 *
 * Supported metric types (in evaluation_source):
 *
 *   1. cron success_rate
 *      source: { type: "cron", name: "<cron-name>" }
 *      Reads the last `window_minutes` of cron_run_log rows for
 *      that cron and computes (ok rows / total rows).
 *
 *   2. cron freshness (minutes since last ok)
 *      source: { type: "cron_freshness", name: "<cron-name>" }
 *      Reads the most recent cron_run_log ok row and returns
 *      minutes since it ran.
 *
 *   3. queue age
 *      source: { type: "queue_age", table: "job_queue", column: "scheduled_at", status_column: "status", status_value: "ready" }
 *      Reads the oldest ready row and returns minutes old.
 *
 *   4. slo_incidents open count (recursive, useful for alerting
 *      on the monitor itself)
 *      source: { type: "open_incidents" }
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const stats = { evaluated: 0, breached: 0, resolved: 0, failed: 0 };

  const { data: definitions, error } = await supabase
    .from("slo_definitions")
    .select("*")
    .eq("enabled", true);

  if (error) {
    log.error("Failed to load SLO definitions", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  for (const def of definitions || []) {
    stats.evaluated++;
    try {
      const definition: SloDefinition = {
        name: def.name as string,
        service: def.service as string,
        metric: def.metric as string,
        target: Number(def.target),
        comparator: def.comparator as SloDefinition["comparator"],
        window_minutes: (def.window_minutes as number) || 60,
      };

      const measurement = await measureSlo(supabase, definition, (def.evaluation_source || {}) as Record<string, unknown>);
      if (measurement == null) {
        stats.failed++;
        continue;
      }

      const result = evaluateSlo(definition, measurement);
      if (result.breached) {
        await openIncident(definition, measurement, result);
        stats.breached++;
      } else {
        await resolveIncident(definition.name);
        stats.resolved++;
      }
    } catch (err) {
      stats.failed++;
      log.error("slo evaluation threw", {
        name: def.name,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("slo monitor completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function measureSlo(
  supabase: AdminClient,
  def: SloDefinition,
  source: Record<string, unknown>,
): Promise<{ value: number; context?: Record<string, unknown> } | null> {
  const type = source.type as string | undefined;
  const windowStart = new Date(Date.now() - def.window_minutes * 60 * 1000).toISOString();

  switch (type) {
    case "cron": {
      const name = source.name as string;
      const { data } = await supabase
        .from("cron_run_log")
        .select("status")
        .eq("name", name)
        .gte("started_at", windowStart);
      const rows = data || [];
      if (rows.length === 0) return { value: 1, context: { note: "no runs in window" } };
      const ok = rows.filter((r) => r.status === "ok").length;
      return { value: ok / rows.length, context: { total: rows.length, ok } };
    }
    case "cron_freshness": {
      const name = source.name as string;
      const { data } = await supabase
        .from("cron_run_log")
        .select("started_at")
        .eq("name", name)
        .eq("status", "ok")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return { value: Infinity, context: { note: "no ok run ever" } };
      const minutes = (Date.now() - new Date(data.started_at as string).getTime()) / (60 * 1000);
      return { value: minutes };
    }
    case "queue_age": {
      const table = source.table as string;
      const tsCol = (source.column as string) || "scheduled_at";
      const statusCol = (source.status_column as string) || "status";
      const statusVal = (source.status_value as string) || "ready";
      const { data } = await supabase
        .from(table)
        .select(tsCol)
        .eq(statusCol, statusVal)
        .order(tsCol, { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!data) return { value: 0 };
      const row = data as unknown as Record<string, unknown>;
      const ts = new Date(row[tsCol] as string).getTime();
      return { value: (Date.now() - ts) / (60 * 1000) };
    }
    case "open_incidents": {
      const { count } = await supabase
        .from("slo_incidents")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      return { value: count || 0 };
    }
    default:
      log.warn("unknown slo source type", { type, name: def.name });
      return null;
  }
}

export const GET = wrapCronHandler("slo-monitor", handler);
