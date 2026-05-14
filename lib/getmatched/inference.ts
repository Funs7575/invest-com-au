/**
 * Inference helpers — port of the old quiz's `inferAdvisorType` plus the
 * routing-matrix logic for the new flow. All pure functions so the engine
 * can call them without DB hits and the test suite can verify the
 * 13 goals × 8 help-prefs = 104-cell routing matrix exhaustively.
 *
 * The decision precedence (strongest signal wins):
 *   1. `help_preference` if explicit (anything other than not_sure)
 *   2. Step-3 sub-question route_hint (property → physical = individual)
 *   3. Goal default route (from intent_taxonomy)
 *
 * The vertical inference is independent: it threads `vertical=X` through
 * the terminal URL so compare/browse routes land on filtered pages
 * instead of the generic shortlist.
 */

import type {
  ActionPlanAnswers,
  IntentSlug,
  RouteType,
  Vertical,
} from "./types";

// ─── Advisor-type inference ────────────────────────────────────────────
// Used to pre-select a default in the help_sub question (when shown) and
// to disambiguate the `individual` route on the result screen.

export type AdvisorType =
  | "financial_planner"
  | "mortgage_broker"
  | "buyers_agent"
  | "tax_agent"
  | "smsf_accountant"
  | "lawyer"
  | "not_sure";

export function inferAdvisorType(answers: ActionPlanAnswers): AdvisorType {
  const goal = (answers.intent as string | undefined) ?? null;
  const propertySub = (answers.property_sub as string | undefined) ?? null;
  const helpSub = (answers.help_sub as string | undefined) ?? null;
  const superSub = (answers.super_sub as string | undefined) ?? null;
  const cryptoSub = (answers.crypto_sub as string | undefined) ?? null;
  const amount = (answers.budget_band as string | undefined) ?? null;

  // Direct help_sub pick wins
  if (helpSub) {
    switch (helpSub) {
      case "financial_planner": return "financial_planner";
      case "mortgage_broker": return "mortgage_broker";
      case "tax_agent": return "tax_agent";
      case "smsf_accountant": return "smsf_accountant";
      case "buyers_agent": return "buyers_agent";
      case "lawyer": return "lawyer";
      case "not_sure_help": return "not_sure";
    }
  }

  if (propertySub === "physical") return "buyers_agent";
  if (propertySub === "smsf") return "smsf_accountant";

  if (superSub === "smsf_setup" || superSub === "smsf_property") return "smsf_accountant";
  if (superSub === "pre_retire") return "financial_planner";

  if (cryptoSub === "tax") return "tax_agent";

  if (goal === "home") return "mortgage_broker";
  if (goal === "property") return "buyers_agent";
  if (goal === "super") return "smsf_accountant";
  if (goal === "crypto") return "tax_agent";
  if (goal === "alt_assets" || goal === "royalties" || goal === "pre_ipo") {
    return "financial_planner";
  }

  // Large balances default to a financial planner unless we have a more
  // specific signal.
  if (amount === "500k_1m" || amount === "1m_plus") return "financial_planner";

  return "financial_planner";
}

// ─── Vertical inference ────────────────────────────────────────────────
// Threads `?vertical=X` through compare/browse URLs.

export function inferVertical(answers: ActionPlanAnswers): Vertical | null {
  const goal = (answers.intent as string | undefined) ?? null;
  const browseSub = (answers.browse_sub as string | undefined) ?? null;
  const propertySub = (answers.property_sub as string | undefined) ?? null;

  if (browseSub === "shares") return "shares";
  if (browseSub === "property") return "property";
  if (browseSub === "opportunities") return "opportunity";

  if (propertySub === "reit") return "property";
  if (propertySub === "browse") return "property";

  switch (goal) {
    case "grow":      return "shares";
    case "income":    return "shares";
    case "crypto":    return "crypto";
    case "trade":     return "trade";
    case "automate":  return "robo";
    case "super":     return "super";
    case "property":  return "property";
    case "home":      return "lender";
    case "alt_assets": return "alt";
    case "royalties": return "royalties";
    case "pre_ipo":   return "pre_ipo";
    default:          return null;
  }
}

// ─── Route + href inference ────────────────────────────────────────────
// Returns the terminal route plus the deep-link href the result screen's
// primary CTA should use. The 13 × 8 routing matrix is encoded here.

export interface ResolvedHref {
  route: RouteType;
  href: string;
  vertical: Vertical | null;
  advisor_type: AdvisorType | null;
}

const COMPARE_HREFS_BY_VERTICAL: Record<Vertical, string> = {
  shares:     "/compare",
  property:   "/compare?vertical=property",
  super:      "/compare?vertical=super",
  crypto:     "/compare?vertical=crypto",
  trade:      "/compare?vertical=trade",
  robo:       "/compare?vertical=robo",
  lender:     "/compare?vertical=lender",
  alt:        "/compare?vertical=alt",
  royalties:  "/compare?vertical=royalties",
  pre_ipo:    "/compare?vertical=pre_ipo",
  opportunity: "/compare",
};

