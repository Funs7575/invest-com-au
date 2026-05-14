import { describe, it, expect } from "vitest";
import {
  BRIEF_TEMPLATES,
  BRIEF_TEMPLATE_LABELS,
  BRIEF_TEMPLATE_BLURBS,
  BRIEF_TEMPLATE_FIELDS,
  BRIEF_TEMPLATE_SCHEMAS,
  getTemplateSchema,
  isBriefTemplate,
} from "@/lib/briefs/templates";

describe("brief template registry", () => {
  it("has labels + blurbs + field hints + schemas for every template", () => {
    for (const t of BRIEF_TEMPLATES) {
      expect(BRIEF_TEMPLATE_LABELS[t]).toBeTruthy();
      expect(BRIEF_TEMPLATE_BLURBS[t]).toBeTruthy();
      expect(BRIEF_TEMPLATE_FIELDS[t]).toBeDefined();
      expect(BRIEF_TEMPLATE_SCHEMAS[t]).toBeDefined();
    }
  });

  it("isBriefTemplate gatekeeps", () => {
    expect(isBriefTemplate("smsf_property")).toBe(true);
    expect(isBriefTemplate("not_a_real_template")).toBe(false);
    expect(isBriefTemplate(123)).toBe(false);
  });

  it("smsf_property schema requires structured fields", () => {
    const schema = getTemplateSchema("smsf_property");
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("smsf_property schema accepts a complete payload", () => {
    const schema = getTemplateSchema("smsf_property");
    const result = schema.safeParse({
      smsf_status: "no_smsf",
      property_budget: "700k_900k",
      timeline: "3_6_months",
      help_needed: ["smsf_setup", "lending"],
    });
    expect(result.success).toBe(true);
  });

  it("general schema accepts notes-only payload", () => {
    const schema = getTemplateSchema("general");
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ notes: "Hi" }).success).toBe(true);
  });
});
