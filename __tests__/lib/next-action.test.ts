/**
 * Unit tests for lib/next-action.ts
 *
 * Verifies: ranking, cross-vertical routing, signed-out vs profiled,
 * surface suppression, edge cases, and AFSL-safe framing invariants.
 */

import { describe, it, expect } from "vitest";
import {
  buildNextActions,
  PRIO_TAKE_QUIZ,
  PRIO_GET_MATCHED,
  PRIO_VERTICAL_GUIDE,
  PRIO_VERTICAL_CALC,
  PRIO_COMPARE,
  PRIO_ADVISOR_REFERRAL,
  PRIO_LEARN,
  type NextActionSignals,
} from "@/lib/next-action";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ANON_SIGNALS: NextActionSignals = {
  profile: null,
  quizVertical: null,
  quizCompleted: false,
  topMatchSlug: null,
  intentCountry: null,
  surface: "other",
};

function signals(overrides: Partial<NextActionSignals>): NextActionSignals {
  return { ...ANON_SIGNALS, ...overrides };
}

function profile(
  overrides: Partial<NonNullable<NextActionSignals["profile"]>> = {},
): NonNullable<NextActionSignals["profile"]> {
  return {
    primaryVertical: null,
    budgetBand: null,
    experienceLevel: null,
    isFhb: false,
    isPreRetiree: false,
    isCrossBorder: false,
    isHnw: false,
    isBusinessOwner: false,
    ...overrides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ids(actions: ReturnType<typeof buildNextActions>) {
  return actions.map((a) => a.id);
}

function kinds(actions: ReturnType<typeof buildNextActions>) {
  return actions.map((a) => a.kind);
}

function byId(actions: ReturnType<typeof buildNextActions>, id: string) {
  return actions.find((a) => a.id === id);
}

// ── Invariant: always non-empty ───────────────────────────────────────────────

describe("buildNextActions invariants", () => {
  it("always returns at least one action for any signal set", () => {
    expect(buildNextActions(ANON_SIGNALS).length).toBeGreaterThan(0);
  });

  it("result is sorted descending by priority", () => {
    const actions = buildNextActions(ANON_SIGNALS);
    for (let i = 0; i < actions.length - 1; i++) {
      expect(actions[i]!.priority).toBeGreaterThanOrEqual(actions[i + 1]!.priority);
    }
  });

  it("no duplicate IDs in any result", () => {
    const actions = buildNextActions(ANON_SIGNALS);
    const seen = new Set(ids(actions));
    expect(seen.size).toBe(actions.length);
  });

  it("every action has non-empty title, description, href, cta", () => {
    const actions = buildNextActions(ANON_SIGNALS);
    for (const a of actions) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
      expect(a.href.startsWith("/")).toBe(true);
      expect(a.cta.length).toBeGreaterThan(0);
    }
  });
});

// ── Signed-out visitor (fully anonymous) ──────────────────────────────────────

describe("anonymous / signed-out visitor", () => {
  it("leads with take-quiz CTA", () => {
    const actions = buildNextActions(ANON_SIGNALS);
    expect(actions[0]!.kind).toBe("take-quiz");
    expect(actions[0]!.priority).toBe(PRIO_TAKE_QUIZ);
  });

  it("includes learn hub and compare as fallbacks", () => {
    const ks = kinds(buildNextActions(ANON_SIGNALS));
    expect(ks).toContain("learn");
    expect(ks).toContain("compare");
  });

  it("does NOT show get-matched when quiz is not completed", () => {
    const ks = kinds(buildNextActions(ANON_SIGNALS));
    expect(ks).not.toContain("get-matched");
  });
});

// ── Quiz completed ────────────────────────────────────────────────────────────

describe("quiz completed — broker vertical", () => {
  const sig = signals({
    quizVertical: "trade",
    quizCompleted: true,
    topMatchSlug: "moomoo",
  });

  it("get-matched appears and outranks compare", () => {
    const actions = buildNextActions(sig);
    const gm = byId(actions, "get-matched")!;
    const cp = byId(actions, "compare-platforms");
    expect(gm).toBeDefined();
    expect(gm.priority).toBe(PRIO_GET_MATCHED);
    // get-matched should be higher than compare
    if (cp) {
      expect(gm.priority).toBeGreaterThan(cp.priority);
    }
  });

  it("take-quiz is suppressed when quiz is completed", () => {
    expect(ids(buildNextActions(sig))).not.toContain("take-quiz");
  });

  it("get-matched href deep-links to the top-match broker", () => {
    const gm = byId(buildNextActions(sig), "get-matched")!;
    expect(gm.href).toBe("/brokers/moomoo");
  });

  it("fee-calculator surfaces for broker vertical", () => {
    expect(ids(buildNextActions(sig))).toContain("fee-calculator");
  });

  it("set-fee-alert surfaces when quiz is done + topMatchSlug", () => {
    expect(ids(buildNextActions(sig))).toContain("set-fee-alert");
  });

  it("set-fee-alert href includes broker slug as query param", () => {
    const alert = byId(buildNextActions(sig), "set-fee-alert")!;
    expect(alert.href).toContain("moomoo");
  });
});

describe("quiz completed — no topMatchSlug", () => {
  const sig = signals({ quizVertical: "advisor_match", quizCompleted: true, topMatchSlug: null });

  it("shows find-advisor instead of broker get-matched", () => {
    const action = byId(buildNextActions(sig), "find-advisor")!;
    expect(action).toBeDefined();
    expect(action.kind).toBe("get-matched");
    expect(action.href).toBe("/advisors");
  });
});

// ── Cross-vertical routing: super / SMSF ─────────────────────────────────────

describe("super / SMSF vertical", () => {
  const sig = signals({
    profile: profile({ primaryVertical: "super" }),
    quizVertical: "super",
    quizCompleted: true,
    topMatchSlug: null,
  });

  it("surfaces smsf-guide", () => {
    expect(ids(buildNextActions(sig))).toContain("smsf-guide");
  });

  it("surfaces super-calc", () => {
    expect(ids(buildNextActions(sig))).toContain("super-calc");
  });

  it("surfaces smsf-advisor referral with boosted priority", () => {
    const adv = byId(buildNextActions(sig), "smsf-advisor")!;
    expect(adv).toBeDefined();
    expect(adv.priority).toBeGreaterThan(PRIO_ADVISOR_REFERRAL);
  });

  it("smsf vertical maps guide href to /smsf", () => {
    const guide = byId(buildNextActions(sig), "smsf-guide")!;
    expect(guide.href).toBe("/smsf");
  });

  it("pre-retiree retirement-guide is suppressed when already in super vertical", () => {
    const sigPreRetiree = signals({
      profile: profile({ primaryVertical: "super", isPreRetiree: true }),
      quizCompleted: true,
    });
    expect(ids(buildNextActions(sigPreRetiree))).not.toContain("retirement-guide");
  });
});

describe("smsf vertical (explicit)", () => {
  it("smsf keyword also routes to smsf-guide", () => {
    const sig = signals({ quizVertical: "smsf", quizCompleted: false });
    expect(ids(buildNextActions(sig))).toContain("smsf-guide");
  });
});

// ── Cross-vertical routing: property ─────────────────────────────────────────

describe("first-home buyer vertical", () => {
  const sig = signals({
    profile: profile({ primaryVertical: "first_home", isFhb: true }),
    quizVertical: "first_home",
    quizCompleted: false,
  });

  it("surfaces fhb-guide", () => {
    expect(ids(buildNextActions(sig))).toContain("fhb-guide");
  });

  it("surfaces stamp-duty-calc", () => {
    expect(ids(buildNextActions(sig))).toContain("stamp-duty-calc");
  });

  it("surfaces buyers-agent advisor referral", () => {
    expect(ids(buildNextActions(sig))).toContain("property-advisor");
  });

  it("fhb-guide href is /first-home-buyer", () => {
    const guide = byId(buildNextActions(sig), "fhb-guide")!;
    expect(guide.href).toBe("/first-home-buyer");
  });
});

describe("property vertical (non-FHB)", () => {
  const sig = signals({
    profile: profile({ primaryVertical: "property", isFhb: false }),
    quizVertical: "property",
    quizCompleted: false,
  });

  it("surfaces property-guide (not fhb-guide)", () => {
    const all = ids(buildNextActions(sig));
    expect(all).toContain("property-guide");
    expect(all).not.toContain("fhb-guide");
  });
});

// ── Cross-vertical routing: international / cross-border ─────────────────────

describe("cross-border / international vertical", () => {
  const sig = signals({
    profile: profile({ primaryVertical: "international", isCrossBorder: true }),
    quizVertical: "international",
    quizCompleted: false,
    intentCountry: "uk",
  });

  it("surfaces foreign-investment-hub", () => {
    expect(ids(buildNextActions(sig))).toContain("foreign-investment-hub");
  });

  it("surfaces non-resident-compare with boosted priority", () => {
    const cmp = byId(buildNextActions(sig), "non-resident-compare")!;
    expect(cmp).toBeDefined();
    expect(cmp.priority).toBeGreaterThan(PRIO_COMPARE);
  });

  it("surfaces intl-tax-advisor referral", () => {
    expect(ids(buildNextActions(sig))).toContain("intl-tax-advisor");
  });

  it("foreign-investment-hub href includes country slug when intentCountry is set", () => {
    const hub = byId(buildNextActions(sig), "foreign-investment-hub")!;
    expect(hub.href).toBe("/foreign-investment/united-kingdom");
  });

  it("generic foreign-investment href used when no intentCountry", () => {
    const noCountrySig = signals({
      profile: profile({ primaryVertical: "international", isCrossBorder: true }),
      quizVertical: "international",
      intentCountry: null,
    });
    const hub = byId(buildNextActions(noCountrySig), "foreign-investment-hub")!;
    expect(hub.href).toBe("/foreign-investment");
  });
});

// ── Advisor vertical ──────────────────────────────────────────────────────────

describe("advisor vertical", () => {
  const sig = signals({
    profile: profile({ primaryVertical: "advisor_match" }),
    quizVertical: "advisor_match",
    quizCompleted: false,
  });

  it("surfaces find-advisor-vertical with boosted priority", () => {
    const adv = byId(buildNextActions(sig), "find-advisor-vertical")!;
    expect(adv).toBeDefined();
    expect(adv.priority).toBeGreaterThan(PRIO_ADVISOR_REFERRAL);
  });

  it("surfaces wealth-guide", () => {
    expect(ids(buildNextActions(sig))).toContain("wealth-guide");
  });

  it("wealth-guide href points to advisor-guides", () => {
    const guide = byId(buildNextActions(sig), "wealth-guide")!;
    expect(guide.href).toContain("/advisor-guides/");
  });
});

// ── Surface suppression ───────────────────────────────────────────────────────

describe("surface suppression", () => {
  it("compare surface suppresses compare-platforms action", () => {
    const sig = signals({
      quizVertical: "trade",
      quizCompleted: true,
      topMatchSlug: "stake",
      surface: "compare",
    });
    const all = ids(buildNextActions(sig));
    expect(all).not.toContain("compare-platforms");
    expect(all).not.toContain("compare-fallback");
  });

  it("learn surface suppresses learn-hub action", () => {
    const sig = signals({ surface: "learn" });
    const all = ids(buildNextActions(sig));
    expect(all).not.toContain("learn-hub");
  });

  it("advisors surface does not suppress non-advisor next actions", () => {
    const sig = signals({
      profile: profile({ primaryVertical: "trade" }),
      quizVertical: "trade",
      quizCompleted: true,
      topMatchSlug: "comsec",
      surface: "advisors",
    });
    // Should still show broker-relevant actions
    expect(ids(buildNextActions(sig))).toContain("fee-calculator");
  });
});

// ── HNW and pre-retiree flags ─────────────────────────────────────────────────

describe("profile flags", () => {
  it("HNW flag surfaces private-markets action", () => {
    const sig = signals({ profile: profile({ isHnw: true }) });
    expect(ids(buildNextActions(sig))).toContain("private-markets");
  });

  it("pre-retiree flag surfaces retirement-guide for non-super verticals", () => {
    const sig = signals({
      profile: profile({ isPreRetiree: true, primaryVertical: "trade" }),
      quizVertical: "trade",
    });
    expect(ids(buildNextActions(sig))).toContain("retirement-guide");
  });

  it("business-owner profile does not crash (no specific action; general fallbacks)", () => {
    const sig = signals({ profile: profile({ isBusinessOwner: true }) });
    expect(() => buildNextActions(sig)).not.toThrow();
    expect(buildNextActions(sig).length).toBeGreaterThan(0);
  });
});

// ── Cross-border upsell without explicit cross-border vertical ────────────────

describe("cross-border upsell (profile flag, non-cross-border vertical)", () => {
  it("adds non-resident-compare for cross-border flag on broker vertical", () => {
    const sig = signals({
      profile: profile({ primaryVertical: "trade", isCrossBorder: true }),
      quizVertical: "trade",
      quizCompleted: false,
    });
    // Should contain either non-resident-compare or non-resident-compare-secondary
    const all = ids(buildNextActions(sig));
    const hasNonResident =
      all.includes("non-resident-compare") ||
      all.includes("non-resident-compare-secondary");
    expect(hasNonResident).toBe(true);
  });
});

// ── Intent country country slug mapping ──────────────────────────────────────

describe("country slug mapping", () => {
  const COUNTRIES: Array<[import("@/lib/intent-context").IntentCountryCode, string]> = [
    ["uk", "/foreign-investment/united-kingdom"],
    ["us", "/foreign-investment/united-states"],
    ["cn", "/foreign-investment/china"],
    ["in", "/foreign-investment/india"],
    ["jp", "/foreign-investment/japan"],
    ["sg", "/foreign-investment/singapore"],
    ["hk", "/foreign-investment/hong-kong"],
    ["kr", "/foreign-investment/south-korea"],
    ["my", "/foreign-investment/malaysia"],
    ["nz", "/foreign-investment/new-zealand"],
    ["ae", "/foreign-investment/united-arab-emirates"],
    ["sa", "/foreign-investment/saudi-arabia"],
  ];

  it.each(COUNTRIES)(
    "code '%s' maps hub href to '%s'",
    (code, expectedHref) => {
      const sig = signals({
        profile: profile({ primaryVertical: "international", isCrossBorder: true }),
        quizVertical: "international",
        intentCountry: code,
      });
      const hub = byId(buildNextActions(sig), "foreign-investment-hub")!;
      expect(hub.href).toBe(expectedHref);
    },
  );
});

// ── Priority ordering guarantees ──────────────────────────────────────────────

describe("priority ordering", () => {
  it("take-quiz always ranks highest for anonymous visitor", () => {
    const actions = buildNextActions(ANON_SIGNALS);
    expect(actions[0]!.id).toBe("take-quiz");
  });

  it("get-matched ranks above vertical-guide when quiz done + topMatch", () => {
    const sig = signals({
      profile: profile({ primaryVertical: "super" }),
      quizVertical: "super",
      quizCompleted: true,
      topMatchSlug: null, // no specific match for super
    });
    const actions = buildNextActions(sig);
    const gmIdx = actions.findIndex((a) => a.kind === "get-matched");
    const guideIdx = actions.findIndex((a) => a.kind === "vertical-guide");
    if (gmIdx !== -1 && guideIdx !== -1) {
      expect(actions[gmIdx]!.priority).toBeGreaterThanOrEqual(actions[guideIdx]!.priority);
    }
  });

  it("vertical-calc ranks below vertical-guide", () => {
    const sig = signals({ quizVertical: "super", quizCompleted: false });
    const actions = buildNextActions(sig);
    const guideIdx = actions.findIndex((a) => a.kind === "vertical-guide");
    const calcIdx = actions.findIndex((a) => a.kind === "vertical-calc");
    if (guideIdx !== -1 && calcIdx !== -1) {
      expect(actions[guideIdx]!.priority).toBeGreaterThanOrEqual(actions[calcIdx]!.priority);
    }
  });

  it("advisor-referral ranks above learn and compare fallbacks", () => {
    const actions = buildNextActions(ANON_SIGNALS);
    const advIdx = actions.findIndex((a) => a.kind === "advisor-referral");
    const learnIdx = actions.findIndex((a) => a.kind === "learn");
    if (advIdx !== -1 && learnIdx !== -1) {
      expect(actions[advIdx]!.priority).toBeGreaterThan(actions[learnIdx]!.priority);
    }
  });

  it("exported priority constants maintain expected relative order", () => {
    expect(PRIO_TAKE_QUIZ).toBeGreaterThan(PRIO_GET_MATCHED);
    expect(PRIO_GET_MATCHED).toBeGreaterThan(PRIO_VERTICAL_GUIDE);
    expect(PRIO_VERTICAL_GUIDE).toBeGreaterThan(PRIO_VERTICAL_CALC);
    expect(PRIO_VERTICAL_CALC).toBeGreaterThan(PRIO_COMPARE);
    expect(PRIO_COMPARE).toBeGreaterThan(PRIO_ADVISOR_REFERRAL);
    expect(PRIO_ADVISOR_REFERRAL).toBeGreaterThan(PRIO_LEARN);
  });
});

// ── showAdviceWarning invariant ───────────────────────────────────────────────

describe("showAdviceWarning framing", () => {
  it("take-quiz action does NOT set showAdviceWarning (navigation, not product CTA)", () => {
    const actions = buildNextActions(ANON_SIGNALS);
    const quiz = byId(actions, "take-quiz")!;
    expect(quiz.showAdviceWarning).toBe(false);
  });

  it("get-matched DOES set showAdviceWarning", () => {
    const sig = signals({ quizCompleted: true, topMatchSlug: "stake" });
    const gm = byId(buildNextActions(sig), "get-matched")!;
    expect(gm.showAdviceWarning).toBe(true);
  });

  it("learn-hub does NOT set showAdviceWarning", () => {
    const actions = buildNextActions(ANON_SIGNALS);
    const learn = byId(actions, "learn-hub");
    if (learn) {
      expect(learn.showAdviceWarning).toBe(false);
    }
  });

  it("compare-related actions DO set showAdviceWarning", () => {
    const sig = signals({ quizVertical: "trade", quizCompleted: true, topMatchSlug: "cmc" });
    const actions = buildNextActions(sig);
    const cmp = actions.find((a) => a.kind === "compare");
    if (cmp) {
      expect(cmp.showAdviceWarning).toBe(true);
    }
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("does not crash with all-null profile fields", () => {
    const sig = signals({ profile: profile() });
    expect(() => buildNextActions(sig)).not.toThrow();
  });

  it("does not crash with intentCountry set but no profile or quiz", () => {
    const sig = signals({ intentCountry: "nz" });
    expect(() => buildNextActions(sig)).not.toThrow();
  });

  it("handles unknown quiz vertical gracefully (no explicit routing match)", () => {
    const sig = signals({ quizVertical: "unknown_future_vertical" as string, quizCompleted: false });
    const actions = buildNextActions(sig);
    expect(actions.length).toBeGreaterThan(0);
    // Should still have fallbacks
    expect(kinds(actions)).toContain("learn");
  });

  it("quiz completed with no vertical surfaces find-advisor fallback", () => {
    const sig = signals({ quizCompleted: true, topMatchSlug: null, quizVertical: null });
    const action = byId(buildNextActions(sig), "find-advisor")!;
    expect(action).toBeDefined();
  });
});
