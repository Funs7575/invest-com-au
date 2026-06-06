/**
 * Auth edge-case flow.
 *
 * The authed/lifecycle personas drive logged-IN surfaces; nothing checked the
 * logged-OUT boundary behaviour — deep-linking straight into a gated route.
 * Two things must hold for every gated route when anonymous:
 *
 *   1. It redirects to the correct login wall (not a 500, not a blank screen).
 *   2. The original path is preserved in a return param (`next=` / `redirect=`)
 *      so the user lands back where they intended after signing in. A dropped
 *      return path is a real UX regression (the gate bounces you to a generic
 *      dashboard).
 *   3. It must NOT leak the gated content to an anonymous visitor (a security
 *      boundary failure).
 *
 * Runs anonymously (no storageState), so it's safe and meaningful on any
 * target including the protected mirror.
 */

import type { Page } from "@playwright/test";
import type { Flow } from "./types";

export interface GatedRoute {
  path: string;
  /** Substring the login URL must contain. */
  loginContains: string;
  /** Return-path query param the gate should set. */
  returnParam: string;
  /** A string that would only appear if the gated content leaked. */
  leakMarker?: RegExp;
}

/** Gated routes + their expected login redirect (from app/account/* + proxy.ts). */
export const GATED_ROUTES: GatedRoute[] = [
  { path: "/account", loginContains: "/auth/login", returnParam: "next" },
  { path: "/account/holdings", loginContains: "/auth/login", returnParam: "next" },
  { path: "/account/net-worth", loginContains: "/auth/login", returnParam: "next" },
  { path: "/admin", loginContains: "/admin/login", returnParam: "redirect" },
];

async function bodyText(page: Page): Promise<string> {
  return page.locator("main, body").first().innerText().catch(() => "");
}

export const AUTH_EDGE_FLOW: Flow = {
  name: "auth-edge",
  description:
    "Deep-links each gated route while logged out and asserts a correct login redirect with the original path preserved in the return param — and that no gated content leaks.",
  steps: GATED_ROUTES.map((route) => ({
    name: `gated ${route.path}`,
    async run({ page, store, persona, config }) {
      const base = config.baseUrl.replace(/\/$/, "");
      const url = base + route.path;

      // Ensure we're anonymous for this check.
      await page.context().clearCookies();

      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const status = res?.status() ?? 0;
      if (status >= 500) {
        throw new Error(`${route.path} returned HTTP ${status} when anonymous`);
      }
      await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

      const finalUrl = page.url();
      const onLogin = finalUrl.includes(route.loginContains);

      if (!onLogin) {
        // It didn't bounce to login. Either it leaked content or rendered its
        // own auth wall in place. Treat a content leak as the serious case.
        const text = await bodyText(page);
        const looksLikeLoginWall = /sign in|log in|login|magic link|password/i.test(text);
        if (!looksLikeLoginWall) {
          store.add({
            severity: "critical",
            category: "auth",
            title: `gated route ${route.path} did not require auth`,
            detail:
              `Anonymous request to ${route.path} stayed at ${finalUrl} and rendered content without a login ` +
              "wall. This is a broken auth boundary — gated content may be exposed to logged-out visitors.",
            url,
            persona,
            signatureKey: `auth-edge:leak:${route.path}`,
          });
          throw new Error(`gated route ${route.path} did not redirect to login`);
        }
        // It rendered an inline login wall — acceptable, but it can't preserve a
        // return param the way a redirect does. Note as low.
        store.add({
          severity: "low",
          category: "auth",
          title: `gated route ${route.path} renders an inline login wall (no return-path redirect)`,
          detail: `${route.path} shows a login form in place rather than redirecting to ${route.loginContains}?${route.returnParam}=… — the post-login deep-link return may be lost.`,
          url,
          persona,
          signatureKey: `auth-edge:inline-wall:${route.path}`,
        });
        return;
      }

      // On the login wall — verify the return path is preserved.
      let returnValue: string | null = null;
      try {
        returnValue = new URL(finalUrl).searchParams.get(route.returnParam);
      } catch {
        /* unparseable */
      }
      if (!returnValue || !returnValue.includes(route.path)) {
        store.add({
          severity: "medium",
          category: "auth",
          title: `gated redirect from ${route.path} dropped the return path`,
          detail:
            `${route.path} redirected to ${finalUrl} but the ${route.returnParam}= param ` +
            `${returnValue ? `was "${returnValue}"` : "was missing"} — it should point back to ${route.path} so the ` +
            "user returns to where they intended after signing in.",
          url: finalUrl,
          persona,
          signatureKey: `auth-edge:no-return:${route.path}`,
        });
      }
    },
  })),
};
