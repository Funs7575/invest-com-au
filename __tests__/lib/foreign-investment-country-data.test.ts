/**
 * Data-integrity guard for the foreign-investment country hub configs.
 *
 * `lib/foreign-investment-country-data.ts` is a ~4.6k-line, pure-data
 * seed: 14 named country configs + the COUNTRY_CONFIGS registry +
 * the getCountryConfig() lookup. It is the single source of truth for
 * country-specific facts and is consumed by the country hub routes,
 * Country Mode, and the homepage preview strips.
 *
 * The existing `country-config-advisor-types.test.ts` only checks the
 * `homepageExpertFilters.specialties` subset. Nothing exercises
 * getCountryConfig() or the structural integrity of the configs
 * themselves. A copy-paste slip (duplicate slug, code/key mismatch,
 * empty hero stat, broken TOC anchor, FAQ with a question but no
 * answer) would render a subtly-broken or non-unique country page with
 * no test catching it. This file is that net.
 */

import { describe, it, expect } from "vitest";
import {
  COUNTRY_CONFIGS,
  getCountryConfig,
  UK_CONFIG,
  US_CONFIG,
  type CountryConfig,
} from "@/lib/foreign-investment-country-data";
import type { IntentCountryCode } from "@/lib/intent-context";

// Every (key, config) pair in the registry. Object.entries loses the
// IntentCountryCode key type, so re-narrow when we need it.
const entries = Object.entries(COUNTRY_CONFIGS) as Array<
  [IntentCountryCode, CountryConfig]
>;

describe("getCountryConfig", () => {
  it("is a pure synchronous lookup (returns the object, not a promise)", () => {
    const result = getCountryConfig("uk");
    expect(result).not.toBeInstanceOf(Promise);
    // Returns the exact same reference held in the registry — pure, no clone/IO.
    expect(result).toBe(COUNTRY_CONFIGS.uk);
    expect(result).toBe(UK_CONFIG);
  });

  it("returns the UK config for 'uk' with a matching code", () => {
    const cfg = getCountryConfig("uk");
    expect(cfg).toBeDefined();
    expect(cfg?.code).toBe("uk");
    expect(cfg).toBe(UK_CONFIG);
  });

  it("returns the US config for 'us' with a matching code", () => {
    const cfg = getCountryConfig("us");
    expect(cfg).toBeDefined();
    expect(cfg?.code).toBe("us");
    expect(cfg).toBe(US_CONFIG);
  });

  it("returns the right config for every registered code", () => {
    for (const [code, config] of entries) {
      expect(getCountryConfig(code)).toBe(config);
    }
  });

  it("returns undefined for an unmapped code", () => {
    // The registry is a Partial<Record<IntentCountryCode, ...>>, so the
    // lookup must tolerate codes that aren't seeded. "ca" (Canada) isn't
    // a current corridor — getCountryConfig must return undefined, not throw.
    expect(entries.length).toBeGreaterThan(0); // sanity: registry non-empty
    const missing = getCountryConfig("ca" as IntentCountryCode);
    expect(missing).toBeUndefined();
  });

  it("returns undefined for an unknown/garbage code", () => {
    expect(getCountryConfig("zz" as IntentCountryCode)).toBeUndefined();
    expect(getCountryConfig("" as IntentCountryCode)).toBeUndefined();
  });
});

