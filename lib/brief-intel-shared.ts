/**
 * Client-safe constants shared between the brief-intel server module and
 * the portal UI. Keep this file free of any server-only imports — it is
 * bundled into client components (BriefDossierPanel), so importing
 * lib/brief-intel (which pulls in the server Supabase clients) from here
 * would break the production build.
 */

/** Display labels for the canonical budget bands (order = QUOTE_BUDGET_BANDS). */
export const BUDGET_BAND_LABELS: Record<string, string> = {
  under_500: "Under $500",
  "500_2k": "$500–$2k",
  "2k_5k": "$2k–$5k",
  "5k_10k": "$5k–$10k",
  "10k_plus": "$10k+",
  not_sure: "Budget TBD",
};
