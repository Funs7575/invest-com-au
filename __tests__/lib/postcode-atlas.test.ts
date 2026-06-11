import { describe, it, expect } from "vitest";
import {
  postcodeAtlasMeta,
  allPostcodes,
  postcodeRecord,
  searchPostcodes,
  nearbyPostcodes,
  topPostcodesByIncome,
  postcodeStateCounts,
  POSTCODE_SEARCH_MAX_RESULTS,
} from "@/lib/postcode-atlas";
import { parsePostcodeCsv, stateForPostcode } from "@/lib/postcode-atlas-ingest";

describe("postcode-atlas loader", () => {
  it("loads a coherent dataset (count matches, postcodes unique + 4-digit)", () => {
    const postcodes = allPostcodes();
    expect(postcodeAtlasMeta().count).toBe(postcodes.length);
    expect(new Set(postcodes.map((p) => p.postcode)).size).toBe(postcodes.length);
    for (const p of postcodes) expect(p.postcode).toMatch(/^\d{4}$/);
  });

  it("resolves postcodes and misses cleanly", () => {
    const first = allPostcodes()[0]!;
    expect(postcodeRecord(first.postcode)?.state).toBe(first.state);
    expect(postcodeRecord("0001")).toBeNull();
  });

  it("search matches postcode prefix and suburb, caps results", () => {
    const first = allPostcodes()[0]!;
    expect(searchPostcodes(first.postcode.slice(0, 3))[0]?.postcode.startsWith(first.postcode.slice(0, 3))).toBe(true);
    const suburb = first.suburbs[0];
    if (suburb) {
      expect(searchPostcodes(suburb.slice(0, 4)).some((p) => p.postcode === first.postcode)).toBe(true);
    }
    expect(searchPostcodes("9").length).toBe(0);
    expect(searchPostcodes("99").length).toBeLessThanOrEqual(POSTCODE_SEARCH_MAX_RESULTS);
  });

  it("nearby postcodes share the state, exclude self, order by numeric distance", () => {
    const first = allPostcodes()[0]!;
    const nearby = nearbyPostcodes(first, 4);
    let prev = -1;
    for (const p of nearby) {
      expect(p.state).toBe(first.state);
      expect(p.postcode).not.toBe(first.postcode);
      const d = Math.abs(parseInt(p.postcode, 10) - parseInt(first.postcode, 10));
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });

  it("top-by-income is descending; state counts sum to total", () => {
    const top = topPostcodesByIncome(5);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1]!.medianTaxableIncome!).toBeGreaterThanOrEqual(top[i]!.medianTaxableIncome!);
    }
    const sum = postcodeStateCounts().reduce((s, c) => s + c.count, 0);
    expect(sum).toBe(allPostcodes().length);
  });
});

describe("stateForPostcode", () => {
  it("maps the standard ranges", () => {
    expect(stateForPostcode("2000")).toBe("NSW");
    expect(stateForPostcode("2600")).toBe("ACT");
    expect(stateForPostcode("3000")).toBe("VIC");
    expect(stateForPostcode("4000")).toBe("QLD");
    expect(stateForPostcode("5000")).toBe("SA");
    expect(stateForPostcode("6000")).toBe("WA");
    expect(stateForPostcode("7000")).toBe("TAS");
    expect(stateForPostcode("0800")).toBe("NT");
    expect(stateForPostcode("abcd")).toBeNull();
  });
});

describe("parsePostcodeCsv", () => {
  const HEADER = "POSTCODE,STATE,SUBURB,NUMBER OF INDIVIDUALS,MEDIAN TAXABLE INCOME,AVERAGE TAXABLE INCOME,MEDIAN SUPER CONTRIBUTIONS";

  it("merges locality rows into one postcode record", () => {
    const csv = [
      HEADER,
      '2000,NSW,Sydney,"12,345","85,000","110,500","9,200"',
      "2000,NSW,Barangaroo,,,,",
      "2000,NSW,The Rocks,,,,",
    ].join("\n");
    const { postcodes } = parsePostcodeCsv(csv);
    expect(postcodes.length).toBe(1);
    const p = postcodes[0]!;
    expect(p.suburbs).toEqual(["Sydney", "Barangaroo", "The Rocks"]);
    expect(p.medianTaxableIncome).toBe(85000);
    expect(p.individualsCount).toBe(12345);
  });

  it("infers missing state from the postcode range and skips junk", () => {
    const csv = [
      HEADER,
      "3056,,Brunswick,5000,72000,84000,7800",
      "junk,,Nowhere,1,1,1,1",
      '6010,WA,Claremont,np,np,np,np',
    ].join("\n");
    const { postcodes, skipped } = parsePostcodeCsv(csv);
    expect(postcodes.find((p) => p.postcode === "3056")?.state).toBe("VIC");
    expect(skipped.badPostcode).toBe(1);
    // np-suppressed row has no stats at all → skipped as stat-less
    expect(postcodes.find((p) => p.postcode === "6010")).toBeUndefined();
    expect(skipped.noStats).toBe(1);
  });

  it("fails loudly when the postcode column is missing", () => {
    expect(() => parsePostcodeCsv("FOO,BAR\n1,2")).toThrowError(/missing a recognisable[\s\S]*FOO, BAR/);
  });
});