const BROWSE_HREFS_BY_VERTICAL: Record<Vertical, string> = {
  shares:     "/invest?vertical=shares",
  property:   "/invest?vertical=property",
  super:      "/invest?vertical=super",
  crypto:     "/invest?vertical=crypto",
  trade:      "/invest?vertical=trade",
  robo:       "/invest?vertical=robo",
  lender:     "/invest?vertical=lender",
  alt:        "/invest?vertical=alt",
  royalties:  "/invest?vertical=royalties",
  pre_ipo:    "/invest?vertical=pre_ipo",
  opportunity: "/invest",
};

const ADVISORS_HREFS_BY_TYPE: Record<AdvisorType, string> = {
  financial_planner: "/advisors?type=financial_planner",
  mortgage_broker:   "/advisors?type=mortgage_broker",
  buyers_agent:      "/advisors?type=buyers_agent",
  tax_agent:         "/advisors?type=tax_agent",
  smsf_accountant:   "/advisors?type=smsf_accountant",
  lawyer:            "/advisors?type=lawyer",
  not_sure:          "/advisors",
};

/**
 * Pure resolver — given the full answer set, returns the terminal route
 * + href + supporting context. The result screen uses this for the
 * primary CTA, and the engine writes the resolved route onto the plan.
 *
 * Logic:
 *   1. Explicit `help_preference` wins (except not_sure_help → infer)
 *   2. Sub-question route_hint wins (property_sub=physical → individual)
 *   3. Otherwise: goal's default route
 *
 * Then attach a vertical filter when the route is compare/browse, and
 * an advisor type when the route is individual.
 */
