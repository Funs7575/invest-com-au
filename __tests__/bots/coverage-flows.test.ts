import { describe, it, expect } from "vitest";
import { COVERAGE_FLOW_PERSONAS, MOBILE_VIEWPORT } from "../../bots/flows/registry";
import {
  COUNTRY_MODE_CASES,
  COUNTRY_MODE_SURFACES,
  INTENT_COUNTRY_COOKIE,
} from "../../bots/flows/country-mode";
import { localeChecks } from "../../bots/flows/i18n-locale";
import { parseFormatted, CALCULATOR_SMOKE_ROUTES } from "../../bots/flows/calculator-correctness";
import { GATED_ROUTES } from "../../bots/flows/auth-edge";
import { CONTENT_SECTIONS, SAMPLE_PER_SECTION } from "../../bots/flows/academy-citability";
import { DARK_MODE_ROUTES } from "../../bots/flows/dark-mode";
import { LOCALES, BCP47_TAG } from "../../lib/i18n/locales";
import type { Flow } from "../../bots/flows/types";

describe("COVERAGE_FLOW_PERSONAS registry", () => {
  it("registers all coverage flows", () => {
    // 10 original + 8 advisor-suite flows added in this PR. The uniqueness
    // check below guards against accidental dupes inflating this count.
    expect(COVERAGE_FLOW_PERSONAS.length).toBe(18);
  });

  it("every persona has a unique name, a description, and a flow", () => {
    const names = COVERAGE_FLOW_PERSONAS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const p of COVERAGE_FLOW_PERSONAS) {
      expect(p.name, JSON.stringify(p)).toBeTruthy();
      expect(p.description, p.name).toBeTruthy();
      expect(p.flow, p.name).toBeTruthy();
      expect(p.flow.name, p.name).toBeTruthy();
      expect(p.flow.steps.length, p.name).toBeGreaterThan(0);
    }
  });

  it("every flow's step names are unique within the flow", () => {
    for (const p of COVERAGE_FLOW_PERSONAS) {
      const stepNames = p.flow.steps.map((s) => s.name);
      expect(new Set(stepNames).size, `${p.name} has duplicate step names`).toBe(stepNames.length);
    }
  });

  it("the mobile persona drives a phone viewport", () => {
    const mobile = COVERAGE_FLOW_PERSONAS.find((p) => p.name === "mobile-nav");
    expect(mobile?.viewport).toEqual(MOBILE_VIEWPORT);
    expect(MOBILE_VIEWPORT.width).toBeLessThan(500);
  });

  it("the dark-mode persona forces the dark palette", () => {
    const dark = COVERAGE_FLOW_PERSONAS.find((p) => p.name === "dark-mode");
    expect(dark?.colorScheme).toBe("dark");
    expect(dark?.seedLocalStorage).toMatchObject({ theme: "dark" });
  });

  it("only mobile/dark personas carry context overrides", () => {
    for (const p of COVERAGE_FLOW_PERSONAS) {
      if (p.name === "mobile-nav") continue;
      if (p.name === "dark-mode") continue;
      expect(p.viewport, p.name).toBeUndefined();
      expect(p.colorScheme, p.name).toBeUndefined();
      expect(p.seedLocalStorage, p.name).toBeUndefined();
    }
  });
});

describe("country-mode flow data", () => {
  it("uses the canonical intent cookie name", () => {
    expect(INTENT_COUNTRY_COOKIE).toBe("iv_intent_country");
  });

  it("sweeps the directory surfaces with a non-empty country set", () => {
    expect(COUNTRY_MODE_SURFACES.length).toBeGreaterThan(0);
    expect(COUNTRY_MODE_CASES.length).toBeGreaterThan(0);
    for (const c of COUNTRY_MODE_CASES) {
      expect(c.code).toBeTruthy();
      expect(c.expectFragment).toBeTruthy();
      expect(c.name).toBeTruthy();
    }
  });

  it("covers at least one low-friction (nz) and high-friction country", () => {
    const codes = COUNTRY_MODE_CASES.map((c) => c.code);
    expect(codes).toContain("nz");
    expect(codes.some((c) => c !== "nz")).toBe(true);
  });
});

describe("i18n localeChecks()", () => {
  const checks = localeChecks();

  it("produces a check per known localised path", () => {
    expect(checks.length).toBeGreaterThan(0);
  });

  it("never emits an English (default-locale) route", () => {
    for (const c of checks) {
      expect(c.locale).not.toBe("en");
      expect(LOCALES).toContain(c.locale);
    }
  });

  it("localised paths carry the locale prefix and the correct BCP-47 lang", () => {
    for (const c of checks) {
      expect(c.path.startsWith(`/${c.locale}`), c.path).toBe(true);
      expect(c.expectLang).toBe(BCP47_TAG[c.locale]);
    }
  });

  it("marks the Arabic locale as RTL and others as LTR", () => {
    for (const c of checks) {
      expect(c.expectDir).toBe(c.locale === "ar" ? "rtl" : "ltr");
    }
  });
});

describe("calculator parseFormatted()", () => {
  it("parses locale-formatted money strings", () => {
    expect(parseFormatted("12,345.00")).toBe(12345);
    expect(parseFormatted("$1,000")).toBe(1000);
    expect(parseFormatted("0.00")).toBe(0);
  });

  it("returns NaN for non-numeric text", () => {
    expect(Number.isNaN(parseFormatted("—"))).toBe(true);
    expect(Number.isNaN(parseFormatted(""))).toBe(true);
  });

  it("smoke routes are absolute paths", () => {
    for (const r of CALCULATOR_SMOKE_ROUTES) expect(r.startsWith("/")).toBe(true);
  });
});

describe("auth-edge gated routes", () => {
  it("each gated route names a login target and a return param", () => {
    expect(GATED_ROUTES.length).toBeGreaterThan(0);
    for (const r of GATED_ROUTES) {
      expect(r.path.startsWith("/")).toBe(true);
      expect(r.loginContains).toBeTruthy();
      expect(r.returnParam).toBeTruthy();
    }
  });

  it("covers both the /account (next=) and /admin (redirect=) gates", () => {
    expect(GATED_ROUTES.some((r) => r.path === "/account" && r.returnParam === "next")).toBe(true);
    expect(GATED_ROUTES.some((r) => r.path === "/admin" && r.returnParam === "redirect")).toBe(true);
  });
});

describe("academy citability crawl", () => {
  it("samples a bounded number of pages per content section", () => {
    expect(CONTENT_SECTIONS.length).toBeGreaterThan(0);
    expect(SAMPLE_PER_SECTION).toBeGreaterThan(0);
    expect(SAMPLE_PER_SECTION).toBeLessThanOrEqual(20);
    for (const s of CONTENT_SECTIONS) {
      expect(s.childPrefix.startsWith(s.index)).toBe(true);
    }
  });
});

describe("dark-mode routes", () => {
  it("re-audits a non-empty set of core surfaces", () => {
    expect(DARK_MODE_ROUTES.length).toBeGreaterThan(0);
    for (const r of DARK_MODE_ROUTES) expect(r.startsWith("/")).toBe(true);
  });
});

describe("flow contract", () => {
  it("every coverage flow satisfies the Flow shape", () => {
    for (const p of COVERAGE_FLOW_PERSONAS) {
      const flow: Flow = p.flow;
      expect(typeof flow.name).toBe("string");
      expect(typeof flow.description).toBe("string");
      for (const step of flow.steps) {
        expect(typeof step.name).toBe("string");
        expect(typeof step.run).toBe("function");
      }
    }
  });
});
