import path from "node:path";
import { promises as fs } from "node:fs";
import type { Browser, BrowserContext } from "@playwright/test";
import { discoverStaticRoutes } from "./routes";
import { DEFAULT_VIEWPORTS, VIEWPORTS, type ViewportName } from "./viewports";
import {
  ALL_STATE_NAMES,
  ANONYMOUS_STATE,
  AUTH_STATES,
  stateIsSeeded,
  type AuthState,
} from "./state-registry";

const SNAPSHOTS_DIR = path.resolve(process.cwd(), "e2e/visual/snapshots");

export interface CaptureOptions {
  baseUrl: string;
  states?: string[];
  routeMatch?: string;
  viewports?: ViewportName[];
  navigationTimeoutMs?: number;
}

interface CaptureMeta {
  route: string;
  finalUrl: string;
  status: number;
  redirected: boolean;
  capturedAt: string;
  viewport: string;
}

export async function capture(
  browser: Browser,
  opts: CaptureOptions,
): Promise<{ runDir: string; total: number; failed: number }> {
  const allRoutes = await discoverStaticRoutes();
  const routes = opts.routeMatch
    ? allRoutes.filter((r) => r.includes(opts.routeMatch!))
    : allRoutes;

  const stateFilter = new Set(opts.states ?? ALL_STATE_NAMES);
  const viewports = opts.viewports ?? DEFAULT_VIEWPORTS;
  const date = new Date().toISOString().slice(0, 10);
  const runDir = path.join(SNAPSHOTS_DIR, date);

  console.log(`\nRoutes discovered: ${allRoutes.length}`);
  console.log(`Routes after filter: ${routes.length}`);
  console.log(`Viewports: ${viewports.join(", ")}`);
  console.log(`Output: ${runDir}\n`);

  let total = 0;
  let failed = 0;

  if (stateFilter.has(ANONYMOUS_STATE.name)) {
    const ctx = await browser.newContext();
    const result = await captureForContext({
      ctx,
      stateName: ANONYMOUS_STATE.name,
      routes,
      viewports,
      baseUrl: opts.baseUrl,
      runDir,
      navigationTimeoutMs: opts.navigationTimeoutMs ?? 20_000,
    });
    total += result.total;
    failed += result.failed;
    await ctx.close();
  }

  for (const state of AUTH_STATES) {
    if (!stateFilter.has(state.name)) continue;
    if (!(await stateIsSeeded(state))) {
      console.log(
        `[skip] ${state.name}: storage state missing. Run: npm run screenshots:seed -- ${state.name}`,
      );
      continue;
    }
    const ctx = await browser.newContext({ storageState: state.storageStateFile });
    const result = await captureForContext({
      ctx,
      stateName: state.name,
      routes,
      viewports,
      baseUrl: opts.baseUrl,
      runDir,
      navigationTimeoutMs: opts.navigationTimeoutMs ?? 20_000,
    });
    total += result.total;
    failed += result.failed;
    await ctx.close();
  }

  return { runDir, total, failed };
}

interface ContextCaptureArgs {
  ctx: BrowserContext;
  stateName: string;
  routes: string[];
  viewports: ViewportName[];
  baseUrl: string;
  runDir: string;
  navigationTimeoutMs: number;
}

async function captureForContext(args: ContextCaptureArgs): Promise<{ total: number; failed: number }> {
  const { ctx, stateName, routes, viewports, baseUrl, runDir, navigationTimeoutMs } = args;
  let total = 0;
  let failed = 0;

  console.log(`\n=== State: ${stateName} (${routes.length} routes) ===`);

  for (const route of routes) {
    const page = await ctx.newPage();
    const slug = slugifyRoute(route);
    const routeDir = path.join(runDir, stateName, slug);

    try {
      await fs.mkdir(routeDir, { recursive: true });
      const response = await page.goto(baseUrl + route, {
        waitUntil: "domcontentloaded",
        timeout: navigationTimeoutMs,
      });
      const status = response?.status() ?? 0;
      const finalUrl = page.url();
      const redirected = !finalUrl.endsWith(route) && !finalUrl.endsWith(`${route}/`);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);

      for (const viewportName of viewports) {
        const vp = VIEWPORTS[viewportName];
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(150);
        const filePath = path.join(routeDir, `${vp.name}.png`);
        await page.screenshot({ path: filePath, fullPage: true });

        const meta: CaptureMeta = {
          route,
          finalUrl,
          status,
          redirected,
          capturedAt: new Date().toISOString(),
          viewport: vp.name,
        };
        await fs.writeFile(
          path.join(routeDir, `${vp.name}.meta.json`),
          JSON.stringify(meta, null, 2),
        );
        total++;
      }

      console.log(`  ${redirected ? "↪" : "✓"} ${route}${redirected ? `  → ${finalUrl.replace(baseUrl, "")}` : ""}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${route}: ${(err as Error).message.split("\n")[0]}`);
      await fs.writeFile(
        path.join(routeDir, "error.txt"),
        (err as Error).stack ?? String(err),
      ).catch(() => undefined);
    } finally {
      await page.close();
    }
  }

  return { total, failed };
}

function slugifyRoute(route: string): string {
  if (route === "/") return "_root";
  return route.replace(/^\//, "").replace(/\//g, "__").replace(/[^a-zA-Z0-9_-]/g, "-");
}
