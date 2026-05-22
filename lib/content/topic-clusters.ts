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
      // Additive (wave3b): real country + topic spokes that were orphaned.
      "/foreign-investment/singapore",
      "/foreign-investment/united-kingdom",
      "/foreign-investment/united-states",
      "/foreign-investment/china",
      "/foreign-investment/crypto",
      "/foreign-investment/cfd",
      "/foreign-investment/energy",
      "/foreign-investment/guides/firb-application-guide",
      "/foreign-investment/guides/property-ban-2025",
      "/foreign-investment/guides/stamp-duty-foreign-buyers",
    ],
    supporting: [
      "/find-advisor",
      "/advisors/financial-planners",
      "/tax",
      "/property",
      "/foreign-investment/shares",
      "/foreign-investment/super",
      "/foreign-investment/savings",
      "/foreign-investment/send-money-australia",
      "/non-resident-dividend-calculator",
      "/advisors/compare",
      // Additive (wave3b): FIRB tooling + specialist advisors that reinforce
      // the foreign-investment intent but live outside its namespace.
      "/firb-fee-estimator",
      "/non-resident-cgt-checker",
      "/tools/withholding-tax-calculator",
      "/tools/visa-investment-calculator",
      "/advisors/firb-specialists",
      "/advisors/international-tax-specialists",
      "/advisors/migration-agents",
      "/property/foreign-investment",
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
      "/compound-interest-calculator",
      "/portfolio-calculator",
      "/trade-cost-calculator",
      "/tco-calculator",
      "/property-yield-calculator",
      "/us-share-costs-calculator",
      "/tax",
      // Additive (wave3b): verified calculators/tools that are natural siblings.
      "/franking-credits-calculator",
      "/tools/borrowing-power-calculator",
      "/tools/fhss-calculator",
      "/tools/salary-sacrifice-optimiser",
      "/tools/mortgage-stress-test",
      "/tools/buy-vs-rent",
      "/non-resident-dividend-calculator",
    ],
  },
  {
    pillar: "/compare",
    label: "Comparison Hub",
    clusters: [
      "/compare/etfs",
      "/compare/insurance",
      // Additive (wave3b): verified comparison spokes.
      "/compare/super",
      "/compare/non-residents",
    ],
    supporting: [
      "/best",
      "/best-for",
      "/quiz",
      "/etfs",
      "/insurance",
      "/robo-advisors",
      "/invest",
      "/super",
      "/get-matched",
      // Additive (wave3b): verified screeners + adjacent comparison surfaces.
      "/lic-screener",
      "/etfs/screener",
      "/advisors/compare",
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
      "/etfs/screener",
      "/etfs/dividends",
      "/etfs/asx-200",
      "/etfs/us-exposure",
      "/lic-screener",
      "/best/etf-platforms",
      // Additive (wave3b): global-investing ETF spokes + dividends hub.
      "/global-investing/etfs/global",
      "/global-investing/etfs/us",
      "/dividends",
      "/share-trading",
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
      "/invest/reits",
      "/invest/managed-funds",
      "/invest/gold",
      "/invest/dividend-investing",
      "/invest/funds",
      "/dividends",
      // Additive (wave3b): verified sector + alternative-asset spokes.
      "/invest/mining",
      "/invest/oil-gas",
      "/invest/private-credit",
      "/invest/private-equity",
      "/invest/infrastructure",
      "/invest/income-assets",
      "/invest/ipo-calendar",
      "/global-investing",
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
      "/insurance/tpd",
      "/insurance/home-contents",
      "/get-matched",
      "/advisors/financial-planners",
      // Additive (wave3b): verified advisor + quiz cross-links.
      "/advisors/insurance-brokers",
      "/insurance/quiz",
      "/quiz",
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
      "/smsf/setup",
      "/smsf/investment-strategy",
      "/smsf/property",
      "/smsf/auditors",
      "/invest/smsf",
      // Additive (wave3b): verified SMSF tools, specialist advisors + quiz.
      "/tools/smsf-checker",
      "/tools/smsf-setup",
      "/advisors/smsf-accountants",
      "/advisors/smsf-auditors",
      "/advisors/smsf-specialists",
      "/smsf/quiz",
    ],
  },
  {
    pillar: "/super",
    label: "Superannuation Hub",
    clusters: [
      "/super/consolidation",
      "/super/leaving-australia",
      // Additive (wave3b): verified super spokes.
      "/super/contributions",
      "/super/smsf",
    ],
    supporting: [
      "/super-contributions-calculator",
      "/smsf",
      "/retirement-calculator",
      "/find-advisor",
      // Additive (wave3b): verified super-adjacent tools, advisors + quiz.
      "/tools/salary-sacrifice-optimiser",
      "/tools/fhss-calculator",
      "/advisors/financial-planners",
      "/advisors/wealth-managers",
      "/super/quiz",
    ],
  },
  {
    pillar: "/tax",
    label: "Tax Hub",
    clusters: [
      "/tax/crypto",
      "/tax/negative-gearing",
      // Additive (wave3b): verified tax spokes.
      "/tax/franking-credits",
      "/tax/capital-gains",
    ],
    supporting: [
      "/cgt-calculator",
      "/property",
      "/invest",
      "/find-advisor",
      "/advisors/financial-planners",
      // Additive (wave3b): verified tax tools, specialist advisors + dividends.
      "/franking-credits-calculator",
      "/non-resident-cgt-checker",
      "/tools/withholding-tax-calculator",
      "/negative-gearing",
      "/dividends/franking-credits",
      "/advisors/tax-agents",
      "/advisors/international-tax-specialists",
    ],
  },
  {
    pillar: "/property",
    label: "Property Hub",
    clusters: [
      "/property/buyer-agents",
      // Additive (wave3b): verified property spokes.
      "/property/finance",
      "/property/suburbs",
      "/property/foreign-investment",
    ],
    supporting: [
      "/property-platforms",
      "/mortgage-calculator",
      "/property-vs-shares-calculator",
      "/foreign-investment/property",
      "/tax/negative-gearing",
      "/find-advisor",
      // Additive (wave3b): verified property tools, advisors + first-home-buyer.
      "/property-yield-calculator",
      "/tools/buy-vs-rent",
      "/tools/mortgage-stress-test",
      "/first-home-buyer",
      "/advisors/buyers-agents",
      "/advisors/mortgage-brokers",
      "/advisors/conveyancers",
      "/advisors/property-lawyers",
    ],
  },
  {
    pillar: "/advisors",
    label: "Advisors Hub",
    clusters: [
      "/advisors/financial-planners",
      "/advisors/accountants",
      "/advisors/mortgage-brokers",
      // Additive (wave3b): verified advisor-type spokes (resolve via /advisors/[type]).
      "/advisors/tax-agents",
      "/advisors/buyers-agents",
      "/advisors/smsf-accountants",
      "/advisors/wealth-managers",
      "/advisors/estate-planners",
    ],
    supporting: [
      "/find-advisor",
      "/quiz",
      "/for-advisors",
      "/advisor-guides/financial-planner-vs-robo-advisor",
      "/advisor-guides/smsf-accountant-vs-diy",
      "/advisor-guides/tax-agent-vs-accountant",
      "/advisor-guides/buyers-agent-vs-diy",
      // Additive (wave3b): verified matching surfaces + adjacent guides.
      "/get-matched",
      "/advisors/compare",
      "/find-advisor/life-event",
      "/advisor-guides/mortgage-broker-vs-bank",
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
      // Additive (wave3b): verified research/screener cross-links.
      "/etfs/screener",
      "/lic-screener",
      "/best",
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
      // Additive (wave3b): verified grant + business cross-links.
      "/grants",
      "/grants/rd-tax-incentive",
      "/invest/pre-ipo",
      "/invest/venture-capital/listings",
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
      // Additive (wave3b): verified lump-sum calculator + adjacent hubs.
      "/lump-sum-investing/calculator",
      "/property-vs-shares-calculator",
      "/etfs",
      "/super",
    ],
  },
  {
    pillar: "/dividends",
    label: "Dividends Hub",
    clusters: [
      "/dividends/franking-credits",
      // Additive (wave3b): verified dividends spokes.
      "/dividends/calculator",
    ],
    supporting: [
      "/dividend-calculator",
      "/dividend-reinvestment-calculator",
      "/etfs",
      "/invest",
      // Additive (wave3b): verified franking + ETF-dividend cross-links.
      "/franking-credits-calculator",
      "/tax/franking-credits",
      "/etfs/dividends",
      "/invest/dividend-investing",
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
