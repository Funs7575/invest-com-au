import { describe, it, expect } from "vitest";
import {
  inferAdvisorType,
  inferVertical,
  inferRoute,
  defaultRouteForGoal,
} from "@/lib/getmatched/inference";

describe("inferAdvisorType", () => {
  it("picks explicit help_sub when present", () => {
    expect(
      inferAdvisorType({ help_sub: "mortgage_broker" }),
    ).toBe("mortgage_broker");
    expect(inferAdvisorType({ help_sub: "tax_agent" })).toBe("tax_agent");
    expect(inferAdvisorType({ help_sub: "smsf_accountant" })).toBe(
      "smsf_accountant",
    );
  });

  it("picks buyers_agent for property_sub=physical", () => {
    expect(
      inferAdvisorType({ intent: "property", property_sub: "physical" }),
    ).toBe("buyers_agent");
  });

  it("picks smsf_accountant for super_sub=smsf_setup", () => {
    expect(
      inferAdvisorType({ intent: "super", super_sub: "smsf_setup" }),
    ).toBe("smsf_accountant");
  });

  it("picks tax_agent for crypto_sub=tax", () => {
    expect(
      inferAdvisorType({ intent: "crypto", crypto_sub: "tax" }),
    ).toBe("tax_agent");
  });

  it("falls back to mortgage_broker for goal=home", () => {
    expect(inferAdvisorType({ intent: "home" })).toBe("mortgage_broker");
  });

  it("escalates to financial_planner for large balances", () => {
    expect(
      inferAdvisorType({ intent: "income", budget_band: "1m_plus" }),
    ).toBe("financial_planner");
  });
});

describe("inferVertical", () => {
  it("returns the right vertical per goal", () => {
    expect(inferVertical({ intent: "grow" })).toBe("shares");
    expect(inferVertical({ intent: "crypto" })).toBe("crypto");
    expect(inferVertical({ intent: "super" })).toBe("super");
    expect(inferVertical({ intent: "property" })).toBe("property");
    expect(inferVertical({ intent: "home" })).toBe("lender");
    expect(inferVertical({ intent: "alt_assets" })).toBe("alt");
    expect(inferVertical({ intent: "pre_ipo" })).toBe("pre_ipo");
  });

  it("respects browse_sub override", () => {
    expect(
      inferVertical({ intent: "browse", browse_sub: "property" }),
    ).toBe("property");
  });

  it("respects property_sub=reit (→ property vertical for the compare page)", () => {
    expect(
      inferVertical({ intent: "property", property_sub: "reit" }),
    ).toBe("property");
  });

  it("income_sub=property_income → property vertical, royalty_income → royalties", () => {
    expect(
      inferVertical({ intent: "income", income_sub: "property_income" }),
    ).toBe("property");
    expect(
      inferVertical({ intent: "income", income_sub: "royalty_income" }),
    ).toBe("royalties");
    // dividend / income_etfs keep the shares vertical (goal default).
    expect(
      inferVertical({ intent: "income", income_sub: "dividend_shares" }),
    ).toBe("shares");
    expect(
      inferVertical({ intent: "income", income_sub: "income_etfs" }),
    ).toBe("shares");
  });

  it("trade_sub=crypto_trading → crypto vertical, others keep trade", () => {
    expect(
      inferVertical({ intent: "trade", trade_sub: "crypto_trading" }),
    ).toBe("crypto");
    expect(
      inferVertical({ intent: "trade", trade_sub: "shares_etfs" }),
    ).toBe("trade");
    expect(
      inferVertical({ intent: "trade", trade_sub: "cfds_forex" }),
    ).toBe("trade");
    expect(inferVertical({ intent: "trade", trade_sub: "options" })).toBe(
      "trade",
    );
  });

  it("automate_sub options keep the robo vertical", () => {
    for (const sub of ["full_robo", "round_ups", "managed_portfolio", "compare_robo"]) {
      expect(inferVertical({ intent: "automate", automate_sub: sub })).toBe(
        "robo",
      );
    }
  });

  it("grow_sub options keep the shares vertical", () => {
    for (const sub of ["just_starting", "etfs_longterm", "pick_shares", "guide_me"]) {
      expect(inferVertical({ intent: "grow", grow_sub: sub })).toBe("shares");
    }
  });

  it("royalties_sub options keep the royalties vertical", () => {
    for (const sub of ["music_ip", "mining", "vending_atm", "browse_all"]) {
      expect(inferVertical({ intent: "royalties", royalties_sub: sub })).toBe(
        "royalties",
      );
    }
  });
});

