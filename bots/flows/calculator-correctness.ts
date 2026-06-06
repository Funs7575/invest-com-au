/**
 * Calculator correctness flow.
 *
 * The /calculators + /tools surfaces were only ever *rendered* by the page
 * sweep (console / a11y), never *driven*: no bot had entered numbers and
 * checked the maths. This flow drives the AUD currency converter — which has a
 * clean, deterministic compute model — and asserts two rate-independent
 * invariants that catch real logic regressions:
 *
 *   1. Identity: converting an amount from AUD→AUD returns the same number
 *      (the `from === to` short-circuit), proving formatting + wiring are sound.
 *   2. Linearity: doubling the input doubles the output for a real cross-rate
 *      (AUD→USD). True for any linear conversion regardless of the live rate,
 *      so the assertion is stable even as the hard-coded rates drift.
 *
 * It then smoke-drives a representative set of other calculators, asserting
 * each renders an actual numeric input (not a blank shell / 500) so a broken
 * client component is caught even where we don't model its specific maths.
 *
 * Reads only — no writes, safe on the protected mirror.
 */

import type { Page } from "@playwright/test";
import type { Flow, FlowStepContext } from "./types";

const CONVERTER_PATH = "/tools/currency-converter";

/** Calculators to smoke (must render a numeric input + meaningful content). */
export const CALCULATOR_SMOKE_ROUTES = [
  "/cgt-calculator",
  "/tools/borrowing-power-calculator",
  "/tools/buy-vs-rent",
  "/tools/withholding-tax-calculator",
  "/tools/salary-sacrifice",
] as const;

/** Parse a locale-formatted money string ("12,345.00") to a number. */
export function parseFormatted(text: string): number {
  const cleaned = text.replace(/[^0-9.-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Read the converter's result cell (the div immediately after the To select). */
async function readResult(page: Page): Promise<number> {
  const cell = page
    .locator('select[aria-label="To currency"]')
    .locator("xpath=following-sibling::div[1]");
  const text = await cell.first().innerText().catch(() => "");
  return parseFormatted(text);
}

async function setConverter(
  page: Page,
  opts: { amount?: string; from?: string; to?: string },
): Promise<void> {
  if (opts.from) await page.locator('select[aria-label="From currency"]').selectOption(opts.from);
  if (opts.to) await page.locator('select[aria-label="To currency"]').selectOption(opts.to);
  if (opts.amount !== undefined) {
    const input = page.locator('input[aria-label="Amount to convert"]');
    await input.fill(opts.amount);
  }
  // Allow React to recompute the derived result.
  await page.waitForTimeout(150);
}

export const CALCULATOR_CORRECTNESS_FLOW: Flow = {
  name: "calculator-correctness",
  description:
    "Drives the AUD currency converter with known inputs (identity + linearity invariants) and smoke-drives a representative set of calculators.",
  steps: [
    {
      name: "converter-renders",
      async run({ page, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + CONVERTER_PATH;
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if ((res?.status() ?? 0) >= 400) {
          throw new Error(`${CONVERTER_PATH} returned HTTP ${res?.status()}`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        const hasInput = (await page.locator('input[aria-label="Amount to convert"]').count()) > 0;
        if (!hasInput) {
          throw new Error("currency converter did not render its amount input (client hydration failure?)");
        }
      },
    },
    {
      name: "converter-identity",
      async run({ page, store, persona }) {
        // AUD → AUD is the identity branch; result must equal the input exactly.
        await setConverter(page, { from: "AUD", to: "AUD", amount: "12345" });
        const result = await readResult(page);
        if (Math.abs(result - 12345) > 0.5) {
          store.add({
            severity: "critical",
            category: "calculator",
            title: "currency converter identity conversion is wrong",
            detail: `AUD→AUD of 12345 should display 12,345 but the result cell read ${result}. The conversion maths or result wiring is broken.`,
            url: page.url(),
            persona,
            signatureKey: "calc:converter:identity",
          });
          throw new Error(`identity conversion wrong: got ${result}`);
        }
      },
    },
    {
      name: "converter-linearity",
      async run({ page, store, persona }) {
        // Doubling the input must double the output for any linear conversion,
        // regardless of the specific AUD→USD rate.
        await setConverter(page, { from: "AUD", to: "USD", amount: "100" });
        const base = await readResult(page);
        await setConverter(page, { amount: "200" });
        const dbl = await readResult(page);

        if (!Number.isFinite(base) || !Number.isFinite(dbl) || base <= 0) {
          throw new Error(`converter produced non-numeric output (base=${base}, dbl=${dbl})`);
        }
        const ratio = dbl / base;
        if (Math.abs(ratio - 2) > 0.02) {
          store.add({
            severity: "high",
            category: "calculator",
            title: "currency converter is non-linear",
            detail: `AUD→USD of 100 gave ${base}; of 200 gave ${dbl} (ratio ${ratio.toFixed(3)}, expected ~2.0). A linear conversion must scale exactly with the input.`,
            url: page.url(),
            persona,
            signatureKey: "calc:converter:linearity",
          });
          throw new Error(`converter non-linear: ratio ${ratio}`);
        }
      },
    },
    ...CALCULATOR_SMOKE_ROUTES.map((route) => ({
      name: `calculator-smoke ${route}`,
      async run({ page, store, persona, config }: FlowStepContext) {
        const url = config.baseUrl.replace(/\/$/, "") + route;
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;
        if (status >= 500) {
          throw new Error(`${route} returned HTTP ${status}`);
        }
        if (status === 404) {
          store.add({
            severity: "low",
            category: "http-error",
            title: `calculator route 404: ${route}`,
            detail: `Expected a calculator at ${route} but it returned 404 — the route may have moved.`,
            url,
            persona,
            signatureKey: `calc:smoke:404:${route}`,
          });
          return;
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        const numericInputs = await page
          .locator('input[type="number"], input[inputmode="numeric"], input[inputmode="decimal"]')
          .count();
        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");

        if (numericInputs === 0 || bodyText.trim().length < 80) {
          store.add({
            severity: "medium",
            category: "calculator",
            title: `calculator did not render inputs: ${route}`,
            detail: `Expected a numeric input + meaningful content on ${route}, found ${numericInputs} numeric inputs and ${bodyText.trim().length} chars. Likely a client-component render/hydration failure.`,
            url,
            persona,
            signatureKey: `calc:smoke:empty:${route}`,
          });
        }
      },
    })),
  ],
};
