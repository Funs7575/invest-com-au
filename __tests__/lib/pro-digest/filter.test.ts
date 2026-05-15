import { describe, it, expect } from "vitest";
import { filterBriefsForPro } from "@/lib/pro-digest";

describe("filterBriefsForPro", () => {
  it("returns all briefs when the pro has no specialty tags", () => {
    const briefs = [
      { id: 1, brief_template: "smsf_property", brief_payload: null },
      { id: 2, brief_template: "tax_help", brief_payload: null },
    ];
    expect(filterBriefsForPro(briefs, []).map((b) => b.id)).toEqual([1, 2]);
  });

  it("filters briefs by specialty tag (case insensitive substring)", () => {
    const briefs = [
      { id: 1, brief_template: "smsf_property", brief_payload: null },
      { id: 2, brief_template: "tax_help", brief_payload: null },
      { id: 3, brief_template: "smsf_setup", brief_payload: null },
    ];
    expect(filterBriefsForPro(briefs, ["SMSF"]).map((b) => b.id)).toEqual([1, 3]);
  });

  it("returns empty when no briefs match any specialty tag", () => {
    const briefs = [
      { id: 1, brief_template: "tax_help", brief_payload: null },
    ];
    expect(filterBriefsForPro(briefs, ["mortgage"])).toEqual([]);
  });

  it("matches if any tag matches", () => {
    const briefs = [
      { id: 1, brief_template: "mortgage_help", brief_payload: null },
    ];
    expect(filterBriefsForPro(briefs, ["smsf", "mortgage"]).map((b) => b.id)).toEqual([1]);
  });

  it("ignores briefs with null brief_template", () => {
    const briefs = [
      { id: 1, brief_template: null, brief_payload: null },
    ];
    expect(filterBriefsForPro(briefs, ["smsf"])).toEqual([]);
  });
});
