import { describe, it, expect, beforeAll } from "vitest";
// @ts-expect-error - next bundles path-to-regexp without type declarations
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import config from "../../next.config";

/**
 * /find-advisor folds fully into /get-matched.
 *
 * Funnel-hygiene wave: get-matched now consumes the cross-border deep-link
 * params (?specialty= / ?country=) via lib/getmatched/deep-link-prefill, so
 * the old `missing` carve-out that kept the dedicated wizard alive for those
 * params is removed — the redirect must now ALWAYS fire on /find-advisor,
 * regardless of query string.
 *
 * Two invariants this pins:
 *   1. No `missing` (or `has`) conditions on the rule — it is unconditional.
 *   2. The source is exact-match: /find-advisor/life-event (permanent
 *      dedicated flow) and /find-advisor/[location] directory pages are
 *      subpaths and must NOT be swallowed by the redirect.
 */
describe("/find-advisor → /get-matched redirect", () => {
  type Redirect = {
    source: string;
    destination: string;
    permanent?: boolean;
    missing?: unknown[];
    has?: unknown[];
  };

  let rule: Redirect;
  let matches: (path: string) => boolean;

  beforeAll(async () => {
    const redirects: Redirect[] = await config.redirects!();
    const found = redirects.find(
      (r) => r.source === "/find-advisor" && r.destination === "/get-matched",
    );
    if (!found) {
      throw new Error("could not find the /find-advisor → /get-matched rule");
    }
    rule = found;

    const keys: Array<{ name: string | number }> = [];
    const re = pathToRegexp(rule.source, keys);
    matches = (path: string) => re.exec(path) !== null;
  });

  it("fires unconditionally — no `missing` / `has` query carve-out", () => {
    expect(rule.missing).toBeUndefined();
    expect(rule.has).toBeUndefined();
  });

  it("is a permanent (308) redirect", () => {
    expect(rule.permanent).toBe(true);
  });

  it("matches the bare /find-advisor route", () => {
    expect(matches("/find-advisor")).toBe(true);
  });

  it("does NOT swallow /find-advisor/life-event (dedicated permanent flow)", () => {
    expect(matches("/find-advisor/life-event")).toBe(false);
  });

  it("does NOT swallow /find-advisor/[location] directory pages", () => {
    expect(matches("/find-advisor/sydney")).toBe(false);
  });
});
