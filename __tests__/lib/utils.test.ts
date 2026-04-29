import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  slugify,
  cn,
  getMostRecentFeeCheck,
  formatDate,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats whole dollars with the AUD symbol", () => {
    expect(formatCurrency(1000)).toBe("$1,000");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("drops trailing zeros on whole amounts", () => {
    expect(formatCurrency(1000.0)).toBe("$1,000");
  });

  it("keeps up to 2 decimal places for non-round values", () => {
    expect(formatCurrency(9.95)).toBe("$9.95");
  });

  it("handles negative amounts", () => {
    // en-AU with currency: negatives render as "-$X,XXX"
    expect(formatCurrency(-500)).toMatch(/^-\$500$/);
  });

  it("handles big numbers with grouping separators", () => {
    expect(formatCurrency(1_234_567)).toBe("$1,234,567");
  });
});

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips punctuation and collapses resulting whitespace runs", () => {
    // The em dash and apostrophe are non-word/non-space/non-hyphen so
    // they drop. The two surrounding spaces collapse to a single dash
    // along with the original space.
    expect(slugify("Invest.com.au — Finn's picks!")).toBe(
      "investcomau-finns-picks",
    );
  });

  it("collapses whitespace, dashes, and underscores", () => {
    expect(slugify("foo  bar __baz---qux")).toBe("foo-bar-baz-qux");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });

  it("produces empty string for all-punctuation", () => {
    expect(slugify("!!!??")).toBe("");
  });

  it("preserves numeric characters", () => {
    expect(slugify("Top 10 ETFs")).toBe("top-10-etfs");
  });
});

describe("cn (className join)", () => {
  it("joins non-falsy classes with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops undefined, null, and false", () => {
    expect(cn("a", undefined, "b", null, "c", false)).toBe("a b c");
  });

  it("returns empty string when all inputs are falsy", () => {
    expect(cn(undefined, null, false)).toBe("");
  });

  it("does NOT dedupe or split — caller owns class deduplication", () => {
    expect(cn("a", "a")).toBe("a a");
    expect(cn("a b", "c")).toBe("a b c");
  });
});

describe("getMostRecentFeeCheck", () => {
  it("returns null when the array is empty", () => {
    expect(getMostRecentFeeCheck([])).toBeNull();
  });

  it("returns null when no broker has a fee_last_checked", () => {
    expect(
      getMostRecentFeeCheck([{ fee_last_checked: null }, {}]),
    ).toBeNull();
  });

  it("returns the single value when only one broker has one", () => {
    expect(
      getMostRecentFeeCheck([
        { fee_last_checked: "2026-04-01T00:00:00Z" },
        {},
      ]),
    ).toBe("2026-04-01T00:00:00Z");
  });

  it("returns the max ISO string when multiple are set", () => {
    // ISO-8601 is lexically sortable, which this helper relies on.
    expect(
      getMostRecentFeeCheck([
        { fee_last_checked: "2026-01-01T00:00:00Z" },
        { fee_last_checked: "2026-03-15T12:00:00Z" },
        { fee_last_checked: "2026-02-20T10:00:00Z" },
      ]),
    ).toBe("2026-03-15T12:00:00Z");
  });

  it("ignores null/undefined entries mixed with valid ones", () => {
    expect(
      getMostRecentFeeCheck([
        { fee_last_checked: null },
        { fee_last_checked: "2026-04-01T00:00:00Z" },
        {},
        { fee_last_checked: "2026-04-05T00:00:00Z" },
      ]),
    ).toBe("2026-04-05T00:00:00Z");
  });
});

describe("formatDate", () => {
  // Use a UTC midday timestamp so the local-time conversion lands on the
  // same calendar day (4 Jan 2026) in the runner's timezone, regardless
  // of where CI actually runs.
  const ISO = "2026-01-04T12:00:00Z";

  it("defaults to short style (en-AU, day numeric, month short, year numeric)", () => {
    // en-AU short month is "Jan." in some Intl ICU builds; assert the load-bearing parts.
    const out = formatDate(ISO);
    expect(out).toMatch(/4/);
    expect(out).toMatch(/Jan/);
    expect(out).toMatch(/2026/);
  });

  it("short-year style emits a 2-digit year", () => {
    const out = formatDate(ISO, { style: "short-year" });
    expect(out).toMatch(/4/);
    expect(out).toMatch(/Jan/);
    expect(out).toMatch(/26/);
    expect(out).not.toMatch(/2026/);
  });

  it("long style emits the full month name", () => {
    const out = formatDate(ISO, { style: "long" });
    expect(out).toMatch(/4/);
    expect(out).toMatch(/January/);
    expect(out).toMatch(/2026/);
  });

  it("short-time style includes hour and minute", () => {
    const out = formatDate(ISO, { style: "short-time" });
    expect(out).toMatch(/Jan/);
    expect(out).toMatch(/2026/);
    // Hour/minute presence — exact value depends on TZ but the colon proves time was rendered
    expect(out).toMatch(/:\d{2}/);
  });

  it("numeric style emits zero-padded DD/MM/YYYY (load-bearing for invoice PDFs)", () => {
    // Use a date with a zero-pad-needed day so we lock the format precisely.
    expect(formatDate("2026-01-04T12:00:00Z", { style: "numeric" })).toBe(
      "04/01/2026",
    );
    expect(formatDate("2026-12-31T12:00:00Z", { style: "numeric" })).toBe(
      "31/12/2026",
    );
  });

  it("returns empty string by default when input is null or undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("returns the supplied fallback when input is null or undefined", () => {
    expect(formatDate(null, { fallback: "—" })).toBe("—");
    expect(formatDate(undefined, { fallback: "n/a" })).toBe("n/a");
  });

  it("ignores fallback when input is a real date string", () => {
    expect(formatDate(ISO, { fallback: "—" })).not.toBe("—");
  });
});
