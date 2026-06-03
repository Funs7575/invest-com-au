import { describe, it, expect } from "vitest";
import {
  ACTIVE_ACCOUNT_KINDS,
  isAccountKind,
  INVESTOR_ACCOUNT_TYPES,
  getInvestorAccountType,
  type AccountKind,
  type InvestorAccountType,
} from "@/lib/account-types";

// ── ACTIVE_ACCOUNT_KINDS ──────────────────────────────────────────────────────

describe("ACTIVE_ACCOUNT_KINDS", () => {
  it("contains exactly 7 kinds", () => {
    expect(ACTIVE_ACCOUNT_KINDS).toHaveLength(7);
  });

  it.each([
    "advisor",
    "broker_partner",
    "investor",
    "business_owner",
    "listing_owner",
    "startup",
    "org_admin",
  ] satisfies AccountKind[])("includes '%s'", (kind) => {
    expect(ACTIVE_ACCOUNT_KINDS).toContain(kind);
  });

  it("has no duplicate entries", () => {
    expect(new Set(ACTIVE_ACCOUNT_KINDS).size).toBe(ACTIVE_ACCOUNT_KINDS.length);
  });
});

// ── isAccountKind ─────────────────────────────────────────────────────────────

describe("isAccountKind", () => {
  it.each(ACTIVE_ACCOUNT_KINDS)("returns true for active kind '%s'", (kind) => {
    expect(isAccountKind(kind)).toBe(true);
  });

  it("returns false for an unknown string", () => {
    expect(isAccountKind("super_admin")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isAccountKind("")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isAccountKind(1)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAccountKind(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAccountKind(undefined)).toBe(false);
  });

  it("returns false for an object", () => {
    expect(isAccountKind({ kind: "advisor" })).toBe(false);
  });
});

// ── INVESTOR_ACCOUNT_TYPES ────────────────────────────────────────────────────

describe("INVESTOR_ACCOUNT_TYPES", () => {
  it("contains exactly 4 entries", () => {
    expect(INVESTOR_ACCOUNT_TYPES).toHaveLength(4);
  });

  it("all entries have a non-empty value, label, and description", () => {
    for (const t of INVESTOR_ACCOUNT_TYPES) {
      expect(t.value.length).toBeGreaterThan(0);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it("values are the four expected InvestorAccountType literals", () => {
    const values = INVESTOR_ACCOUNT_TYPES.map((t) => t.value);
    expect(values).toEqual(
      expect.arrayContaining(["individual", "couple", "family", "business"] satisfies InvestorAccountType[]),
    );
    expect(values).toHaveLength(4);
  });

  it("has no duplicate value entries", () => {
    const values = INVESTOR_ACCOUNT_TYPES.map((t) => t.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ── getInvestorAccountType ────────────────────────────────────────────────────

describe("getInvestorAccountType", () => {
  it.each(["individual", "couple", "family", "business"] satisfies InvestorAccountType[])(
    "returns '%s' when meta.account_type is '%s'",
    (type) => {
      expect(getInvestorAccountType({ account_type: type })).toBe(type);
    },
  );

  it("returns 'individual' for an unknown account_type value", () => {
    expect(getInvestorAccountType({ account_type: "unknown" })).toBe("individual");
  });

  it("returns 'individual' when account_type is missing", () => {
    expect(getInvestorAccountType({})).toBe("individual");
  });

  it("returns 'individual' when account_type is null", () => {
    expect(getInvestorAccountType({ account_type: null })).toBe("individual");
  });

  it("returns 'individual' when account_type is a number", () => {
    expect(getInvestorAccountType({ account_type: 42 })).toBe("individual");
  });
});
