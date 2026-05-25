/**
 * PWA regression tests.
 *
 * 1. manifest.json is valid JSON with required PWA fields.
 * 2. sw.js defines the push, notificationclick, and pushsubscriptionchange
 *    handlers (regression guard — ensures merging push into sw.js didn't
 *    accidentally drop them).
 * 3. sw.js defines a fetch handler (caching regression guard).
 * 4. sw-push.js still defines the original push handlers (legacy file guard).
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, beforeAll } from "vitest";

const ROOT = resolve(__dirname, "../..");

function readPublicFile(name: string): string {
  return readFileSync(resolve(ROOT, "public", name), "utf-8");
}

// ── manifest.json ─────────────────────────────────────────────────────────────

describe("manifest.json", () => {
  let manifest: Record<string, unknown>;

  it("is valid JSON", () => {
    const raw = readPublicFile("manifest.json");
    expect(() => {
      manifest = JSON.parse(raw) as Record<string, unknown>;
    }).not.toThrow();
  });

  it("has required PWA fields", () => {
    const raw = readPublicFile("manifest.json");
    manifest = JSON.parse(raw) as Record<string, unknown>;

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect((manifest.icons as unknown[]).length).toBeGreaterThan(0);
  });

  it("has screenshots array with narrow and wide entries", () => {
    const raw = readPublicFile("manifest.json");
    manifest = JSON.parse(raw) as Record<string, unknown>;

    expect(Array.isArray(manifest.screenshots)).toBe(true);
    const screenshots = manifest.screenshots as Array<Record<string, string>>;
    expect(screenshots.length).toBeGreaterThanOrEqual(2);

    const formFactors = screenshots.map((s) => s.form_factor);
    expect(formFactors).toContain("narrow");
    expect(formFactors).toContain("wide");

    for (const screenshot of screenshots) {
      expect(screenshot.src).toBeTruthy();
      expect(screenshot.sizes).toMatch(/^\d+x\d+$/);
      expect(screenshot.type).toBe("image/png");
      expect(screenshot.label).toBeTruthy();
    }
  });

  it("has icons with valid src and sizes fields", () => {
    const raw = readPublicFile("manifest.json");
    manifest = JSON.parse(raw) as Record<string, unknown>;

    const icons = manifest.icons as Array<Record<string, string>>;
    for (const icon of icons) {
      expect(icon.src).toBeTruthy();
      expect(icon.sizes).toMatch(/^\d+x\d+$/);
      expect(icon.type).toBe("image/png");
    }
  });
});

// ── sw.js — unified service worker ───────────────────────────────────────────

describe("sw.js (unified caching + push worker)", () => {
  let sw: string;

  beforeAll(() => {
    sw = readPublicFile("sw.js");
  });

  it("registers a fetch handler", () => {
    expect(sw).toContain('addEventListener("fetch"');
  });

  it("registers an install handler", () => {
    expect(sw).toContain('addEventListener("install"');
  });

  it("registers an activate handler", () => {
    expect(sw).toContain('addEventListener("activate"');
  });

  it("registers a push handler", () => {
    expect(sw).toContain('addEventListener("push"');
  });

  it("registers a notificationclick handler", () => {
    expect(sw).toContain('addEventListener("notificationclick"');
  });

  it("registers a pushsubscriptionchange handler", () => {
    expect(sw).toContain('addEventListener("pushsubscriptionchange"');
  });

  it("defines an offline fallback URL constant", () => {
    expect(sw).toContain("OFFLINE_URL");
    expect(sw).toContain("/offline");
  });

  it("precaches the offline fallback in APP_SHELL", () => {
    expect(sw).toContain("APP_SHELL");
    expect(sw).toContain("addAll");
  });

  it("uses a versioned SHELL_CACHE name", () => {
    expect(sw).toContain("invest-shell-");
  });

  it("does not cache private prefixes", () => {
    expect(sw).toContain("/api/");
    expect(sw).toContain("/admin");
    expect(sw).toContain("/dashboard");
  });

  it("references /api/push/subscribe for subscription renewal", () => {
    expect(sw).toContain("/api/push/subscribe");
  });
});

// ── sw-push.js — legacy push-only file ───────────────────────────────────────
// Regression guard: this file must retain its push handlers.
// PushOptIn and PushNotificationPrompt now register sw.js instead,
// but sw-push.js should still be a valid push worker in case any
// bookmarked / cached registration still references it.

describe("sw-push.js (legacy push-only file — regression guard)", () => {
  let sw: string;

  beforeAll(() => {
    sw = readPublicFile("sw-push.js");
  });

  it("registers a push handler", () => {
    expect(sw).toContain('addEventListener("push"');
  });

  it("registers a notificationclick handler", () => {
    expect(sw).toContain('addEventListener("notificationclick"');
  });

  it("registers a pushsubscriptionchange handler", () => {
    expect(sw).toContain('addEventListener("pushsubscriptionchange"');
  });
});
