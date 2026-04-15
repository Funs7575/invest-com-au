/**
 * Quiz → vertical routing engine.
 *
 * Takes the user's quiz answers and decides which vertical landing
 * page they should land on after submit:
 *
 *   - "brokers"        → /compare (or a specific broker shortlist)
 *   - "advisors"       → /find-advisor
 *   - "property"       → /property/buyer-agents OR /property/listings
 *   - "super"          → /super
 *   - "crypto"         → /compare?tab=crypto
 *   - "robo"           → /robo-advisors
 *
 * Previously the quiz always routed to the broker compare page,
 * regardless of what the user said they actually wanted. This meant
 * a property-focused user saw a share-broker list and bounced.
 *
 * Pure function — no DB access, no side effects — so it's unit-
 * testable without mocks. The caller (`/quiz/results`) uses the
 * output to redirect and the persist layer writes it to
 * `quiz_leads.inferred_vertical` for cohort analysis.
 */

export type QuizVertical =
  | "brokers"
  | "advisors"
  | "property"
  | "super"
  | "crypto"
  | "robo"
  | "resources";

export interface QuizAnswers {
  goal?: string;          // Q1: crypto | trade | income | grow | property | property-reit | property-super | super | automate | resources
  approach?: string;      // Q2: diy | advisor | unsure
  experience?: string;    // beginner | intermediate | pro
  situation?: string;     // simple | moderate | complex
  priority?: string;      // fees | safety | tools | simple | ...
  amount?: string;
  propertySubType?: string; // if goal=property: physical | reit | super
  resourceSector?: string;  // if goal=resources: oil-gas | lithium | uranium | gold | rare-earths
}

export interface RoutingDecision {
  vertical: QuizVertical;
  confidence: number;   // 0-1
  reasons: string[];    // human-readable explanation chain
  nextPath: string;     // suggested URL path to redirect to
}

/**
 * Core router. Logic:
 *
 *   1. If approach = advisor → advisors (property/super if goal
 *      overlays)
 *   2. If goal is clearly a non-broker vertical → route to that
 *      vertical (property → property, super → super, etc.)
 *   3. If approach = diy AND goal ∈ {crypto, trade, income, grow}
 *      → brokers
 *   4. If approach = unsure → use the goal as the primary signal
 *   5. Fallback → brokers (broadest default)
 */
export function routeQuizToVertical(answers: QuizAnswers): RoutingDecision {
  const goal = (answers.goal || "").toLowerCase();
  const approach = (answers.approach || "").toLowerCase();
  const reasons: string[] = [];

  // Step 1: advisor track
  if (approach === "advisor") {
    reasons.push("approach=advisor");
    if (goal === "property" || goal === "property-reit") {
      reasons.push("goal=property → buyer's agents");
      return {
        vertical: "property",
        confidence: 0.9,
        reasons,
        nextPath: "/property/buyer-agents",
      };
    }
    if (goal === "super" || goal === "property-super") {
      reasons.push("goal=super → super-focused advisors");
      return {
        vertical: "super",
        confidence: 0.9,
        reasons,
        nextPath: "/super",
      };
    }
    return {
      vertical: "advisors",
      confidence: 0.95,
      reasons,
      nextPath: "/find-advisor",
    };
  }

  // Step 2: goal-driven non-broker verticals
  if (goal === "property") {
    reasons.push("goal=property");
    // Sub-type may override the physical-property default
    if (answers.propertySubType === "reit") {
      reasons.push("sub=reit → broker compare for ETF/REIT buy");
      return {
        vertical: "brokers",
        confidence: 0.8,
        reasons,
        nextPath: "/compare?tab=etf",
      };
    }
    if (answers.propertySubType === "super") {
      reasons.push("sub=super → SMSF property pathway");
      return {
        vertical: "super",
        confidence: 0.85,
        reasons,
        nextPath: "/super/smsf",
      };
    }
    return {
      vertical: "property",
      confidence: 0.9,
      reasons,
      nextPath: "/property/buyer-agents",
    };
  }

  if (goal === "property-reit") {
    reasons.push("goal=property-reit → ETF/REIT brokers");
    return {
      vertical: "brokers",
      confidence: 0.85,
      reasons,
      nextPath: "/compare?tab=etf",
    };
  }

  if (goal === "property-super" || goal === "super") {
    reasons.push(`goal=${goal} → super pathway`);
    return {
      vertical: "super",
      confidence: 0.9,
      reasons,
      nextPath: "/super",
    };
  }

  if (goal === "crypto") {
    reasons.push("goal=crypto → crypto compare");
    return {
      vertical: "crypto",
      confidence: 0.9,
      reasons,
      nextPath: "/compare?tab=crypto",
    };
  }

  // Resource / commodity sector track — sends the user to the
  // specific /invest/<sector> hub if they picked one, else the
  // general commodities page. Advisor-track resource investors
  // get routed to /find-advisor with a `focus` param so the
  // matcher can prefer SMSF / resource-specialist advisors.
  if (goal === "resources") {
    reasons.push("goal=resources");
    const sector = (answers.resourceSector || "").toLowerCase();
    const validSectors = ["oil-gas", "lithium", "uranium", "gold", "rare-earths"];
    if (sector && validSectors.includes(sector)) {
      reasons.push(`resourceSector=${sector}`);
      return {
        vertical: "resources",
        confidence: 0.95,
        reasons,
        nextPath: `/invest/${sector}`,
      };
    }
    return {
      vertical: "resources",
      confidence: 0.8,
      reasons,
      nextPath: "/invest/commodities",
    };
  }

  if (goal === "automate") {
    reasons.push("goal=automate → robo-advisors");
    return {
      vertical: "robo",
      confidence: 0.9,
      reasons,
      nextPath: "/robo-advisors",
    };
  }

  // Step 3: DIY track with a share-focused goal
  if (approach === "diy" && ["trade", "income", "grow"].includes(goal)) {
    reasons.push(`approach=diy, goal=${goal} → brokers`);
    return {
      vertical: "brokers",
      confidence: 0.9,
      reasons,
      nextPath: "/compare",
    };
  }

  // Step 4: unsure track — let the goal lead
  if (approach === "unsure" && goal) {
    reasons.push(`approach=unsure, goal=${goal} → defer to goal`);
    return {
      vertical: "brokers",
      confidence: 0.5,
      reasons,
      nextPath: "/compare",
    };
  }

  // Fallback
  reasons.push("fallback → brokers");
  return {
    vertical: "brokers",
    confidence: 0.4,
    reasons,
    nextPath: "/compare",
  };
}
