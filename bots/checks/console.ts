/**
 * Console + page-error collector. Attaches to a page and records uncaught
 * console.error output and unhandled exceptions as findings.
 */

import type { Page } from "@playwright/test";
import type { FindingStore } from "../findings/store";

const BENIGN = [
  /favicon/i,
  /Download the React DevTools/i,
  /ResizeObserver loop/i,
  /\[Fast Refresh\]/i,
  /Failed to load resource:.*(analytics|posthog|sentry|googletagmanager|gtag|hotjar|clarity)/i,
];

function isBenign(text: string): boolean {
  return BENIGN.some((re) => re.test(text));
}

/** Collapse volatile bits (urls, numbers) so the same error dedupes cleanly. */
function stabilize(text: string): string {
  return text
    .replace(/https?:\/\/[^\s)'"]+/g, "<url>")
    .replace(/\b\d+\b/g, "<n>")
    .slice(0, 160);
}

function firstLine(text: string): string {
  return (text.split("\n")[0] ?? text).slice(0, 120);
}

export function attachConsole(page: Page, store: FindingStore, persona: string): void {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (!text || isBenign(text)) return;
    store.add({
      severity: "high",
      category: "console-error",
      title: firstLine(text),
      detail: text.slice(0, 2000),
      url: page.url(),
      persona,
      signatureKey: stabilize(text),
    });
  });

  page.on("pageerror", (err) => {
    const message = err.message || String(err);
    store.add({
      severity: "critical",
      category: "page-error",
      title: firstLine(message),
      detail: (err.stack ?? message).slice(0, 2000),
      url: page.url(),
      persona,
      signatureKey: `${err.name}:${stabilize(message)}`,
    });
  });
}
