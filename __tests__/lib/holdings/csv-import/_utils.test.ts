import { describe, it, expect } from "vitest";
import {
  splitCsvLine,
  truncate,
  parseAuDate,
  parseIsoDate,
  parseFlexibleDate,
  parseMoney,
  MAX_INPUT_ROWS,
} from "@/lib/holdings/csv-import/_utils";

describe("splitCsvLine", () => {
  it("splits a simple comma line and trims fields", () => {
    expect(splitCsvLine("a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("respects commas inside double-quoted fields", () => {
    expect(splitCsvLine('"Smith, John",42,"X"')).toEqual(["Smith, John", "42", "X"]);
  });

  it("strips the surrounding quotes from quoted fields", () => {
    expect(splitCsvLine('"hello"')).toEqual(["hello"]);
  });

  it("returns a single field for input with no commas", () => {
    expect(splitCsvLine("solo")).toEqual(["solo"]);
  });

  it("yields empty strings for an empty line and for trailing commas", () => {
    expect(splitCsvLine("")).toEqual([""]);
    expect(splitCsvLine("a,,b")).toEqual(["a", "", "b"]);
    expect(splitCsvLine("a,b,")).toEqual(["a", "b", ""]);
  });

  it("treats adjacent quotes as toggles (not RFC-4180 escapes)", () => {
    // "" toggles inQuote off then on again -> net no quote chars in output.
    expect(splitCsvLine('a""b')).toEqual(["ab"]);
  });

  it("trims whitespace around unquoted values", () => {
    expect(splitCsvLine("  TLS  ,  100  ")).toEqual(["TLS", "100"]);
  });
});

describe("truncate", () => {
  it("returns the input unchanged when within the limit", () => {
    expect(truncate("short")).toBe("short");
  });

  it("returns input unchanged at exactly the limit", () => {
    const s = "x".repeat(200);
    expect(truncate(s)).toBe(s);
  });

  it("appends an ellipsis when over the limit", () => {
    const s = "x".repeat(250);
    const out = truncate(s);
    expect(out).toHaveLength(201); // 200 chars + ellipsis
    expect(out.endsWith("…")).toBe(true);
  });

  it("honours a custom max", () => {
    expect(truncate("abcdef", 3)).toBe("abc…");
  });

  it("handles empty string", () => {
    expect(truncate("")).toBe("");
  });
});

describe("parseAuDate", () => {
  it("parses DD/MM/YYYY", () => {
    expect(parseAuDate("09/05/2026")).toBe("2026-05-09");
  });

  it("parses single-digit day/month", () => {
    expect(parseAuDate("1/2/2026")).toBe("2026-02-01");
  });

  it("maps two-digit year >= 50 to 19xx", () => {
    expect(parseAuDate("01/01/99")).toBe("1999-01-01");
  });

  it("maps two-digit year < 50 to 20xx", () => {
    expect(parseAuDate("01/01/26")).toBe("2026-01-01");
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseAuDate("  10/06/2026  ")).toBe("2026-06-10");
  });

  it("rejects invalid calendar dates", () => {
    expect(parseAuDate("31/02/2026")).toBeNull();
    expect(parseAuDate("32/01/2026")).toBeNull();
    expect(parseAuDate("01/13/2026")).toBeNull();
  });

  it("rejects ISO and garbage input", () => {
    expect(parseAuDate("2026-05-09")).toBeNull();
    expect(parseAuDate("not a date")).toBeNull();
    expect(parseAuDate("")).toBeNull();
  });

  it("rejects 3-digit years", () => {
    expect(parseAuDate("01/01/202")).toBeNull();
  });
});

describe("parseIsoDate", () => {
  it("parses YYYY-MM-DD", () => {
    expect(parseIsoDate("2026-05-09")).toBe("2026-05-09");
  });

  it("zero-pads single-digit month/day", () => {
    expect(parseIsoDate("2026-5-9")).toBe("2026-05-09");
  });

  it("tolerates a trailing time portion (T / space / comma)", () => {
    expect(parseIsoDate("2026-05-09T10:30:00Z")).toBe("2026-05-09");
    expect(parseIsoDate("2026-05-09 10:30:00")).toBe("2026-05-09");
    expect(parseIsoDate("2026-05-09,extra")).toBe("2026-05-09");
  });

  it("tolerates leading whitespace", () => {
    expect(parseIsoDate("   2026-01-01")).toBe("2026-01-01");
  });

  it("rejects invalid calendar dates", () => {
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
  });

  it("rejects AU-format and garbage", () => {
    expect(parseIsoDate("09/05/2026")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
  });
});

describe("parseFlexibleDate", () => {
  it("prefers ISO format", () => {
    expect(parseFlexibleDate("2026-05-09")).toBe("2026-05-09");
  });

  it("falls back to AU format", () => {
    expect(parseFlexibleDate("09/05/2026")).toBe("2026-05-09");
  });

  it("returns null when neither format matches", () => {
    expect(parseFlexibleDate("May 9 2026")).toBeNull();
  });
});

describe("parseMoney", () => {
  it("parses a plain number string", () => {
    expect(parseMoney("100")).toBe(100);
  });

  it("strips currency symbols", () => {
    expect(parseMoney("$1234")).toBe(1234);
    expect(parseMoney("£500")).toBe(500);
    expect(parseMoney("€42")).toBe(42);
    expect(parseMoney("¥99")).toBe(99);
  });

  it("strips thousands separators and whitespace", () => {
    expect(parseMoney("1,234,567")).toBe(1234567);
    expect(parseMoney("  2 500 ")).toBe(2500);
  });

  it("strips alphabetic currency codes", () => {
    expect(parseMoney("AUD 1500")).toBe(1500);
    expect(parseMoney("1500 USD")).toBe(1500);
  });

  it("preserves a decimal point and leading minus", () => {
    expect(parseMoney("$1,234.56")).toBeCloseTo(1234.56);
    expect(parseMoney("-50")).toBe(-50);
  });

  it("returns NaN for empty input", () => {
    expect(parseMoney("")).toBeNaN();
  });

  it("coerces an all-alpha string to 0 (letters stripped, Number('') === 0)", () => {
    // Documented behaviour quirk: stripping leaves "" which Number() reads as 0.
    expect(parseMoney("abc")).toBe(0);
  });

  it("returns NaN when a stray symbol survives stripping", () => {
    // '.' is not in the strip set, so "1.2.3" -> Number("1.2.3") === NaN.
    expect(parseMoney("1.2.3")).toBeNaN();
  });
});

describe("MAX_INPUT_ROWS", () => {
  it("is the documented 500-row cap", () => {
    expect(MAX_INPUT_ROWS).toBe(500);
  });
});
