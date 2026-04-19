import { describe, it, expect } from "vitest";
import {
  generateVersusPairs,
  getRelatedVersusPairs,
} from "@/lib/versus-pairs";

type Row = {
  slug: string;
  name: string;
  rating: number | null;
  platform_type:
    | "share_broker"
    | "cfd_forex"
    | "crypto_exchange"
    | "super_fund"
    | "robo_advisor"
    | "savings_account"
    | "term_deposit"
    | "property_platform"
    | "research_tool";
};

const SHARE_BROKERS: Row[] = [
  { slug: "stake", name: "Stake", rating: 4.5, platform_type: "share_broker" },
  { slug: "commsec", name: "CommSec", rating: 3.5, platform_type: "share_broker" },
  { slug: "moomoo", name: "Moomoo", rating: 4.3, platform_type: "share_broker" },
];

const CRYPTO: Row[] = [
  { slug: "coinspot", name: "CoinSpot", rating: 4.2, platform_type: "crypto_exchange" },
  { slug: "swyftx", name: "Swyftx", rating: 4.4, platform_type: "crypto_exchange" },
];

describe("generateVersusPairs", () => {
  it("generates N*(N-1)/2 pairs per platform_type group", () => {
    const pairs = generateVersusPairs([...SHARE_BROKERS, ...CRYPTO]);
    // 3 share brokers → 3 pairs ; 2 crypto → 1 pair = 4 total
    expect(pairs).toHaveLength(4);
  });

  it("never pairs across platform types", () => {
    const pairs = generateVersusPairs([...SHARE_BROKERS, ...CRYPTO]);
    for (const p of pairs) {
      const [a, b] = p.slug.split("-vs-");
      const rowA = [...SHARE_BROKERS, ...CRYPTO].find((r) => r.slug === a)!;
      const rowB = [...SHARE_BROKERS, ...CRYPTO].find((r) => r.slug === b)!;
      expect(rowA.platform_type).toBe(rowB.platform_type);
    }
  });

  it("sorts slugs alphabetically in each pair", () => {
    const pairs = generateVersusPairs(SHARE_BROKERS);
    for (const p of pairs) {
      const [a, b] = p.slug.split("-vs-");
      expect([a, b]).toEqual([a, b].slice().sort());
    }
  });

  it("ranks by rating product descending", () => {
    const pairs = generateVersusPairs(SHARE_BROKERS);
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i - 1].score).toBeGreaterThanOrEqual(pairs[i].score);
    }
  });

  it("handles brokers with null rating as zero score", () => {
    const pairs = generateVersusPairs([
      ...SHARE_BROKERS,
      {
        slug: "unrated",
        name: "Unrated",
        rating: null,
        platform_type: "share_broker",
      },
    ]);
    const unratedPairs = pairs.filter((p) => p.slug.includes("unrated"));
    for (const p of unratedPairs) {
      expect(p.score).toBe(0);
    }
  });

  it("returns an empty array for a single broker", () => {
    expect(generateVersusPairs([SHARE_BROKERS[0]!])).toEqual([]);
  });
});

describe("getRelatedVersusPairs", () => {
  it("returns pairs that share a broker and platform_type", () => {
    const all = generateVersusPairs(SHARE_BROKERS);
    const stakeVsCommsec = all.find((p) => p.slug === "commsec-vs-stake")!;
    const related = getRelatedVersusPairs(stakeVsCommsec, all, 10);

    for (const r of related) {
      const parts = r.slug.split("-vs-");
      // Must share at least one of the two brokers in the input pair.
      expect(parts.some((p) => p === "commsec" || p === "stake")).toBe(true);
      expect(r.platform_type).toBe("share_broker");
    }
  });

  it("never returns the input pair", () => {
    const all = generateVersusPairs(SHARE_BROKERS);
    const pair = all[0]!;
    expect(getRelatedVersusPairs(pair, all, 10)).not.toContainEqual(pair);
  });

  it("respects the limit", () => {
    const all = generateVersusPairs([...SHARE_BROKERS, ...CRYPTO]);
    const p = all[0]!;
    expect(getRelatedVersusPairs(p, all, 1).length).toBeLessThanOrEqual(1);
  });
});
