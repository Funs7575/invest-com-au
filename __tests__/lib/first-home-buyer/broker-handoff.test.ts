import { describe, it, expect } from "vitest";
import {
  FHB_MORTGAGE_BROKER_SPECIALTY,
  firstHomeBuyerBrokerDirectoryUrl,
} from "@/lib/first-home-buyer/broker-handoff";
import { SPECIALTIES_BY_TYPE } from "@/lib/advisor-specialties";

describe("first-home-buyer broker handoff", () => {
  it("uses a specialty that actually exists for mortgage brokers", () => {
    // Drift guard: the directory filters with an exact specialties.includes()
    // check, so this label must stay in the real mortgage_broker specialty set.
    expect(SPECIALTIES_BY_TYPE.mortgage_broker).toContain(
      FHB_MORTGAGE_BROKER_SPECIALTY,
    );
  });

  it("deep-links to the mortgage-broker directory pre-filtered to FHB specialists", () => {
    expect(firstHomeBuyerBrokerDirectoryUrl()).toBe(
      "/advisors/mortgage-brokers?specialty=First+Home+Buyers",
    );
  });

  it("encodes a specialty value the directory can round-trip back", () => {
    const url = new URL(
      firstHomeBuyerBrokerDirectoryUrl(),
      "https://invest.com.au",
    );
    expect(url.pathname).toBe("/advisors/mortgage-brokers");
    expect(url.searchParams.get("specialty")).toBe(
      FHB_MORTGAGE_BROKER_SPECIALTY,
    );
  });
});
