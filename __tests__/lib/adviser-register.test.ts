import { describe, it, expect } from "vitest";
import {
  registerMeta,
  allRegisterAdvisers,
  adviserBySlug,
  colleaguesOf,
  searchRegister,
  topLicensees,
  REGISTER_SEARCH_MAX_RESULTS,
} from "@/lib/adviser-register";
import { parseFarCsv, parseCsv, slugifyAdviser } from "@/lib/adviser-register-ingest";

describe("adviser-register loader", () => {
  it("loads a coherent dataset (meta count matches rows, slugs unique)", () => {
    const advisers = allRegisterAdvisers();
    expect(registerMeta().count).toBe(advisers.length);
    expect(new Set(advisers.map((a) => a.slug)).size).toBe(advisers.length);
    expect(new Set(advisers.map((a) => a.number)).size).toBe(advisers.length);
  });

  it("resolves a slug to the same record and misses cleanly", () => {
    const first = allRegisterAdvisers()[0]!;
    expect(adviserBySlug(first.slug)?.number).toBe(first.number);
    expect(adviserBySlug("definitely-not-a-real-slug-0")).toBeNull();
  });

  it("colleagues share a licensee and never include the adviser", () => {
    const first = allRegisterAdvisers()[0]!;
    const colleagues = colleaguesOf(first, 5);
    for (const c of colleagues) {
      expect(c.licenseeName).toBe(first.licenseeName);
      expect(c.number).not.toBe(first.number);
    }
    expect(colleagues.length).toBeLessThanOrEqual(5);
  });

  it("search matches name prefix first, caps results, ignores short queries", () => {
    const first = allRegisterAdvisers()[0]!;
    const prefix = first.name.slice(0, 4);
    const results = searchRegister(prefix);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.adviser.name.toLowerCase().startsWith(prefix.toLowerCase())).toBe(true);
    expect(searchRegister("a").length).toBe(0);
    expect(searchRegister("  ").length).toBe(0);
    expect(searchRegister("a ".repeat(1)).length).toBe(0);
    const broad = searchRegister("an");
    expect(broad.length).toBeLessThanOrEqual(REGISTER_SEARCH_MAX_RESULTS);
  });

  it("search finds by exact adviser number and by licensee", () => {
    const first = allRegisterAdvisers()[0]!;
    expect(searchRegister(first.number)[0]?.adviser.number).toBe(first.number);
    const byLicensee = searchRegister(first.licenseeName.slice(0, 12));
    expect(byLicensee.some((r) => r.adviser.licenseeName === first.licenseeName)).toBe(true);
  });

  it("topLicensees orders by headcount", () => {
    const tops = topLicensees(5);
    expect(tops.length).toBeGreaterThan(0);
    for (let i = 1; i < tops.length; i++) {
      expect(tops[i - 1]!.count).toBeGreaterThanOrEqual(tops[i]!.count);
    }
  });
});

describe("parseCsv", () => {
  it("handles quoted fields, embedded commas, escaped quotes, CRLF", () => {
    const rows = parseCsv('a,"b, with comma","say ""hi"""\r\nc,d,e\n');
    expect(rows).toEqual([
      ["a", "b, with comma", 'say "hi"'],
      ["c", "d", "e"],
    ]);
  });
});

describe("parseFarCsv", () => {
  const HEADER = "ADV_NAME,ADV_NUMBER,ADV_ROLE,ADV_SUB_TYPE,ROLE_STATUS,LICENCE_NAME,LICENCE_NUMBER,ADV_FIRST_PROVIDED_ADVICE,QUALIFICATIONS_AND_TRAINING";

  it("normalises current advisers and skips ceased ones", () => {
    const csv = [
      HEADER,
      'JANE CITIZEN,1234567,Financial Adviser,,Current,EXAMPLE WEALTH PTY LTD,345678,01/2015,"Bachelor of Commerce; Master of Financial Planning"',
      "JOHN OLD,7654321,Financial Adviser,,Ceased,EXAMPLE WEALTH PTY LTD,345678,01/2001,",
    ].join("\n");
    const { advisers, skipped } = parseFarCsv(csv);
    expect(advisers.length).toBe(1);
    expect(skipped.ceased).toBe(1);
    const jane = advisers[0]!;
    expect(jane.name).toBe("Jane Citizen");
    expect(jane.slug).toBe("jane-citizen-1234567");
    expect(jane.licenseeName).toBe("Example Wealth Pty Ltd");
    expect(jane.firstAdviceYear).toBe(2015);
    expect(jane.qualifications).toEqual(["Bachelor of Commerce", "Master of Financial Planning"]);
  });

  it("dedupes by adviser number keeping the last row", () => {
    const csv = [
      HEADER,
      "JANE CITIZEN,1234567,Financial Adviser,,Current,OLD LICENSEE PTY LTD,1,,",
      "JANE CITIZEN,1234567,Financial Adviser,,Current,NEW LICENSEE PTY LTD,2,,",
    ].join("\n");
    const { advisers } = parseFarCsv(csv);
    expect(advisers.length).toBe(1);
    expect(advisers[0]!.licenseeName).toBe("New Licensee Pty Ltd");
  });

  it("fails loudly when required columns are missing, naming found headers", () => {
    expect(() => parseFarCsv("FOO,BAR\n1,2")).toThrowError(/missing a recognisable/);
    expect(() => parseFarCsv("FOO,BAR\n1,2")).toThrowError(/FOO, BAR/);
  });

  it("skips rows with missing identity fields", () => {
    const csv = [HEADER, ",1111111,Financial Adviser,,Current,SOME LICENSEE,9,,"].join("\n");
    const { advisers, skipped } = parseFarCsv(csv);
    expect(advisers.length).toBe(0);
    expect(skipped.missingFields).toBe(1);
  });
});

describe("slugifyAdviser", () => {
  it("kebab-cases and suffixes the number for uniqueness", () => {
    expect(slugifyAdviser("Seán O'Brien-Smyth", "987")).toBe("sean-o-brien-smyth-987");
    expect(slugifyAdviser("李 伟", "123")).toBe("adviser-123");
  });
});
