import { test } from "@playwright/test";
import { capture } from "./runner";
import { buildIndex } from "./index-builder";
import type { ViewportName } from "./viewports";
import { ALL_STATE_NAMES } from "./state-registry";

/**
 * Manual-only screenshot sweep. Invoked via `npm run screenshots`.
 *
 * Configuration is by env var so it works through `npm run screenshots -- --env ...`
 * or directly with `STATES=anonymous npm run screenshots`.
 *
 * STATES        comma-separated state names (default: all)
 *               e.g. STATES=anonymous,user-individual
 * MATCH         substring filter on routes (default: none)
 *               e.g. MATCH=/advisor   →  only routes containing /advisor
 * VIEWPORTS     comma-separated viewport names: mobile,tablet,desktop
 * NAV_TIMEOUT   per-route navigation timeout in ms (default: 20000)
 */
test("capture full screenshot sweep", async ({ browser }) => {
  test.setTimeout(0);

  const states = parseList(process.env.STATES) ?? ALL_STATE_NAMES;
  const viewports = parseList(process.env.VIEWPORTS) as ViewportName[] | undefined;
  const match = process.env.MATCH || undefined;
  const navigationTimeoutMs = process.env.NAV_TIMEOUT ? Number(process.env.NAV_TIMEOUT) : undefined;
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

  const { runDir, total, failed } = await capture(browser, {
    baseUrl,
    states,
    viewports,
    routeMatch: match,
    navigationTimeoutMs,
  });

  const indexPath = await buildIndex(runDir);
  console.log(`\n--- Summary ---`);
  console.log(`Captured: ${total} screenshots`);
  console.log(`Failed:   ${failed}`);
  console.log(`Browse:   file://${indexPath}`);
});

function parseList(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
