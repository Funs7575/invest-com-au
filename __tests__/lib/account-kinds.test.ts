import { describe, it, expect } from "vitest";
import {
  chooseCallbackRedirect,
  isWorkspaceKind,
  portalForKind,
  type KindMembership,
} from "@/lib/account-kinds";

const m = (kind: KindMembership["kind"], extras: Partial<KindMembership> = {}): KindMembership => ({
  authUserId: "u1",
  kind,
  kindId: "1",
  status: "active",
  displayLabel: "Test",
  createdAt: "2026-05-10T00:00:00Z",
  ...extras,
});

describe("isWorkspaceKind", () => {
  it("accepts every active workspace kind", () => {
    expect(isWorkspaceKind("investor")).toBe(true);
    expect(isWorkspaceKind("advisor")).toBe(true);
    expect(isWorkspaceKind("broker_partner")).toBe(true);
    expect(isWorkspaceKind("business_owner")).toBe(true);
    expect(isWorkspaceKind("listing_owner")).toBe(true);
  });
  it("rejects unknown values", () => {
    expect(isWorkspaceKind("admin")).toBe(false);
    expect(isWorkspaceKind("")).toBe(false);
    expect(isWorkspaceKind("INVESTOR")).toBe(false); // case-sensitive
  });
});

describe("portalForKind", () => {
  it("maps each kind to its portal", () => {
    expect(portalForKind("advisor")).toBe("/advisor-portal");
    expect(portalForKind("broker_partner")).toBe("/broker-portal");
    expect(portalForKind("business_owner")).toBe("/business-portal");
    expect(portalForKind("listing_owner")).toBe("/invest/my-listings");
    expect(portalForKind("investor")).toBe("/account");
  });
  it("respects fallback for investor kind only", () => {
    expect(portalForKind("investor", "/custom")).toBe("/custom");
    expect(portalForKind("advisor", "/custom")).toBe("/advisor-portal");
  });
});

describe("chooseCallbackRedirect", () => {
  it("0 kinds → fallback + lazy-investor cookie", () => {
    const r = chooseCallbackRedirect([], "/account");
    expect(r.redirect).toBe("/account");
    expect(r.setKind).toBe("investor");
  });

  it("1 kind → that portal + matching cookie", () => {
    const r = chooseCallbackRedirect([m("advisor")], "/account");
    expect(r.redirect).toBe("/advisor-portal");
    expect(r.setKind).toBe("advisor");
  });

  it("2+ kinds → chooser, no cookie set", () => {
    const r = chooseCallbackRedirect([m("advisor"), m("investor")], "/account");
    expect(r.redirect).toBe("/account/select-workspace");
    expect(r.setKind).toBeNull();
  });

  it("respects fallbackNext for the 0-kind case", () => {
    const r = chooseCallbackRedirect([], "/find-advisor");
    expect(r.redirect).toBe("/find-advisor");
  });

  it("uses portalForKind for the 1-kind broker_partner case", () => {
    const r = chooseCallbackRedirect([m("broker_partner")], "/account");
    expect(r.redirect).toBe("/broker-portal");
  });
});
