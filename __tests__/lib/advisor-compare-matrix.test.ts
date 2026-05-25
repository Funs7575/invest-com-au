/**
 * __tests__/lib/advisor-compare-matrix.test.ts
 *
 * Unit tests for the advisor compare-matrix assembler.
 *
 * Covers:
 *  - Each row (specialties, fee_model, credentials, trust_score,
 *    accepts_new_clients, meeting_methods, languages, verified)
 *  - Missing-data "—" / missing: true sentinel
 *  - Single advisor vs multiple advisors
 *  - Trust Score cell computation (uses real computeAdvisorTrustScore)
 *  - Capping at 3 advisors
 *  - Empty input → empty columns, rows still present
 *  - formatFeeModel and formatCredentials helpers
 */

import { describe, it, expect } from "vitest";
import {
  buildAdvisorCompareMatrix,
  formatFeeModel,
  formatCredentials,
  type AdvisorCompareInput,
} from "@/lib/advisor-compare-matrix";

/* ─── Fixtures ────────────────────────────────────────────────────────────── */

/** Minimal advisor with no positive signals — all optional fields absent. */
const BLANK: AdvisorCompareInput = {
  id: 1,
  slug: "advisor-blank",
  name: "Blank Advisor",
  type: "financial_planner",
  rating: 0,
  review_count: 0,
  verified: false,
};

