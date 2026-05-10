#!/usr/bin/env node
/**
 * KK-03 — Topic cluster map generator
 *
 * Reads lib/content/topic-clusters.ts (hub-page clusters) and
 * lib/topic-clusters.ts (article clusters), cross-references with the
 * KK-01 internal link audit findings, and outputs either:
 *   --mermaid   A Mermaid flowchart (default)
 *   --json      Raw cluster data as JSON
 *   --report    Markdown coverage report
 *
 * Usage:
 *   node scripts/topic-cluster-map.mjs [--mermaid|--json|--report]
 *   node scripts/topic-cluster-map.mjs --report > docs/audits/kk-03-topic-cluster-map.md
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Inline hub cluster data (mirrors lib/content/topic-clusters.ts — kept as JS
// to avoid needing ts-node in the CI pipeline that runs this script)
// ---------------------------------------------------------------------------
const HUB_CLUSTERS = [
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
    supporting: ["/find-advisor", "/advisors/financial-planners", "/tax", "/property"],
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
    supporting: ["/super", "/property", "/smsf", "/compare", "/find-advisor"],
  },
  {
    pillar: "/compare",
    label: "Comparison Hub",
    clusters: ["/compare/etfs", "/compare/insurance"],
    supporting: ["/best", "/best-for", "/quiz", "/etfs", "/insurance"],
  },
  {
    pillar: "/etfs",
    label: "ETFs Hub",
    clusters: ["/etfs/bonds", "/etfs/international", "/etfs/sectors"],
    supporting: ["/compare/etfs", "/best/etf-investing", "/dividend-reinvestment-calculator", "/invest"],
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
    supporting: ["/etfs", "/smsf", "/super", "/compare", "/find-advisor"],
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
    supporting: ["/compare/insurance", "/find-advisor", "/super"],
  },
  {
    pillar: "/smsf",
    label: "SMSF Hub",
    clusters: ["/smsf/checklist", "/smsf/crypto"],
    supporting: ["/smsf-calculator", "/super", "/tax", "/property", "/find-advisor", "/advisors/financial-planners"],
  },
  {
    pillar: "/super",
    label: "Superannuation Hub",
    clusters: ["/super/consolidation", "/super/leaving-australia"],
    supporting: ["/super-contributions-calculator", "/smsf", "/retirement-calculator", "/find-advisor"],
  },
  {
    pillar: "/tax",
    label: "Tax Hub",
    clusters: ["/tax/crypto", "/tax/negative-gearing"],
    supporting: ["/cgt-calculator", "/property", "/invest", "/find-advisor", "/advisors/financial-planners"],
  },
  {
    pillar: "/property",
    label: "Property Hub",
    clusters: ["/property/buyer-agents"],
    supporting: ["/property-platforms", "/mortgage-calculator", "/property-vs-shares-calculator", "/foreign-investment/property", "/tax/negative-gearing", "/find-advisor"],
  },
  {
    pillar: "/advisors",
    label: "Advisors Hub",
    clusters: ["/advisors/financial-planners", "/advisors/accountants", "/advisors/mortgage-brokers"],
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
    clusters: ["/research-tools", "/health-scores", "/benchmark", "/chess-lookup"],
    supporting: ["/articles", "/etfs", "/compare"],
  },
  {
    pillar: "/startup",
    label: "Startup Hub",
    clusters: ["/startup/grants"],
    supporting: ["/invest/startups", "/find-advisor", "/tax"],
  },
  {
    pillar: "/lump-sum-investing",
    label: "Lump-Sum Investing Hub",
    clusters: ["/lump-sum-investing/inheritance", "/lump-sum-investing/redundancy"],
    supporting: ["/invest", "/tax", "/find-advisor"],
  },
  {
    pillar: "/dividends",
    label: "Dividends Hub",
    clusters: ["/dividends/franking-credits"],
    supporting: ["/dividend-calculator", "/dividend-reinvestment-calculator", "/etfs", "/invest"],
  },
];

// ---------------------------------------------------------------------------
// Node ID helpers (Mermaid-safe, no slashes)
// ---------------------------------------------------------------------------
function nodeId(path) {
  return path.replace(/\//g, "_").replace(/^_/, "") || "root";
}

function shortLabel(path) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  return parts[parts.length - 1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Mermaid output
// ---------------------------------------------------------------------------
function renderMermaid() {
  const lines = ["```mermaid", "flowchart TD"];

  for (const tc of HUB_CLUSTERS) {
    const pid = nodeId(tc.pillar);
    lines.push(`  ${pid}["🏛️ ${tc.label}\\n${tc.pillar}"]:::pillar`);

    for (const c of tc.clusters) {
      const cid = nodeId(c);
      lines.push(`  ${cid}["${shortLabel(c)}"]:::cluster`);
      lines.push(`  ${pid} --> ${cid}`);
    }
  }

  // Pillar-to-pillar cross-links (supporting that are also pillars)
  const pillarPaths = new Set(HUB_CLUSTERS.map((tc) => tc.pillar));
  const seen = new Set();
  for (const tc of HUB_CLUSTERS) {
    for (const s of tc.supporting) {
      if (pillarPaths.has(s)) {
        const key = `${tc.pillar}::${s}`;
        if (!seen.has(key)) {
          seen.add(key);
          lines.push(`  ${nodeId(tc.pillar)} -.-> ${nodeId(s)}`);
        }
      }
    }
  }

  lines.push("  classDef pillar fill:#2563eb,color:#fff,stroke:#1d4ed8,rx:8");
  lines.push("  classDef cluster fill:#dbeafe,color:#1e40af,stroke:#93c5fd");
  lines.push("```");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// JSON output
// ---------------------------------------------------------------------------
function renderJson() {
  return JSON.stringify({ hub_clusters: HUB_CLUSTERS }, null, 2);
}

// ---------------------------------------------------------------------------
// Markdown report
// ---------------------------------------------------------------------------
function renderReport() {
  const totalClusters = HUB_CLUSTERS.reduce((n, tc) => n + tc.clusters.length, 0);
  const totalSupporting = HUB_CLUSTERS.reduce((n, tc) => n + tc.supporting.length, 0);
  const allPaths = new Set([
    ...HUB_CLUSTERS.map((tc) => tc.pillar),
    ...HUB_CLUSTERS.flatMap((tc) => tc.clusters),
    ...HUB_CLUSTERS.flatMap((tc) => tc.supporting),
  ]);

  const lines = [
    "# KK-03 Topic Cluster Map",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}  `,
    "**Script:** `scripts/topic-cluster-map.mjs`  ",
    "**Queue item:** KK-03 — Topic cluster map (pillar ↔ cluster ↔ supporting)  ",
    "**Audit ref:** `docs/audits/codebase-health-2026-04-24.md` §5 (SEO + discoverability)",
    "",
    "---",
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|--------|-------|",
    `| Hub pillar pages | ${HUB_CLUSTERS.length} |`,
    `| Cluster pages (direct sub-topics) | ${totalClusters} |`,
    `| Supporting pages (cross-hub links) | ${totalSupporting} |`,
    `| Total unique paths in cluster map | ${allPaths.size} |`,
    "",
    "---",
    "",
    "## Hub cluster overview",
    "",
    "| Pillar | Label | Clusters | Supporting |",
    "|--------|-------|----------|------------|",
    ...HUB_CLUSTERS.map(
      (tc) =>
        `| \`${tc.pillar}\` | ${tc.label} | ${tc.clusters.length} | ${tc.supporting.length} |`,
    ),
    "",
    "---",
    "",
    "## Cluster map (Mermaid diagram)",
    "",
    "Solid arrows (→) = pillar → direct cluster sub-page.  ",
    "Dashed arrows (⇢) = cross-hub structural links between pillars.",
    "",
    renderMermaid(),
    "",
    "---",
    "",
    "## Detailed cluster tables",
    "",
    ...HUB_CLUSTERS.flatMap((tc) => [
      `### ${tc.label} (\`${tc.pillar}\`)`,
      "",
      "**Cluster pages** (should all link back to pillar + appear in pillar nav):",
      "",
      ...tc.clusters.map((c) => `- \`${c}\``),
      "",
      "**Supporting pages** (bi-directional links where contextually natural):",
      "",
      ...tc.supporting.map((s) => `- \`${s}\``),
      "",
      "---",
      "",
    ]),
    "## KK-01 orphan coverage",
    "",
    "Pages flagged as actionable orphans in KK-01 that are now mapped:",
    "",
    "| KK-01 orphaned page | Mapped pillar |",
    "|---------------------|---------------|",
    "| `/debt-calculator` | `/calculators` |",
    "| `/fire-calculator` | `/calculators` |",
    "| `/mortgage-calculator` | `/calculators` |",
    "| `/retirement-calculator` | `/calculators` |",
    "| `/smsf-calculator` | `/calculators` |",
    "| `/super-contributions-calculator` | `/calculators` |",
    "| `/dividend-reinvestment-calculator` | `/calculators` |",
    "| `/property-vs-shares-calculator` | `/calculators` |",
    "| `/etfs/bonds` | `/etfs` |",
    "| `/etfs/international` | `/etfs` |",
    "| `/etfs/sectors` | `/etfs` |",
    "| `/smsf/checklist` | `/smsf` |",
    "| `/smsf/crypto` | `/smsf` |",
    "| `/super/consolidation` | `/super` |",
    "| `/super/leaving-australia` | `/super` |",
    "| `/tax/crypto` | `/tax` |",
    "| `/tax/negative-gearing` | `/tax` |",
    "| `/insurance/health` | `/insurance` |",
    "| `/insurance/life` | `/insurance` |",
    "| `/insurance/income-protection` | `/insurance` |",
    "| `/lump-sum-investing/inheritance` | `/lump-sum-investing` |",
    "| `/lump-sum-investing/redundancy` | `/lump-sum-investing` |",
    "| `/dividends/franking-credits` | `/dividends` |",
    "| `/startup/grants` | `/startup` |",
    "",
    "Pages from KK-01 not yet addressed (require content or UX work, not just linking):",
    "- `/accessibility`, `/jobs`, `/press`, `/api-docs` — footer trust section items",
    "- `/benchmark`, `/chess-lookup`, `/health-scores` — research tools (mapped to `/research` pillar)",
    "- `/embed`, `/for-advisors/pricing`, `/for-advisors/sponsored` — advisor-facing surfaces",
    "",
    "---",
    "",
    "## Next steps",
    "",
    "| Priority | Item | Queue |",
    "|----------|------|-------|",
    "| High | Automated internal link injection using this cluster map | KK-04 |",
    "| High | Add orphaned calculators to `/calculators` hub page | KK-04 |",
    "| Medium | Add sub-category links in `/etfs`, `/smsf`, `/insurance` hub pages | KK-04 |",
    "| Low | Footer audit: add `/accessibility`, `/jobs`, `/press` | KK-04 |",
  ];
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const arg = process.argv[2] ?? "--report";

switch (arg) {
  case "--json":
    process.stdout.write(renderJson() + "\n");
    break;
  case "--mermaid":
    process.stdout.write(renderMermaid() + "\n");
    break;
  case "--report":
  default:
    process.stdout.write(renderReport() + "\n");
    break;
}
