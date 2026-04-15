import { describe, it, expect } from "vitest";
import {
  rankBrokersForScenario,
  type BrokerForScoring,
  type ScenarioInput,
} from "@/lib/best-for-scorer";

const BROKERS: BrokerForScoring[] = [
  {
    id: 1,
    slug: "stake",
    name: "Stake",
    status: "active",
    rating: 4.5,
    asx_fee_value: 3,
    us_fee_value: 0,
    fx_rate: 0.7,
    chess_sponsored: true,
    smsf_support: true,
  },
  {
    id: 2,
    slug: "cmc",
    name: "CMC Markets",
    status: "active",
    rating: 4.7,
    asx_fee_value: 0,
    us_fee_value: 0,
    fx_rate: 0.6,
    chess_sponsored: true,
    smsf_support: true,
  },
  {
    id: 3,
    slug: "pearler",
    name: "Pearler",
    status: "active",
    rating: 4.3,
    asx_fee_value: 6.5,
    us_fee_value: 6.5,
    fx_rate: 0.6,
    chess_sponsored: true,
    smsf_support: true,
  },
  {
    id: 4,
    slug: "defunct",
    name: "Defunct Broker",
    status: "inactive",
    rating: 3,
    asx_fee_value: 0,
    chess_sponsored: false,
    smsf_support: false,
  },
];

describe("rankBrokersForScenario — filter gates", () => {
  it("drops inactive brokers", () => {
    const scenario: ScenarioInput = {
      slug: "test",
      scoring_weights: { asx_fee_value: -1 },
    };
    const r = rankBrokersForScenario(scenario, BROKERS);
    expect(r.find((s) => s.broker.slug === "defunct")).toBeUndefined();
  });

  it("respects required_attrs", () => {
    const scenario: ScenarioInput = {
      slug: "smsf-only",
      scoring_weights: { asx_fee_value: -1 },
      required_attrs: ["smsf_support", "chess_sponsored"],
    };
    const r = rankBrokersForScenario(scenario, BROKERS);
    // Defunct fails smsf_support — already filtered. All three
    // active brokers support both.
    expect(r).toHaveLength(3);
    expect(r.every((s) => s.broker.smsf_support === true)).toBe(true);
  });

  it("drops brokers missing a required_attr even if active", () => {
    const scenario: ScenarioInput = {
      slug: "needs-custom-attr",
      scoring_weights: { asx_fee_value: -1 },
      required_attrs: ["made_up_attr"],
    };
    const r = rankBrokersForScenario(scenario, BROKERS);
    expect(r).toHaveLength(0);
  });
});

describe("rankBrokersForScenario — scoring", () => {
  it("ranks by lowest ASX fee when the weight is -1 on asx_fee_value", () => {
    const scenario: ScenarioInput = {
      slug: "cheapest-asx",
      scoring_weights: { asx_fee_value: -1 },
    };
    const r = rankBrokersForScenario(scenario, BROKERS);
    // CMC (0) > Stake (3) > Pearler (6.5)
    expect(r[0].broker.slug).toBe("cmc");
    expect(r[1].broker.slug).toBe("stake");
    expect(r[2].broker.slug).toBe("pearler");
  });

  it("normalises best to 100 and worst to a floor of 40", () => {
    const scenario: ScenarioInput = {
      slug: "normalised",
      scoring_weights: { asx_fee_value: -1 },
    };
    const r = rankBrokersForScenario(scenario, BROKERS);
    expect(r[0].score).toBe(100);
    expect(r[r.length - 1].score).toBeGreaterThanOrEqual(40);
  });

  it("ties get arbitrary but stable order", () => {
    const all: BrokerForScoring[] = [
      { id: 1, slug: "a", name: "A", status: "active", asx_fee_value: 5 },
      { id: 2, slug: "b", name: "B", status: "active", asx_fee_value: 5 },
    ];
    const r = rankBrokersForScenario(
      { slug: "tied", scoring_weights: { asx_fee_value: -1 } },
      all,
    );
    expect(r).toHaveLength(2);
    // All tied → both get 100 because spread is 0
    expect(r[0].score).toBe(100);
    expect(r[1].score).toBe(100);
  });

  it("returns empty list when no brokers pass filters", () => {
    const r = rankBrokersForScenario(
      {
        slug: "impossible",
        scoring_weights: { asx_fee_value: -1 },
        required_attrs: ["imaginary_thing"],
      },
      BROKERS,
    );
    expect(r).toHaveLength(0);
  });
});

describe("rankBrokersForScenario — breakdown", () => {
  it("includes every weight in the breakdown", () => {
    const scenario: ScenarioInput = {
      slug: "multi",
      scoring_weights: {
        chess_sponsored: 0.5,
        smsf_support: 0.3,
        asx_fee_value: -0.2,
      },
    };
    const r = rankBrokersForScenario(scenario, BROKERS);
    expect(r[0].breakdown).toHaveLength(3);
    expect(r[0].breakdown.map((b) => b.attr).sort()).toEqual([
      "asx_fee_value",
      "chess_sponsored",
      "smsf_support",
    ]);
  });

  it("raw numeric values come through in the breakdown", () => {
    const r = rankBrokersForScenario(
      { slug: "probe", scoring_weights: { asx_fee_value: -1 } },
      BROKERS,
    );
    const stake = r.find((s) => s.broker.slug === "stake");
    expect(stake).toBeTruthy();
    const asxLine = stake!.breakdown.find((b) => b.attr === "asx_fee_value");
    expect(asxLine?.rawValue).toBe(3);
  });

  it("handles missing data gracefully (contribution=0)", () => {
    const sparse: BrokerForScoring[] = [
      {
        id: 1,
        slug: "sparse",
        name: "Sparse",
        status: "active",
        asx_fee_value: 5,
        // no us_fee_value
      },
    ];
    const r = rankBrokersForScenario(
      {
        slug: "probe",
        scoring_weights: { asx_fee_value: -1, us_fee_value: -1 },
      },
      sparse,
    );
    const breakdown = r[0].breakdown;
    const usLine = breakdown.find((b) => b.attr === "us_fee_value");
    expect(usLine?.rawValue).toBeNull();
    expect(usLine?.contribution).toBe(0);
  });
});
