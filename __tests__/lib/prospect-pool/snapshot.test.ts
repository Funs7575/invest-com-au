import { describe, it, expect } from "vitest";

import {
  buildSnapshot,
  scrubSnapshot,
  SnapshotPiiError,
  describeSnapshot,
} from "@/lib/prospect-pool/snapshot";
import type { InvestorProfile } from "@/lib/investor-profiles";
import type { QuizHistoryRow } from "@/lib/quiz-history";

function profile(overrides: Partial<InvestorProfile> = {}): InvestorProfile {
  return {
    authUserId: "user-123",
    displayName: "Jane Investor",
    isFhb: false,
    isPreRetiree: false,
    isBusinessOwner: false,
    isCrossBorder: false,
    isHnw: false,
    intentCountrySnapshot: null,
    budgetBand: "medium",
    experienceLevel: "intermediate",
    primaryVertical: "property",
    meta: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function quiz(answers: Record<string, unknown>): QuizHistoryRow {
  return {
    id: 1,
    user_id: "user-123",
    session_id: null,
    answers,
    inferred_vertical: "property",
    top_match_slug: null,
    completed_at: "2026-01-01T00:00:00Z",
    resumed_from: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("buildSnapshot — anonymisation", () => {
  it("builds a snapshot from profile + quiz with only non-identifying fields", () => {
    const snap = buildSnapshot({
      profile: profile({ isCrossBorder: true }),
      latestQuiz: quiz({
        raw: { goal: "super", amount: "large", state: "VIC", timeline: "asap" },
        structured: { advisor_type: "smsf-accountant", state: "NSW", amount: "large" },
      }),
      stateHint: "NSW",
    });

    expect(snap.advisorType).toBe("smsf-accountant");
    expect(snap.advisorTypeLabel).toBe("SMSF Accountant");
    expect(snap.state).toBe("NSW");
    expect(snap.budgetBand).toBe("medium"); // profile is canonical over quiz
    expect(snap.crossBorder).toBe(true);
    expect(snap.experience).toBe("intermediate");
    expect(typeof snap.builtAt).toBe("string");
  });

  it("NEVER serialises any PII field, even with PII present in inputs", () => {
    const snap = buildSnapshot({
      profile: profile({ displayName: "Jane SECRET Investor" }),
      latestQuiz: quiz({
        raw: {
          goal: "home",
          email: "jane@example.com",
          firstName: "Jane",
          phone: "0400000000",
          postcode: "2000",
          suburb: "Bondi",
          address: "1 Beach Rd",
        },
        structured: { advisor_type: "mortgage-broker", state: "NSW" },
      }),
      stateHint: "NSW",
    });

    const serialised = JSON.stringify(snap).toLowerCase();
    for (const banned of [
      "jane",
      "secret",
      "example.com",
      "0400000000",
      "2000",
      "bondi",
      "beach rd",
    ]) {
      expect(serialised).not.toContain(banned);
    }
  });

  it("coerces a postcode/suburb stateHint down to null (state codes only)", () => {
    const snap = buildSnapshot({
      profile: profile({ budgetBand: null }),
      latestQuiz: quiz({ raw: { goal: "grow" }, structured: {} }),
      stateHint: "2000 Sydney NSW Australia", // not a clean state code
    });
    expect(snap.state).toBeNull();
  });

  it("accepts a clean state code from any source and uppercases it", () => {
    const snap = buildSnapshot({
      profile: profile(),
      latestQuiz: quiz({ raw: {}, structured: { state: "qld" } }),
      stateHint: null,
    });
    expect(snap.state).toBe("QLD");
  });

  it("derives a goal from quiz token, falling back to life-event flags", () => {
    expect(
      buildSnapshot({
        profile: profile(),
        latestQuiz: quiz({ raw: { goal: "home" }, structured: {} }),
        stateHint: null,
      }).goal,
    ).toBe("Buying a first home");

    expect(
      buildSnapshot({
        profile: profile({ isPreRetiree: true }),
        latestQuiz: null,
        stateHint: null,
      }).goal,
    ).toBe("Planning for retirement");
  });

  it("normalises a timeline_ prefixed answer", () => {
    const snap = buildSnapshot({
      profile: profile(),
      latestQuiz: quiz({ raw: {}, structured: { timeline: "timeline_weeks" } }),
      stateHint: null,
    });
    expect(snap.timeline).toBe("weeks");
  });

  it("handles a null profile and null quiz without throwing", () => {
    const snap = buildSnapshot({ profile: null, latestQuiz: null, stateHint: null });
    expect(snap.advisorType).toBeNull();
    expect(snap.state).toBeNull();
    expect(snap.budgetBand).toBeNull();
    expect(snap.crossBorder).toBe(false);
  });
});

describe("scrubSnapshot — PII assertion", () => {
  it("passes a clean snapshot through unchanged", () => {
    const snap = buildSnapshot({
      profile: profile(),
      latestQuiz: quiz({ raw: { goal: "grow" }, structured: { advisor_type: "tax-agent", state: "NSW" } }),
      stateHint: "NSW",
    });
    expect(scrubSnapshot(snap)).toBe(snap);
  });

  it("throws SnapshotPiiError when a banned key is injected at any depth", () => {
    const dirty = {
      advisorType: "tax-agent",
      advisorTypeLabel: "Tax Agent",
      goal: "Growing wealth",
      state: "NSW",
      budgetBand: null,
      timeline: null,
      experience: null,
      crossBorder: false,
      vertical: null,
      builtAt: "2026-01-01T00:00:00Z",
      // injected PII (simulating an upstream regression)
      email: "leak@example.com",
    } as never;
    expect(() => scrubSnapshot(dirty)).toThrow(SnapshotPiiError);
  });

  it("throws when a state field carries a non-state value", () => {
    const dirty = {
      advisorType: null,
      advisorTypeLabel: null,
      goal: null,
      state: "Bondi Beach 2026", // not a state code
      budgetBand: null,
      timeline: null,
      experience: null,
      crossBorder: false,
      vertical: null,
      builtAt: "2026-01-01T00:00:00Z",
    } as never;
    expect(() => scrubSnapshot(dirty)).toThrow(SnapshotPiiError);
  });
});

describe("describeSnapshot", () => {
  it("produces a PII-free one-liner", () => {
    const snap = buildSnapshot({
      profile: profile(),
      latestQuiz: quiz({ raw: { goal: "super" }, structured: { advisor_type: "smsf-accountant", state: "NSW" } }),
      stateHint: "NSW",
    });
    const desc = describeSnapshot(snap);
    expect(desc).toContain("SMSF Accountant");
    expect(desc).toContain("NSW");
    expect(desc.toLowerCase()).not.toContain("jane");
  });
});
