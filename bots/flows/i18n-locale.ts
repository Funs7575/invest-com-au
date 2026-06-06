/**
 * i18n locale-roaming flow.
 *
 * Every existing persona walks default-locale (English) paths, so the
 * locale-prefixed pages (`/zh/...`, `/ko/...`, `/ar/...`) registered in
 * `LOCALE_KNOWN_PATHS` had zero bot coverage. This flow visits each known
 * localised route and checks the things that actually break in translated
 * pages:
 *
 *   1. The route renders (no 4xx/5xx, not a near-empty page).
 *   2. `<html lang>` carries the locale's BCP-47 tag (en-AU → zh-CN / ko-KR /
 *      ar-AE) — wrong/missing lang tanks hreflang + screen-reader pronunciation.
 *   3. `<html dir>` is `rtl` for Arabic — a common regression that silently
 *      ships LTR layout for RTL content.
 *   4. No untranslated-key artifacts leaked into the DOM (raw `{{token}}`,
 *      `undefined`, `[object Object]`, or dotted i18n keys like
 *      `foreignInvestment.title`).
 *
 * Pure route/expectation generation is exported (`localeChecks`) so it can be
 * unit-tested without a browser, and reuses lib/i18n as the single source of
 * truth (no duplicated locale list).
 */

import {
  BCP47_TAG,
  LOCALE_DIR,
  LOCALE_KNOWN_PATHS,
  localePath,
  type Locale,
} from "../../lib/i18n/locales";
import type { Flow, FlowStepContext } from "./types";

export interface LocaleCheck {
  locale: Locale;
  /** Localised path actually served, e.g. /zh/foreign-investment. */
  path: string;
  /** Expected <html lang> value. */
  expectLang: string;
  /** Expected <html dir> value. */
  expectDir: "ltr" | "rtl";
}

/** Build the (locale × known-path) matrix from the locale registry. */
export function localeChecks(): LocaleCheck[] {
  const checks: LocaleCheck[] = [];
  for (const [loc, paths] of Object.entries(LOCALE_KNOWN_PATHS)) {
    const locale = loc as Locale;
    for (const p of paths ?? []) {
      checks.push({
        locale,
        path: localePath(p, locale),
        expectLang: BCP47_TAG[locale],
        expectDir: LOCALE_DIR[locale],
      });
    }
  }
  return checks;
}

/** Patterns that should never survive into rendered, translated copy. */
const UNTRANSLATED_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\{\{[^}]+\}\}/, label: "raw {{interpolation}} token" },
  { re: /\bundefined\b/, label: "literal 'undefined'" },
  { re: /\[object Object\]/, label: "'[object Object]'" },
  // Dotted i18n keys that escaped lookup, e.g. "foreignInvestment.hero.title".
  { re: /\b[a-z]+(?:[A-Z][a-z]+)*(?:\.[a-z]+){2,}\b/, label: "leaked i18n key path" },
];

async function checkLocaleRoute(ctx: FlowStepContext, check: LocaleCheck): Promise<void> {
  const { page, store, persona, config } = ctx;
  const url = config.baseUrl.replace(/\/$/, "") + check.path;
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const status = res?.status() ?? 0;

  if (status >= 400) {
    throw new Error(`${check.path} returned HTTP ${status}`);
  }
  await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

  const { lang, dir, bodyText } = await page.evaluate(() => ({
    lang: document.documentElement.getAttribute("lang") ?? "",
    dir: document.documentElement.getAttribute("dir") ?? "ltr",
    bodyText: document.querySelector("main")?.innerText ?? document.body.innerText ?? "",
  }));

  if (bodyText.trim().length < 50) {
    throw new Error(`${check.path} rendered almost no content (${bodyText.trim().length} chars)`);
  }

  // 2. lang tag — compare loosely (some setups emit just "zh" vs "zh-CN").
  const langOk = lang === check.expectLang || lang.startsWith(check.expectLang.split("-")[0]!);
  if (!langOk) {
    store.add({
      severity: "high",
      category: "i18n",
      title: `wrong <html lang> on ${check.path}`,
      detail: `Expected lang "${check.expectLang}" (or its base) but got "${lang || "(none)"}". Breaks hreflang + assistive tech.`,
      url,
      persona,
      signatureKey: `i18n:lang:${check.path}`,
    });
  }

  // 3. dir — RTL locales must set dir="rtl".
  if (check.expectDir === "rtl" && dir !== "rtl") {
    store.add({
      severity: "high",
      category: "i18n",
      title: `RTL locale not marked dir="rtl" on ${check.path}`,
      detail: `Locale ${check.locale} is right-to-left but <html dir> is "${dir}". The page will render LTR.`,
      url,
      persona,
      signatureKey: `i18n:dir:${check.path}`,
    });
  }

  // 4. Untranslated-key artifacts.
  for (const { re, label } of UNTRANSLATED_PATTERNS) {
    const m = bodyText.match(re);
    if (m) {
      store.add({
        severity: "medium",
        category: "i18n",
        title: `untranslated artifact (${label}) on ${check.path}`,
        detail: `Found ${label} in rendered copy: "${m[0].slice(0, 80)}". A translation key or interpolation did not resolve.`,
        url,
        persona,
        signatureKey: `i18n:artifact:${check.path}:${label}`,
      });
    }
  }
}

export const I18N_LOCALE_FLOW: Flow = {
  name: "i18n-locale",
  description:
    "Visits every locale-prefixed route (zh/ko/ar) and asserts lang tag, RTL direction, and absence of untranslated-key artifacts.",
  steps: localeChecks().map((check) => ({
    name: `locale ${check.locale}: ${check.path}`,
    run: (ctx) => checkLocaleRoute(ctx, check),
  })),
};
