/**
 * Unit tests for lib/homepage-personalisation.ts
 *
 * Covers: classifyVisitor (all three buckets + edge cases) and
 * buildWelcomeGreeting (per bucket + with/without displayName).
 * Pure functions — no mocks needed.
 */

import { describe, it, expect } from "vitest";
import {
  classifyVisitor,
  buildWelcomeGreeting,
  type PersonalisationSignals,
  type VisitorKind,
} from "@/lib/homepage-personalisation";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function signals(
  overrides: Partial<PersonalisationSignals> = {},
): PersonalisationSignals {
  return {
    isSignedIn: false,
    quizCompleted: false,
    hasIntentCountry: false,
    displayName: null,
    ...overrides,
  };
}

// ── classifyVisitor ───────────────────────────────────────────────────────────

describe("classifyVisitor", () => {
  describe("anonymous", () => {
    it("returns 'anonymous' when no signals are present", () => {
      expect(classifyVisitor(signals())).toBe("anonymous");
    });

    it("returns 'anonymous' when quiz started but not completed and no country", () => {
      expect(
        classifyVisitor(signals({ quizCompleted: false, hasIntentCountry: false })),
      ).toBe("anonymous");
    });
  });

  describe("returning", () => {
    it("returns 'returning' when quiz is completed (no auth)", () => {
      expect(
        classifyVisitor(signals({ quizCompleted: true })),
      ).toBe("returning");
    });

    it("returns 'returning' when intent country is set (no auth)", () => {
      expect(
        classifyVisitor(signals({ hasIntentCountry: true })),
      ).toBe("returning");
    });

    it("returns 'returning' when both quiz and country are set (no auth)", () => {
      expect(
        classifyVisitor(signals({ quizCompleted: true, hasIntentCountry: true })),
      ).toBe("returning");
    });
  });

  describe("signed-in", () => {
    it("returns 'signed-in' when user is authenticated", () => {
      expect(
        classifyVisitor(signals({ isSignedIn: true })),
      ).toBe("signed-in");
    });

    it("returns 'signed-in' even when quiz and country are absent", () => {
      expect(
        classifyVisitor(
          signals({ isSignedIn: true, quizCompleted: false, hasIntentCountry: false }),
        ),
      ).toBe("signed-in");
    });

    it("signed-in takes priority over returning signals", () => {
      // Auth session + quiz + country → still "signed-in"
      const result = classifyVisitor(
        signals({ isSignedIn: true, quizCompleted: true, hasIntentCountry: true }),
      );
      expect(result).toBe("signed-in");
    });
  });
});

// ── buildWelcomeGreeting ──────────────────────────────────────────────────────

describe("buildWelcomeGreeting", () => {
  it("returns null for anonymous visitors", () => {
    expect(buildWelcomeGreeting("anonymous", null)).toBeNull();
    expect(buildWelcomeGreeting("anonymous", "Alice")).toBeNull();
  });

  it("returns generic greeting for returning visitors (no name)", () => {
    expect(buildWelcomeGreeting("returning", null)).toBe("Welcome back");
  });

  it("returns generic greeting for returning visitors even when name is supplied (no auth = no trust)", () => {
    // The returning bucket has no auth session; we don't have a verified name
    expect(buildWelcomeGreeting("returning", "Alice")).toBe("Welcome back");
  });

  it("returns generic greeting for signed-in user without a display name", () => {
    expect(buildWelcomeGreeting("signed-in", null)).toBe("Welcome back");
  });

  it("uses the first name only for signed-in users", () => {
    expect(buildWelcomeGreeting("signed-in", "Alice Smith")).toBe("Welcome back, Alice");
  });

  it("handles single-word display names", () => {
    expect(buildWelcomeGreeting("signed-in", "Alice")).toBe("Welcome back, Alice");
  });

  it("handles extra whitespace in display name", () => {
    expect(buildWelcomeGreeting("signed-in", "  Alice  ")).toBe("Welcome back, Alice");
  });

  it("handles empty-string display name as absent", () => {
    expect(buildWelcomeGreeting("signed-in", "")).toBe("Welcome back");
  });
});

// ── Integration: round-trip ───────────────────────────────────────────────────

describe("classifyVisitor + buildWelcomeGreeting round-trip", () => {
  it("anonymous user always gets null greeting", () => {
    const kind: VisitorKind = classifyVisitor(signals());
    expect(buildWelcomeGreeting(kind, "Finn")).toBeNull();
  });

  it("returning user gets generic welcome back", () => {
    const kind: VisitorKind = classifyVisitor(
      signals({ quizCompleted: true }),
    );
    expect(buildWelcomeGreeting(kind, null)).toBe("Welcome back");
  });

  it("signed-in user with a name gets personalised greeting", () => {
    const kind: VisitorKind = classifyVisitor(signals({ isSignedIn: true }));
    expect(buildWelcomeGreeting(kind, "Finn Dunn")).toBe("Welcome back, Finn");
  });
});
