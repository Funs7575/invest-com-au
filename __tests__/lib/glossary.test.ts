import { describe, it, expect } from "vitest";
import { GLOSSARY, GLOSSARY_ENTRIES } from "@/lib/glossary";

describe("glossary", () => {
  it("GLOSSARY_ENTRIES is non-empty", () => {
    expect(GLOSSARY_ENTRIES.length).toBeGreaterThan(10);
  });

  it("every entry has term + slug + definition", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(entry.term, "term").toBeTruthy();
      expect(entry.slug, `${entry.term} slug`).toBeTruthy();
      expect(entry.definition, `${entry.term} definition`).toBeTruthy();
    }
  });

  it("slugs are url-safe (lowercase, hyphen-separated)", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(entry.slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
    }
  });

  it("slugs are globally unique", () => {
    const slugs = GLOSSARY_ENTRIES.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("terms are globally unique (case-sensitive — matches GLOSSARY flat lookup key)", () => {
    const terms = GLOSSARY_ENTRIES.map((e) => e.term);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it("GLOSSARY flat lookup mirrors every entry's term → definition", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(GLOSSARY[entry.term]).toBe(entry.definition);
    }
  });

  it("contains key Australian investing terms", () => {
    const terms = GLOSSARY_ENTRIES.map((e) => e.term);
    expect(terms).toContain("ASX");
    expect(terms).toContain("ASX Fee");
    expect(terms).toContain("FX Rate");
  });
});
