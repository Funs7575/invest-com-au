import { describe, it, expect } from "vitest";
import {
  FHB_SAVINGS_CATEGORY_SLUG,
  FHB_SAVINGS_REF,
  firstHomeBuyerSavingsUrl,
} from "@/lib/first-home-buyer/savings-match";
import { getCategoryBySlug } from "@/lib/best-broker-categories";

describe("first-home-buyer savings match", () => {
  it("targets a best-page category that actually exists", () => {
    // Drift guard: a renamed/removed slug would 404 the hub's "Compare all"
    // link, the exact failure mode the broker-handoff lever was built to kill.
    expect(getCategoryBySlug(FHB_SAVINGS_CATEGORY_SLUG)).toBeDefined();
  });

  it("targets a category scoped to savings accounts", () => {
    const category = getCategoryBySlug(FHB_SAVINGS_CATEGORY_SLUG)!;
    // The category filters to savings_account products — confirm the match
    // routes deposit-savers at flexible-access savings (not term deposits).
    expect(category.filter({ platform_type: "savings_account" } as never)).toBe(
      true,
    );
    expect(category.filter({ platform_type: "term_deposit" } as never)).toBe(
      false,
    );
  });

  it("deep-links to the high-interest-savings directory with attribution", () => {
    expect(firstHomeBuyerSavingsUrl()).toBe(
      "/best/high-interest-savings?ref=first-home-buyer",
    );
  });

  it("encodes a ref the directory can round-trip back", () => {
    const url = new URL(firstHomeBuyerSavingsUrl(), "https://invest.com.au");
    expect(url.pathname).toBe(`/best/${FHB_SAVINGS_CATEGORY_SLUG}`);
    expect(url.searchParams.get("ref")).toBe(FHB_SAVINGS_REF);
  });
});
