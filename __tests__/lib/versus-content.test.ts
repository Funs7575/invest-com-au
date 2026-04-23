import { describe, it, expect } from "vitest";
import {
  getVersusEditorial,
  getAllVersusEditorialKeys,
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
