/**
 * SEO Topic Cluster System
 *
 * Defines pillar↔cluster relationships for internal linking.
 * Each cluster has ONE pillar page and multiple spoke pages.
 * Every cluster page links back to its pillar. Every pillar links out
 * to all its cluster pages. Cross-cluster links connect overlapping topics.
 */

import { absoluteUrl } from "./seo";

/* ─── Types ─── */

export interface ClusterPage {
  slug: string;
  /** Full path e.g. "/article/how-to-invest-australia" or "/best/beginners" */
  href: string;
  title: string;
  /** Anchor text for internal links (natural language) */
  anchorText: string;
}

export interface TopicCluster {
  id: string;
  name: string;
  pillar: ClusterPage;
  clusterPages: ClusterPage[];
}

/* ─── Cluster Definitions ─── */

export const TOPIC_CLUSTERS: TopicCluster[] = [
  {
    id: "investing-beginners",
    name: "Investing for Beginners",
    pillar: {
      slug: "investing-for-beginners-australia",
      href: "/article/investing-for-beginners-australia",
      title: "Investing for Beginners Australia: Everything You Need to Know",
      anchorText: "our complete beginner's guide to investing in Australia",
    },
    clusterPages: [
      {
        slug: "how-to-invest-australia",
        href: "/article/how-to-invest-australia",
        title: "How to Invest in Australia: A Complete Beginner's Guide",
        anchorText: "step-by-step guide to investing in Australia",
      },
      {
        slug: "how-to-buy-shares",
        href: "/article/how-to-buy-shares",
        title: "How to Buy Shares in Australia",
        anchorText: "how to buy your first shares in Australia",
      },
      {
        slug: "what-is-an-etf",
        href: "/article/what-is-an-etf",
        title: "What Is an ETF? Exchange-Traded Funds Explained",
        anchorText: "what ETFs are and how they work",
      },
      {
        slug: "brokerage-account-explained",
        href: "/article/brokerage-account-explained",
        title: "What Is a Brokerage Account and How to Open One",
        anchorText: "what a brokerage account is and how to open one",
      },
      {
        slug: "how-to-invest-1000-dollars",
        href: "/article/how-to-invest-1000-dollars",
        title: "How to Invest $1,000 in Australia",
        anchorText: "how to invest your first $1,000",
      },
      {
        slug: "dca-asx",
        href: "/article/dca-asx",
        title: "Dollar Cost Averaging on the ASX",
        anchorText: "dollar-cost averaging strategy explained",
      },
      {
        slug: "shares-vs-etfs",
        href: "/article/shares-vs-etfs",
        title: "Shares vs ETFs: Which Is Better for Beginners?",
        anchorText: "comparing individual shares vs ETFs",
      },
      {
        slug: "investing-mistakes-beginners",
        href: "/article/investing-mistakes-beginners",
        title: "Common Investing Mistakes Beginners Make",
        anchorText: "common investing mistakes to avoid",
      },
      {
        slug: "chess-vs-custodial",
        href: "/article/chess-vs-custodial",
        title: "CHESS vs Custodial: What You Need to Know",
        anchorText: "CHESS vs custodial brokers explained",
      },
      {
        slug: "read-annual-report",
        href: "/article/read-annual-report",
        title: "How to Read an ASX Annual Report",
        anchorText: "how to read an annual report",
      },
    ],
  },
  {
    id: "best-brokers",
    name: "Best Brokers in Australia",
    pillar: {
      slug: "best-share-trading-platforms-australia",
      href: "/article/best-share-trading-platforms-australia",
      title: "Best Share Trading Platforms in Australia",
      anchorText: "our comprehensive comparison of Australian trading platforms",
    },
    clusterPages: [
      {
        slug: "beginners",
        href: "/best/beginners",
        title: "Best Brokers for Beginners in Australia",
        anchorText: "best brokers for beginners",
      },
      {
        slug: "us-shares",
        href: "/best/us-shares",
        title: "Best Brokers for Buying US Shares from Australia",
        anchorText: "best brokers for US share trading",
      },
      {
        slug: "low-fees",
        href: "/best/low-fees",
        title: "Cheapest Online Brokers in Australia",
        anchorText: "cheapest online brokers in Australia",
      },
      {
        slug: "chess-sponsored",
        href: "/best/chess-sponsored",
        title: "Best CHESS-Sponsored Brokers in Australia",
        anchorText: "best CHESS-sponsored brokers",
      },
      {
        slug: "smsf",
        href: "/best/smsf",
        title: "Best Brokers for Self-Managed Super Funds",
        anchorText: "best brokers for SMSF trading",
      },
      {
        slug: "low-fx-fees",
        href: "/best/low-fx-fees",
        title: "Best Brokers for Low Foreign Exchange Fees",
        anchorText: "brokers with the lowest FX fees",
      },
      {
        slug: "best-investing-app-australia",
        href: "/article/best-investing-app-australia",
        title: "Best Investing Apps in Australia",
        anchorText: "best investing apps in Australia",
      },
      {
        slug: "how-to-choose-a-broker",
        href: "/article/how-to-choose-a-broker",
        title: "How to Choose the Right Broker",
        anchorText: "our guide to choosing a broker",
      },
    ],
  },
  {
    id: "etfs-australia",
    name: "ETFs in Australia",
    pillar: {
      slug: "best-etfs-australia",
      href: "/article/best-etfs-australia",
      title: "Best ETFs in Australia",
      anchorText: "our guide to the best ETFs in Australia",
    },
    clusterPages: [
      {
        slug: "what-is-an-etf",
        href: "/article/what-is-an-etf",
        title: "What Is an ETF? Exchange-Traded Funds Explained",
        anchorText: "what ETFs are and how they work",
      },
      {
        slug: "best-asx-etfs",
        href: "/article/best-asx-etfs",
        title: "Best ASX-Listed ETFs",
        anchorText: "top ASX-listed ETFs for Australian investors",
      },
      {
        slug: "best-international-etfs",
        href: "/article/best-international-etfs",
        title: "Best International ETFs for Australians",
        anchorText: "best global ETFs available in Australia",
      },
      {
        slug: "vanguard-etfs-australia",
        href: "/article/vanguard-etfs-australia",
        title: "Vanguard ETFs in Australia Reviewed",
        anchorText: "Vanguard's ETF range in Australia",
      },
      {
        slug: "betashares-etfs",
        href: "/article/betashares-etfs",
        title: "BetaShares ETFs Reviewed",
        anchorText: "BetaShares ETF range reviewed",
      },
      {
        slug: "etf-vs-managed-funds",
        href: "/article/etf-vs-managed-funds",
        title: "ETFs vs Managed Funds Compared",
        anchorText: "ETFs compared to managed funds",
      },
      {
        slug: "high-dividend-etfs-australia",
        href: "/article/high-dividend-etfs-australia",
        title: "Best High-Dividend ETFs in Australia",
        anchorText: "high-dividend ETFs for income investors",
      },
      {
        slug: "how-to-buy-etfs",
        href: "/article/how-to-buy-etfs",
        title: "How to Buy ETFs in Australia",
        anchorText: "step-by-step guide to buying ETFs",
      },
      {
        slug: "shares-vs-etfs",
        href: "/article/shares-vs-etfs",
        title: "Shares vs ETFs: Which Is Better?",
        anchorText: "comparing shares vs ETFs",
      },
    ],
  },
  {
    id: "tax-investing",
    name: "Tax and Investing",
    pillar: {
      slug: "tax-guide-australian-investors",
      href: "/article/tax-guide-australian-investors",
      title: "Tax Guide for Australian Investors",
      anchorText: "our complete tax guide for Australian investors",
    },
    clusterPages: [
      {
        slug: "cgt-discount",
        href: "/article/cgt-discount",
        title: "The CGT 50% Discount Explained",
        anchorText: "how the CGT 50% discount works",
      },
      {
        slug: "tax-loss-harvesting",
        href: "/article/tax-loss-harvesting",
        title: "Tax-Loss Harvesting: How to Offset Capital Gains",
        anchorText: "how to use tax-loss harvesting",
      },
      {
        slug: "franking-credits",
        href: "/article/franking-credits",
        title: "Franking Credits Explained",
        anchorText: "how franking credits work",
      },
      {
        slug: "smsf-guide",
        href: "/article/smsf-guide",
        title: "SMSF Share Trading: Rules, Brokers & Tax Traps",
        anchorText: "SMSF tax rules and advantages",
      },
      {
        slug: "crypto-tax-australia",
        href: "/article/crypto-tax-australia",
        title: "Crypto Tax in Australia: What You Owe",
        anchorText: "crypto tax obligations in Australia",
      },
      {
        slug: "tax-return-shares",
        href: "/article/tax-return-shares",
        title: "How to Report Shares on Your Tax Return",
        anchorText: "reporting shares on your tax return",
      },
    ],
  },
  {
    id: "crypto-australia",
    name: "Crypto in Australia",
    pillar: {
      slug: "crypto-trading-australia",
      href: "/article/crypto-trading-australia",
      title: "Cryptocurrency Trading in Australia",
      anchorText: "our complete guide to crypto trading in Australia",
    },
    clusterPages: [
      {
        slug: "best-crypto-exchanges-australia",
        href: "/article/best-crypto-exchanges-australia",
        title: "Best Crypto Exchanges in Australia",
        anchorText: "best crypto exchanges compared",
      },
      {
        slug: "how-to-buy-bitcoin-australia",
        href: "/article/how-to-buy-bitcoin-australia",
        title: "How to Buy Bitcoin in Australia",
        anchorText: "how to buy Bitcoin in Australia",
      },
      {
        slug: "how-to-buy-ethereum-australia",
        href: "/article/how-to-buy-ethereum-australia",
        title: "How to Buy Ethereum in Australia",
        anchorText: "how to buy Ethereum in Australia",
      },
      {
        slug: "crypto-tax-australia",
        href: "/article/crypto-tax-australia",
        title: "Crypto Tax in Australia: What You Owe",
        anchorText: "crypto tax obligations in Australia",
      },
      {
        slug: "crypto-vs-shares",
        href: "/article/crypto-vs-shares",
        title: "Crypto vs Shares: Which Should You Invest In?",
        anchorText: "comparing crypto and shares as investments",
      },
      {
        slug: "crypto-wallet-australia",
        href: "/article/crypto-wallet-australia",
        title: "Best Crypto Wallets for Australians",
        anchorText: "crypto wallet options for Australians",
      },
    ],
  },
  {
    id: "robo-advisors",
    name: "Robo-Advisors in Australia",
    pillar: {
      slug: "robo-advisors-australia",
      href: "/article/robo-advisors-australia",
      title: "Robo-Advisors in Australia: Complete Guide",
      anchorText: "our complete guide to robo-advisors in Australia",
    },
    clusterPages: [
      {
        slug: "robo-advisors",
        href: "/best/robo-advisors",
        title: "Best Robo-Advisors in Australia",
        anchorText: "best robo-advisors compared",
      },
      {
        slug: "robo-advisor-vs-diy",
        href: "/article/robo-advisor-vs-diy",
        title: "Robo-Advisor vs DIY Investing: Which Is Better?",
        anchorText: "robo-advisor vs DIY investing compared",
      },
      {
        slug: "stockspot-review",
        href: "/article/stockspot-review",
        title: "Stockspot Review: Fees, Performance & Verdict",
        anchorText: "our Stockspot review",
      },
      {
        slug: "raiz-review",
        href: "/article/raiz-review",
        title: "Raiz Review: Micro-Investing App Analysed",
        anchorText: "our Raiz review",
      },
      {
        slug: "spaceship-review",
        href: "/article/spaceship-review",
        title: "Spaceship Review: Is It Worth It?",
        anchorText: "our Spaceship review",
      },
    ],
  },
  {
    id: "research-tools",
    name: "Investment Research Tools",
    pillar: {
      slug: "investment-research-tools-australia",
      href: "/article/investment-research-tools-australia",
      title: "Best Investment Research Tools in Australia",
      anchorText: "our guide to investment research tools in Australia",
    },
    clusterPages: [
      {
        slug: "research-tools",
        href: "/best/research-tools",
        title: "Best Investment Research Tools",
        anchorText: "best research tools compared",
      },
      {
        slug: "simply-wall-st-review",
        href: "/article/simply-wall-st-review",
        title: "Simply Wall St Review: Visual Stock Analysis",
        anchorText: "our Simply Wall St review",
      },
      {
        slug: "tradingview-australia",
        href: "/article/tradingview-australia",
        title: "TradingView for Australian Investors",
        anchorText: "TradingView guide for Australians",
      },
      {
        slug: "morningstar-australia",
        href: "/article/morningstar-australia",
        title: "Morningstar Australia: Is Premium Worth It?",
        anchorText: "Morningstar Australia review",
      },
      {
        slug: "how-to-research-stocks",
        href: "/article/how-to-research-stocks",
        title: "How to Research Stocks Before You Buy",
        anchorText: "how to research stocks before buying",
      },
    ],
  },
];

