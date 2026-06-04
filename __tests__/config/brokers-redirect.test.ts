import { describe, it, expect, beforeAll } from "vitest";
// @ts-expect-error - next bundles path-to-regexp without type declarations
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import config from "../../next.config";

/**
 * /brokers/:slug → /broker/:slug plural-alias redirect must NOT shadow the
 * real curated /brokers/full-service hub (and its /brokers/full-service/:slug
 * firm profiles), which are first-class app routes (app/brokers/full-service/**).
 *
 * Regression: the original catch-all `/brokers/:slug*` 308ed /brokers/full-service
 * to a non-existent /broker/full-service → "Broker Not Found". The fix adds a
 * negative-lookahead to the redirect source. This test pins that behaviour to
 * the real next.config redirect rule so it can't silently regress.
 */
describe("/brokers plural-alias redirect", () => {
  type Redirect = {
    source: string;
    destination: string;
    permanent?: boolean;
  };

  let brokerSlugRule: Redirect;
  let matchSource: (path: string) => string | null;

  beforeAll(async () => {
    const redirects: Redirect[] = await config.redirects!();

    const rule = redirects.find(
      (r) =>
        r.source.startsWith("/brokers/") &&
        r.destination.startsWith("/broker/"),
    );
    if (!rule) {
      throw new Error("could not find the /brokers/:slug → /broker/:slug rule");
    }
    brokerSlugRule = rule;

    const keys: Array<{ name: string | number }> = [];
    const re = pathToRegexp(brokerSlugRule.source, keys);

    matchSource = (path: string) => {
      const m = re.exec(path);
      if (!m) return null;
      let out = brokerSlugRule.destination;
      keys.forEach((k, i) => {
        out = out.replace(`:${k.name}`, m[i + 1] ?? "");
      });
      return out;
    };
  });

  it("does NOT redirect /brokers/full-service (real curated hub)", () => {
    expect(matchSource("/brokers/full-service")).toBeNull();
  });

  it("does NOT redirect /brokers/full-service/:slug (firm profiles)", () => {
    expect(matchSource("/brokers/full-service/morgans")).toBeNull();
  });

  it("still redirects an ordinary broker slug to the singular profile", () => {
    expect(matchSource("/brokers/commsec")).toBe("/broker/commsec");
  });

  it("still redirects a slug that merely starts with 'full-service-'", () => {
    // The exclusion is segment-anchored, so a real broker whose slug happens
    // to begin with "full-service-" must still redirect.
    expect(matchSource("/brokers/full-service-broker-xyz")).toBe(
      "/broker/full-service-broker-xyz",
    );
  });

  it("preserves multi-segment redirect behaviour", () => {
    expect(matchSource("/brokers/foo/bar")).toBe("/broker/foo/bar");
  });

  it("is a permanent (308) redirect for link-equity transfer", () => {
    expect(brokerSlugRule.permanent).toBe(true);
  });
});
