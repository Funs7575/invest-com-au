import { describe, it, expect } from "vitest";
import { GLOSSARY_ENTRIES } from "@/lib/glossary";
import {
  EXTENDED_GLOSSARY_ENTRIES,
  FULL_GLOSSARY_ENTRIES,
} from "@/lib/glossary-extended";

// The full set powers server-side surfaces (sitemap, internal-link targets,
// DB fallback). It must stay a clean superset of the lean client tooltip set,
// with no duplicate slugs/terms — JargonTooltip's client bundle is unaffected
// because it imports only lib/glossary.ts.
describe("glossary-extended (server-only full set)", () => {
  it("FULL = core (client) + extended (server) with no overlap", () => {
    expect(FULL_GLOSSARY_ENTRIES.length).toBe(
      GLOSSARY_ENTRIES.length + EXTENDED_GLOSSARY_ENTRIES.length,
    );
  });

  it("has unique slugs across the full set", () => {
    const slugs = FULL_GLOSSARY_ENTRIES.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has unique terms across the full set", () => {
    const terms = FULL_GLOSSARY_ENTRIES.map((e) => e.term);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it("extended terms are not already in the core client set", () => {
    const coreSlugs = new Set(GLOSSARY_ENTRIES.map((e) => e.slug));
    for (const e of EXTENDED_GLOSSARY_ENTRIES) {
      expect(coreSlugs.has(e.slug)).toBe(false);
    }
  });

  it("every entry has a non-empty definition (citable content)", () => {
    for (const e of FULL_GLOSSARY_ENTRIES) {
      expect(e.definition.length).toBeGreaterThan(0);
    }
  });
});
