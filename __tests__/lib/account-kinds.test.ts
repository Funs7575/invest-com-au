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
  scopeSlug: null,
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
    expect(isWorkspaceKind("squad")).toBe(true);
    expect(isWorkspaceKind("wholesale_operator")).toBe(true);
    expect(isWorkspaceKind("embed_customer")).toBe(true);
  });
  it("rejects unknown values", () => {
    expect(isWorkspaceKind("admin")).toBe(false);
    expect(isWorkspaceKind("")).toBe(false);
    expect(isWorkspaceKind("INVESTOR")).toBe(false); // case-sensitive
  });
});

describe("portalForKind", () => {
  it("maps each base kind to its portal", () => {
    expect(portalForKind("advisor")).toBe("/advisor-portal");
    expect(portalForKind("broker_partner")).toBe("/broker-portal");
    expect(portalForKind("business_owner")).toBe("/business-portal");
    expect(portalForKind("listing_owner")).toBe("/invest/my-listings");
    expect(portalForKind("investor")).toBe("/account");
  });
  it("respects fallback option for investor kind only", () => {
    expect(portalForKind("investor", { fallback: "/custom" })).toBe("/custom");
    expect(portalForKind("advisor", { fallback: "/custom" })).toBe("/advisor-portal");
  });
  it("squad with teamSlug routes to /teams/<slug>/dashboard", () => {
    expect(portalForKind("squad", { teamSlug: "au-smsf-property-squad" })).toBe(
      "/teams/au-smsf-property-squad/dashboard",
    );
  });
  it("squad without teamSlug falls back to chooser", () => {
    expect(portalForKind("squad")).toBe("/account/select-workspace");
    expect(portalForKind("squad", { teamSlug: null })).toBe("/account/select-workspace");
  });
  it("wholesale_operator routes to its portal", () => {
    expect(portalForKind("wholesale_operator")).toBe("/wholesale-portal");
  });
  it("embed_customer routes to its portal", () => {
    expect(portalForKind("embed_customer")).toBe("/embed-portal");
  });
});

describe("chooseCallbackRedirect", () => {
  it("0 kinds → fallback + lazy-investor cookie + no team", () => {
    const r = chooseCallbackRedirect([], "/account");
    expect(r.redirect).toBe("/account");
    expect(r.setKind).toBe("investor");
    expect(r.setTeamId).toBeNull();
  });

  it("1 base kind → that portal + matching cookie + no team", () => {
    const r = chooseCallbackRedirect([m("advisor")], "/account");
    expect(r.redirect).toBe("/advisor-portal");
    expect(r.setKind).toBe("advisor");
    expect(r.setTeamId).toBeNull();
  });

  it("2+ kinds → chooser, no cookies set", () => {
    const r = chooseCallbackRedirect([m("advisor"), m("investor")], "/account");
    expect(r.redirect).toBe("/account/select-workspace");
    expect(r.setKind).toBeNull();
    expect(r.setTeamId).toBeNull();
  });

  it("respects fallbackNext for the 0-kind case", () => {
    const r = chooseCallbackRedirect([], "/find-advisor");
    expect(r.redirect).toBe("/find-advisor");
  });

  it("uses portalForKind for the 1-kind broker_partner case", () => {
    const r = chooseCallbackRedirect([m("broker_partner")], "/account");
    expect(r.redirect).toBe("/broker-portal");
  });

  it("1 squad membership → squad dashboard + both cookies", () => {
    const r = chooseCallbackRedirect(
      [m("squad", { kindId: "42", scopeSlug: "au-smsf-property-squad" })],
      "/account",
    );
    expect(r.redirect).toBe("/teams/au-smsf-property-squad/dashboard");
    expect(r.setKind).toBe("squad");
    expect(r.setTeamId).toBe("42");
  });

  it("1 squad with no scopeSlug → chooser (defensive)", () => {
    const r = chooseCallbackRedirect(
      [m("squad", { kindId: "42", scopeSlug: null })],
      "/account",
    );
    // portalForKind('squad', { teamSlug: null }) falls through to chooser
    expect(r.redirect).toBe("/account/select-workspace");
    expect(r.setKind).toBe("squad");
    expect(r.setTeamId).toBe("42");
  });

  it("base kind + squad → chooser (multi-membership)", () => {
    const r = chooseCallbackRedirect(
      [m("advisor"), m("squad", { kindId: "42", scopeSlug: "smsf" })],
      "/account",
    );
    expect(r.redirect).toBe("/account/select-workspace");
    expect(r.setKind).toBeNull();
    expect(r.setTeamId).toBeNull();
  });

  // ─── Phase 3 preference-aware routing ────────────────────────────────────

  it("multi-kind + defaultKind matches → that workspace auto-routed", () => {
    const r = chooseCallbackRedirect(
      [m("advisor"), m("investor")],
      "/account",
      {
        defaultKind: "advisor",
        defaultTeamId: null,
        lastActiveKind: "investor",
        lastActiveTeamId: null,
      },
    );
    expect(r.redirect).toBe("/advisor-portal");
    expect(r.setKind).toBe("advisor");
    expect(r.setTeamId).toBeNull();
  });

  it("multi-kind + no default + lastActive matches → last-active auto-routed", () => {
    const r = chooseCallbackRedirect(
      [m("advisor"), m("investor")],
      "/account",
      {
        defaultKind: null,
        defaultTeamId: null,
        lastActiveKind: "investor",
        lastActiveTeamId: null,
      },
    );
    expect(r.redirect).toBe("/account");
    expect(r.setKind).toBe("investor");
  });

  it("multi-kind + default points at kind the user no longer holds → chooser", () => {
    const r = chooseCallbackRedirect(
      [m("advisor"), m("investor")],
      "/account",
      {
        defaultKind: "broker_partner", // user lost this membership
        defaultTeamId: null,
        lastActiveKind: null,
        lastActiveTeamId: null,
      },
    );
    expect(r.redirect).toBe("/account/select-workspace");
    expect(r.setKind).toBeNull();
  });

  it("multi-kind + default squad with matching team id → that squad routed", () => {
    const r = chooseCallbackRedirect(
      [m("advisor"), m("squad", { kindId: "42", scopeSlug: "smsf" })],
      "/account",
      {
        defaultKind: "squad",
        defaultTeamId: "42",
        lastActiveKind: null,
        lastActiveTeamId: null,
      },
    );
    expect(r.redirect).toBe("/teams/smsf/dashboard");
    expect(r.setKind).toBe("squad");
    expect(r.setTeamId).toBe("42");
  });

  it("multi-kind + default squad with wrong team id → falls through to chooser", () => {
    const r = chooseCallbackRedirect(
      [m("advisor"), m("squad", { kindId: "42", scopeSlug: "smsf" })],
      "/account",
      {
        defaultKind: "squad",
        defaultTeamId: "999", // user is not a member of squad 999
        lastActiveKind: null,
        lastActiveTeamId: null,
      },
    );
    expect(r.redirect).toBe("/account/select-workspace");
    expect(r.setKind).toBeNull();
  });
});