/** Fully-populated advisor fixture. */
const FULL: AdvisorCompareInput = {
  id: 2,
  slug: "advisor-full",
  name: "Full Advisor",
  firm_name: "Acme Wealth",
  type: "financial_planner",
  photo_url: "https://example.com/photo.jpg",
  rating: 4.8,
  review_count: 15,
  verified: true,
  afsl_number: "123456",
  registration_number: "AR 999",
  verified_at: new Date().toISOString(),
  specialties: ["Retirement Planning", "SMSF", "Estate Planning"],
  fee_structure: "Hourly",
  hourly_rate_cents: 35000,
  initial_consultation_free: true,
  accepts_new_clients: true,
  booking_link: "https://cal.com/advisor-full",
  meeting_types: ["In-person", "Video", "Phone"],
  languages: ["English", "Mandarin"],
  created_at: new Date(Date.now() - 8 * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
  years_experience: 10,
  bio: "Experienced planner with over a decade helping Australians retire well.",
  qualifications: [{ name: "CFP" }],
  education: [{ institution: "UNSW", degree: "BComm" }],
  memberships: [{ name: "FPA" }],
  linkedin_url: "https://linkedin.com/in/advisor-full",
  website: "https://acmewealth.com.au",
};

/** Second advisor for multi-column tests. */
const SECOND: AdvisorCompareInput = {
  id: 3,
  slug: "advisor-second",
  name: "Second Advisor",
  type: "wealth_manager",
  rating: 3.5,
  review_count: 2,
  verified: false,
  afsl_number: "654321",
  specialties: ["Shares", "ETFs"],
  flat_fee_cents: 500000,
  accepts_new_clients: false,
  meeting_types: ["Video"],
  languages: [],
};

/** Third advisor for cap test. */
const THIRD: AdvisorCompareInput = {
  id: 4,
  slug: "advisor-third",
  name: "Third Advisor",
  type: "tax_agent",
  rating: 0,
  review_count: 0,
  verified: false,
};

/** Fourth advisor — should be dropped by the 3-cap. */
const FOURTH: AdvisorCompareInput = {
  id: 5,
  slug: "advisor-fourth",
  name: "Fourth Advisor",
  type: "mortgage_broker",
  rating: 0,
  review_count: 0,
  verified: false,
};

/* ─── buildAdvisorCompareMatrix ───────────────────────────────────────────── */

describe("buildAdvisorCompareMatrix", () => {
  it("returns 8 rows in the canonical order", () => {
    const { rows } = buildAdvisorCompareMatrix([BLANK]);
    expect(rows).toHaveLength(8);
    const keys = rows.map((r) => r.key);
    expect(keys).toEqual([
      "specialties",
      "fee_model",
      "credentials",
      "trust_score",
      "accepts_new_clients",
      "meeting_methods",
      "languages",
      "verified",
    ]);
  });

  it("caps columns at 3 even when 4 advisors are provided", () => {
    const { columns } = buildAdvisorCompareMatrix([BLANK, FULL, SECOND, FOURTH]);
    expect(columns).toHaveLength(3);
    const slugs = columns.map((c) => c.slug);
    expect(slugs).not.toContain("advisor-fourth");
  });

  it("produces zero columns for empty input but still includes rows", () => {
    const { rows, columns, cells } = buildAdvisorCompareMatrix([]);
    expect(columns).toHaveLength(0);
    expect(rows).toHaveLength(8);
    // Every row should have an empty cells object
    for (const row of rows) {
      expect(cells[row.key]).toEqual({});
    }
  });

  it("maps column metadata correctly for a full advisor", () => {
    const { columns } = buildAdvisorCompareMatrix([FULL]);
    const col = columns[0];
    expect(col).toMatchObject({
      slug: "advisor-full",
      name: "Full Advisor",
      firm_name: "Acme Wealth",
      photo_url: "https://example.com/photo.jpg",
      profilePath: "/advisor/advisor-full",
    });
  });

  it("coerces null firm_name and photo_url to null in column", () => {
    const { columns } = buildAdvisorCompareMatrix([BLANK]);
    expect(columns[0]?.firm_name).toBeNull();
    expect(columns[0]?.photo_url).toBeNull();
  });

  /* ── specialties row ─────────────────────────────────────────────────── */

  it("specialties row: badge_list with items for a full advisor", () => {
    const { cells } = buildAdvisorCompareMatrix([FULL]);
    const cell = cells.specialties["advisor-full"];
    expect(cell?.kind).toBe("badge_list");
    if (cell?.kind !== "badge_list") return;
    expect(cell.missing).toBe(false);
    expect(cell.items).toEqual(["Retirement Planning", "SMSF", "Estate Planning"]);
  });

  it("specialties row: missing: true when no specialties", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK]);
    const cell = cells.specialties["advisor-blank"];
    expect(cell?.kind).toBe("badge_list");
    if (cell?.kind !== "badge_list") return;
    expect(cell.missing).toBe(true);
    expect(cell.items).toHaveLength(0);
  });

  /* ── fee_model row ───────────────────────────────────────────────────── */

  it("fee_model row: shows hourly rate with free consult note", () => {
    const { cells } = buildAdvisorCompareMatrix([FULL]);
    const cell = cells.fee_model["advisor-full"];
    expect(cell?.kind).toBe("text");
    if (cell?.kind !== "text") return;
    expect(cell.missing).toBe(false);
    expect(cell.value).toContain("$350");
    expect(cell.value).toContain("Free initial consult");
  });

  it("fee_model row: shows flat fee", () => {
    const { cells } = buildAdvisorCompareMatrix([SECOND]);
    const cell = cells.fee_model["advisor-second"];
    expect(cell?.kind).toBe("text");
    if (cell?.kind !== "text") return;
    expect(cell.value).toContain("$5,000");
    expect(cell.value).toContain("flat fee");
  });

  it("fee_model row: missing: true and value '—' when no fee data", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK]);
    const cell = cells.fee_model["advisor-blank"];
    expect(cell?.kind).toBe("text");
    if (cell?.kind !== "text") return;
    expect(cell.missing).toBe(true);
    expect(cell.value).toBe("—");
  });

  it("fee_model row: shows AUM percentage", () => {
    const advisor: AdvisorCompareInput = { ...BLANK, aum_percentage: 1.0 };
    const { cells } = buildAdvisorCompareMatrix([advisor]);
    const cell = cells.fee_model["advisor-blank"];
    if (cell?.kind !== "text") return;
    expect(cell.value).toContain("1%");
    expect(cell.value).toContain("AUM");
  });

  it("fee_model row: falls back to fee_description (truncated at 50 chars)", () => {
    const longDesc = "This is a long fee description that goes beyond fifty characters total";
    const advisor: AdvisorCompareInput = { ...BLANK, fee_description: longDesc };
    const { cells } = buildAdvisorCompareMatrix([advisor]);
    const cell = cells.fee_model["advisor-blank"];
    if (cell?.kind !== "text") return;
    expect(cell.missing).toBe(false);
    expect(cell.value.length).toBeLessThanOrEqual(52); // 50 + "…"
    expect(cell.value.endsWith("…")).toBe(true);
  });

  /* ── credentials row ─────────────────────────────────────────────────── */

  it("credentials row: shows AFSL + AR when both present", () => {
    const { cells } = buildAdvisorCompareMatrix([FULL]);
    const cell = cells.credentials["advisor-full"];
    expect(cell?.kind).toBe("text");
    if (cell?.kind !== "text") return;
    expect(cell.missing).toBe(false);
    expect(cell.value).toContain("AFSL 123456");
    expect(cell.value).toContain("AR 999");
  });

  it("credentials row: shows only AFSL when no registration_number", () => {
    const { cells } = buildAdvisorCompareMatrix([SECOND]);
    const cell = cells.credentials["advisor-second"];
    if (cell?.kind !== "text") return;
    expect(cell.value).toBe("AFSL 654321");
    expect(cell.missing).toBe(false);
  });

  it("credentials row: missing: true when neither AFSL nor AR present", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK]);
    const cell = cells.credentials["advisor-blank"];
    if (cell?.kind !== "text") return;
    expect(cell.missing).toBe(true);
    expect(cell.value).toBe("—");
  });

  /* ── trust_score row ─────────────────────────────────────────────────── */

  it("trust_score row: returns score cell with kind 'score'", () => {
    const { cells } = buildAdvisorCompareMatrix([FULL]);
    const cell = cells.trust_score["advisor-full"];
    expect(cell?.kind).toBe("score");
  });

  it("trust_score row: fully-verified advisor has overall > blank advisor", () => {
    const { cells } = buildAdvisorCompareMatrix([FULL, BLANK]);
    const fullScore = cells.trust_score["advisor-full"];
    const blankScore = cells.trust_score["advisor-blank"];
    if (fullScore?.kind !== "score" || blankScore?.kind !== "score") {
      throw new Error("Expected score cells");
    }
    expect(fullScore.overall).toBeGreaterThan(blankScore.overall);
  });

  it("trust_score row: blank advisor yields label 'Limited' or 'Moderate'", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK]);
    const cell = cells.trust_score["advisor-blank"];
    if (cell?.kind !== "score") throw new Error("Expected score cell");
    expect(["Limited", "Moderate"]).toContain(cell.label);
  });

  it("trust_score row: never marks missing: true (score always computable)", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK, FULL]);
    for (const slug of ["advisor-blank", "advisor-full"]) {
      const cell = cells.trust_score[slug];
      if (cell?.kind !== "score") throw new Error("Expected score cell");
      expect(cell.missing).toBe(false);
    }
  });

  it("trust_score row: score is between 0 and 100 inclusive", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK, FULL, SECOND]);
    for (const col of ["advisor-blank", "advisor-full", "advisor-second"]) {
      const cell = cells.trust_score[col];
      if (cell?.kind !== "score") throw new Error("Expected score cell");
      expect(cell.overall).toBeGreaterThanOrEqual(0);
      expect(cell.overall).toBeLessThanOrEqual(100);
    }
  });

  /* ── accepts_new_clients row ─────────────────────────────────────────── */

  it("accepts_new_clients row: true → display 'Yes', value true", () => {
    const { cells } = buildAdvisorCompareMatrix([FULL]);
    const cell = cells.accepts_new_clients["advisor-full"];
    expect(cell?.kind).toBe("boolean");
    if (cell?.kind !== "boolean") return;
    expect(cell.value).toBe(true);
    expect(cell.display).toBe("Yes");
    expect(cell.missing).toBe(false);
  });

  it("accepts_new_clients row: false → display 'No', value false", () => {
    const { cells } = buildAdvisorCompareMatrix([SECOND]);
    const cell = cells.accepts_new_clients["advisor-second"];
    if (cell?.kind !== "boolean") return;
    expect(cell.value).toBe(false);
    expect(cell.display).toBe("No");
    expect(cell.missing).toBe(false);
  });

  it("accepts_new_clients row: null/undefined → display '—', missing: true", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK]);
    const cell = cells.accepts_new_clients["advisor-blank"];
    if (cell?.kind !== "boolean") return;
    expect(cell.value).toBeNull();
    expect(cell.display).toBe("—");
    expect(cell.missing).toBe(true);
  });

  /* ── meeting_methods row ─────────────────────────────────────────────── */

  it("meeting_methods row: badge_list with types for full advisor", () => {
    const { cells } = buildAdvisorCompareMatrix([FULL]);
    const cell = cells.meeting_methods["advisor-full"];
    expect(cell?.kind).toBe("badge_list");
    if (cell?.kind !== "badge_list") return;
    expect(cell.items).toEqual(["In-person", "Video", "Phone"]);
    expect(cell.missing).toBe(false);
  });

  it("meeting_methods row: missing: true when no meeting_types", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK]);
    const cell = cells.meeting_methods["advisor-blank"];
    if (cell?.kind !== "badge_list") return;
    expect(cell.missing).toBe(true);
    expect(cell.items).toHaveLength(0);
  });

  /* ── languages row ───────────────────────────────────────────────────── */

  it("languages row: shows languages when specified", () => {
    const { cells } = buildAdvisorCompareMatrix([FULL]);
    const cell = cells.languages["advisor-full"];
    expect(cell?.kind).toBe("badge_list");
    if (cell?.kind !== "badge_list") return;
    expect(cell.items).toContain("English");
    expect(cell.items).toContain("Mandarin");
    expect(cell.missing).toBe(false);
  });

  it("languages row: defaults to ['English'] and missing: true when no languages specified", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK]);
    const cell = cells.languages["advisor-blank"];
    if (cell?.kind !== "badge_list") return;
    expect(cell.items).toEqual(["English"]);
    // missing: true because no explicit languages on record
    expect(cell.missing).toBe(true);
  });

  it("languages row: empty array [] is treated same as absent (defaults to English)", () => {
    const { cells } = buildAdvisorCompareMatrix([SECOND]);
    const cell = cells.languages["advisor-second"];
    if (cell?.kind !== "badge_list") return;
    expect(cell.items).toEqual(["English"]);
    expect(cell.missing).toBe(true);
  });

  /* ── verified row ────────────────────────────────────────────────────── */

  it("verified row: verified advisor → value true, display 'Yes'", () => {
    const { cells } = buildAdvisorCompareMatrix([FULL]);
    const cell = cells.verified["advisor-full"];
    expect(cell?.kind).toBe("boolean");
    if (cell?.kind !== "boolean") return;
    expect(cell.value).toBe(true);
    expect(cell.display).toBe("Yes");
    expect(cell.missing).toBe(false);
  });

  it("verified row: unverified advisor → value false, display 'No'", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK]);
    const cell = cells.verified["advisor-blank"];
    if (cell?.kind !== "boolean") return;
    expect(cell.value).toBe(false);
    expect(cell.display).toBe("No");
    expect(cell.missing).toBe(false);
  });

  /* ── multi-column coherence ──────────────────────────────────────────── */

  it("produces the right set of slugs in cells for 3 advisors", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK, FULL, SECOND]);
    const slugsInSpecialties = Object.keys(cells.specialties);
    expect(slugsInSpecialties.sort()).toEqual(
      ["advisor-blank", "advisor-full", "advisor-second"].sort(),
    );
  });

  it("does not include a fourth advisor when 4 are passed", () => {
    const { cells } = buildAdvisorCompareMatrix([BLANK, FULL, SECOND, FOURTH]);
    expect(Object.keys(cells.specialties)).not.toContain("advisor-fourth");
  });
});

