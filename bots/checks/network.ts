/**
 * Network collector. Records first-party HTTP errors (>= 400) and outright
 * request failures. Third-party hosts are ignored — we only care about our own
 * endpoints. Aborted requests (cancelled navigations, intercepted routes) are
 * not treated as failures.
 */

import type { Page } from "@playwright/test";
import type { BotConfig } from "../config";
import type { FindingStore } from "../findings/store";
import { normalizeUrl } from "../findings/types";

export function attachNetwork(
  page: Page,
  config: BotConfig,
  store: FindingStore,
  persona: string,
): void {
  let origin = "";
  try {
    origin = new URL(config.baseUrl).origin;
  } catch {
    origin = "";
  }

  page.on("response", (res) => {
    let url: URL;
    try {
      url = new URL(res.url());
    } catch {
      return;
    }
    if (url.origin !== origin) return;
    const status = res.status();
    if (status < 400) return;
    const req = res.request();
    const resourceType = req.resourceType();
    const severity =
      status >= 500 ? "critical" : resourceType === "document" ? "high" : "medium";
    store.add({
      severity,
      category: "http-error",
      title: `${status} ${req.method()} ${url.pathname}`,
      detail: `${req.method()} ${url.pathname} returned HTTP ${status} (${resourceType}).`,
      url: page.url(),
      persona,
      signatureKey: `${status}:${req.method()}:${normalizeUrl(url.pathname)}`,
      evidence: { status, method: req.method(), resourceType, path: url.pathname },
    });
  });

  page.on("requestfailed", (req) => {
    let url: URL;
    try {
      url = new URL(req.url());
    } catch {
      return;
    }
    if (url.origin !== origin) return;
    const errorText = req.failure()?.errorText ?? "";
    if (/aborted/i.test(errorText)) return;
    store.add({
      severity: "high",
      category: "network-error",
      title: `request failed: ${req.method()} ${url.pathname}`,
      detail: `${req.method()} ${url.pathname} failed: ${errorText}`,
      url: page.url(),
      persona,
      signatureKey: `netfail:${req.method()}:${normalizeUrl(url.pathname)}`,
      evidence: { errorText, resourceType: req.resourceType() },
    });
  });
}
