import { describe, it, expect } from "vitest";
import { LEAD_MAGNETS, getLeadMagnetForHub } from "@/lib/lead-magnets";

// ── registry integrity ────────────────────────────────────────────────────────

describe("LEAD_MAGNETS registry", () => {
  it("contains at least 10 entries", () => {
    expect(LEAD_MAGNETS.length).toBeGreaterThanOrEqual(10);
  });

  it("all slugs are unique", () => {
    const slugs = LEAD_MAGNETS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("all hubSlugs are unique (one magnet per hub)", () => {
    const hubs = LEAD_MAGNETS.map((m) => m.hubSlug);
    expect(new Set(hubs).size).toBe(hubs.length);
  });

  it("every magnet has a non-empty slug, title, description, hubSlug, segmentSlug, downloadUrl, coverIcon", () => {
    for (const m of LEAD_MAGNETS) {
      expect(m.slug.length).toBeGreaterThan(0);
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
      expect(m.hubSlug.length).toBeGreaterThan(0);
      expect(m.segmentSlug.length).toBeGreaterThan(0);
      expect(m.downloadUrl.length).toBeGreaterThan(0);
      expect(m.coverIcon.length).toBeGreaterThan(0);
    }
  });

  it("all downloadUrls start with /downloads/", () => {
    for (const m of LEAD_MAGNETS) {
      expect(m.downloadUrl).toMatch(/^\/downloads\//);
    }
  });

  it("all downloadUrls end with .pdf", () => {
    for (const m of LEAD_MAGNETS) {
      expect(m.downloadUrl).toMatch(/\.pdf$/);
    }
  });

  it("segmentSlug ends with -hub for every entry", () => {
    for (const m of LEAD_MAGNETS) {
      expect(m.segmentSlug).toMatch(/-hub$/);
    }
  });

  it("includes a magnet for the smsf hub", () => {
    expect(LEAD_MAGNETS.some((m) => m.hubSlug === "smsf")).toBe(true);
  });

  it("includes a magnet for the etfs hub", () => {
    expect(LEAD_MAGNETS.some((m) => m.hubSlug === "etfs")).toBe(true);
  });

  it("includes a magnet for the super hub", () => {
    expect(LEAD_MAGNETS.some((m) => m.hubSlug === "super")).toBe(true);
  });
});

// ── getLeadMagnetForHub ───────────────────────────────────────────────────────

describe("getLeadMagnetForHub", () => {
  it("returns the correct magnet for a known hub", () => {
    const m = getLeadMagnetForHub("smsf");
    expect(m).toBeDefined();
    expect(m!.hubSlug).toBe("smsf");
  });

  it("returns the correct magnet for the etfs hub", () => {
    const m = getLeadMagnetForHub("etfs");
    expect(m).toBeDefined();
    expect(m!.hubSlug).toBe("etfs");
  });

  it("returns undefined for an unknown hub", () => {
    expect(getLeadMagnetForHub("not-a-real-hub")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getLeadMagnetForHub("")).toBeUndefined();
  });

  it("round-trips every magnet through getLeadMagnetForHub", () => {
    for (const m of LEAD_MAGNETS) {
      const found = getLeadMagnetForHub(m.hubSlug);
      expect(found).toEqual(m);
    }
  });
});
