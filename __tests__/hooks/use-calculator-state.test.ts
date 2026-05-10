import { describe, it, expect } from "vitest";
import { buildShareableUrl } from "@/hooks/use-calculator-state";

// The hook itself is tested via the calculator integration tests + manual
// smoke-test (sessionStorage / DB / URL hydration paths). What we can
// usefully unit-test is the pure helper for shareable links.

describe("buildShareableUrl", () => {
  it("returns the bare URL when data is empty", () => {
    expect(buildShareableUrl("https://invest.com.au/mortgage-calculator", "mortgage", {}))
      .toBe("https://invest.com.au/mortgage-calculator");
  });

  it("encodes scalar fields with the calculator-key prefix", () => {
    const url = buildShareableUrl(
      "https://invest.com.au/mortgage-calculator",
      "mortgage",
      { loan_amount: 600000, interest_rate: 6.5 },
    );
    expect(url).toMatch(/^https:\/\/invest\.com\.au\/mortgage-calculator\?/);
    expect(url).toContain("mortgage_loan_amount=600000");
    expect(url).toContain("mortgage_interest_rate=6.5");
  });

  it("skips null, undefined, and empty-string values", () => {
    const url = buildShareableUrl("https://x.com", "k", {
      a: null,
      b: undefined,
      empty: "",
      d: "kept",
    });
    expect(url).toContain("k_d=kept");
    expect(url).not.toContain("k_a=");
    expect(url).not.toContain("k_b=");
    expect(url).not.toContain("k_empty=");
  });
});
