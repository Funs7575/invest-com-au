/**
 * Registry of the deterministic coverage flows added to close the
 * highest-value gaps in bot coverage (country mode, i18n, calculators, form
 * negative-paths, directory filters, content citability, rate limiting, mobile,
 * auth edges, dark mode).
 *
 * Each entry binds a flow to the browser-context shape it needs (viewport,
 * colour scheme, seeded localStorage) so `fleet.spec.ts` can register them all
 * with one uniform loop instead of a bespoke block per flow. Pure data + types
 * only — no Playwright import — so it can be unit-tested under vitest.
 */

import type { Flow } from "./types";
import { COUNTRY_MODE_FLOW } from "./country-mode";
import { I18N_LOCALE_FLOW } from "./i18n-locale";
import { CALCULATOR_CORRECTNESS_FLOW } from "./calculator-correctness";
import { FORM_VALIDATION_FLOW } from "./form-validation";
import { DIRECTORY_FILTERS_FLOW } from "./directory-filters";
import { ACADEMY_CITABILITY_FLOW } from "./academy-citability";
import { RATE_LIMIT_FLOW } from "./rate-limit";
import { MOBILE_NAV_FLOW } from "./mobile-nav";
import { AUTH_EDGE_FLOW } from "./auth-edge";
import { DARK_MODE_FLOW } from "./dark-mode";

export interface FlowPersona {
  /** Persona/test name — unique across the whole fleet. */
  name: string;
  description: string;
  /** The deterministic flow this persona drives. */
  flow: Flow;
  /** Override the browser viewport (mobile personas). */
  viewport?: { width: number; height: number };
  /** Emulate prefers-color-scheme (dark-mode persona). */
  colorScheme?: "light" | "dark";
  /** Seed localStorage before any page script (pin theme, etc.). */
  seedLocalStorage?: Record<string, string>;
}

/** Standard phone viewport (iPhone 13 logical size) for mobile personas. */
export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

export const COVERAGE_FLOW_PERSONAS: FlowPersona[] = [
  {
    name: "country-mode",
    description: "Drives the country-aware recommendation banners across directory surfaces for several countries.",
    flow: COUNTRY_MODE_FLOW,
  },
  {
    name: "i18n-locale",
    description: "Visits every locale-prefixed route (zh/ko/ar) and checks lang/dir + untranslated artifacts.",
    flow: I18N_LOCALE_FLOW,
  },
  {
    name: "calculator-correctness",
    description: "Drives the currency converter (identity + linearity) and smoke-drives other calculators.",
    flow: CALCULATOR_CORRECTNESS_FLOW,
  },
  {
    name: "form-validation",
    description: "Submits empty/invalid/oversized payloads to the adviser enquiry form and checks graceful handling.",
    flow: FORM_VALIDATION_FLOW,
  },
  {
    name: "directory-filters",
    description: "Drives search / sort / compare on the advisor directory.",
    flow: DIRECTORY_FILTERS_FLOW,
  },
  {
    name: "academy-citability",
    description: "Crawls the glossary/academy/questions content trees and runs citability + schema checks at scale.",
    flow: ACADEMY_CITABILITY_FLOW,
  },
  {
    name: "rate-limit",
    description: "Bursts a read-only rate-limited endpoint and asserts the limiter engages and degrades cleanly.",
    flow: RATE_LIMIT_FLOW,
  },
  {
    name: "mobile-nav",
    description: "Drives core surfaces at a phone viewport (overflow, hamburger, filter drawer).",
    flow: MOBILE_NAV_FLOW,
    viewport: MOBILE_VIEWPORT,
  },
  {
    name: "auth-edge",
    description: "Deep-links gated routes while logged out and asserts correct login redirect + return path.",
    flow: AUTH_EDGE_FLOW,
  },
  {
    name: "dark-mode",
    description: "Walks core surfaces under a forced dark palette and re-runs the a11y audit.",
    flow: DARK_MODE_FLOW,
    colorScheme: "dark",
    seedLocalStorage: { theme: "dark" },
  },
];
