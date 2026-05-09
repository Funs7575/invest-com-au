import { describe, it, expect } from "vitest";
import {
  computeTrueCost,
  formatTcoAmount,
  type BrokerFeeProfile,
} from "@/lib/tco";

const FULL_BROKER: BrokerFeeProfile = {
  slug: "full",
  asx_fee_value: 5,
  us_fee_value: 10,
  fx_rate: 0.006,
  inactivity_fee_value: 50,
  account_transfer_out_fee: 100,
  inactivity_threshold_balance: 10_000,
};

const BARE_BROKER: BrokerFeeProfile = {
  slug: "bare",
  asx_fee_value: null,
  us_fee_value: null,
  fx_rate: null,
  inactivity_fee_value: null,
};

describe("computeTrueCost — happy path", () => {
  it("computes ASX brokerage × 12 months", () => {
    const out = computeTrueCost(FULL_BROKER, { asx_trades_per_month: 4 });
    // 4 trades × 12 months × $5 = $240
    expect(out.effective).toBe(240);
    const asx = out.components.find((c) => c.sourceField === "asx_fee_value");
    expect(asx?.amount).toBe(240);
    expect(asx?.fromKnownData).toBe(true);
  });

  it("adds US brokerage to ASX", () => {
    const out = computeTrueCost(FULL_BROKER, {
      asx_trades_per_month: 2,
      us_trades_per_month: 3,
    });
    // ASX: 2*12*5=120, US: 3*12*10=360 → 480
    const asx = out.components.find((c) => c.label.startsWith("ASX"));
    const us = out.components.find((c) => c.label.startsWith("US"));
    expect(asx?.amount).toBe(120);
    expect(us?.amount).toBe(360);
  });

  it("adds FX spread when there's USD volume", () => {
    const out = computeTrueCost(FULL_BROKER, {
      us_trades_per_month: 5,
      avg_us_trade_amount_usd: 1000,
    });
    // USD volume / yr = 5*12*1000 = $60,000; spread 0.6% = $360
    const fx = out.components.find((c) => c.sourceField === "fx_rate");
    expect(fx?.amount).toBe(360);
  });

  it("adds inactivity fee when balance under threshold", () => {
    const out = computeTrueCost(FULL_BROKER, {
      asx_trades_per_month: 1,
      avg_holding_balance_aud: 5000, // under 10k threshold
    });
    const inactivity = out.components.find(
      (c) => c.sourceField === "inactivity_fee_value",
    );
    expect(inactivity?.amount).toBe(50);
  });

  it("skips inactivity fee when balance over threshold", () => {
    const out = computeTrueCost(FULL_BROKER, {
      asx_trades_per_month: 1,
      avg_holding_balance_aud: 100_000,
    });
    const inactivity = out.components.find(
      (c) => c.sourceField === "inactivity_fee_value",
    );
    expect(inactivity?.amount).toBe(0);
  });

  it("amortises transfer-out fee over horizon years when included", () => {
    const out = computeTrueCost(FULL_BROKER, {
      include_transfer_out: true,
      horizon_years: 5,
    });
    const t = out.components.find(
      (c) => c.sourceField === "account_transfer_out_fee",
    );
    expect(t?.amount).toBe(20); // 100 / 5 = 20
  });
});

describe("computeTrueCost — coverageScore", () => {
  it("is 1 when all applicable components have data", () => {
    const out = computeTrueCost(FULL_BROKER, { asx_trades_per_month: 1 });
    expect(out.coverageScore).toBe(1);
  });

  it("drops below 1 when a relevant field is null", () => {
    const out = computeTrueCost(BARE_BROKER, { asx_trades_per_month: 1 });
    // 2 components applicable (asx, inactivity); 0 known → 0 coverage
    expect(out.coverageScore).toBe(0);
    expect(out.effective).toBe(0); // null fields contribute zero amount
  });

  it("partial coverage when SOME fields known", () => {
    const partial: BrokerFeeProfile = {
      ...FULL_BROKER,
      fx_rate: null,
    };
    const out = computeTrueCost(partial, {
      asx_trades_per_month: 1,
      us_trades_per_month: 1,
      avg_us_trade_amount_usd: 500,
    });
    // applicable: asx, us, fx, inactivity = 4; known: asx, us, inactivity = 3
    expect(out.coverageScore).toBe(0.75);
  });
});

describe("computeTrueCost — headline picker", () => {
  it("picks ASX headline when user trades only ASX", () => {
    const out = computeTrueCost(FULL_BROKER, { asx_trades_per_month: 5 });
    expect(out.headline).toBe(5);
  });

  it("picks US headline when user is US-heavy", () => {
    const out = computeTrueCost(FULL_BROKER, {
      asx_trades_per_month: 1,
      us_trades_per_month: 5,
    });
    expect(out.headline).toBe(10);
  });

  it("falls back to ASX headline when no trades specified", () => {
    const out = computeTrueCost(FULL_BROKER);
    expect(out.headline).toBe(5);
  });

  it("returns null headline if both venue fees are null", () => {
    expect(computeTrueCost(BARE_BROKER).headline).toBeNull();
  });
});

describe("computeTrueCost — never throws on missing data", () => {
  it("works with no profile passed", () => {
    expect(() => computeTrueCost(FULL_BROKER)).not.toThrow();
  });

  it("works on the bare broker", () => {
    expect(() => computeTrueCost(BARE_BROKER, { asx_trades_per_month: 5 })).not.toThrow();
  });
});

describe("formatTcoAmount", () => {
  it("returns '$0' for zero", () => {
    expect(formatTcoAmount(0)).toBe("$0");
  });
  it("preserves cents for small amounts", () => {
    expect(formatTcoAmount(3)).toBe("$3.00");
    expect(formatTcoAmount(9.99)).toBe("$9.99");
  });
  it("rounds + commas large amounts", () => {
    expect(formatTcoAmount(1234)).toBe("$1,234");
    expect(formatTcoAmount(1234567)).toBe("$1,234,567");
  });
});
