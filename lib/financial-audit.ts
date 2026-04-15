/**
 * Financial audit log helper.
 *
 * Every money movement, refund, dispute reversal, credit adjustment,
 * and billing event should call `recordFinancialAudit` so compliance
 * can answer "what happened to advisor X's balance this quarter" or
 * "which admin authorised this refund".
 *
 * AFSL s912D requires financial services providers to maintain
 * records of decisions affecting client funds. We satisfy that with
 * a single append-only table + this helper.
 *
 * Writes are best-effort (fire-and-forget) so a logging failure
 * never blocks the underlying financial operation. Failures are
 * surfaced to Sentry via the structured logger.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isPeriodClosedAt } from "@/lib/financial-periods";

const log = logger("financial-audit");

export type AuditActor = "admin" | "system" | "advisor" | "user" | "cron";
export type AuditAction = "credit" | "debit" | "refund" | "charge" | "adjustment";

export interface FinancialAuditEntry {
  actorType: AuditActor;
  actorId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | number;
  amountCents?: number | null;
  currency?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  context?: Record<string, unknown> | null;
}

export async function recordFinancialAudit(entry: FinancialAuditEntry): Promise<void> {
  try {
    // Period lock guard: refuse writes dated inside a closed month.
    // AFSL s912D requires the books to be immutable once a period
    // is closed. Without this, a rogue cron or admin could silently
    // backdate an adjustment into a sealed month.
    if (await isPeriodClosedAt(new Date())) {
      log.warn("financial_audit_log blocked — period is closed", {
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        action: entry.action,
      });
      return;
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("financial_audit_log").insert({
      actor_type: entry.actorType,
      actor_id: entry.actorId ?? null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: String(entry.resourceId),
      amount_cents: entry.amountCents ?? null,
      currency: entry.currency || "AUD",
      old_value: entry.oldValue ?? null,
      new_value: entry.newValue ?? null,
      reason: entry.reason ?? null,
      context: entry.context ?? null,
    });
    if (error) {
      log.warn("financial_audit_log insert failed", {
        error: error.message,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
      });
    }
  } catch (err) {
    log.warn("financial_audit_log threw", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