describe("COUNTRY_CONFIGS registry shape", () => {
  it("contains at least the 12 seeded corridors", () => {
    expect(entries.length).toBeGreaterThanOrEqual(12);
  });

  it("includes the named UK and US configs", () => {
    expect(COUNTRY_CONFIGS.uk).toBe(UK_CONFIG);
    expect(COUNTRY_CONFIGS.us).toBe(US_CONFIG);
  });

  it("every config.code matches its registry key", () => {
    for (const [key, config] of entries) {
      expect(
        config.code,
        `config under key "${key}" has code "${config.code}"`,
      ).toBe(key);
    }
  });

  it("has no duplicate codes across configs", () => {
    const codes = entries.map(([, c]) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has no duplicate slugs across configs", () => {
    const slugs = entries.map(([, c]) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("COUNTRY_CONFIGS per-config integrity", () => {
  it.each(entries)("%s — slug is non-empty kebab-case", (_key, config) => {
    expect(config.slug.length).toBeGreaterThan(0);
    // lowercase letters and single hyphens, no leading/trailing/double hyphen.
    expect(config.slug).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
  });

  it.each(entries)(
    "%s — core identity fields are all non-empty",
    (_key, config) => {
      const fields: Array<[string, string]> = [
        ["countryName", config.countryName],
        ["countryShort", config.countryShort],
        ["adjective", config.adjective],
        ["flag", config.flag],
        ["currency", config.currency],
        ["currencySymbol", config.currencySymbol],
      ];
      for (const [name, value] of fields) {
        expect(typeof value, `${name} type`).toBe("string");
        expect(value.trim().length, `${name} non-empty`).toBeGreaterThan(0);
      }
    },
  );

  it.each(entries)(
    "%s — metadata.title and metadata.description are non-empty",
    (_key, config) => {
      expect(config.metadata.title.trim().length).toBeGreaterThan(0);
      expect(config.metadata.description.trim().length).toBeGreaterThan(0);
      expect(config.metadata.ogTitle.trim().length).toBeGreaterThan(0);
      expect(config.metadata.ogSub.trim().length).toBeGreaterThan(0);
    },
  );

  it.each(entries)("%s — hero.stats is a non-empty array", (_key, config) => {
    expect(Array.isArray(config.hero.stats)).toBe(true);
    expect(config.hero.stats.length).toBeGreaterThan(0);
    for (const stat of config.hero.stats) {
      expect(stat.label.trim().length).toBeGreaterThan(0);
      expect(stat.value.trim().length).toBeGreaterThan(0);
      expect(stat.sub.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(entries)("%s — hero copy fields are non-empty", (_key, config) => {
    expect(config.hero.h1Plain.trim().length).toBeGreaterThan(0);
    expect(config.hero.h1Highlight.trim().length).toBeGreaterThan(0);
    expect(config.hero.h1Sub.trim().length).toBeGreaterThan(0);
    expect(config.hero.paragraph.trim().length).toBeGreaterThan(0);
    expect(config.hero.flagPillText.trim().length).toBeGreaterThan(0);
  });

  it.each(entries)(
    "%s — toc entries have non-empty, unique ids",
    (_key, config) => {
      expect(config.toc.length).toBeGreaterThan(0);
      const ids = config.toc.map((t) => t.id);
      for (const entry of config.toc) {
        expect(entry.id.trim().length).toBeGreaterThan(0);
        expect(entry.label.trim().length).toBeGreaterThan(0);
      }
      expect(new Set(ids).size, `toc ids unique for ${config.slug}`).toBe(
        ids.length,
      );
    },
  );

  it.each(entries)(
    "%s — every FAQ entry has both a question and an answer",
    (_key, config) => {
      expect(config.faq.length).toBeGreaterThan(0);
      for (const entry of config.faq) {
        // FaqEntry uses { q, a } as the field names.
        expect(entry.q.trim().length, "FAQ question").toBeGreaterThan(0);
        expect(entry.a.trim().length, "FAQ answer").toBeGreaterThan(0);
      }
    },
  );

  it.each(entries)(
    "%s — every related link has a non-empty title and href",
    (_key, config) => {
      expect(config.related.length).toBeGreaterThan(0);
      for (const link of config.related) {
        expect(link.title.trim().length).toBeGreaterThan(0);
        expect(link.href.trim().length).toBeGreaterThan(0);
      }
    },
  );

  it.each(entries)(
    "%s — every property-section CtaLink has a non-empty label and href",
    (_key, config) => {
      for (const cta of config.property.ctaLinks) {
        expect(cta.label.trim().length).toBeGreaterThan(0);
        expect(cta.href.trim().length).toBeGreaterThan(0);
      }
    },
  );

  it.each(entries)(
    "%s — DTA rows are well-formed (every field non-empty)",
    (_key, config) => {
      expect(config.dta.rows.length).toBeGreaterThan(0);
      for (const row of config.dta.rows) {
        expect(row.type.trim().length).toBeGreaterThan(0);
        expect(row.noTreaty.trim().length).toBeGreaterThan(0);
        expect(row.withTreaty.trim().length).toBeGreaterThan(0);
        expect(row.countrySideNote.trim().length).toBeGreaterThan(0);
      }
    },
  );
});

describe("UK_CONFIG / US_CONFIG anchor assertions", () => {
  it("UK_CONFIG identifies as the United Kingdom corridor", () => {
    expect(UK_CONFIG.code).toBe("uk");
    expect(UK_CONFIG.slug).toBe("united-kingdom");
    expect(UK_CONFIG.currency).toBe("GBP");
  });

  it("US_CONFIG identifies as the United States corridor", () => {
    expect(US_CONFIG.code).toBe("us");
    expect(US_CONFIG.slug).toBe("united-states");
    expect(US_CONFIG.currency).toBe("USD");
  });

  it("UK and US are distinct objects with distinct slugs", () => {
    expect(UK_CONFIG).not.toBe(US_CONFIG);
    expect(UK_CONFIG.slug).not.toBe(US_CONFIG.slug);
  });
});
