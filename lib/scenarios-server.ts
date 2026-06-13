/**
 * Scenario Workspace — server-only reads.
 *
 * `getSharedScenario` powers the public read-only page (/scenarios/shared/[token]).
 * It uses the REGULAR RLS server client (NOT the admin client): the
 * `user_scenarios` "Anyone reads shared scenarios" policy permits anon/auth
 * SELECT only for rows whose `share_token IS NOT NULL`, and we select ONLY the
 * non-identifying public columns — so no owner identity can leak.
 *
 * Returns null on miss / error so the page can `notFound()` without surfacing a
 * stack trace. Gated by the `scenario_workspace` flag at the page level.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  SCENARIO_PUBLIC_COLUMNS,
  SCENARIO_SHARE_TOKEN_MIN_LENGTH,
  type ScenarioPublicView,
} from "@/lib/scenarios";

const log = logger("scenarios-server");

/**
 * Fetch a shared scenario by its opaque token. Returns the public projection
 * (name + calculator_key + inputs + results_snapshot) — never owner identity.
 */
export async function getSharedScenario(
  token: string,
): Promise<ScenarioPublicView | null> {
  if (!token || token.length < SCENARIO_SHARE_TOKEN_MIN_LENGTH) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_scenarios")
      .select(SCENARIO_PUBLIC_COLUMNS)
      .eq("share_token", token)
      .maybeSingle();
    if (error) {
      log.warn("getSharedScenario failed", { error: error.message });
      return null;
    }
    if (!data) return null;
    const row = data as {
      name: string;
      calculator_key: string;
      inputs: Record<string, unknown> | null;
      results_snapshot: Record<string, unknown> | null;
    };
    return {
      name: row.name,
      calculator_key: row.calculator_key,
      inputs: row.inputs ?? {},
      results_snapshot: row.results_snapshot ?? null,
    };
  } catch (err) {
    log.warn("getSharedScenario threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
