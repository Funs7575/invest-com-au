import { describe, it, expect } from "vitest";
import {
  buildInvestorProfile,
  type ProfileSignal,
} from "@/lib/getmatched/investor-profile";
import type { ActionPlanAnswers } from "@/lib/getmatched/types";

const sig = (signals: ProfileSignal[], name: string) =>
  signals.find((s) => s.name === name);

describe("buildInvestorProfile — label composition across all 13 retail intents", () => {
  it("grow base + each sub-answer variation", () => {
    expect(buildInvestorProfile({ intent: "grow" }).label).toBe(
      "Long-term growth investor",
    );
    expect(
      buildInvestorProfile({ intent: "grow", grow_sub: "just_starting" }).label,
    ).toBe("First-step investor");
    expect(
      buildInvestorProfile({ intent: "grow", grow_sub: "etfs_longterm" }).label,
    ).toBe("Long-term ETF investor");
    expect(
      buildInvestorProfile({ intent: "grow", grow_sub: "pick_shares" }).label,
    ).toBe("Share-picking investor");
    expect(
      buildInvestorProfile({ intent: "grow", grow_sub: "guide_me" }).label,
    ).toBe("Investor seeking guidance");
  });

  it("income base + each sub-answer variation", () => {
    expect(buildInvestorProfile({ intent: "income" }).label).toBe(
      "Income & dividend investor",
    );
    expect(
      buildInvestorProfile({ intent: "income", income_sub: "dividend_shares" }).label,
    ).toBe("Dividend-share investor");
    expect(
      buildInvestorProfile({ intent: "income", income_sub: "income_etfs" }).label,
    ).toBe("Income-ETF / LIC investor");
    expect(
      buildInvestorProfile({ intent: "income", income_sub: "property_income" }).label,
    ).toBe("REIT income investor");
    expect(
      buildInvestorProfile({ intent: "income", income_sub: "royalty_income" }).label,
    ).toBe("Royalty-income investor");
  });

  it("crypto base + each sub-answer variation", () => {
    expect(buildInvestorProfile({ intent: "crypto" }).label).toBe(
      "Crypto investor",
    );
    expect(
      buildInvestorProfile({ intent: "crypto", crypto_sub: "first_buy" }).label,
    ).toBe("First-time crypto buyer");
    expect(
      buildInvestorProfile({ intent: "crypto", crypto_sub: "hodl" }).label,
    ).toBe("Long-term crypto holder");
    expect(
      buildInvestorProfile({ intent: "crypto", crypto_sub: "active" }).label,
    ).toBe("Crypto-focused active trader");
    expect(
      buildInvestorProfile({ intent: "crypto", crypto_sub: "tax" }).label,
    ).toBe("Crypto investor seeking tax help");
  });

  it("trade base + each sub-answer variation", () => {
    expect(buildInvestorProfile({ intent: "trade" }).label).toBe("Active trader");
    expect(
      buildInvestorProfile({ intent: "trade", trade_sub: "shares_etfs" }).label,
    ).toBe("Shares & ETF trader");
    expect(
      buildInvestorProfile({ intent: "trade", trade_sub: "cfds_forex" }).label,
    ).toBe("CFD & forex trader");
    expect(
      buildInvestorProfile({ intent: "trade", trade_sub: "options" }).label,
    ).toBe("Options trader");
    expect(
      buildInvestorProfile({ intent: "trade", trade_sub: "crypto_trading" }).label,
    ).toBe("Crypto trader");
  });

  it("automate base + each sub-answer variation", () => {
    expect(buildInvestorProfile({ intent: "automate" }).label).toBe(
      "Hands-off / robo investor",
    );
    expect(
      buildInvestorProfile({ intent: "automate", automate_sub: "full_robo" }).label,
    ).toBe("Full robo-advice investor");
    expect(
      buildInvestorProfile({ intent: "automate", automate_sub: "round_ups" }).label,
    ).toBe("Round-ups / micro-investor");
    expect(
      buildInvestorProfile({ intent: "automate", automate_sub: "managed_portfolio" }).label,
    ).toBe("Managed-portfolio investor");
    expect(
      buildInvestorProfile({ intent: "automate", automate_sub: "compare_robo" }).label,
    ).toBe("Robo-advisor comparer");
  });

  it("super base + each sub-answer variation", () => {
    expect(buildInvestorProfile({ intent: "super" }).label).toBe(
      "Super / SMSF planner",
    );
    expect(
      buildInvestorProfile({ intent: "super", super_sub: "compare_funds" }).label,
    ).toBe("Super-fund switcher");
    expect(
      buildInvestorProfile({ intent: "super", super_sub: "smsf_setup" }).label,
    ).toBe("SMSF set-up planner");
    expect(
      buildInvestorProfile({ intent: "super", super_sub: "smsf_property" }).label,
    ).toBe("SMSF property strategist");
    expect(
      buildInvestorProfile({ intent: "super", super_sub: "pre_retire" }).label,
    ).toBe("Pre-retirement planner");
  });

  it("property base + each sub-answer variation", () => {
    expect(buildInvestorProfile({ intent: "property" }).label).toBe(
      "Property investor",
    );
    expect(
      buildInvestorProfile({ intent: "property", property_sub: "physical" }).label,
    ).toBe("Direct property investor");
    expect(
      buildInvestorProfile({ intent: "property", property_sub: "reit" }).label,
    ).toBe("REIT / fractional-property investor");
    expect(
      buildInvestorProfile({ intent: "property", property_sub: "smsf" }).label,
    ).toBe("SMSF property strategist");
    expect(
      buildInvestorProfile({ intent: "property", property_sub: "browse" }).label,
    ).toBe("Property-listing explorer");
  });

  it("home → first-home buyer", () => {
    expect(buildInvestorProfile({ intent: "home" }).label).toBe(
      "First-home buyer",
    );
  });

  it("alt_assets base + named asset sub-answers", () => {
    expect(buildInvestorProfile({ intent: "alt_assets" }).label).toBe(
      "Alternative-assets investor",
    );
    expect(
      buildInvestorProfile({ intent: "alt_assets", alt_assets_sub: "whisky" }).label,
    ).toBe("Whisky & wine collector");
    expect(
      buildInvestorProfile({ intent: "alt_assets", alt_assets_sub: "art" }).label,
    ).toBe("Art collector");
    expect(
      buildInvestorProfile({ intent: "alt_assets", alt_assets_sub: "watches" }).label,
    ).toBe("Watch collector");
    expect(
      buildInvestorProfile({ intent: "alt_assets", alt_assets_sub: "cars" }).label,
    ).toBe("Classic-car collector");
    expect(
      buildInvestorProfile({ intent: "alt_assets", alt_assets_sub: "coins" }).label,
    ).toBe("Coin & collectible collector");
    // browse_all is not a named asset → falls back to the base label.
    expect(
      buildInvestorProfile({ intent: "alt_assets", alt_assets_sub: "browse_all" }).label,
    ).toBe("Alternative-assets investor");
  });

  it("royalties base + each sub-answer variation", () => {
    expect(buildInvestorProfile({ intent: "royalties" }).label).toBe(
      "Royalties / income-asset investor",
    );
    expect(
      buildInvestorProfile({ intent: "royalties", royalties_sub: "music_ip" }).label,
    ).toBe("Music / IP royalties investor");
    expect(
      buildInvestorProfile({ intent: "royalties", royalties_sub: "mining" }).label,
    ).toBe("Mining-royalties investor");
    expect(
      buildInvestorProfile({ intent: "royalties", royalties_sub: "vending_atm" }).label,
    ).toBe("Vending / ATM income investor");
    // browse_all is not a named stream → falls back to the base label.
    expect(
      buildInvestorProfile({ intent: "royalties", royalties_sub: "browse_all" }).label,
    ).toBe("Royalties / income-asset investor");
  });

  it("pre_ipo base + each sub-answer variation", () => {
    expect(buildInvestorProfile({ intent: "pre_ipo" }).label).toBe(
      "Pre-IPO / wholesale explorer",
    );
    expect(
      buildInvestorProfile({ intent: "pre_ipo", pre_ipo_sub: "invest_now" }).label,
    ).toBe("Wholesale pre-IPO investor");
    expect(
      buildInvestorProfile({ intent: "pre_ipo", pre_ipo_sub: "browse_calendar" }).label,
    ).toBe("IPO-calendar watcher");
    expect(
      buildInvestorProfile({ intent: "pre_ipo", pre_ipo_sub: "get_verified" }).label,
    ).toBe("Aspiring wholesale investor");
  });

  it("help base + each help_sub variation", () => {
    expect(buildInvestorProfile({ intent: "help" }).label).toBe(
      "Investor seeking expert help",
    );
    expect(
      buildInvestorProfile({ intent: "help", help_sub: "financial_planner" }).label,
    ).toBe("Investor seeking a financial planner");
    expect(
      buildInvestorProfile({ intent: "help", help_sub: "mortgage_broker" }).label,
    ).toBe("Borrower seeking a mortgage broker");
    expect(
      buildInvestorProfile({ intent: "help", help_sub: "tax_agent" }).label,
    ).toBe("Investor seeking tax help");
    expect(
      buildInvestorProfile({ intent: "help", help_sub: "smsf_accountant" }).label,
    ).toBe("Investor seeking an SMSF accountant");
    expect(
      buildInvestorProfile({ intent: "help", help_sub: "buyers_agent" }).label,
    ).toBe("Buyer seeking a buyer's agent");
    expect(
      buildInvestorProfile({ intent: "help", help_sub: "lawyer" }).label,
    ).toBe("Investor seeking a lawyer / conveyancer");
    expect(
      buildInvestorProfile({ intent: "help", help_sub: "not_sure_help" }).label,
    ).toBe("Investor seeking guidance");
  });

  it("browse base + each browse_sub variation", () => {
    expect(buildInvestorProfile({ intent: "browse" }).label).toBe(
      "Early-stage explorer",
    );
    expect(
      buildInvestorProfile({ intent: "browse", browse_sub: "shares" }).label,
    ).toBe("Share-platform explorer");
    expect(
      buildInvestorProfile({ intent: "browse", browse_sub: "property" }).label,
    ).toBe("Property-listing explorer");
    expect(
      buildInvestorProfile({ intent: "browse", browse_sub: "opportunities" }).label,
    ).toBe("Private-opportunity explorer");
    expect(
      buildInvestorProfile({ intent: "browse", browse_sub: "advisors" }).label,
    ).toBe("Investor browsing experts");
  });
});

