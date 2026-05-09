/**
 * Navigation registry — single source of truth for which hubs appear in the
 * site navigation and in what order.
 *
 * Adding a new hub to lib/verticals.ts does NOT automatically add it to the
 * nav. Register it here (ordered, with a short nav label and nav description)
 * so Header.tsx stays decoupled from HubConfig internals.
 *
 * Usage in Header.tsx (after Y-02 migration):
 *
 *   import { getHubNavColumns } from "@/lib/nav-registry";
 *   const columns = getHubNavColumns();
 */

import type { MegaMenuColumn, MegaMenuSidebar } from "@/components/MegaMenu";

export interface NavHubEntry {
  slug: string;
  navLabel: string;
  navDesc: string;
  group: "investment" | "tools" | "advisors";
}

const NAV_HUB_REGISTRY: NavHubEntry[] = [
  {
    slug: "smsf",
    navLabel: "SMSF Hub",
    navDesc: "SMSF setup, auditors, strategy & specialists",
    group: "investment",
  },
  {
    slug: "dividends",
    navLabel: "Dividend Investing",
    navDesc: "Franking credits, high-yield ASX stocks & ETFs",
    group: "investment",
  },
  {
    slug: "private-markets",
    navLabel: "Private Markets",
    navDesc: "Private equity, credit & pre-IPO (wholesale)",
    group: "investment",
  },
  {
    slug: "grants",
    navLabel: "Grants Hub",
    navDesc: "All Australian business grants in one place",
    group: "tools",
  },
];

type HubGroup = NavHubEntry["group"];

const GROUP_LABELS: Record<HubGroup, string> = {
  investment: "Investment Hubs",
  tools: "Tools & Resources",
  advisors: "Find Experts",
};

export function getHubNavColumns(): MegaMenuColumn[] {
  const grouped = new Map<HubGroup, NavHubEntry[]>();

  for (const entry of NAV_HUB_REGISTRY) {
    const list = grouped.get(entry.group) ?? [];
    list.push(entry);
    grouped.set(entry.group, list);
  }

  return Array.from(grouped.entries()).map(([group, entries]) => ({
    title: GROUP_LABELS[group],
    items: entries.map((e) => ({
      label: e.navLabel,
      href: `/${e.slug}`,
      desc: e.navDesc,
    })),
  }));
}

export function getHubNavSidebar(options?: {
  heading?: string;
  ctaLabel?: string;
  ctaHref?: string;
}): MegaMenuSidebar {
  const investmentHubs = NAV_HUB_REGISTRY.filter((e) => e.group === "investment");

  return {
    heading: options?.heading ?? "Popular Hubs",
    links: investmentHubs.slice(0, 5).map((e) => ({
      label: e.navLabel,
      href: `/${e.slug}`,
    })),
    ctaLabel: options?.ctaLabel ?? "All Hubs",
    ctaHref: options?.ctaHref ?? "/invest",
  };
}

export { NAV_HUB_REGISTRY };
export type { HubGroup };
