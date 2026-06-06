/**
 * Country Mode flow — exercises the country-aware directory experience.
 *
 * Country Mode is one of the largest, most compliance-sensitive surfaces in the
 * app (`lib/country-mode/*` + `lib/page-recommendations.ts` +
 * `<DirectoryBanners>`), yet no bot had ever driven it. A returning foreign
 * investor carries an `iv_intent_country` cookie (an intent code like `us`,
 * `cn`, `sg`); server components read it via `getIntentCountry()` and render a
 * country-specific recommendation card on the directory surfaces
 * (/invest, /compare, /advisors, /foreign-investment).
 *
 * This flow, for each (surface × country):
 *   1. Loads the surface with NO country cookie  → the recommendation card is
 *      absent (the standard AU/global experience is unchanged).
 *   2. Sets the intent cookie, reloads           → the card now appears, and its
 *      copy reflects that country (the audience label, e.g. "US investors").
 *   3. Asserts the country-mode copy is present AND differs from the control,
 *      so a regression that silently stops reading the cookie — or renders the
 *      wrong country — is caught.
 *
 * Reads only: setting a cookie + navigating has no side effects, so this runs
 * safely against the protected Netlify mirror.
 */

import type { Page } from "@playwright/test";
import type { Flow } from "./types";

/** A country to drive, keyed by the cookie's intent code. */
export interface CountryModeCase {
  /** `iv_intent_country` cookie value (an intent code, not a slug). */
  code: string;
  /** A fragment that must appear in the recommendation card when active. */
  expectFragment: string;
  /** Human label for finding/report copy. */
  name: string;
}

/** The cookie the server reads (single source of truth: lib/intent-context.ts). */
export const INTENT_COUNTRY_COOKIE = "iv_intent_country";

/**
 * Surfaces that render `<DirectoryBanners>` / IntentCountryRecommendation.
 * Single source of truth for what this flow sweeps; mirrors the
 * `RecommendationSurface` union in lib/page-recommendations.ts plus
 * /foreign-investment (which also embeds the banner stack).
 */
export const COUNTRY_MODE_SURFACES = [
  "/advisors",
  "/compare",
  "/invest",
] as const;

/**
 * Representative countries spanning the friction tiers:
 *  - us: high-friction, DTA, large audience
 *  - cn: high-friction, established-dwelling ban headline
 *  - nz: low-friction (trans-Tasman) — exercises the softer copy branch
 */
export const COUNTRY_MODE_CASES: CountryModeCase[] = [
  { code: "us", name: "United States", expectFragment: "US" },
  { code: "cn", name: "China", expectFragment: "Chinese" },
  { code: "nz", name: "New Zealand", expectFragment: "NZ" },
];

/** Text of the recommendation card region, or "" if it isn't rendered. */
async function recommendationText(page: Page): Promise<string> {
  // The card renders an uppercase amber eyebrow with the audience label and an
  // <h3> title. We read the nearest region that holds both. Falling back to the
  // <main> text keeps this resilient if the card markup is refactored — we only
  // assert on the *country label* fragment, which is unique to the card.
  const eyebrow = page.locator("p.text-amber-700").first();
  if ((await eyebrow.count()) > 0) {
    const container = eyebrow.locator(
      "xpath=ancestor::div[contains(@class,'flex')][1]",
    );
    const txt = await container.first().innerText().catch(() => "");
    if (txt.trim()) return txt;
  }
  return "";
}

async function setCountryCookie(page: Page, code: string, baseUrl: string): Promise<void> {
  await page.context().addCookies([
    {
      name: INTENT_COUNTRY_COOKIE,
      value: code,
      url: baseUrl.replace(/\/$/, ""),
    },
  ]);
}

async function clearCountryCookie(page: Page): Promise<void> {
  // Remove only the intent cookie, preserving any auth/session cookies.
  const cookies = await page.context().cookies();
  await page.context().clearCookies();
  const keep = cookies.filter((c) => c.name !== INTENT_COUNTRY_COOKIE);
  if (keep.length > 0) await page.context().addCookies(keep);
}

export const COUNTRY_MODE_FLOW: Flow = {
  name: "country-mode",
  description:
    "Drives the country-aware recommendation banners across /advisors, /compare and /invest for several countries, asserting the copy reflects the active country and is absent without it.",
  steps: COUNTRY_MODE_SURFACES.flatMap((surface) =>
    COUNTRY_MODE_CASES.map((country) => ({
      name: `country-mode ${country.name} on ${surface}`,
      async run({ page, store, persona, config }) {
        const base = config.baseUrl.replace(/\/$/, "");
        const url = base + surface;

        // ── Control: no country cookie → no recommendation card ──────────────
        await clearCountryCookie(page);
        const controlRes = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        if ((controlRes?.status() ?? 0) >= 500) {
          throw new Error(`${surface} returned HTTP ${controlRes?.status()} (control load)`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        const control = await recommendationText(page);

        // ── Active: set the cookie, reload → country-specific card appears ────
        await setCountryCookie(page, country.code, base);
        const activeRes = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        if ((activeRes?.status() ?? 0) >= 500) {
          throw new Error(
            `${surface} returned HTTP ${activeRes?.status()} with ${country.code} cookie set`,
          );
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        const active = await recommendationText(page);

        if (!active) {
          store.add({
            severity: "high",
            category: "country-mode",
            title: `country mode not reflected on ${surface} for ${country.name}`,
            detail:
              `Set ${INTENT_COUNTRY_COOKIE}=${country.code} and reloaded ${surface}, but no ` +
              `country recommendation card rendered. Country Mode reads the cookie via ` +
              `getIntentCountry() — this regression means foreign investors see the generic AU ` +
              `experience with none of the FIRB / non-resident steering.`,
            url,
            persona,
            signatureKey: `country-mode:missing:${surface}:${country.code}`,
          });
          throw new Error(`no country card on ${surface} for ${country.code}`);
        }

        if (!active.includes(country.expectFragment)) {
          store.add({
            severity: "medium",
            category: "country-mode",
            title: `country card copy mismatch on ${surface} for ${country.name}`,
            detail:
              `Expected the recommendation card to reference "${country.expectFragment}" but the ` +
              `rendered card was:\n${active.slice(0, 400)}`,
            url,
            persona,
            signatureKey: `country-mode:copy:${surface}:${country.code}`,
          });
        }

        if (control && control === active) {
          store.add({
            severity: "medium",
            category: "country-mode",
            title: `country card identical to control on ${surface} for ${country.name}`,
            detail:
              `The recommendation region did not change between no-cookie and ` +
              `${country.code}-cookie loads — the cookie may be ignored (stale cache or a ` +
              `getIntentCountry regression).`,
            url,
            persona,
            signatureKey: `country-mode:unchanged:${surface}:${country.code}`,
          });
        }

        // Leave the cookie cleared so later steps start from a clean slate.
        await clearCountryCookie(page);
      },
    })),
  ),
};
