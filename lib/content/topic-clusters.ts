/**
 * Topic cluster map — KK-03 (audit remediation).
 *
 * Defines the INTENDED pillar → cluster → supporting page hierarchy for
 * internal linking. This is the authoritative source for KK-04's automated
 * link injection and for validating the KK-01 orphan findings against our
 * planned information architecture.
 *
 * Structure:
 *   pillar  — the hub page that owns the topic (high out-degree, indexed)
 *   clusters — direct sub-topics that live under the pillar URL namespace
 *   supporting — adjacent pages outside the namespace that strengthen the pillar
 *
 * Usage:
 *   import { TOPIC_CLUSTERS, getPillarForPath, getClustersForPillar } from "@/lib/content/topic-clusters";
 */

export interface TopicCluster {
  /** Canonical path of the pillar page. */
  pillar: string;
  /** Human label used in admin dashboards and audit reports. */
  label: string;
  /**
   * Direct cluster pages — sub-topics under this pillar.
   * Each should receive a contextual link from the pillar page.
   */
  clusters: string[];
  /**
   * Supporting pages — related content that reinforces the pillar but lives
   * outside its URL namespace. Link should be bi-directional where natural.
   */
  supporting: string[];
}

export const TOPIC_CLUSTERS: TopicCluster[] = [
  {
    pillar: "/foreign-investment",
    label: "Foreign Investment",
    clusters: [
      "/foreign-investment/siv",
      "/foreign-investment/property",
      "/foreign-investment/tax",
      "/foreign-investment/united-arab-emirates",
      "/foreign-investment/hong-kong",
      "/foreign-investment/new-zealand",
      "/foreign-investment/guides/firb-guide",
      "/foreign-investment/guides/siv-guide",
      "/foreign-investment/guides/property-guide",
    ],
    supporting: [
      "/find-advisor",
      "/advisors/financial-planners",
      "/tax",
      "/property",
    ],
  },
  {
    pillar: "/calculators",
    label: "Calculators Hub",
    clusters: [
      "/mortgage-calculator",
      "/super-contributions-calculator",
      "/retirement-calculator",
      "/debt-calculator",
      "/fire-calculator",
      "/property-vs-shares-calculator",
      "/smsf-calculator",
      "/dividend-reinvestment-calculator",
      "/cgt-calculator",
      "/fee-simulator",
      "/fee-tracker",
      "/dividend-calculator",
      "/savings-calculator",
      "/switching-calculator",
      "/fee-impact",
      "/borrowing-power-calculator",
    ],
    supporting: [
      "/super",
      "/property",
      "/smsf",
      "/compare",
      "/find-advisor",
    ],
  },
  {
    pillar: "/compare",
    label: "Comparison Hub",
    clusters: [
      "/compare/etfs",
      "/compare/insurance",
    ],
    supporting: [
      "/best",
      "/best-for",
      "/quiz",
      "/etfs",
      "/insurance",
    ],
  },
  {
    pillar: "/etfs",
    label: "ETFs Hub",
    clusters: [
      "/etfs/bonds",
      "/etfs/international",
      "/etfs/sectors",
    ],
    supporting: [
      "/compare/etfs",
      "/best/etf-investing",
      "/dividend-reinvestment-calculator",
      "/invest",
    ],
  },
  {
    pillar: "/invest",
    label: "Investing Hub",
    clusters: [
      "/invest/bonds",
      "/invest/commodities",
      "/invest/forex",
      "/invest/alternatives",
      "/invest/alternatives/guides",
      "/invest/digital-infrastructure",
      "/invest/startups",
    ],
    supporting: [
      "/etfs",
      "/smsf",
      "/super",
      "/compare",
      "/find-advisor",
    ],
  },
  {
    pillar: "/insurance",
    label: "Insurance Hub",
    clusters: [
      "/insurance/health",
      "/insurance/life",
      "/insurance/income-protection",
      "/insurance/total-and-permanent-disability",
      "/insurance/trauma",
      "/insurance/business",
    ],
    supporting: [
      "/compare/insurance",
      "/find-advisor",
      "/super",
    ],
  },
  {
    pillar: "/smsf",
    label: "SMSF Hub",
    clusters: [
      "/smsf/checklist",
      "/smsf/crypto",
    ],
    supporting: [
      "/smsf-calculator",
      "/super",
      "/tax",
      "/property",
      "/find-advisor",
      "/advisors/financial-planners",
    ],
  },
  {
    pillar: "/super",
    label: "Superannuation Hub",
    clusters: [
      "/super/consolidation",
      "/super/leaving-australia",
    ],
    supporting: [
      "/super-contributions-calculator",
      "/smsf",
      "/retirement-calculator",
      "/find-advisor",
    ],
  },
  {
    pillar: "/tax",
    label: "Tax Hub",
    clusters: [
      "/tax/crypto",
      "/tax/negative-gearing",
    ],
    supporting: [
      "/cgt-calculator",
      "/property",
      "/invest",
      "/find-advisor",
      "/advisors/financial-planners",
    ],
  },
  {
    pillar: "/property",
    label: "Property Hub",
    clusters: [
      "/property/buyer-agents",
    ],
    supporting: [
      "/property-platforms",
      "/mortgage-calculator",
      "/property-vs-shares-calculator",
      "/foreign-investment/property",
      "/tax/negative-gearing",
      "/find-advisor",
    ],
  },
  {
    pillar: "/advisors",
    label: "Advisors Hub",
    clusters: [
      "/advisors/financial-planners",
      "/advisors/accountants",
      "/advisors/mortgage-brokers",
    ],
    supporting: [
      "/find-advisor",
      "/quiz",
      "/for-advisors",
      "/advisor-guides/financial-planner-vs-robo-advisor",
      "/advisor-guides/smsf-accountant-vs-diy",
      "/advisor-guides/tax-agent-vs-accountant",
      "/advisor-guides/buyers-agent-vs-diy",
    ],
  },
  {
    pillar: "/research",
    label: "Research Hub",
    clusters: [
      "/research-tools",
      "/health-scores",
      "/benchmark",
      "/chess-lookup",
    ],
    supporting: [
      "/articles",
      "/etfs",
      "/compare",
    ],
  },
  {
    pillar: "/startup",
    label: "Startup Hub",
    clusters: [
      "/startup/grants",
    ],
    supporting: [
      "/invest/startups",
      "/find-advisor",
      "/tax",
    ],
  },
  {
    pillar: "/lump-sum-investing",
    label: "Lump-Sum Investing Hub",
    clusters: [
      "/lump-sum-investing/inheritance",
      "/lump-sum-investing/redundancy",
    ],
    supporting: [
      "/invest",
      "/tax",
      "/find-advisor",
    ],
  },
  {
    pillar: "/dividends",
    label: "Dividends Hub",
    clusters: [
      "/dividends/franking-credits",
    ],
    supporting: [
      "/dividend-calculator",
      "/dividend-reinvestment-calculator",
      "/etfs",
      "/invest",
    ],
  },
];

/** Look up the pillar cluster entry for any path — returns undefined for paths
 *  that are not a registered pillar, cluster, or supporting page. */
export function getPillarForPath(
  pathname: string,
): TopicCluster | undefined {
  return TOPIC_CLUSTERS.find(
    (tc) =>
      tc.pillar === pathname ||
      tc.clusters.includes(pathname) ||
      tc.supporting.includes(pathname),
  );
}

/** Return all clusters (direct + supporting) for a given pillar path. */
export function getClustersForPillar(
  pillarPath: string,
): { clusters: string[]; supporting: string[] } | undefined {
  const tc = TOPIC_CLUSTERS.find((t) => t.pillar === pillarPath);
  if (!tc) return undefined;
  return { clusters: tc.clusters, supporting: tc.supporting };
}

/** All unique paths referenced in the cluster map — useful for link-injection
 *  allow-listing and sitemap validation. */
export const ALL_CLUSTER_PATHS: readonly string[] = [
  ...new Set(
    TOPIC_CLUSTERS.flatMap((tc) => [tc.pillar, ...tc.clusters, ...tc.supporting]),
  ),
];