export function inferRoute(answers: ActionPlanAnswers): ResolvedHref {
  const help = (answers.help_preference as string | undefined) ?? null;
  const goal = (answers.intent as string | undefined) ?? null;
  const propertySub = (answers.property_sub as string | undefined) ?? null;
  const browseSub = (answers.browse_sub as string | undefined) ?? null;
  const helpSub = (answers.help_sub as string | undefined) ?? null;
  const superSub = (answers.super_sub as string | undefined) ?? null;
  const preIpoSub = (answers.pre_ipo_sub as string | undefined) ?? null;
  const startingPoint = (answers.starting_point as string | undefined) ?? null;
  const listingSub = (answers.listing_sub as string | undefined) ?? null;

  const vertical = inferVertical(answers);
  const advisorType = inferAdvisorType(answers);

  // ── Listing-owner branch — always lands on listing_brief ──
  if (startingPoint === "listing_owner" || listingSub) {
    return {
      route: "listing_brief",
      href: "/briefs/new?template=listing_readiness",
      vertical: null,
      advisor_type: null,
    };
  }

  // ── help_preference fork ──
  // "not_sure" and "not_sure_help" both mean "fall through to my
  // goal's default route" — anything else is an explicit override.
  if (help && help !== "not_sure_help" && help !== "not_sure") {
    switch (help) {
      case "info_only":
        return { route: "guide", href: "/articles", vertical, advisor_type: advisorType };
      case "browse":
        return {
          route: "browse",
          href: vertical ? BROWSE_HREFS_BY_VERTICAL[vertical] : "/invest",
          vertical,
          advisor_type: advisorType,
        };
      case "compare":
        return {
          route: "compare",
          href: vertical ? COMPARE_HREFS_BY_VERTICAL[vertical] : "/compare",
          vertical,
          advisor_type: advisorType,
        };
      case "individual":
        return {
          route: "individual",
          href: ADVISORS_HREFS_BY_TYPE[advisorType],
          vertical,
          advisor_type: advisorType,
        };
      case "firm":
        return {
          route: "firm",
          href: "/advisors?provider_type=firm",
          vertical,
          advisor_type: advisorType,
        };
      case "expert_team":
        return {
          route: "expert_team",
          href: "/advisors#expert-teams",
          vertical,
          advisor_type: advisorType,
        };
      case "investor_brief":
        return {
          route: "investor_brief",
          href: "/briefs/new",
          vertical,
          advisor_type: advisorType,
        };
    }
  }

  // ── Sub-question hints (when help_preference is empty or not_sure) ──
  if (propertySub === "browse") {
    return { route: "browse", href: BROWSE_HREFS_BY_VERTICAL.property, vertical: "property", advisor_type: advisorType };
  }
  if (propertySub === "reit") {
    return { route: "compare", href: COMPARE_HREFS_BY_VERTICAL.property, vertical: "property", advisor_type: advisorType };
  }
  if (propertySub === "physical") {
    return { route: "individual", href: ADVISORS_HREFS_BY_TYPE.buyers_agent, vertical, advisor_type: "buyers_agent" };
  }
  if (propertySub === "smsf" || superSub === "smsf_setup" || superSub === "smsf_property") {
    return { route: "expert_team", href: "/advisors#expert-teams", vertical, advisor_type: "smsf_accountant" };
  }
  if (preIpoSub === "browse_calendar" || preIpoSub === "invest_now") {
    return { route: "browse", href: BROWSE_HREFS_BY_VERTICAL.pre_ipo, vertical: "pre_ipo", advisor_type: advisorType };
  }
  if (browseSub === "advisors") {
    return { route: "individual", href: ADVISORS_HREFS_BY_TYPE[advisorType], vertical: null, advisor_type: advisorType };
  }
  if (helpSub) {
    return { route: "individual", href: ADVISORS_HREFS_BY_TYPE[advisorType], vertical, advisor_type: advisorType };
  }

  // ── Goal-default fallback (covers both retail + niche slugs) ──
  switch (goal) {
    // ── 13 retail slugs ──
    case "grow":
    case "income":
    case "trade":
    case "automate":
    case "crypto":
    case "compare_platform":
    case "start_investing":
      return {
        route: "compare",
        href: vertical ? COMPARE_HREFS_BY_VERTICAL[vertical] : "/compare",
        vertical,
        advisor_type: advisorType,
      };
    case "super":
      return {
        route: "individual",
        href: ADVISORS_HREFS_BY_TYPE.smsf_accountant,
        vertical: "super",
        advisor_type: "smsf_accountant",
      };
    case "property":
      // No property_sub — default to browse so user can look at listings first
      return {
        route: "browse",
        href: BROWSE_HREFS_BY_VERTICAL.property,
        vertical: "property",
        advisor_type: "buyers_agent",
      };
    case "buy_property":
      return {
        route: "individual",
        href: ADVISORS_HREFS_BY_TYPE.buyers_agent,
        vertical: "property",
        advisor_type: "buyers_agent",
      };
    case "home":
    case "mortgage_help":
      return {
        route: "individual",
        href: ADVISORS_HREFS_BY_TYPE.mortgage_broker,
        vertical: "lender",
        advisor_type: "mortgage_broker",
      };
    case "alt_assets":
    case "royalties":
    case "pre_ipo":
      return {
        route: "browse",
        href: vertical ? BROWSE_HREFS_BY_VERTICAL[vertical] : "/invest",
        vertical,
        advisor_type: advisorType,
      };
    case "help":
    case "financial_advice":
    case "tax_help":
    case "legal_help":
    case "expat_investing":
      return {
        route: "individual",
        href: ADVISORS_HREFS_BY_TYPE[advisorType],
        vertical,
        advisor_type: advisorType,
      };
    case "browse":
    case "not_sure":
      return {
        route: "browse",
        href: vertical ? BROWSE_HREFS_BY_VERTICAL[vertical] : "/invest",
        vertical,
        advisor_type: advisorType,
      };

    // ── Niche slugs ──
    case "smsf_property":
    case "opportunity_assessment":
    case "business_acquisition":
    case "commercial_property":
    case "foreign_investor":
      return {
        route: "expert_team",
        href: "/advisors#expert-teams",
        vertical,
        advisor_type: advisorType,
      };
    case "second_opinion":
      return {
        route: "second_opinion",
        href: "/briefs/new?template=second_opinion",
        vertical,
        advisor_type: advisorType,
      };
    case "listing_owner":
    case "listing_readiness":
      return {
        route: "listing_brief",
        href: "/briefs/new?template=listing_readiness",
        vertical,
        advisor_type: null,
      };

    default:
      return { route: "guide", href: "/articles", vertical, advisor_type: advisorType };
  }
}

/** Map an IntentSlug to its primary route — used by callers that need a
 *  default before answers have been collected. */
export function defaultRouteForGoal(slug: IntentSlug): RouteType {
  switch (slug) {
    case "grow":
    case "income":
    case "trade":
    case "automate":
    case "crypto":
    case "compare_platform":
    case "start_investing":
      return "compare";
    case "property":
    case "alt_assets":
    case "royalties":
    case "pre_ipo":
    case "browse":
    case "not_sure":
      return "browse";
    case "home":
    case "super":
    case "help":
    case "financial_advice":
    case "tax_help":
    case "mortgage_help":
    case "legal_help":
    case "buy_property":
    case "expat_investing":
      return "individual";
    case "smsf_property":
    case "opportunity_assessment":
    case "business_acquisition":
    case "commercial_property":
    case "foreign_investor":
      return "expert_team";
    case "second_opinion":
      return "second_opinion";
    case "listing_owner":
    case "listing_readiness":
      return "listing_brief";
  }
}
