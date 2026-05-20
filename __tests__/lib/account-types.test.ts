import { describe, it, expect } from "vitest";
import { ACTIVE_ACCOUNT_KINDS, isAccountKind } from "@/lib/account-types";

describe("isAccountKind", () => {
  it("accepts every active account kind", () => {
    for (const kind of ACTIVE_ACCOUNT_KINDS) {
      expect(isAccountKind(kind)).toBe(true);
    }
  });

  it("rejects unknown strings and is case-sensitive", () => {
    expect(isAccountKind("admin")).toBe(false);
    expect(isAccountKind("wholesale_operator")).toBe(false);
    expect(isAccountKind("INVESTOR")).toBe(false);
    expect(isAccountKind("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isAccountKind(null)).toBe(false);
    expect(isAccountKind(undefined)).toBe(false);
    expect(isAccountKind(123)).toBe(false);
    expect(isAccountKind({ kind: "advisor" })).toBe(false);
    expect(isAccountKind(["advisor"])).toBe(false);
  });
});

describe("ACTIVE_ACCOUNT_KINDS", () => {
  it("holds the five production kinds", () => {
    expect([...ACTIVE_ACCOUNT_KINDS].sort()).toEqual(
      ["advisor", "broker_partner", "business_owner", "investor", "listing_owner"].sort(),
    );
  });

  it("has no duplicate kinds", () => {
    expect(new Set(ACTIVE_ACCOUNT_KINDS).size).toBe(ACTIVE_ACCOUNT_KINDS.length);
  });

  it("every entry round-trips through isAccountKind", () => {
    for (const kind of ACTIVE_ACCOUNT_KINDS) {
      expect(isAccountKind(kind)).toBe(true);
    }
  });
});
