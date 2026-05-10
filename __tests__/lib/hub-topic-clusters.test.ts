import { describe, it, expect } from "vitest";
import {
  TOPIC_CLUSTERS,
  getPillarForPath,
  getClustersForPillar,
  ALL_CLUSTER_PATHS,
} from "@/lib/content/topic-clusters";

describe("TOPIC_CLUSTERS registry", () => {
  it("has entries for all major hub pillars from the KK-01 audit", () => {
    const pillarPaths = TOPIC_CLUSTERS.map((tc) => tc.pillar);
    expect(pillarPaths).toContain("/calculators");
    expect(pillarPaths).toContain("/foreign-investment");
    expect(pillarPaths).toContain("/etfs");
    expect(pillarPaths).toContain("/super");
    expect(pillarPaths).toContain("/smsf");
    expect(pillarPaths).toContain("/insurance");
    expect(pillarPaths).toContain("/tax");
    expect(pillarPaths).toContain("/invest");
  });

  it("every cluster entry has a pillar, label, non-empty clusters, and non-empty supporting", () => {
    for (const tc of TOPIC_CLUSTERS) {
      expect(tc.pillar).toMatch(/^\//);
      expect(tc.label).toBeTruthy();
      expect(tc.clusters.length).toBeGreaterThan(0);
      expect(tc.supporting.length).toBeGreaterThan(0);
    }
  });

  it("all paths start with /", () => {
    for (const tc of TOPIC_CLUSTERS) {
      expect(tc.pillar).toMatch(/^\//);
      tc.clusters.forEach((p) => expect(p).toMatch(/^\//));
      tc.supporting.forEach((p) => expect(p).toMatch(/^\//));
    }
  });

  it("no pillar appears as its own cluster or supporting page", () => {
    for (const tc of TOPIC_CLUSTERS) {
      expect(tc.clusters).not.toContain(tc.pillar);
      expect(tc.supporting).not.toContain(tc.pillar);
    }
  });

  it("pillar paths are unique across the registry", () => {
    const pillars = TOPIC_CLUSTERS.map((tc) => tc.pillar);
    expect(new Set(pillars).size).toBe(pillars.length);
  });

  it("the calculators pillar covers the 8 orphaned calculator pages from KK-01", () => {
    const calc = TOPIC_CLUSTERS.find((tc) => tc.pillar === "/calculators");
    expect(calc).toBeDefined();
    const knownOrphans = [
      "/debt-calculator",
      "/fire-calculator",
      "/mortgage-calculator",
      "/retirement-calculator",
      "/smsf-calculator",
      "/super-contributions-calculator",
      "/dividend-reinvestment-calculator",
    ];
    for (const orphan of knownOrphans) {
      expect(calc!.clusters).toContain(orphan);
    }
  });

  it("/etfs pillar includes the three orphaned sub-category pages from KK-01", () => {
    const etf = TOPIC_CLUSTERS.find((tc) => tc.pillar === "/etfs");
    expect(etf).toBeDefined();
    expect(etf!.clusters).toContain("/etfs/bonds");
    expect(etf!.clusters).toContain("/etfs/international");
    expect(etf!.clusters).toContain("/etfs/sectors");
  });
});

describe("getPillarForPath", () => {
  it("returns the cluster when querying a pillar path directly", () => {
    const result = getPillarForPath("/calculators");
    expect(result).toBeDefined();
    expect(result!.pillar).toBe("/calculators");
  });

  it("returns the cluster when querying a cluster page path", () => {
    const result = getPillarForPath("/mortgage-calculator");
    expect(result).toBeDefined();
    expect(result!.pillar).toBe("/calculators");
  });

  it("returns the cluster when querying a supporting page path", () => {
    const result = getPillarForPath("/find-advisor");
    expect(result).toBeDefined();
  });

  it("returns undefined for an unregistered path", () => {
    expect(getPillarForPath("/completely-unknown-page-xyz")).toBeUndefined();
  });
});

describe("getClustersForPillar", () => {
  it("returns clusters + supporting for a known pillar", () => {
    const result = getClustersForPillar("/foreign-investment");
    expect(result).toBeDefined();
    expect(result!.clusters).toContain("/foreign-investment/siv");
    expect(result!.clusters).toContain("/foreign-investment/property");
    expect(result!.supporting.length).toBeGreaterThan(0);
  });

  it("returns undefined for a non-pillar path", () => {
    expect(getClustersForPillar("/mortgage-calculator")).toBeUndefined();
    expect(getClustersForPillar("/unknown")).toBeUndefined();
  });
});

describe("ALL_CLUSTER_PATHS", () => {
  it("contains all pillar paths", () => {
    for (const tc of TOPIC_CLUSTERS) {
      expect(ALL_CLUSTER_PATHS).toContain(tc.pillar);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(ALL_CLUSTER_PATHS).size).toBe(ALL_CLUSTER_PATHS.length);
  });

  it("every path starts with /", () => {
    for (const p of ALL_CLUSTER_PATHS) {
      expect(p).toMatch(/^\//);
    }
  });
});
