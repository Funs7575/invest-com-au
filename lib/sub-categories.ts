export interface SubCategoryChipDef {
  value: string;
  label: string;
}

export const SUBCATEGORY_CHIPS: Readonly<Record<string, ReadonlyArray<SubCategoryChipDef>>> = {
  startup: [
    { value: "fintech", label: "Fintech" },
    { value: "proptech", label: "Proptech" },
    { value: "medtech", label: "Medtech" },
    { value: "agritech", label: "Agritech" },
    { value: "cleantech", label: "Cleantech" },
    { value: "saas", label: "SaaS" },
    { value: "marketplace", label: "Marketplace" },
    { value: "deep_tech", label: "Deep tech" },
    { value: "edtech", label: "Edtech" },
    { value: "legaltech", label: "Legaltech" },
  ],
  mining: [
    { value: "gold", label: "Gold" },
    { value: "lithium", label: "Lithium" },
    { value: "copper", label: "Copper" },
    { value: "iron_ore", label: "Iron ore" },
    { value: "rare_earths", label: "Rare earths" },
    { value: "uranium", label: "Uranium" },
    { value: "coal", label: "Coal" },
    { value: "nickel", label: "Nickel" },
    { value: "silver", label: "Silver" },
    { value: "graphite", label: "Graphite" },
  ],
  farmland: [
    { value: "cropping", label: "Cropping" },
    { value: "dairy", label: "Dairy" },
    { value: "viticulture", label: "Viticulture" },
    { value: "horticulture", label: "Horticulture" },
    { value: "livestock", label: "Livestock" },
    { value: "mixed", label: "Mixed farming" },
    { value: "irrigated", label: "Irrigated" },
    { value: "carbon", label: "Carbon farming" },
  ],
  energy: [
    { value: "solar", label: "Solar" },
    { value: "wind", label: "Wind" },
    { value: "battery", label: "Battery storage" },
    { value: "hydrogen", label: "Hydrogen" },
    { value: "oil_gas", label: "Oil & gas" },
    { value: "geothermal", label: "Geothermal" },
  ],
  fund: [
    { value: "property_fund", label: "Property" },
    { value: "equity_fund", label: "Equities" },
    { value: "credit_fund", label: "Private credit" },
    { value: "infrastructure_fund", label: "Infrastructure" },
    { value: "hedge_fund", label: "Hedge" },
    { value: "esg_fund", label: "ESG / Impact" },
    { value: "venture_fund", label: "Venture" },
    { value: "balanced_fund", label: "Balanced" },
  ],
  commercial_property: [
    { value: "office", label: "Office" },
    { value: "retail", label: "Retail" },
    { value: "industrial", label: "Industrial" },
    { value: "medical", label: "Medical" },
    { value: "hotel", label: "Hotel" },
    { value: "childcare", label: "Childcare" },
    { value: "service_station", label: "Service station" },
  ],
  infrastructure: [
    { value: "transport", label: "Transport" },
    { value: "utilities", label: "Utilities" },
    { value: "social", label: "Social" },
    { value: "digital", label: "Digital" },
    { value: "water", label: "Water" },
  ],
  alternatives: [
    { value: "art", label: "Art" },
    { value: "wine", label: "Wine" },
    { value: "classic_cars", label: "Classic cars" },
    { value: "watches", label: "Watches" },
    { value: "collectibles", label: "Collectibles" },
    { value: "luxury_assets", label: "Luxury assets" },
  ],
  private_credit: [
    { value: "construction", label: "Construction" },
    { value: "asset_backed", label: "Asset-backed" },
    { value: "invoice", label: "Invoice finance" },
    { value: "real_estate", label: "Real estate" },
    { value: "sme_lending", label: "SME lending" },
  ],
};

/** Get chips for a vertical slug, or empty array if none defined. */
export function getSubCategoryChips(vertical: string): ReadonlyArray<SubCategoryChipDef> {
  return SUBCATEGORY_CHIPS[vertical] ?? [];
}
