/**
 * Autopilot gate — reads site_settings to decide whether a cron automation
 * should execute. The admin UI at /admin/autopilot writes two keys per
 * automation: "autopilot_enabled" (master switch) and "autopilot_<id>"
 * (per-automation toggle). Both must be truthy for the automation to run.
 *
 * Without this gate the admin toggles were cosmetic — they saved to DB but
 * the cron routes never read them. Audit §5 item 16 (2026-05-20).
 *
 * Usage inside a cron GET handler (after requireCronAuth):
 *
 *   const gateResult = await checkAutopilotGate("check-fees");
 *   if (gateResult) return gateResult;      // returns 503 JSON when disabled
 *   // … do the work …
 */

import { NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports -- site_settings is service-role-only (no anon SELECT policy) per CLAUDE.md § "Tables with service_role-only policies"
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("autopilot");

const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  masterEnabled: boolean;
  perAutomation: Record<string, boolean>;
  at: number;
}

let cache: CacheEntry | null = null;

async function loadSettings(): Promise<Pick<CacheEntry, "masterEnabled" | "perAutomation">> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .like("key", "autopilot%");

  if (error) {
    log.warn("autopilot-settings-read-failed (defaulting to enabled)", { err: error.message });
    return { masterEnabled: true, perAutomation: {} };
  }

  let masterEnabled = true;
  const perAutomation: Record<string, boolean> = {};

  for (const row of data ?? []) {
    if (row.key === "autopilot_enabled") {
      masterEnabled = (row.value as string) !== "false";
    } else {
      const id = (row.key as string).replace("autopilot_", "");
      perAutomation[id] = (row.value as string) !== "false";
    }
  }

  return { masterEnabled, perAutomation };
}

/**
 * Call immediately after `requireCronAuth`. Returns a NextResponse (503) if
 * the automation is disabled via the admin UI, or null if it should run.
 *
 * Fail-open: if the DB read fails, the cron proceeds as normal so a Supabase
 * outage doesn't silence all automations.
 */
export async function checkAutopilotGate(id: string): Promise<NextResponse | null> {
  const now = Date.now();

  if (!cache || now - cache.at > CACHE_TTL_MS) {
    const settings = await loadSettings();
    cache = { ...settings, at: now };
  }

  if (!cache.masterEnabled) {
    log.info("autopilot-master-disabled", { id });
    return NextResponse.json(
      { skipped: true, reason: "autopilot_master_disabled" },
      { status: 503 },
    );
  }

  // Per-automation toggle defaults to enabled when no setting exists
  const perEnabled = cache.perAutomation[id] ?? true;
  if (!perEnabled) {
    log.info("autopilot-automation-disabled", { id });
    return NextResponse.json(
      { skipped: true, reason: `autopilot_${id}_disabled` },
      { status: 503 },
    );
  }

  return null;
}

/** Test-only — reset the in-process cache between test cases. */
export function _resetAutopilotCache(): void {
  cache = null;
}
