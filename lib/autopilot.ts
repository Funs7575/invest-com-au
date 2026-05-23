import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// eslint-disable-next-line no-restricted-imports -- site_settings is service-role-only config
const log = logger("autopilot");

/**
 * Returns true when the automation is allowed to run.
 *
 * Two checks in one DB round-trip:
 *   - `autopilot_enabled`        — master kill-switch (default true when absent)
 *   - `autopilot_${automationId}` — per-automation toggle (default true when absent)
 *
 * Fails open on DB errors so a transient Supabase outage doesn't halt
 * production crons. The setting values are the strings "true" / "false" as
 * set by the admin autopilot dashboard.
 */
export async function isAutomationEnabled(automationId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data: rows } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["autopilot_enabled", `autopilot_${automationId}`]);

    if (!rows) return true;

    const byKey = Object.fromEntries(
      rows.map((r) => [r.key as string, r.value as string]),
    );

    if (byKey["autopilot_enabled"] === "false") return false;
    if (byKey[`autopilot_${automationId}`] === "false") return false;

    return true;
  } catch (err) {
    log.warn("autopilot check failed — failing open", {
      automationId,
      err: err instanceof Error ? err.message : String(err),
    });
    return true;
  }
}