describe("inferRoute", () => {
  describe("listing-owner branch", () => {
    it("forces listing_brief when starting_point=listing_owner", () => {
      const r = inferRoute({ starting_point: "listing_owner", intent: "property" });
      expect(r.route).toBe("listing_brief");
      expect(r.href).toContain("/briefs/new");
    });

    it("forces listing_brief when listing_sub is present", () => {
      const r = inferRoute({ listing_sub: "business" });
      expect(r.route).toBe("listing_brief");
    });
  });

  describe("help_preference wins when explicit", () => {
    it("info_only → guide", () => {
      expect(inferRoute({ help_preference: "info_only" }).route).toBe("guide");
    });
    it("browse → /invest with vertical filter", () => {
      const r = inferRoute({ intent: "property", help_preference: "browse" });
      expect(r.route).toBe("browse");
      expect(r.href).toBe("/invest?vertical=property");
    });
    it("compare → /compare with vertical filter", () => {
      const r = inferRoute({ intent: "crypto", help_preference: "compare" });
      expect(r.route).toBe("compare");
      expect(r.href).toBe("/compare?vertical=crypto");
    });
    it("individual → filtered /advisors", () => {
      const r = inferRoute({ intent: "home", help_preference: "individual" });
      expect(r.route).toBe("individual");
      expect(r.href).toBe("/advisors?type=mortgage_broker");
    });
    it("firm → /advisors?provider_type=firm", () => {
      expect(
        inferRoute({ help_preference: "firm" }).href,
      ).toBe("/advisors?provider_type=firm");
    });
    it("expert_team → /advisors#expert-teams", () => {
      expect(
        inferRoute({ help_preference: "expert_team" }).href,
      ).toBe("/advisors#expert-teams");
    });
    it("investor_brief → /briefs/new", () => {
      expect(
        inferRoute({ help_preference: "investor_brief" }).href,
      ).toBe("/briefs/new");
    });
  });

  describe("sub-question hints (when help_preference is empty)", () => {
    it("property_sub=browse → browse route at /invest?vertical=property", () => {
      const r = inferRoute({
        intent: "property",
        property_sub: "browse",
      });
      expect(r.route).toBe("browse");
      expect(r.href).toBe("/invest?vertical=property");
    });
    it("property_sub=reit → compare?vertical=property", () => {
      const r = inferRoute({
        intent: "property",
        property_sub: "reit",
      });
      expect(r.route).toBe("compare");
      expect(r.href).toBe("/compare?vertical=property");
    });
    it("property_sub=physical → individual buyers_agent", () => {
      const r = inferRoute({
        intent: "property",
        property_sub: "physical",
      });
      expect(r.route).toBe("individual");
      expect(r.advisor_type).toBe("buyers_agent");
    });
    it("property_sub=smsf → expert_team", () => {
      expect(
        inferRoute({ intent: "property", property_sub: "smsf" }).route,
      ).toBe("expert_team");
    });
    it("pre_ipo_sub=browse_calendar → browse?vertical=pre_ipo", () => {
      const r = inferRoute({
        intent: "pre_ipo",
        pre_ipo_sub: "browse_calendar",
      });
      expect(r.route).toBe("browse");
      expect(r.href).toBe("/invest?vertical=pre_ipo");
    });
  });

  describe("new step-3 sub-questions — every option pinned (route + vertical)", () => {
    // grow_sub
    it("grow_sub=just_starting → compare?vertical=shares (default compare)", () => {
      const r = inferRoute({ intent: "grow", grow_sub: "just_starting" });
      expect(r.route).toBe("compare");
      expect(r.href).toBe("/compare");
      expect(r.vertical).toBe("shares");
    });
    it("grow_sub=etfs_longterm → compare shares", () => {
      const r = inferRoute({ intent: "grow", grow_sub: "etfs_longterm" });
      expect(r.route).toBe("compare");
      expect(r.vertical).toBe("shares");
    });
    it("grow_sub=pick_shares → compare shares", () => {
      const r = inferRoute({ intent: "grow", grow_sub: "pick_shares" });
      expect(r.route).toBe("compare");
      expect(r.vertical).toBe("shares");
    });
    it("grow_sub=guide_me → guide /articles", () => {
      const r = inferRoute({ intent: "grow", grow_sub: "guide_me" });
      expect(r.route).toBe("guide");
      expect(r.href).toBe("/articles");
    });

    // income_sub
    it("income_sub=dividend_shares → compare shares", () => {
      const r = inferRoute({ intent: "income", income_sub: "dividend_shares" });
      expect(r.route).toBe("compare");
      expect(r.href).toBe("/compare");
      expect(r.vertical).toBe("shares");
    });
    it("income_sub=income_etfs → compare shares", () => {
      const r = inferRoute({ intent: "income", income_sub: "income_etfs" });
      expect(r.route).toBe("compare");
      expect(r.vertical).toBe("shares");
    });
    it("income_sub=property_income → compare?vertical=property (REIT compare)", () => {
      const r = inferRoute({ intent: "income", income_sub: "property_income" });
      expect(r.route).toBe("compare");
      expect(r.href).toBe("/compare?vertical=property");
      expect(r.vertical).toBe("property");
    });
    it("income_sub=royalty_income → browse?vertical=royalties", () => {
      const r = inferRoute({ intent: "income", income_sub: "royalty_income" });
      expect(r.route).toBe("browse");
      expect(r.href).toBe("/invest?vertical=royalties");
      expect(r.vertical).toBe("royalties");
    });

    // trade_sub
    it("trade_sub=shares_etfs → compare?vertical=trade", () => {
      const r = inferRoute({ intent: "trade", trade_sub: "shares_etfs" });
      expect(r.route).toBe("compare");
      expect(r.href).toBe("/compare?vertical=trade");
      expect(r.vertical).toBe("trade");
    });
    it("trade_sub=cfds_forex → compare?vertical=trade", () => {
      const r = inferRoute({ intent: "trade", trade_sub: "cfds_forex" });
      expect(r.route).toBe("compare");
      expect(r.vertical).toBe("trade");
    });
    it("trade_sub=options → compare?vertical=trade", () => {
      const r = inferRoute({ intent: "trade", trade_sub: "options" });
      expect(r.route).toBe("compare");
      expect(r.vertical).toBe("trade");
    });
    it("trade_sub=crypto_trading → compare?vertical=crypto", () => {
      const r = inferRoute({ intent: "trade", trade_sub: "crypto_trading" });
      expect(r.route).toBe("compare");
      expect(r.href).toBe("/compare?vertical=crypto");
      expect(r.vertical).toBe("crypto");
    });

    // automate_sub — all robo compare
    it("automate_sub options → compare?vertical=robo", () => {
      for (const sub of ["full_robo", "round_ups", "managed_portfolio", "compare_robo"]) {
        const r = inferRoute({ intent: "automate", automate_sub: sub });
        expect(r.route).toBe("compare");
        expect(r.href).toBe("/compare?vertical=robo");
        expect(r.vertical).toBe("robo");
      }
    });

    // royalties_sub — all browse royalties
    it("royalties_sub options → browse?vertical=royalties", () => {
      for (const sub of ["music_ip", "mining", "vending_atm", "browse_all"]) {
        const r = inferRoute({ intent: "royalties", royalties_sub: sub });
        expect(r.route).toBe("browse");
        expect(r.href).toBe("/invest?vertical=royalties");
        expect(r.vertical).toBe("royalties");
      }
    });
  });

  describe("goal-default fallback (no help_preference, no sub-hint)", () => {
    it("grow → compare?vertical=shares", () => {
      const r = inferRoute({ intent: "grow" });
      expect(r.route).toBe("compare");
      expect(r.href).toBe("/compare");
    });
    it("crypto → compare?vertical=crypto", () => {
      const r = inferRoute({ intent: "crypto" });
      expect(r.route).toBe("compare");
      expect(r.href).toBe("/compare?vertical=crypto");
    });
    it("super → individual smsf_accountant", () => {
      const r = inferRoute({ intent: "super" });
      expect(r.route).toBe("individual");
      expect(r.advisor_type).toBe("smsf_accountant");
    });
    it("property (no sub) → browse listings", () => {
      const r = inferRoute({ intent: "property" });
      expect(r.route).toBe("browse");
      expect(r.href).toBe("/invest?vertical=property");
    });
    it("home → individual mortgage_broker", () => {
      const r = inferRoute({ intent: "home" });
      expect(r.route).toBe("individual");
      expect(r.advisor_type).toBe("mortgage_broker");
    });
    it("alt_assets → browse?vertical=alt", () => {
      const r = inferRoute({ intent: "alt_assets" });
      expect(r.route).toBe("browse");
      expect(r.href).toBe("/invest?vertical=alt");
    });
    it("browse → /invest", () => {
      expect(inferRoute({ intent: "browse" }).href).toBe("/invest");
    });
    it("help → individual financial_planner by default", () => {
      const r = inferRoute({ intent: "help" });
      expect(r.route).toBe("individual");
      expect(r.advisor_type).toBe("financial_planner");
    });
  });

  describe("zero dead-ends — every goal × help-pref reaches a route", () => {
    const GOALS = [
      "grow", "income", "crypto", "trade", "automate", "super",
      "property", "home", "alt_assets", "royalties", "pre_ipo",
      "help", "browse",
    ];
    const HELPS = [
      "info_only", "browse", "compare", "individual", "firm",
      "expert_team", "investor_brief", "not_sure_help",
    ];

    for (const goal of GOALS) {
      for (const help of HELPS) {
        it(`goal=${goal} × help=${help} resolves to a non-empty href`, () => {
          const r = inferRoute({ intent: goal, help_preference: help });
          expect(r.href).toBeTruthy();
          expect(r.route).toBeTruthy();
        });
      }
    }
  });
});

describe("defaultRouteForGoal", () => {
  it("returns expected default routes for the 13 retail goals", () => {
    expect(defaultRouteForGoal("grow")).toBe("compare");
    expect(defaultRouteForGoal("crypto")).toBe("compare");
    expect(defaultRouteForGoal("super")).toBe("individual");
    expect(defaultRouteForGoal("property")).toBe("browse");
    expect(defaultRouteForGoal("home")).toBe("individual");
    expect(defaultRouteForGoal("alt_assets")).toBe("browse");
    expect(defaultRouteForGoal("help")).toBe("individual");
    expect(defaultRouteForGoal("browse")).toBe("browse");
  });
});
