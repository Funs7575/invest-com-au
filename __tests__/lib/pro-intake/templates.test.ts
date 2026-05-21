import { describe, it, expect } from "vitest";

import {
  INTAKE_TEMPLATES,
  getTemplatesForCategory,
  type IntakeTemplate,
} from "@/lib/pro-intake/templates";

const VALID_KINDS = new Set(["text", "number", "select", "phone", "email"]);

describe("INTAKE_TEMPLATES (static invariants)", () => {
  it("ships a non-empty list", () => {
    expect(INTAKE_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("has unique slugs", () => {
    const slugs = INTAKE_TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every template has a title, blurb, and at least one match key", () => {
    for (const t of INTAKE_TEMPLATES) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.blurb.length).toBeGreaterThan(0);
      expect(t.match.length).toBeGreaterThan(0);
      expect(t.match.every((m) => typeof m === "string" && m.length > 0)).toBe(
        true,
      );
    }
  });

  it("every template has 4-5 questions (per the doc'd pack size)", () => {
    for (const t of INTAKE_TEMPLATES) {
      expect(t.questions.length).toBeGreaterThanOrEqual(4);
      expect(t.questions.length).toBeLessThanOrEqual(5);
    }
  });

  it("every question has a prompt and a valid kind", () => {
    for (const t of INTAKE_TEMPLATES) {
      for (const q of t.questions) {
        expect(q.prompt.length).toBeGreaterThan(0);
        expect(VALID_KINDS.has(q.kind)).toBe(true);
        expect(typeof q.required).toBe("boolean");
      }
    }
  });

  it("select questions carry a non-empty options array; non-select questions carry none", () => {
    for (const t of INTAKE_TEMPLATES) {
      for (const q of t.questions) {
        if (q.kind === "select") {
          expect(Array.isArray(q.options)).toBe(true);
          expect(q.options!.length).toBeGreaterThan(0);
          expect(q.options!.every((o) => typeof o === "string" && o.length > 0)).toBe(
            true,
          );
        } else {
          expect(q.options).toBeUndefined();
        }
      }
    }
  });

  it("does not repeat option labels within a single question", () => {
    for (const t of INTAKE_TEMPLATES) {
      for (const q of t.questions) {
        if (q.options) {
          expect(new Set(q.options).size).toBe(q.options.length);
        }
      }
    }
  });
});

describe("getTemplatesForCategory", () => {
  it("returns all templates when category is null/undefined/empty", () => {
    expect(getTemplatesForCategory(null)).toEqual(INTAKE_TEMPLATES);
    expect(getTemplatesForCategory(undefined)).toEqual(INTAKE_TEMPLATES);
    expect(getTemplatesForCategory("")).toEqual(INTAKE_TEMPLATES);
  });

  it("returns every template even when there is no match (fallback)", () => {
    const out = getTemplatesForCategory("totally-unknown-category");
    expect(out).toEqual(INTAKE_TEMPLATES);
    expect(out.length).toBe(INTAKE_TEMPLATES.length);
  });

  it("surfaces the matching template first, then the rest", () => {
    const out = getTemplatesForCategory("business_acquisition");
    expect(out[0]!.slug).toBe("sme_acquisition_starter");
    // still returns the full set, no duplicates, no drops
    expect(out.length).toBe(INTAKE_TEMPLATES.length);
    expect(new Set(out.map((t) => t.slug)).size).toBe(INTAKE_TEMPLATES.length);
  });

  it("matches case-insensitively", () => {
    const lower = getTemplatesForCategory("smsf_property");
    const upper = getTemplatesForCategory("SMSF_PROPERTY");
    const mixed = getTemplatesForCategory("Smsf_Property");
    expect(lower[0]!.slug).toBe("smsf_property_starter");
    expect(upper[0]!.slug).toBe("smsf_property_starter");
    expect(mixed[0]!.slug).toBe("smsf_property_starter");
  });

  it("matches on any key within a template's match array", () => {
    // smsf_property_starter lists several aliases
    for (const alias of [
      "smsf_property",
      "smsf_strategy",
      "smsf_accounting",
      "smsf_accountant",
    ]) {
      expect(getTemplatesForCategory(alias)[0]!.slug).toBe(
        "smsf_property_starter",
      );
    }
  });

  it("can surface multiple templates first when several share a match", () => {
    // No category matches two templates in current data, but assert the
    // ordering contract holds: matched come before unmatched.
    const out = getTemplatesForCategory("cross_border_tax");
    const matched: IntakeTemplate[] = INTAKE_TEMPLATES.filter((t) =>
      t.match.includes("cross_border_tax"),
    );
    expect(out.slice(0, matched.length).map((t) => t.slug)).toEqual(
      matched.map((t) => t.slug),
    );
  });

  it("does not mutate the source array", () => {
    const before = [...INTAKE_TEMPLATES];
    getTemplatesForCategory("business_acquisition");
    expect(INTAKE_TEMPLATES).toEqual(before);
  });
});
