/**
 * Per-category due-diligence checklists (idea #21) — the buyer-side
 * "what to verify before you transact" content. General information and
 * process prompts only: every list routes hard questions to the licensed
 * professional who should answer them (conveyancer, accountant, licensed
 * adviser), never substitutes for one.
 *
 * Checklist state is personal and client-side (localStorage per slug in
 * the component); nothing here writes to the server.
 */

export interface DueDiligenceItem {
  id: string;
  label: string;
  detail?: string;
}

const BASE: readonly DueDiligenceItem[] = [
  {
    id: "identity",
    label: "Verify the seller's identity and right to sell",
    detail: "Match the contracting entity to the title/registry owner; search the ABN/ACN.",
  },
  {
    id: "contract_review",
    label: "Have the contract reviewed before signing",
    detail: "A licensed conveyancer or solicitor — not the seller's — reviews terms, special conditions and cooling-off rights.",
  },
  {
    id: "independent_valuation",
    label: "Obtain an independent valuation or appraisal",
    detail: "Commissioned by you, not supplied by the seller.",
  },
  {
    id: "funds_path",
    label: "Confirm the settlement path before paying anything",
    detail: "Funds move through your solicitor/conveyancer's trust arrangements — never direct to an unverified account. Re-confirm account details by phone; payment redirection scams target settlements.",
  },
];

const BY_CATEGORY: Record<string, readonly DueDiligenceItem[]> = {
  farmland: [
    { id: "title_search", label: "Title search + registered encumbrances", detail: "Easements, leases, mortgages and caveats on the folio." },
    { id: "water_register", label: "Water entitlement register extract", detail: "Confirm the advertised megalitres exist, their security class, and that they transfer with the sale." },
    { id: "land_tests", label: "Soil, water and contamination checks", detail: "Agronomist or environmental assessment appropriate to the land use." },
    { id: "firb_ag", label: "FIRB position if you're a foreign person", detail: "Agricultural land has its own thresholds — confirm with a professional before contracting." },
  ],
  "commercial-property": [
    { id: "title_search", label: "Title search + registered encumbrances" },
    { id: "lease_audit", label: "Verify every lease underpinning the yield", detail: "Sight executed leases; check WALE, options, incentives and arrears against what's advertised." },
    { id: "outgoings", label: "Audit outgoings and recoveries", detail: "Statutory charges, insurance and maintenance vs. what the net yield assumes." },
    { id: "zoning_cert", label: "Planning/zoning certificate", detail: "Current zoning, permitted use and any proposals affecting the asset." },
    { id: "building_report", label: "Building condition + compliance report" },
  ],
  "buy-business": [
    { id: "financials", label: "Financials reviewed by your accountant", detail: "Three years of statements + tax returns, reconciled to bank data — not the seller's summary." },
    { id: "lease_assign", label: "Premises lease assignment terms", detail: "Landlord consent, remaining term and options." },
    { id: "licences", label: "Licences, permits and registrations transfer", },
    { id: "staff_suppliers", label: "Key staff, contracts and supplier terms survive the sale" },
  ],
  franchise: [
    { id: "disclosure_doc", label: "Franchise disclosure document review", detail: "The Franchising Code requires one — have a franchise-experienced lawyer read it." },
    { id: "franchisee_refs", label: "Speak to current and former franchisees" },
    { id: "territory", label: "Territory rights in writing", detail: "Exclusivity, online-sales carve-outs and renewal terms." },
    { id: "true_costs", label: "Total cost picture beyond the entry fee", detail: "Royalties, marketing levies, fit-out refresh obligations." },
  ],
  mining: [
    { id: "tenement", label: "Tenement standing and expenditure conditions", detail: "Check the register: good standing, expiry, annual commitments." },
    { id: "jorc", label: "JORC report read by a competent person", detail: "Resource classification and the assumptions behind it." },
    { id: "approvals", label: "Environmental and heritage approvals status" },
  ],
  "water-rights": [
    { id: "register_extract", label: "Entitlement register extract", detail: "Volume, security class and any encumbrances, from the state register — not the broker's summary." },
    { id: "allocation_history", label: "Allocation history for the system", detail: "What the entitlement actually delivered across recent seasons." },
    { id: "carryover", label: "Carryover and trade rules for the catchment" },
    { id: "broker_conduct", label: "Confirm the intermediary's conduct obligations", detail: "Water-market intermediaries have statutory conduct rules — ask how they're met." },
  ],
  "renewable-energy": [
    { id: "grid", label: "Grid connection status and curtailment risk" },
    { id: "land_tenure", label: "Land tenure underpinning the project", detail: "Leases/easements for the full asset life." },
    { id: "offtake", label: "Offtake/PPA terms verified" },
  ],
};

const PROFESSIONAL_NOTE =
  "This checklist is general information, not legal, tax or financial advice — engage your own licensed conveyancer, accountant or adviser before transacting.";

export function dueDiligenceForCategory(categorySlug: string): {
  items: DueDiligenceItem[];
  note: string;
} {
  const specific = BY_CATEGORY[categorySlug] ?? [];
  // Specific items lead; the base applies everywhere. Ids are namespaced
  // enough to never collide (test-enforced).
  return { items: [...specific, ...BASE], note: PROFESSIONAL_NOTE };
}