/* ─── formatFeeModel ──────────────────────────────────────────────────────── */

describe("formatFeeModel", () => {
  it("returns '—' when no fee data", () => {
    expect(formatFeeModel(BLANK)).toBe("—");
  });

  it("formats hourly_rate_cents correctly", () => {
    expect(formatFeeModel({ ...BLANK, hourly_rate_cents: 35000 })).toBe("$350/hr");
  });

  it("formats large hourly_rate_cents with locale separators", () => {
    expect(formatFeeModel({ ...BLANK, hourly_rate_cents: 100000 })).toBe("$1,000/hr");
  });

  it("formats flat_fee_cents correctly", () => {
    expect(formatFeeModel({ ...BLANK, flat_fee_cents: 200000 })).toBe("$2,000 flat fee");
  });

  it("formats aum_percentage correctly", () => {
    expect(formatFeeModel({ ...BLANK, aum_percentage: 0.75 })).toBe("0.75% AUM");
  });

  it("prefers hourly rate over flat fee when both set", () => {
    const result = formatFeeModel({
      ...BLANK,
      hourly_rate_cents: 20000,
      flat_fee_cents: 50000,
    });
    expect(result).toBe("$200/hr");
  });

  it("truncates long fee_description at 50 chars with ellipsis", () => {
    const desc = "A".repeat(60);
    const result = formatFeeModel({ ...BLANK, fee_description: desc });
    expect(result.length).toBe(51); // 50 + "…"
    expect(result.endsWith("…")).toBe(true);
  });

  it("returns fee_structure when description is absent", () => {
    expect(
      formatFeeModel({ ...BLANK, fee_structure: "Commission based" }),
    ).toBe("Commission based");
  });
});