describe("buildInvestorProfile — experience / complexity prefix", () => {
  it("prepends the experience adjective and lowercases the core", () => {
    expect(
      buildInvestorProfile({ intent: "crypto", crypto_sub: "active", experience: "beginner" })
        .label,
    ).toBe("Beginner crypto-focused active trader");
    expect(
      buildInvestorProfile({ intent: "grow", experience: "intermediate" }).label,
    ).toBe("Experienced long-term growth investor");
    expect(
      buildInvestorProfile({ intent: "grow", experience: "pro" }).label,
    ).toBe("Advanced long-term growth investor");
  });

  it("falls back to the complexity adjective when no experience answer", () => {
    expect(
      buildInvestorProfile({ intent: "help", help_sub: "financial_planner", complexity: "complex" })
        .label,
    ).toBe("Complex-situation investor seeking a financial planner");
  });

  it("experience wins over complexity when both present", () => {
    expect(
      buildInvestorProfile({ intent: "grow", experience: "pro", complexity: "simple" }).label,
    ).toBe("Advanced long-term growth investor");
  });
});

describe("buildInvestorProfile — descriptor uses correct article + restatement framing", () => {
  it("uses 'a' / 'an' correctly and frames as 'based on what you told us'", () => {
    expect(buildInvestorProfile({ intent: "trade" }).descriptor).toBe(
      "Based on what you told us, you described yourself as an active trader.",
    );
    expect(buildInvestorProfile({ intent: "grow" }).descriptor).toBe(
      "Based on what you told us, you described yourself as a long-term growth investor.",
    );
  });
});

