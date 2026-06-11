import { describe, it, expect } from "vitest";
import {
  projectAnnualFee,
  formatAnnualFee,
} from "@/lib/getmatched/fee-projection";
import type { Broker } from "@/lib/types";

function makeBroker(overrides: Partial<Broker> = {}): Broker {
  return {
    id: 1,
    name: "Test Broker",
    slug: "test-broker",
    color: "#000",
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    platform_type: "share_broker",
    deal: false,
    editors_pick: false,
    status: "active",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

describe("projectAnnualFee — trade-frequency assumptions per goal", () => {
  it("active goals (trade) assume 24 trades/yr", () => {
    const p = projectAnnualFee({ broker: makeBroker({ asx_fee_value: 5 }), intent: "trade" });
    expect(p).not.toBeNull();
    expect(p!.assumptionLabel).toBe("≈24 ASX trades/yr");
    expect(p!.annualCostAud).toBe(120); // 5 × 24
  });

  it("crypto goal also assumes the active band", () => {
    const p = projectAnnualFee({ broker: makeBroker({ asx_fee_value: 5 }), intent: "crypto" });
    expect(p!.assumptionLabel).toBe("≈24 ASX trades/yr");
  });

  it("growth / income goals assume 12 trades/yr", () => {
    const grow = projectAnnualFee({ broker: makeBroker({ asx_fee_value: 10 }), intent: "grow" });
    expect(grow!.assumptionLabel).toBe("≈12 ASX trades/yr");
    expect(grow!.annualCostAud).toBe(120); // 10 × 12
    const income = projectAnnualFee({ broker: makeBroker({ asx_fee_value: 10 }), intent: "income" });
    expect(income!.assumptionLabel).toBe("≈12 ASX trades/yr");
  });

  it("hands-off / automate goal assumes 4 trades/yr", () => {
    const p = projectAnnualFee({ broker: makeBroker({ asx_fee_value: 10 }), intent: "automate" });
    expect(p!.assumptionLabel).toBe("≈4 ASX trades/yr");
    expect(p!.annualCostAud).toBe(40); // 10 × 4
  });

  it("falls back to 12 trades/yr for an unknown / missing intent", () => {
    const p = projectAnnualFee({ broker: makeBroker({ asx_fee_value: 2 }) });
    expect(p!.assumptionLabel).toBe("≈12 ASX trades/yr");
    expect(p!.annualCostAud).toBe(24);
  });
});

describe("projectAnnualFee — experience + crypto_sub nudges", () => {
  it("a pro investor trades ~25% more", () => {
    // grow base 12 → pro 15
    const p = projectAnnualFee({
      broker: makeBroker({ asx_fee_value: 10 }),
      intent: "grow",
      experience: "pro",
    });
    expect(p!.assumptionLabel).toBe("≈15 ASX trades/yr");
    expect(p!.annualCostAud).toBe(150);
  });

  it("a beginner trades ~half as often (min 2)", () => {
    // grow base 12 → beginner 6
    const p = projectAnnualFee({
      broker: makeBroker({ asx_fee_value: 10 }),
      intent: "grow",
      experience: "beginner",
    });
    expect(p!.assumptionLabel).toBe("≈6 ASX trades/yr");
    expect(p!.annualCostAud).toBe(60);
  });

  it("an active crypto sub-answer raises a holder to the active band", () => {
    const p = projectAnnualFee({
      broker: makeBroker({ asx_fee_value: 5 }),
      intent: "grow",
      cryptoSub: "active",
    });
    expect(p!.assumptionLabel).toBe("≈24 ASX trades/yr");
  });
});

describe("projectAnnualFee — inactivity fee parsing", () => {
  it("adds a monthly inactivity fee × 12", () => {
    const p = projectAnnualFee({
      broker: makeBroker({ asx_fee_value: 0, inactivity_fee: "$10/month" }),
      intent: "grow",
    });
    expect(p!.annualCostAud).toBe(120); // 0 brokerage + 10×12
  });

  it("adds a quarterly inactivity fee × 4", () => {
    const p = projectAnnualFee({
      broker: makeBroker({ asx_fee_value: 0, inactivity_fee: "$15/qtr" }),
      intent: "grow",
    });
    expect(p!.annualCostAud).toBe(60); // 15×4
  });

  it("treats 'None' / '$0' / 'No' as zero inactivity cost", () => {
    for (const fee of ["None", "$0", "No"]) {
      const p = projectAnnualFee({
        broker: makeBroker({ asx_fee_value: 10, inactivity_fee: fee }),
        intent: "grow",
      });
      expect(p!.annualCostAud).toBe(120); // brokerage only
    }
  });

  it("an unparseable inactivity string contributes nothing", () => {
    const p = projectAnnualFee({
      broker: makeBroker({ asx_fee_value: 10, inactivity_fee: "varies" }),
      intent: "grow",
    });
    expect(p!.annualCostAud).toBe(120);
  });

  it("a bare-dollar inactivity fee is treated as annual", () => {
    const p = projectAnnualFee({
      broker: makeBroker({ asx_fee_value: 0, inactivity_fee: "$50 per year" }),
      intent: "grow",
    });
    expect(p!.annualCostAud).toBe(50);
  });
});

describe("projectAnnualFee — null when fee data insufficient", () => {
  it("returns null with no asx_fee_value", () => {
    expect(projectAnnualFee({ broker: makeBroker(), intent: "grow" })).toBeNull();
  });

  it("returns null when asx_fee_value is explicitly undefined", () => {
    expect(
      projectAnnualFee({ broker: makeBroker({ asx_fee_value: undefined }), intent: "grow" }),
    ).toBeNull();
  });

  it("a $0-brokerage broker still projects (0 is valid, not missing)", () => {
    const p = projectAnnualFee({ broker: makeBroker({ asx_fee_value: 0 }), intent: "grow" });
    expect(p).not.toBeNull();
    expect(p!.annualCostAud).toBe(0);
  });
});

describe("formatAnnualFee", () => {
  it("formats with AU thousands separators and /yr suffix", () => {
    expect(formatAnnualFee({ annualCostAud: 0, assumptionLabel: "x" })).toBe("$0/yr");
    expect(formatAnnualFee({ annualCostAud: 1200, assumptionLabel: "x" })).toBe("$1,200/yr");
  });
});