/* ─── formatCredentials ───────────────────────────────────────────────────── */

describe("formatCredentials", () => {
  it("returns '—' when neither AFSL nor registration_number present", () => {
    expect(formatCredentials(BLANK)).toBe("—");
  });

  it("returns AFSL only when no registration_number", () => {
    expect(formatCredentials({ ...BLANK, afsl_number: "123456" })).toBe("AFSL 123456");
  });

  it("returns registration_number only when no AFSL", () => {
    expect(
      formatCredentials({ ...BLANK, registration_number: "AR 999" }),
    ).toBe("AR AR 999");
  });

  it("returns both separated by ' · ' when both present", () => {
    const result = formatCredentials({
      ...BLANK,
      afsl_number: "123456",
      registration_number: "AR 999",
    });
    expect(result).toBe("AFSL 123456 · AR AR 999");
  });

  it("trims whitespace from afsl_number", () => {
    expect(
      formatCredentials({ ...BLANK, afsl_number: "  123456  " }),
    ).toBe("AFSL 123456");
  });

  it("ignores empty string afsl_number (returns '—')", () => {
    expect(formatCredentials({ ...BLANK, afsl_number: "" })).toBe("—");
  });

  it("ignores whitespace-only afsl_number (returns '—')", () => {
    expect(formatCredentials({ ...BLANK, afsl_number: "   " })).toBe("—");
  });
});