describe("buildInvestorProfile — signal chips", () => {
  it("returns budget / timeline / help / experience as display-ready signals", () => {
    const { signals } = buildInvestorProfile({
      intent: "grow",
      budget_band: "10k_100k",
      timeline: "now",
      help_preference: "compare",
      experience: "beginner",
    });
    expect(sig(signals, "Budget")?.value).toBe("A$10k–$100k");
    expect(sig(signals, "Timeline")?.value).toBe("Ready now");
    expect(sig(signals, "Help")?.value).toBe("Wants to compare platforms");
    expect(sig(signals, "Experience")?.value).toBe("Complete beginner");
  });

  it("orders strongest signals first (budget + now timeline lead)", () => {
    const { signals } = buildInvestorProfile({
      intent: "grow",
      budget_band: "100k_500k",
      timeline: "now",
      help_preference: "not_sure_help",
    });
    // Both budget (3) and timeline-now (3) are strength 3; help_preference
    // not_sure_help is strength 1 and must come last.
    expect(signals[signals.length - 1]?.name).toBe("Help");
    expect(signals[0]?.strength).toBe(3);
  });

  it("prefer_not budget is a weak signal", () => {
    const { signals } = buildInvestorProfile({ intent: "grow", budget_band: "prefer_not" });
    expect(sig(signals, "Budget")?.value).toBe("Amount kept private");
    expect(sig(signals, "Budget")?.strength).toBe(1);
  });

  it("researching timeline is the softest urgency signal", () => {
    const { signals } = buildInvestorProfile({ intent: "grow", timeline: "researching" });
    expect(sig(signals, "Timeline")?.strength).toBe(1);
  });

  it("uses the complexity 'Situation' signal when no experience answer", () => {
    const { signals } = buildInvestorProfile({
      intent: "help",
      help_preference: "individual",
      complexity: "moderate",
    });
    expect(sig(signals, "Situation")?.value).toBe("Moderate situation");
    expect(sig(signals, "Experience")).toBeUndefined();
  });

  it("covers every budget band label", () => {
    const bands: Record<string, string> = {
      under_10k: "Under A$10k",
      "10k_100k": "A$10k–$100k",
      "100k_500k": "A$100k–$500k",
      "500k_1m": "A$500k–$1m",
      "1m_plus": "A$1m+",
    };
    for (const [band, label] of Object.entries(bands)) {
      const { signals } = buildInvestorProfile({ intent: "grow", budget_band: band });
      expect(sig(signals, "Budget")?.value).toBe(label);
    }
  });
});

describe("buildInvestorProfile — edge cases", () => {
  it("empty answers → generic investor, no signals, no crash", () => {
    const p = buildInvestorProfile({});
    expect(p.label).toBe("Investor");
    expect(p.signals).toEqual([]);
    expect(p.descriptor).toContain("an investor");
  });

  it("unknown intent slug → generic investor", () => {
    const p = buildInvestorProfile({ intent: "totally_made_up" } as ActionPlanAnswers);
    expect(p.label).toBe("Investor");
  });

  it("non-string answer values are ignored gracefully", () => {
    const p = buildInvestorProfile({
      intent: "grow",
      budget_band: 42 as unknown as string,
      timeline: null,
    });
    expect(p.label).toBe("Long-term growth investor");
    expect(p.signals).toEqual([]);
  });

  it("unknown sub-answer falls through to the base label", () => {
    expect(
      buildInvestorProfile({ intent: "crypto", crypto_sub: "nonsense" }).label,
    ).toBe("Crypto investor");
  });
});