/* ─── Lookup helpers ─── */

/**
 * Given an article slug, return the cluster(s) it belongs to
 * and whether it's a pillar or spoke page.
 */
export function getClustersForArticle(articleSlug: string): {
  cluster: TopicCluster;
  isPillar: boolean;
  pillarLink: ClusterPage;
  siblingPages: ClusterPage[];
}[] {
  const results: {
    cluster: TopicCluster;
    isPillar: boolean;
    pillarLink: ClusterPage;
    siblingPages: ClusterPage[];
  }[] = [];

  for (const cluster of TOPIC_CLUSTERS) {
    const isPillar = cluster.pillar.slug === articleSlug;
    const isClusterPage = cluster.clusterPages.some(
      (p) => p.slug === articleSlug
    );

    if (isPillar || isClusterPage) {
      results.push({
        cluster,
        isPillar,
        pillarLink: cluster.pillar,
        siblingPages: cluster.clusterPages.filter(
          (p) => p.slug !== articleSlug
        ),
      });
    }
  }

  return results;
}

/**
 * Given a /best/ page slug, return any clusters it belongs to.
 */
export function getClustersForBestPage(bestSlug: string): {
  cluster: TopicCluster;
  pillarLink: ClusterPage;
  siblingPages: ClusterPage[];
}[] {
  const results: {
    cluster: TopicCluster;
    pillarLink: ClusterPage;
    siblingPages: ClusterPage[];
  }[] = [];

  for (const cluster of TOPIC_CLUSTERS) {
    const isClusterPage = cluster.clusterPages.some(
      (p) => p.slug === bestSlug && p.href.startsWith("/best/")
    );

    if (isClusterPage) {
      results.push({
        cluster,
        pillarLink: cluster.pillar,
        siblingPages: cluster.clusterPages.filter(
          (p) => p.slug !== bestSlug
        ),
      });
    }
  }

  return results;
}

