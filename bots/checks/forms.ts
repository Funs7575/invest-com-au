/**
 * Form smoke-test checker.
 *
 * Finds every <form> element on the current page, fills known input types with
 * safe QA values, submits (where a visible submit control exists), and watches
 * for server-error indicators. This catches broken form handlers before real
 * users hit them.
 *
 * Safety:
 *   • Forms whose action matches /go/, /api/stripe, or /api/webhook are
 *     skipped — those paths are already intercepted by the safety net
 *     (bots/safety/money-paths.ts).
 *   • Submissions are only attempted when a visible submit button exists.
 *   • All errors are caught per-form; the check never throws.
 *
 * Called from BotSession.audit() for every visited page.
 */

import type { Page } from "@playwright/test";
import type { BotConfig } from "../config";
import type { FindingStore } from "../findings/store";

/** Form action prefixes that are managed by the safety net — skip them. */
const SKIPPED_ACTION_PATTERNS = ["/go/", "/api/stripe", "/api/webhook"];

interface FormDescriptor {
  action: string;
  method: string;
  inputCount: number;
  index: number;
}

async function extractForms(page: Page): Promise<FormDescriptor[]> {
  return page.evaluate((): FormDescriptor[] => {
    return Array.from(document.querySelectorAll("form")).map((form, index) => ({
      action: form.action ?? "",
      method: (form.method ?? "get").toLowerCase(),
      inputCount: form.querySelectorAll("input, textarea, select").length,
      index,
    }));
  });
}

function isSafeAction(action: string): boolean {
  for (const pattern of SKIPPED_ACTION_PATTERNS) {
    try {
      const pathname = new URL(action, "http://x").pathname;
      if (pathname.startsWith(pattern)) return false;
    } catch {
      if (action.includes(pattern)) return false;
    }
  }
  return true;
}

export async function checkForms(
  page: Page,
  _config: BotConfig,
  store: FindingStore,
  persona: string,
): Promise<void> {
  const pageUrl = page.url();
  let route: string;
  try {
    route = new URL(pageUrl).pathname;
  } catch {
    return;
  }

  let forms: FormDescriptor[];
  try {
    forms = await extractForms(page);
  } catch {
    return; // page may have navigated away
  }

  for (const form of forms) {
    if (form.inputCount < 1) continue;
    if (!isSafeAction(form.action)) continue;

    try {
      // ── Fill known input types ─────────────────────────────────────────────
      const emailInputs = page.locator(`form:nth-of-type(${form.index + 1}) input[type="email"]`);
      const emailCount = await emailInputs.count();
      for (let i = 0; i < emailCount; i++) {
        await emailInputs.nth(i).fill("bot-test@invest-test.local").catch(() => undefined);
      }

      const textInputs = page.locator(`form:nth-of-type(${form.index + 1}) input[type="text"]`);
      const textCount = await textInputs.count();
      for (let i = 0; i < textCount; i++) {
        await textInputs.nth(i).fill("Bot Test").catch(() => undefined);
      }

      const telInputs = page.locator(`form:nth-of-type(${form.index + 1}) input[type="tel"]`);
      const telCount = await telInputs.count();
      for (let i = 0; i < telCount; i++) {
        await telInputs.nth(i).fill("+61400000000").catch(() => undefined);
      }

      const textareas = page.locator(`form:nth-of-type(${form.index + 1}) textarea`);
      const textareaCount = await textareas.count();
      for (let i = 0; i < textareaCount; i++) {
        await textareas
          .nth(i)
          .fill("This is a QA bot smoke test. Please ignore.")
          .catch(() => undefined);
      }

      // ── Check for a visible submit control ────────────────────────────────
      const submitLocator = page.locator(
        'form button[type="submit"], form input[type="submit"]',
      ).first();
      const submitVisible = await submitLocator.isVisible().catch(() => false);

      if (!submitVisible) continue;

      const urlBefore = page.url();

      await submitLocator.click({ timeout: 5_000 });
      await page.waitForTimeout(2_000);

      // ── Check for server error indicators ─────────────────────────────────
      const errorLocator = page.locator(
        '[data-status="500"], .error-boundary, [role="alert"]',
      );
      const errorVisible = await errorLocator.first().isVisible().catch(() => false);
      if (errorVisible) {
        store.add({
          severity: "high",
          category: "flow-failure",
          title: `form smoke: error indicator after submit on ${route} (form ${form.index})`,
          detail:
            `Submitting form #${form.index} on ${route} (action="${form.action}", ` +
            `method="${form.method}") produced a visible error indicator ` +
            `([data-status="500"] / .error-boundary / [role="alert"]) within 2 seconds.`,
          url: pageUrl,
          persona,
          signatureKey: `form-smoke:${route}:${form.index}:error`,
          evidence: { formAction: form.action, formMethod: form.method },
        });
        continue;
      }

      // ── Emit info if form succeeded visibly ───────────────────────────────
      const urlAfter = page.url();
      const urlChanged = urlAfter !== urlBefore;
      const spinnerOrSuccess = await page
        .locator(
          '[data-state="loading"], .loading, .spinner, [class*="success"], [data-success]',
        )
        .first()
        .isVisible()
        .catch(() => false);

      if (urlChanged || spinnerOrSuccess) {
        store.add({
          severity: "info",
          category: "flow-failure",
          title: `form smoke: form ${form.index} on ${route} submitted successfully`,
          detail:
            `Form #${form.index} on ${route} (action="${form.action}") produced a visible ` +
            `success indicator after submission (${urlChanged ? "URL changed to " + urlAfter : "success/spinner element visible"}).`,
          url: pageUrl,
          persona,
          signatureKey: `form-smoke:${route}:${form.index}:success`,
          evidence: { formAction: form.action, urlBefore, urlAfter },
        });
      }
    } catch {
      // Per-form error isolation — continue to next form
    }
  }
}
