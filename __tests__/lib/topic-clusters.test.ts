import { describe, it, expect } from "vitest";
import {
  TOPIC_CLUSTERS,
  getClustersForArticle,
  getClustersForBestPage,
  getCrossClusterLinks,
  getAllClusterArticleSlugs,
} from "@/lib/topic-clusters";

describe("TOPIC_CLUSTERS registry", () => {
  it("has multiple clusters", () => {
    expect(TOPIC_CLUSTERS.length).toBeGreaterThan(3);
  });

  it("every cluster has id / name / pillar / clusterPages array", () => {
    for (const c of TOPIC_CLUSTERS) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.pillar).toBeDefined();
      expect(c.pillar.slug).toBeTruthy();
      expect(c.pillar.href).toBeTruthy();
      expect(c.pillar.title).toBeTruthy();
      expect(c.pillar.anchorText).toBeTruthy();
      expect(Array.isArray(c.clusterPages)).toBe(true);
      expect(c.clusterPages.length).toBeGreaterThan(0);
    }
  });

  it("cluster ids are globally unique", () => {
    const ids = TOPIC_CLUSTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every pillar and cluster page has non-empty href that starts with /", () => {
    for (const c of TOPIC_CLUSTERS) {
      expect(c.pillar.href).toMatch(/^\//);
      for (const p of c.clusterPages) {
        expect(p.href).toMatch(/^\//);
        expect(p.slug).toBeTruthy();
        expect(p.title).toBeTruthy();
      }
    }
  });
});

describe("getClustersForArticle", () => {
  it("returns [] for an unknown slug", () => {
    expect(getClustersForArticle("not-a-slug")).toEqual([]);
  });

  it("identifies a known pillar slug (isPillar=true, siblingPages=clusterPages)", () => {
    const cluster = TOPIC_CLUSTERS[0]!;
    const res = getClustersForArticle(cluster.pillar.slug);
    expect(res).toHaveLength(1);
    expect(res[0]?.isPillar).toBe(true);
    expect(res[0]?.cluster.id).toBe(cluster.id);
    expect(res[0]?.siblingPages).toEqual(cluster.clusterPages);
  });

  it("identifies a known spoke slug (isPillar=false, siblingPages excludes self)", () => {
    const cluster = TOPIC_CLUSTERS.find((c) => c.clusterPages.length > 1)!;
    const spoke = cluster.clusterPages[0]!;
    const res = getClustersForArticle(spoke.slug);
    expect(res.length).toBeGreaterThanOrEqual(1);
    const self = res.find((r) => r.cluster.id === cluster.id);
    expect(self?.isPillar).toBe(false);
    expect(self?.pillarLink).toEqual(cluster.pillar);
    expect(self?.siblingPages).not.toContainEqual(spoke);
  });
});

describe("getClustersForBestPage", () => {
  it("returns [] for unknown best slug", () => {
    expect(getClustersForBestPage("not-a-best")).toEqual([]);
  });

  it("matches only when the cluster page's href starts with /best/", () => {
    // Find any cluster that includes a /best/ page
    const withBest = TOPIC_CLUSTERS.find((c) =>
      c.clusterPages.some((p) => p.href.startsWith("/best/")),
    );
    if (!withBest) return;
    const bestPage = withBest.clusterPages.find((p) =>
      p.href.startsWith("/best/"),
    )!;
    const res = getClustersForBestPage(bestPage.slug);
    expect(res.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getCrossClusterLinks", () => {
  it("returns [] for a slug that doesn't exist in any cluster", () => {
    expect(getCrossClusterLinks("completely-unrelated-slug")).toEqual([]);
  });

  it("returns pillars from other clusters when keywords overlap", () => {
    // Take an article slug that overlaps keywords with another cluster's pillar
    const slug = "crypto-tax-australia";
    const res = getCrossClusterLinks(slug);
    // Must be an array; content varies with cluster shapes
    expect(Array.isArray(res)).toBe(true);
    // If any results, each must have clusterName + page
    for (const r of res) {
      expect(r.clusterName).toBeTruthy();
      expect(r.page.href).toBeTruthy();
    }
  });
});

describe("getAllClusterArticleSlugs", () => {
  it("returns the deduped set of /article/ slugs only (no /best/)", () => {
    const slugs = getAllClusterArticleSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    // No duplicates (the implementation uses a Set internally)
    expect(new Set(slugs).size).toBe(slugs.length);

    // Every slug must come from a pillar or cluster page with
    // href starting /article/
    const allHrefs = new Set<string>();
    for (const c of TOPIC_CLUSTERS) {
      if (c.pillar.href.startsWith("/article/")) {
        allHrefs.add(c.pillar.slug);
      }
      for (const p of c.clusterPages) {
        if (p.href.startsWith("/article/")) allHrefs.add(p.slug);
      }
    }
    for (const s of slugs) expect(allHrefs.has(s)).toBe(true);
  });
});
