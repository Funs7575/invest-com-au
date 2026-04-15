import { describe, it, expect } from "vitest";
import {
  scoreLead,
  type LeadScoringInput,
} from "@/lib/advisor-lead-scoring";

describe("scoreLead — contact completeness", () => {
  it("cold for a bare email-only lead with no other signals", () => {
    const r = scoreLead({ email: "a@example.com" });
    expect(r.band).toBe("cold");
    expect(r.signals.map((s) => s.code)).toContain("contact_email");
  });

  it("awards the complete-contact bonus when all three are present", () => {
    const r = scoreLead({
      email: "a@example.com",
      phone: "0412345678",
      name: "Alice",
    });
    expect(r.signals.map((s) => s.code)).toContain("contact_complete_bonus");
  });

  it("no complete-contact bonus when only two of three are present", () => {
    const r = scoreLead({ email: "a@example.com", name: "Alice" });
    expect(r.signals.map((s) => s.code)).not.toContain(
      "contact_complete_bonus",
    );
  });
});

describe("scoreLead — quiz depth", () => {
  it("quiz_deep fires at 4+ answers", () => {
    const r = scoreLead({ email: "a@x.com", quizAnswerCount: 4 });
    expect(r.signals.map((s) => s.code)).toContain("quiz_deep");
  });

  it("quiz_shallow fires at 1-3", () => {
    const r = scoreLead({ email: "a@x.com", quizAnswerCount: 2 });
    expect(r.signals.map((s) => s.code)).toContain("quiz_shallow");
  });

  it("no quiz signal at 0 answers", () => {
    const r = scoreLead({ email: "a@x.com", quizAnswerCount: 0 });
    const codes = r.signals.map((s) => s.code);
    expect(codes).not.toContain("quiz_deep");
    expect(codes).not.toContain("quiz_shallow");
  });
});

describe("scoreLead — budget tiers", () => {
  it("$500k+ scores budget_high", () => {
    const r = scoreLead({
      email: "a@x.com",
      declaredBudgetAud: 500_000,
    });
    expect(r.signals.map((s) => s.code)).toContain("budget_high");
  });

  it("$250k scores budget_mid", () => {
    const r = scoreLead({
      email: "a@x.com",
      declaredBudgetAud: 250_000,
    });
    expect(r.signals.map((s) => s.code)).toContain("budget_mid");
  });

  it("$50k scores budget_low", () => {
    const r = scoreLead({
      email: "a@x.com",
      declaredBudgetAud: 50_000,
    });
    expect(r.signals.map((s) => s.code)).toContain("budget_low");
  });

  it("budget below $10k is untiered", () => {
    const r = scoreLead({
      email: "a@x.com",
      declaredBudgetAud: 5_000,
    });
    const codes = r.signals.map((s) => s.code);
    expect(codes).not.toContain("budget_high");
    expect(codes).not.toContain("budget_mid");
    expect(codes).not.toContain("budget_low");
  });
});

describe("scoreLead — band boundaries", () => {
  it("full-fat SMSF ready-to-engage lead lands in 'hot'", () => {
    const r = scoreLead({
      email: "smsf@example.com",
      phone: "0412345678",
      name: "Taylor",
      message:
        "Looking for an SMSF-specialist advisor, $750k fund, want to discuss international ETF allocation.",
      quizAnswerCount: 6,
      declaredBudgetAud: 750_000,
      intent: "ready_to_engage",
      sourcePage: "/find-advisor",
      utmMedium: "organic",
    });
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.band).toBe("hot");
  });

  it("thin info-only lead lands in 'cold'", () => {
    const r = scoreLead({
      email: "x@example.com",
      intent: "info",
      sourcePage: "/",
      utmMedium: "paid",
    });
    expect(r.score).toBeLessThan(40);
    expect(r.band).toBe("cold");
  });

  it("mid-profile lead with some signals lands in 'warm'", () => {
    const r = scoreLead({
      email: "x@example.com",
      phone: "0412345678",
      name: "Jamie",
      quizAnswerCount: 2,
      declaredBudgetAud: 75_000,
      intent: "comparison",
      sourcePage: "/quiz",
      utmMedium: "organic",
    });
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.score).toBeLessThan(70);
    expect(r.band).toBe("warm");
  });
});

describe("scoreLead — penalties", () => {
  it("disposable email heavy penalty", () => {
    const base: LeadScoringInput = {
      email: "a@example.com",
      phone: "0412345678",
      name: "Alice",
      quizAnswerCount: 4,
      declaredBudgetAud: 250_000,
      intent: "ready_to_engage",
      sourcePage: "/find-advisor",
      utmMedium: "organic",
    };
    const clean = scoreLead(base);
    const dirty = scoreLead({ ...base, isDisposableEmail: true });
    expect(dirty.score).toBeLessThan(clean.score);
    expect(dirty.signals.map((s) => s.code)).toContain(
      "disposable_email_penalty",
    );
  });

  it("repeat email penalty", () => {
    const base: LeadScoringInput = { email: "a@x.com", phone: "0412345678", name: "A" };
    const clean = scoreLead(base);
    const repeat = scoreLead({ ...base, isRepeatLeadEmail: true });
    expect(repeat.score).toBeLessThan(clean.score);
  });
});

describe("scoreLead — clamping", () => {
  it("clamps at 100 even with maxed signals", () => {
    const r = scoreLead({
      email: "a@x.com",
      phone: "0412345678",
      name: "A",
      message: "A".repeat(200),
      quizAnswerCount: 20,
      declaredBudgetAud: 10_000_000,
      intent: "ready_to_engage",
      sourcePage: "/find-advisor",
      utmMedium: "direct",
    });
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("clamps at 0 even with all penalties", () => {
    const r = scoreLead({
      email: "junk@temp.com",
      isDisposableEmail: true,
      isRepeatLeadEmail: true,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe("scoreLead — determinism", () => {
  it("same input, same output", () => {
    const i: LeadScoringInput = {
      email: "a@x.com",
      phone: "0412",
      quizAnswerCount: 3,
      declaredBudgetAud: 60_000,
    };
    expect(scoreLead(i)).toEqual(scoreLead(i));
  });

  it("signal contributions sum to the raw positive score", () => {
    const r = scoreLead({
      email: "a@x.com",
      phone: "0412345678",
      name: "Alice",
      declaredBudgetAud: 500_000,
      intent: "ready_to_engage",
    });
    const positive = r.signals
      .filter((s) => s.contribution > 0)
      .reduce((acc, s) => acc + s.contribution, 0);
    const negative = r.signals
      .filter((s) => s.contribution < 0)
      .reduce((acc, s) => acc + s.contribution, 0);
    const rawExpected = Math.max(0, Math.min(100, positive + negative));
    expect(r.score).toBe(rawExpected);
  });
});
