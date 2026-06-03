/**
 * The side-effect firewall, installed on every bot page.
 *
 * Intercepts ALL same-origin requests and, for anything the policy says must
 * be mocked, answers with a synthetic response so no real-world action occurs:
 *   - payments never reach Stripe,
 *   - `/go/*` affiliate redirects never reach the partner (no click row, no
 *     fraud signal),
 *   - leads/emails/content writes are mocked on protected targets.
 *
 * On a sandbox target, internal writes are allowed through so deep flows can be
 * exercised against disposable data. See ../safety/money-paths.ts for the
 * policy and ../config.ts for the target-class model.
 */

import type { Page, Route } from "@playwright/test";
import { decide } from "./money-paths";
import type { BotConfig } from "../config";

export interface InterceptedCall {
  method: string;
  pathname: string;
  category: string;
  action: "allow" | "mock";
  at: number;
}

export interface SafetyNet {
  readonly intercepted: InterceptedCall[];
  summary(): Record<string, number>;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

async function fulfillSynthetic(route: Route, baseOrigin: string, category: string): Promise<void> {
  const request = route.request();
  const pathname = (() => {
    try {
      return new URL(request.url()).pathname;
    } catch {
      return request.url();
    }
  })();

  if (request.resourceType() === "document") {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body:
        `<!doctype html><meta charset="utf-8"><title>bots: intercepted</title>` +
        `<body style="font-family:system-ui;padding:2rem;color:#333">` +
        `<h1>🤖 Side-effect intercepted</h1><p>The bot safety net blocked a ` +
        `<b>${escapeHtml(category)}</b> ${escapeHtml(request.method())} to ` +
        `<code>${escapeHtml(pathname)}</code> so no real-world action occurred.</p></body>`,
    });
    return;
  }

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      mocked: true,
      bots: true,
      category,
      // Some clients redirect to a returned `url` (e.g. Stripe checkout). Keep
      // it same-origin and harmless.
      url: `${baseOrigin}/?bots-mock=1`,
    }),
  });
}

export async function installSafetyNet(page: Page, config: BotConfig): Promise<SafetyNet> {
  const intercepted: InterceptedCall[] = [];
  const opts = {
    targetClass: config.targetClass,
    mockAi: config.mockAi,
    allowDestructive: config.allowDestructive,
  };
  const baseOrigin = originOf(config.baseUrl);

  await page.route("**/*", async (route) => {
    try {
      const request = route.request();
      const url = new URL(request.url());

      // Third-party assets (fonts/CDNs/analytics) proceed untouched. Affiliate
      // partner hops don't happen because /go redirects are mocked below.
      if (url.origin !== baseOrigin) {
        await route.continue();
        return;
      }

      const decision = decide(url.pathname, request.method(), opts);
      if (decision === null) {
        await route.continue();
        return;
      }

      intercepted.push({
        method: request.method(),
        pathname: url.pathname,
        category: decision.category,
        action: decision.action,
        at: Date.now(),
      });

      if (decision.action === "allow") {
        await route.continue();
        return;
      }
      await fulfillSynthetic(route, baseOrigin, decision.category);
    } catch {
      // Never leave a request hanging because the handler threw.
      await route.continue().catch(() => undefined);
    }
  });

  return {
    intercepted,
    summary() {
      const out: Record<string, number> = {};
      for (const call of intercepted) {
        const key = `${call.category}:${call.action}`;
        out[key] = (out[key] ?? 0) + 1;
      }
      return out;
    },
  };
}