/**
 * Get cross-cluster links for an article slug.
 * Returns articles from OTHER clusters that share the same slug
 * (e.g., "crypto-tax-australia" appears in both Tax and Crypto clusters).
 */
export function getCrossClusterLinks(
  articleSlug: string
): { clusterName: string; page: ClusterPage }[] {
  const myClusters = getClustersForArticle(articleSlug);
  const myClusterIds = new Set(myClusters.map((c) => c.cluster.id));
  const results: { clusterName: string; page: ClusterPage }[] = [];

  for (const cluster of TOPIC_CLUSTERS) {
    if (myClusterIds.has(cluster.id)) continue;

    // Find topically related pages from other clusters
    // - Same slug appearing in multiple clusters (shared pages)
    const sharedPage = cluster.clusterPages.find(
      (p) => p.slug === articleSlug
    );
    if (sharedPage) continue; // Skip self

    // Suggest the pillar of related clusters based on keyword overlap
    const myKeywords = articleSlug.split("-");
    const pillarKeywords = cluster.pillar.slug.split("-");
    const overlap = myKeywords.filter((k) =>
      pillarKeywords.includes(k)
    ).length;
    if (overlap >= 1) {
      results.push({
        clusterName: cluster.name,
        page: cluster.pillar,
      });
    }
  }

  return results;
}

/**
 * All unique article slugs across all clusters (pillar + spoke pages).
 * Used to validate sitemap coverage and generate missing content lists.
 */
export function getAllClusterArticleSlugs(): string[] {
  const slugs = new Set<string>();

  for (const cluster of TOPIC_CLUSTERS) {
    if (cluster.pillar.href.startsWith("/article/")) {
      slugs.add(cluster.pillar.slug);
    }
    for (const page of cluster.clusterPages) {
      if (page.href.startsWith("/article/")) {
        slugs.add(page.slug);
      }
    }
  }

  return Array.from(slugs);
}
