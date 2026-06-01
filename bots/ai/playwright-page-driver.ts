/**
 * Real PageDriver — wraps a Playwright Page so AI bots can see and act on a
 * live page. The page-level safety net (bots/safety/intercept.ts) is already
 * installed on the page, so any side-effecting request these actions trigger is
 * still intercepted.
 *
 * `observe()` stamps a `data-bot-ref` on each visible interactable and returns
 * a compact list; click/fill then target those stamps. Refs are re-stamped on
 * every observe, so they stay valid across navigations.
 */

import type { Page } from "@playwright/test";
import type { PageDriver, PageObservation } from "./types";

const MAX_ELEMENTS = 60;

export class PlaywrightPageDriver implements PageDriver {
  constructor(
    private readonly page: Page,
    private readonly baseUrl: string,
  ) {}

  async observe(): Promise<PageObservation> {
    return this.page.evaluate((max) => {
      const selector = [
        "a[href]",
        "button",
        "[role=button]",
        "[role=link]",
        "input:not([type=hidden])",
        "select",
        "textarea",
        "[role=checkbox]",
        "[role=radio]",
        "[role=tab]",
        "[role=menuitem]",
        "summary",
        "[onclick]",
      ].join(",");

      const elements: Array<{
        ref: string;
        role: string;
        name: string;
        inputType?: string;
        value?: string;
      }> = [];
      let n = 0;

      for (const node of Array.from(document.querySelectorAll(selector))) {
        const el = node as HTMLElement;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (rect.width === 0 || rect.height === 0) continue;
        if (style.visibility === "hidden" || style.display === "none") continue;
        if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") continue;

        n += 1;
        if (n > max) break;
        const ref = `e${n}`;
        el.setAttribute("data-bot-ref", ref);

        const input = el as HTMLInputElement;
        const role = el.getAttribute("role") || el.tagName.toLowerCase();
        const name = (
          el.getAttribute("aria-label") ||
          el.textContent ||
          input.placeholder ||
          el.getAttribute("title") ||
          input.value ||
          ""
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 80);
        const inputType = input.type || undefined;
        const value = typeof input.value === "string" && input.value ? input.value.slice(0, 60) : undefined;

        elements.push({ ref, role, name, inputType, value });
      }

      return {
        url: location.pathname + location.search,
        title: document.title,
        elements,
      };
    }, MAX_ELEMENTS);
  }

  async click(ref: string): Promise<void> {
    await this.page.click(`[data-bot-ref="${ref}"]`, { timeout: 10_000 });
    await this.settle();
  }

  async fill(ref: string, text: string): Promise<void> {
    await this.page.fill(`[data-bot-ref="${ref}"]`, text, { timeout: 10_000 });
  }

  async scroll(direction: "up" | "down"): Promise<void> {
    await this.page.evaluate((dir) => {
      const delta = window.innerHeight * 0.8 * (dir === "down" ? 1 : -1);
      window.scrollBy(0, delta);
    }, direction);
    await this.page.waitForTimeout(300);
  }

  async navigate(path: string): Promise<void> {
    const target = this.baseUrl.replace(/\/$/, "") + path;
    await this.page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await this.settle();
  }

  private async settle(): Promise<void> {
    await this.page.waitForLoadState("load", { timeout: 15_000 }).catch(() => undefined);
    await this.page.waitForTimeout(400);
  }
}
