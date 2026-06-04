import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  PHASE0_PERSONAS,
  ADVISOR_PERSONAS,
  AI_PERSONAS,
  AUTHED_PERSONAS,
  type Persona,
} from "../../bots/personas";

const ALL_PERSONAS: Persona[] = [
  ...PHASE0_PERSONAS,
  ...ADVISOR_PERSONAS,
  ...AI_PERSONAS,
  ...AUTHED_PERSONAS,
];

const AUTH_DIR = path.resolve(process.cwd(), "e2e/visual/.auth");

describe("ADVISOR_PERSONAS", () => {
  it("is non-empty", () => {
    expect(ADVISOR_PERSONAS.length).toBeGreaterThan(0);
  });

  it("every persona has a name, a description, and routes or a goal", () => {
    for (const persona of ADVISOR_PERSONAS) {
      expect(persona.name).toBeTruthy();
      expect(persona.description).toBeTruthy();
      const hasRoutes = (persona.routes?.length ?? 0) > 0;
      const hasGoal = Boolean(persona.goal);
      expect(hasRoutes || hasGoal).toBe(true);
    }
  });

  it("is anonymous — no storage state (the mirror is a protected target)", () => {
    for (const persona of ADVISOR_PERSONAS) {
      expect(persona.storageStateFile).toBeUndefined();
    }
  });

  it("every route targets the advisor area", () => {
    for (const persona of ADVISOR_PERSONAS) {
      for (const route of persona.routes ?? []) {
        // /advisors, /advisor/<slug>, and /find-advisor are all advisor-area.
        expect(route).toMatch(/^\/(advisors?|find-advisor)/);
      }
    }
  });

  it("covers the directory, specialty hubs, find-advisor, and a profile", () => {
    const routes = ADVISOR_PERSONAS.flatMap((p) => p.routes ?? []);
    expect(routes).toContain("/advisors");
    expect(routes).toContain("/find-advisor");
    expect(routes.some((r) => r.startsWith("/advisor/"))).toBe(true);
    expect(routes).toContain("/advisors/firb-specialists");
    expect(routes).toContain("/advisors/migration-agents");
    expect(routes).toContain("/advisors/international-tax-specialists");
    // A type listing and a type-by-state slice.
    expect(routes.some((r) => /^\/advisors\/[a-z-]+$/.test(r))).toBe(true);
    expect(routes.some((r) => /^\/advisors\/[a-z-]+\/[a-z-]+$/.test(r))).toBe(true);
  });
});

describe("persona registry integrity", () => {
  it("every persona has a non-empty name and description", () => {
    for (const p of ALL_PERSONAS) {
      expect(p.name, JSON.stringify(p)).toBeTruthy();
      expect(p.description, p.name).toBeTruthy();
    }
  });

  it("persona names are unique across all arrays", () => {
    const names = ALL_PERSONAS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every persona declares routes or a goal", () => {
    for (const persona of ALL_PERSONAS) {
      const hasRoutes = (persona.routes?.length ?? 0) > 0;
      const hasGoal = Boolean(persona.goal);
      expect(hasRoutes || hasGoal).toBe(true);
    }
  });

  it("deterministic (anon) personas declare routes", () => {
    for (const p of PHASE0_PERSONAS) {
      expect(p.routes && p.routes.length > 0, p.name).toBe(true);
    }
  });

  it("AI personas declare a goal", () => {
    for (const p of AI_PERSONAS) {
      expect(p.goal, p.name).toBeTruthy();
    }
  });
});

describe("authenticated personas", () => {
  it("ships at least one authenticated persona", () => {
    expect(AUTHED_PERSONAS.length).toBeGreaterThan(0);
  });

  it("includes the authed-investor persona", () => {
    expect(AUTHED_PERSONAS.some((p) => p.name === "authed-investor")).toBe(true);
  });

  it("every authed persona has a storageStateFile", () => {
    for (const p of AUTHED_PERSONAS) {
      expect(p.storageStateFile, p.name).toBeTruthy();
    }
  });

  it("every authed persona has routes and/or a goal to drive", () => {
    for (const p of AUTHED_PERSONAS) {
      const hasWork = (p.routes && p.routes.length > 0) || Boolean(p.goal);
      expect(hasWork, p.name).toBe(true);
    }
  });

  it("storageStateFile paths live under e2e/visual/.auth and are .json", () => {
    for (const p of AUTHED_PERSONAS) {
      const file = p.storageStateFile!;
      expect(path.dirname(path.resolve(file)), p.name).toBe(AUTH_DIR);
      expect(file.endsWith(".json"), p.name).toBe(true);
    }
  });
});
