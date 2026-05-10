import { describe, it, expect } from "vitest";
import { buildSwitchingCoach, type BrokerForCoach } from "@/lib/holdings/switching-coach";

const brokers: BrokerForCoach[] = [
  { slug: "stake", name: "Stake", asx_fee_value: 3 },
  { slug: "selfwealth", name: "SelfWealth", asx_fee_value: 9.5 },
  { slug: "commsec", name: "CommSec", asx_fee_value: 19.95 },
  { slug: "no-fee-listed", name: "NoFee", asx_fee_value: null }, // ignored
];

describe("buildSwitchingCoach", () => {
  it("returns a tag-prompt when the user hasn't tagged any broker", () => {
    const r = buildSwitchingCoach({ currentBrokerSlugs: [], tradesPerYear: 20, brokers });
    expect(r.currentBroker).toBeNull();
    expect(r.summary).toMatch(/Tag a broker/);
  });

  it("returns frequency-prompt when tradesPerYear is 0", () => {
    const r = buildSwitchingCoach({ currentBrokerSlugs: ["commsec"], tradesPerYear: 0, brokers });
    expect(r.summary).toMatch(/trade frequency/);
  });

  it("computes saving when current broker is more expensive than cheapest", () => {
    const r = buildSwitchingCoach({ currentBrokerSlugs: ["commsec"], tradesPerYear: 20, brokers });
    expect(r.currentBroker?.slug).toBe("commsec");
    expect(r.cheapest?.slug).toBe("stake");
    // commsec: $19.95 × 20 = $399 = 39900 cents
    expect(r.currentBroker?.estCostCents).toBe(39900);
    // stake: $3 × 20 = $60 = 6000 cents
    expect(r.cheapest?.estCostCents).toBe(6000);
    expect(r.estSavingCents).toBe(33900);
    expect(r.summary).toMatch(/saving ~/);
  });

  it("returns 0 saving when current broker is already the cheapest", () => {
    const r = buildSwitchingCoach({ currentBrokerSlugs: ["stake"], tradesPerYear: 20, brokers });
    expect(r.estSavingCents).toBe(0);
    expect(r.summary).toMatch(/lowest-fee match/);
  });

  it("ignores brokers without a usable asx_fee_value", () => {
    const r = buildSwitchingCoach({ currentBrokerSlugs: ["no-fee-listed"], tradesPerYear: 10, brokers });
    expect(r.currentBroker).toBeNull(); // user's tagged broker has null fee → not in the eligible set
  });

  it("uses the cheapest of multiple tagged current brokers (generous comparison)", () => {
    // User holds stuff at both selfwealth and commsec; we compare against
    // their cheapest (selfwealth) so the saving is not artificially inflated.
    const r = buildSwitchingCoach({ currentBrokerSlugs: ["commsec","selfwealth"], tradesPerYear: 50, brokers });
    expect(r.currentBroker?.slug).toBe("selfwealth");
    expect(r.cheapest?.slug).toBe("stake");
  });
});
