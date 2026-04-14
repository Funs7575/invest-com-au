/**
 * SLO evaluator + alert helpers.
 *
 * Pure decision functions that take a measured value and an SLO
 * definition, decide whether it's breached, and (if so) open an
 * incident row. The `slo-monitor` cron is the only caller — it
 * walks every enabled row in `slo_definitions`, runs the matching
 * measurement, then calls `evaluateSlo`.
 *
 * Alert routing:
 *   - `warn` incidents → Slack webhook
 *   - `page` incidents → Slack + PagerDuty webhook
 *
 * Both webhook URLs come from env vars. If they're unset we still
 * open the incident row, just without an external notification —
 * so adding the webhook later is zero-code.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("slo");

export type SloComparator = ">=" | "<=" | "<" | ">";

export interface SloDefinition {
  name: string;
  service: string;
  metric: string;
  target: number;
  comparator: SloComparator;
  window_minutes: number;
}

export interface SloMeasurement {
  value: number;
  context?: Record<string, unknown>;
}

export interface SloEvaluation {
  breached: boolean;
  severity: "warn" | "page";
  reason: string;
}

/**
 * Pure evaluation — given a measurement + an SLO definition,
 * decide whether the SLO is in breach and at what severity.
 *
 * Rules:
 *   - If the comparator check fails → breach
 *   - Severity = 'page' if the breach is ≥50% off target
 *     (e.g. 99% target, measured 49% = page; measured 95% = warn)
 *   - Otherwise severity = 'warn'
 *
 * Kept pure so the unit tests can cover every case without a
 * DB stub.
 */
export function evaluateSlo(
  definition: SloDefinition,
  measurement: SloMeasurement,
): SloEvaluation {
  const { target, comparator } = definition;
  const value = measurement.value;
  let breached: boolean;
  switch (comparator) {
    case ">=":
      breached = !(value >= target);
      break;
    case ">":
      breached = !(value > target);
      break;
    case "<=":
      breached = !(value <= target);
      break;
    case "<":
      breached = !(value < target);
      break;
  }
  if (!breached) {
    return { breached: false, severity: "warn", reason: "within_target" };
  }

  // Page if the breach is >= 50% off target
  const gap = Math.abs(value - target) / Math.max(Math.abs(target), 1);
  const severity: "warn" | "page" = gap >= 0.5 ? "page" : "warn";
  return {
    breached: true,
    severity,
    reason: `measured ${value} ${comparator} ${target} failed (gap ${(gap * 100).toFixed(0)}%)`,
  };
}

/**
 * Open a new slo_incidents row for a breach. Fire-and-forget
 * notification on success. Safe to call multiple times — the
 * cron dedupes by only opening if there isn't already an `open`
 * row for the same SLO name.
 */
export async function openIncident(
  definition: SloDefinition,
  measurement: SloMeasurement,
  evaluation: SloEvaluation,
): Promise<void> {
  if (!evaluation.breached) return;

  const supabase = createAdminClient();
  // Dedupe — don't open a new incident if one is already open
  const { data: existing } = await supabase
    .from("slo_incidents")
    .select("id")
    .eq("slo_name", definition.name)
    .eq("status", "open")
    .limit(1);
  if (existing && existing.length > 0) return;

  const { error } = await supabase.from("slo_incidents").insert({
    slo_name: definition.name,
    service: definition.service,
    severity: evaluation.severity,
    measured_value: measurement.value,
    target_value: definition.target,
    comparator: definition.comparator,
    notes: evaluation.reason,
    context: measurement.context || null,
  });
  if (error) {
    log.warn("slo_incidents insert failed", { error: error.message });
    return;
  }

  // Route to Slack (always) + PagerDuty (page only)
  notifySlack(definition, evaluation, measurement).catch((err) =>
    log.warn("slo slack notification failed", {
      err: err instanceof Error ? err.message : String(err),
    }),
  );
  if (evaluation.severity === "page") {
    notifyPagerDuty(definition, evaluation, measurement).catch((err) =>
      log.warn("slo pagerduty notification failed", {
        err: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

async function notifySlack(
  def: SloDefinition,
  evaluation: SloEvaluation,
  measurement: SloMeasurement,
): Promise<void> {
  const url = process.env.SLACK_ALERT_WEBHOOK_URL;
  if (!url) return;
  const emoji = evaluation.severity === "page" ? ":rotating_light:" : ":warning:";
  const body = {
    text: `${emoji} SLO breach: *${def.name}*`,
    attachments: [
      {
        color: evaluation.severity === "page" ? "#dc2626" : "#f59e0b",
        fields: [
          { title: "Service", value: def.service, short: true },
          { title: "Metric", value: def.metric, short: true },
          { title: "Target", value: `${def.comparator} ${def.target}`, short: true },
          { title: "Measured", value: String(measurement.value), short: true },
          { title: "Reason", value: evaluation.reason, short: false },
        ],
      },
    ],
  };
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
}

async function notifyPagerDuty(
  def: SloDefinition,
  evaluation: SloEvaluation,
  measurement: SloMeasurement,
): Promise<void> {
  const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
  if (!routingKey) return;
  const body = {
    routing_key: routingKey,
    event_action: "trigger",
    dedup_key: `slo:${def.name}`,
    payload: {
      summary: `SLO breach: ${def.name}`,
      severity: "error",
      source: "invest-com-au",
      component: def.service,
      custom_details: {
        metric: def.metric,
        target: def.target,
        measured: measurement.value,
        reason: evaluation.reason,
        ...(measurement.context || {}),
      },
    },
  };
  await fetch("https://events.pagerduty.com/v2/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
}

/**
 * Resolve any open incident whose name matches the given SLO.
 * Called by the monitor cron after an evaluation comes back
 * clean so recoveries auto-close.
 */
export async function resolveIncident(sloName: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("slo_incidents")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("slo_name", sloName)
    .eq("status", "open");

  // Also send PagerDuty resolve event so the incident auto-closes
  const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
  if (routingKey) {
    await fetch("https://events.pagerduty.com/v2/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: "resolve",
        dedup_key: `slo:${sloName}`,
      }),
      signal: AbortSignal.timeout(8_000),
    }).catch(() => undefined);
  }
}
