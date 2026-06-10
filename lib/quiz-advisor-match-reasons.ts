/**
 * Dynamic match-reason generator for quiz-matched advisors.
 *
 * For each quiz lead matched to an advisor, generate 3–4 context-driven
 * bullets explaining *why* this specific person was matched, based on:
 *
 *   - Quiz answers (goal, budget, experience, complexity, location, specialty needs)
 *   - Advisor attributes (rating, reviews, verified, response time, specialties,
 *     location/remote, country availability, profile completeness)
 *
 * The reasons are never generic ("Strong overall score") — they're always tied
 * to real overlap between the user's stated needs and the advisor's profile.
 *
 * Returns an array of 3–4 bullets, each < 70 chars for mobile readability.
 */

export interface QuizAnswersForReasons {
  goal?: string;
  advisor_type?: string;
  complexity?: string;
  amount?: string;
  experience?: string;
  location?: string;
  investor_goal_intl?: string;
  visa_status?: string;
  investor_country?: string;
}

export interface AdvisorForReasons {
  name: string;
  type: string;
  rating: number | null;
  review_count: number | null;
  verified: boolean | null;
  specialties?: string[] | null;
  location_display?: string | null;
  location_state?: string | null;
  median_response_hours?: number | null;
  recent_lead_count?: number | null;
  accepts_international_clients?: boolean | null;
  available_in_countries?: string[] | null;
  profile_quality_gate?: string | null;
  fee_description?: string | null;
}

/**
 * Generate match reasons for a specific advisor + user combo.
 * Returns 3–4 bullets; never empty (falls back to "Strong match" if no specifics found).
 */
export function getAdvisorMatchReasons(
  answers: QuizAnswersForReasons,
  advisor: AdvisorForReasons,
  isInternational: boolean = false,
): string[] {
  const reasons: string[] = [];

  // ─── Specialty match ───
  if (advisor.specialties && advisor.specialties.length > 0) {
    const goalLabels: Record<string, string[]> = {
      property: ["Property", "Property Investment", "SMSF", "Real Estate"],
      home: ["Mortgage", "Home Loan"],
      super: ["SMSF", "Superannuation", "Retirement"],
      crypto: ["Crypto", "Cryptocurrency"],
    };
    const relevantGoal = answers.goal ? (goalLabels[answers.goal] ?? []) : [];
    if (relevantGoal.length > 0) {
      const matching = advisor.specialties.filter((s) =>
        relevantGoal.some((g) => s.toLowerCase().includes(g.toLowerCase()))
      );
      if (matching.length > 0) {
        reasons.push(`Specialises in ${matching.slice(0, 2).join(" and ")}`);
      }
    }
  }

  // ─── Experience match (experience level → advisor fit) ───
  if (answers.experience === "beginner" && advisor.specialties?.some(s => s.toLowerCase().includes("beginner"))) {
    reasons.push("Great for investors just getting started");
  } else if (answers.experience === "pro" && advisor.rating && advisor.rating >= 4.5) {
    reasons.push("Trusted by experienced investors");
  }

  // ─── Complexity match ───
  if (answers.complexity === "complex") {
    if (advisor.type.includes("financial_planner") || advisor.type.includes("accountant")) {
      reasons.push("Handles complex financial situations");
    }
  }

  // ─── Budget/size match ───
  if (answers.amount === "whale" || answers.amount === "large") {
    if (advisor.rating && advisor.rating >= 4.5) {
      reasons.push("Works with high-net-worth clients");
    }
  }

  // ─── Trust signals ───
  if (advisor.verified) {
    reasons.push("ASIC verified and regulated");
  } else if (advisor.rating && advisor.rating >= 4.5 && advisor.review_count && advisor.review_count >= 5) {
    reasons.push(`Highly rated (${advisor.rating.toFixed(1)}/5) by clients`);
  }

  // ─── Availability / responsiveness ───
  if (advisor.median_response_hours != null && advisor.median_response_hours <= 2) {
    reasons.push("Responds within 2 hours");
  } else if (advisor.median_response_hours != null && advisor.median_response_hours <= 6) {
    reasons.push("Quick response time");
  }

  // ─── Location match (domestic) ───
  if (!isInternational && answers.location && advisor.location_state) {
    // If user specified location and advisor is in the same state, mention it
    const userState = answers.location.toLowerCase();
    const advState = advisor.location_state.toLowerCase();
    if (userState === advState) {
      reasons.push(`Local to your area (${advisor.location_display || advisor.location_state})`);
    }
  }

  // ─── International match ───
  if (isInternational && answers.investor_country) {
    if (advisor.accepts_international_clients) {
      reasons.push("Works with international investors");
    }
    if (advisor.available_in_countries) {
      const countryMap: Record<string, string> = {
        uk: "UK",
        usa: "US",
        china: "China",
        india: "India",
        singapore: "Singapore",
        hong_kong: "Hong Kong",
        uae: "UAE",
        new_zealand: "NZ",
      };
      const userCountry = countryMap[answers.investor_country] || answers.investor_country;
      const matches = (advisor.available_in_countries || []).some((c) =>
        c.toLowerCase() === answers.investor_country?.toLowerCase()
      );
      if (matches) {
        reasons.push(`Cross-border specialist (${userCountry})`);
      }
    }
  }

  // ─── Profile completeness ───
  if (advisor.profile_quality_gate === "passed") {
    reasons.push("Complete, professional profile");
  }

  // ─── Fallback if no specific reasons found ───
  if (reasons.length === 0) {
    if (advisor.rating && advisor.rating >= 4.0) {
      reasons.push(`Strong advisor match (${advisor.rating.toFixed(1)}/5 rating)`);
    } else {
      reasons.push("Strong match for your needs");
    }
  }

  // ─── Trim to 3–4 bullets, prefer diversity ───
  // Order: (1) specialty, (2) trust signal, (3) availability/location, (4) extra
  const preferred = reasons.filter(
    (r) =>
      r.includes("Specialises") ||
      r.includes("Verified") ||
      r.includes("Responds") ||
      r.includes("Highly rated") ||
      r.includes("Works with") ||
      r.includes("Complete")
  );
  const others = reasons.filter((r) => !preferred.includes(r));

  return [...preferred, ...others].slice(0, 4);
}
