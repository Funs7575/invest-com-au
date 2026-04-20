import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  slugify,
  cn,
  getMostRecentFeeCheck,
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
