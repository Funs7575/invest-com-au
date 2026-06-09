import { type ProfessionalType } from "@/lib/types";

export interface AdvisorCluster {
  id: string;
  label: string;
  icon: string;
  types: ReadonlyArray<ProfessionalType>;
}

export const ADVISOR_CLUSTERS: ReadonlyArray<AdvisorCluster> = [
  {
    id: "finance",
    label: "Finance & Wealth",
    icon: "trending-up",
    types: [
      "financial_planner",
      "wealth_manager",
      "private_wealth_manager",
      "stockbroker_firm",
      "fund_manager",
    ],
  },
  {
    id: "tax_super",
    label: "Tax & SMSF",
    icon: "calculator",
    types: [
      "tax_agent",
      "smsf_accountant",
      "smsf_specialist",
      "smsf_auditor",
      "mining_tax_advisor",
    ],
  },
  {
    id: "property",
    label: "Property",
    icon: "home",
    types: [
      "property_advisor",
      "buyers_agent",
      "real_estate_agent",
      "rural_property_agent",
      "commercial_property_agent",
      "conveyancer",
      "property_lawyer",
    ],
  },
  {
    id: "mortgage",
    label: "Mortgage & Credit",
    icon: "landmark",
    types: ["mortgage_broker"],
  },
  {
    id: "legal",
    label: "Legal & Estate",
    icon: "gavel",
    types: [
      "estate_planner",
      "commercial_lawyer",
      "mining_lawyer",
      "foreign_investment_lawyer",
      "immigration_investment_lawyer",
    ],
  },
  {
    id: "insurance_debt",
    label: "Insurance & Debt",
    icon: "shield",
    types: ["insurance_broker", "debt_counsellor", "aged_care_advisor"],
  },
  {
    id: "international",
    label: "International",
    icon: "globe",
    types: ["migration_agent"],
  },
  {
    id: "alternatives",
    label: "Alternatives & Collectibles",
    icon: "gem",
    types: [
      "art_advisor",
      "wine_advisor",
      "classic_car_specialist",
      "luxury_asset_broker",
      "royalty_broker",
      "crypto_advisor",
    ],
  },
  {
    id: "energy_resources",
    label: "Energy & Resources",
    icon: "zap",
    types: [
      "energy_consultant",
      "energy_financial_planner",
      "resources_fund_manager",
      "petroleum_royalties_advisor",
    ],
  },
  {
    id: "business",
    label: "Business",
    icon: "briefcase",
    types: ["business_broker"],
  },
] as const;

/** Flat map: type → cluster ID. */
export const TYPE_TO_CLUSTER: Readonly<Record<ProfessionalType, string>> =
  Object.fromEntries(
    ADVISOR_CLUSTERS.flatMap((c) => c.types.map((t) => [t, c.id])),
  ) as Record<ProfessionalType, string>;

/** Expand a set of cluster IDs into member types. */
export function expandClusters(
  clusterIds: ReadonlyArray<string>,
): Set<ProfessionalType> {
  const result = new Set<ProfessionalType>();
  for (const cluster of ADVISOR_CLUSTERS) {
    if (clusterIds.includes(cluster.id)) {
      for (const t of cluster.types) result.add(t);
    }
  }
  return result;
}

/** Return clusters that are fully covered by the given type set. */
export function activeClusters(
  activeTypes: ReadonlySet<ProfessionalType>,
): Set<string> {
  const result = new Set<string>();
  for (const cluster of ADVISOR_CLUSTERS) {
    if (cluster.types.every((t) => activeTypes.has(t))) {
      result.add(cluster.id);
    }
  }
  return result;
}
