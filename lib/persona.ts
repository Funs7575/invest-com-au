// Pure investor persona derivation — no I/O.
// Maps investor_profiles flags (or quiz answers) to one of five archetypes.
// Framed as factual profiling of the user's own stated preferences — compliance-safe.

export type PersonaType =
  | "Accumulator"
  | "FIRE-Chaser"
  | "Wealth-Protector"
  | "Cautious-Builder"
  | "SMSF-Architect";

export interface PersonaInput {
  isFhb?: boolean;
  isPreRetiree?: boolean;
  isHnw?: boolean;
  experienceLevel?: "beginner" | "intermediate" | "pro" | null;
  budgetBand?: "small" | "medium" | "large" | "whale" | null;
  primaryVertical?: string | null;
}

export interface PersonaResult {
  persona: PersonaType;
  slug: string;
  emoji: string;
  tagline: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}

const PERSONA_CONFIG: Record<PersonaType, Omit<PersonaResult, "persona">> = {
  "Wealth-Protector": {
    slug: "wealth-protector",
    emoji: "🛡️",
    tagline: "Capital preservation first — protecting and growing lasting wealth.",
    description:
      "You're focused on protecting what you've built while generating steady returns. Diversification, blue-chip holdings, and defensive assets are your core tools.",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  "SMSF-Architect": {
    slug: "smsf-architect",
    emoji: "🏛️",
    tagline: "Self-directed super with full control over your retirement structure.",
    description:
      "You want direct ownership of your retirement assets — property, shares, and alternatives — with tax-efficient compounding inside your own fund.",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  "FIRE-Chaser": {
    slug: "fire-chaser",
    emoji: "🔥",
    tagline: "Aggressive saving and compounding toward financial independence.",
    description:
      "You're optimising every dollar for early financial freedom. High savings rate, low-cost index funds, and ruthless cost efficiency define your strategy.",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  "Cautious-Builder": {
    slug: "cautious-builder",
    emoji: "🌱",
    tagline: "Building a solid foundation — steady steps, manageable risk.",
    description:
      "You're getting started with investing and want to grow with confidence. Low-cost, diversified options that match your current life stage are the priority.",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  Accumulator: {
    slug: "accumulator",
    emoji: "📈",
    tagline: "Consistent investing across the market cycle — time in beats timing.",
    description:
      "You believe in the power of regular, diversified investing. A steady DCA approach across ASX and global markets, kept cheap and low-maintenance.",
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#a5f3fc",
  },
};

export function computePersona(input: PersonaInput): PersonaResult {
  const type = derivePersonaType(input);
  return { persona: type, ...PERSONA_CONFIG[type] };
}

/** Direct lookup when the PersonaType is already known (e.g. static pages). */
export function personaFromType(type: PersonaType): PersonaResult {
  return { persona: type, ...PERSONA_CONFIG[type] };
}

/** Map quiz answer arrays to PersonaInput for client-side persona derivation. */
export function personaInputFromQuizAnswers(
  rawAnswers: string[],
  unified: { amount?: string; experience?: string; goal?: string },
): PersonaInput {
  return {
    isFhb: rawAnswers.includes("home"),
    experienceLevel: (unified.experience as PersonaInput["experienceLevel"]) ?? null,
    budgetBand: (unified.amount as PersonaInput["budgetBand"]) ?? null,
    primaryVertical: rawAnswers.includes("smsf")
      ? "smsf"
      : unified.goal === "super"
        ? "super"
        : null,
  };
}

// Priority order: HNW/pre-retiree → SMSF → FIRE → Cautious → Accumulator
function derivePersonaType({
  isFhb,
  isPreRetiree,
  isHnw,
  experienceLevel,
  budgetBand,
  primaryVertical,
}: PersonaInput): PersonaType {
  if (isHnw || isPreRetiree) return "Wealth-Protector";
  if (primaryVertical === "super" || primaryVertical === "smsf") return "SMSF-Architect";
  if (budgetBand === "whale" && experienceLevel !== "beginner") return "FIRE-Chaser";
  if (isFhb || experienceLevel === "beginner") return "Cautious-Builder";
  return "Accumulator";
}
