import { describe, it, expect } from "vitest";
import {
  getVersusEditorial,
  getAllVersusEditorialKeys,
  type VersusEditorial,
} from "@/lib/versus-content";

describe("versus-content data integrity", () => {
  const keys = getAllVersusEditorialKeys();

  it("exposes multiple editorial comparisons", () => {
    expect(keys.length).toBeGreaterThan(3);
  });

  it("keys follow the '<slug>-vs-<slug>' pattern", () => {
    for (const k of keys) {
      expect(k).toMatch(/^[a-z0-9-]+-vs-[a-z0-9-]+$/);
    }
  });

  it("keys are globally unique", () => {
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every key splits cleanly into exactly two slugs", () => {
    for (const k of keys) {
      const parts = k.split("-vs-");
      expect(parts.length).toBe(2);
      expect(parts[0]).toBeTruthy();
      expect(parts[1]).toBeTruthy();
    }
  });
});

describe("getVersusEditorial", () => {
  it("returns null for an unknown pair", () => {
    expect(getVersusEditorial(["foo", "bar"])).toBeNull();
  });

  it("returns the same entry for reversed slug input (normalises order)", () => {
    // Take the first known key and reverse the slug order in the input
    const [firstKey] = getAllVersusEditorialKeys();
    if (!firstKey) return;
    const [a, b] = firstKey.split("-vs-");
    const forward = getVersusEditorial([a!, b!]);
    const reverse = getVersusEditorial([b!, a!]);
    expect(forward).toBeTruthy();
    expect(reverse).toBe(forward);
  });

  it("returned entry has all required prose fields", () => {
    const [firstKey] = getAllVersusEditorialKeys();
    if (!firstKey) return;
    const [a, b] = firstKey.split("-vs-");
    const entry = getVersusEditorial([a!, b!])!;
    expect(entry.tldr).toBeTruthy();
    expect(entry.chooseA).toBeTruthy();
    expect(entry.chooseB).toBeTruthy();
    expect(entry.sections.length).toBeGreaterThan(0);
    for (const s of entry.sections) {
      expect(s.heading).toBeTruthy();
      expect(s.body.length).toBeGreaterThan(30);
    }
  });
});

describe("orBoth panel content", () => {
  // Walk every key, dereference via getVersusEditorial, and assert that
  // when an entry opts into orBoth it provides usable copy. The field
  // is optional — entries without it are explicitly allowed and read
  // a generic templated panel at render time.
  const entries: VersusEditorial[] = getAllVersusEditorialKeys()
    .map((k) => {
      const [a, b] = k.split("-vs-");
      return getVersusEditorial([a!, b!]);
    })
    .filter((e): e is VersusEditorial => e !== null);

  it("at least one entry opts into orBoth (otherwise the field is dead code)", () => {
    const withOrBoth = entries.filter((e) => e.orBoth);
    expect(withOrBoth.length).toBeGreaterThan(0);
  });

  it("every populated orBoth has a non-empty title and body", () => {
    for (const e of entries) {
      if (!e.orBoth) continue;
      expect(e.orBoth.title.length).toBeGreaterThan(0);
      expect(e.orBoth.body.length).toBeGreaterThan(30);
    }
  });

  it("optional ctaA / ctaB are either absent or non-empty strings", () => {
    for (const e of entries) {
      if (!e.orBoth) continue;
      if (e.orBoth.ctaA !== undefined) {
        expect(typeof e.orBoth.ctaA).toBe("string");
        expect(e.orBoth.ctaA.length).toBeGreaterThan(0);
      }
      if (e.orBoth.ctaB !== undefined) {
        expect(typeof e.orBoth.ctaB).toBe("string");
        expect(e.orBoth.ctaB.length).toBeGreaterThan(0);
      }
    }
  });
});
