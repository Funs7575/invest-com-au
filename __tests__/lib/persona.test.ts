import { describe, it, expect } from "vitest";
import {
  computePersona,
  personaFromType,
  personaInputFromQuizAnswers,
  type PersonaInput,
} from "@/lib/persona";

const base: PersonaInput = {};

describe("computePersona", () => {
  it("defaults to Accumulator for empty input", () => {
    expect(computePersona(base).persona).toBe("Accumulator");
  });

  it("returns Wealth-Protector for HNW", () => {
    expect(computePersona({ ...base, isHnw: true }).persona).toBe("Wealth-Protector");
  });

  it("returns Wealth-Protector for pre-retiree", () => {
    expect(computePersona({ ...base, isPreRetiree: true }).persona).toBe("Wealth-Protector");
  });

  it("HNW takes priority over SMSF vertical", () => {
    expect(computePersona({ ...base, isHnw: true, primaryVertical: "super" }).persona).toBe("Wealth-Protector");
  });

  it("returns SMSF-Architect for super primary vertical", () => {
    expect(computePersona({ ...base, primaryVertical: "super" }).persona).toBe("SMSF-Architect");
  });

  it("returns SMSF-Architect for smsf primary vertical", () => {
    expect(computePersona({ ...base, primaryVertical: "smsf" }).persona).toBe("SMSF-Architect");
  });

  it("SMSF takes priority over FIRE and Cautious", () => {
    expect(computePersona({ ...base, primaryVertical: "super", budgetBand: "whale", experienceLevel: "pro" }).persona).toBe("SMSF-Architect");
  });

  it("returns FIRE-Chaser for whale budget + non-beginner", () => {
    expect(computePersona({ ...base, budgetBand: "whale", experienceLevel: "pro" }).persona).toBe("FIRE-Chaser");
  });

  it("returns FIRE-Chaser for whale budget + intermediate", () => {
    expect(computePersona({ ...base, budgetBand: "whale", experienceLevel: "intermediate" }).persona).toBe("FIRE-Chaser");
  });

  it("does not return FIRE-Chaser for whale + beginner", () => {
    expect(computePersona({ ...base, budgetBand: "whale", experienceLevel: "beginner" }).persona).toBe("Cautious-Builder");
  });

  it("returns Cautious-Builder for FHB", () => {
    expect(computePersona({ ...base, isFhb: true }).persona).toBe("Cautious-Builder");
  });

  it("returns Cautious-Builder for beginner", () => {
    expect(computePersona({ ...base, experienceLevel: "beginner" }).persona).toBe("Cautious-Builder");
  });

  it("returns Cautious-Builder for FHB even with large budget", () => {
    expect(computePersona({ ...base, isFhb: true, budgetBand: "large" }).persona).toBe("Cautious-Builder");
  });

  it("returns Accumulator for intermediate with no special flags", () => {
    expect(computePersona({ ...base, experienceLevel: "intermediate" }).persona).toBe("Accumulator");
  });

  it("returns Accumulator for pro with no special flags", () => {
    expect(computePersona({ ...base, experienceLevel: "pro" }).persona).toBe("Accumulator");
  });

  it("returns Accumulator for large budget + intermediate (below whale threshold)", () => {
    expect(computePersona({ ...base, budgetBand: "large", experienceLevel: "intermediate" }).persona).toBe("Accumulator");
  });

  it("result includes all required fields", () => {
    const r = computePersona({ ...base, isHnw: true });
    expect(r.persona).toBe("Wealth-Protector");
    expect(r.emoji).toBeTruthy();
    expect(r.tagline).toBeTruthy();
    expect(r.description).toBeTruthy();
    expect(r.color).toMatch(/^#/);
    expect(r.bg).toMatch(/^#/);
    expect(r.border).toMatch(/^#/);
    expect(r.slug).toBe("wealth-protector");
  });
});

describe("personaFromType", () => {
  it("returns correct config for Accumulator", () => {
    const r = personaFromType("Accumulator");
    expect(r.persona).toBe("Accumulator");
    expect(r.slug).toBe("accumulator");
    expect(r.emoji).toBeTruthy();
  });

  it("returns correct config for FIRE-Chaser", () => {
    const r = personaFromType("FIRE-Chaser");
    expect(r.slug).toBe("fire-chaser");
  });
});

describe("personaInputFromQuizAnswers", () => {
  it("maps home answer to isFhb", () => {
    const input = personaInputFromQuizAnswers(["home"], {});
    expect(input.isFhb).toBe(true);
  });

  it("does not set isFhb when home absent", () => {
    const input = personaInputFromQuizAnswers(["crypto"], {});
    expect(input.isFhb).toBe(false);
  });

  it("maps experience to experienceLevel", () => {
    const input = personaInputFromQuizAnswers([], { experience: "pro" });
    expect(input.experienceLevel).toBe("pro");
  });

  it("maps whale amount to budgetBand", () => {
    const input = personaInputFromQuizAnswers([], { amount: "whale" });
    expect(input.budgetBand).toBe("whale");
  });

  it("maps super goal to super vertical", () => {
    const input = personaInputFromQuizAnswers([], { goal: "super" });
    expect(input.primaryVertical).toBe("super");
  });

  it("maps smsf raw answer to smsf vertical (overrides goal)", () => {
    const input = personaInputFromQuizAnswers(["smsf"], { goal: "shares" });
    expect(input.primaryVertical).toBe("smsf");
  });

  it("returns null primaryVertical when no super/smsf signals", () => {
    const input = personaInputFromQuizAnswers(["crypto"], { goal: "crypto" });
    expect(input.primaryVertical).toBeNull();
  });

  it("returns null experienceLevel when experience absent", () => {
    const input = personaInputFromQuizAnswers([], {});
    expect(input.experienceLevel).toBeNull();
  });

  it("full pro + whale combo resolves FIRE-Chaser", () => {
    const input = personaInputFromQuizAnswers([], { experience: "pro", amount: "whale" });
    expect(computePersona(input).persona).toBe("FIRE-Chaser");
  });

  it("home + beginner combo resolves Cautious-Builder", () => {
    const input = personaInputFromQuizAnswers(["home"], { experience: "beginner" });
    expect(computePersona(input).persona).toBe("Cautious-Builder");
  });
});
