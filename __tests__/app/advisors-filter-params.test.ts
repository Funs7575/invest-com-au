import { describe, it, expect } from "vitest";
import { resolveDirectoryFilters } from "@/app/advisors/filter-params";
import {
  FHB_MORTGAGE_BROKER_SPECIALTY,
  firstHomeBuyerBrokerDirectoryUrl,
} from "@/lib/first-home-buyer/broker-handoff";

const validType = (k: string) =>
  ["mortgage_broker", "financial_planner", "buyers_agent"].includes(k);

function parse(qs: string, routeScoped: boolean) {
  return resolveDirectoryFilters(new URLSearchParams(qs), {
    routeScoped,
    validType,
  });
}

describe("resolveDirectoryFilters", () => {
  it("returns an empty object for no params", () => {
    expect(parse("", false)).toEqual({});
  });

  it("reads a valid provider_type", () => {
    expect(parse("provider_type=firm", false).providerType).toBe("firm");
    expect(parse("provider_type=bogus", false).providerType).toBeUndefined();
  });

  it("honours the specialty param even when route-scoped", () => {
    // The route fixes the type (e.g. /advisors/mortgage-brokers), but
    // specialty is orthogonal — it must still pre-select the filter.
    const result = parse("specialty=First Home Buyers", true);
    expect(result.specialties).toEqual(["First Home Buyers"]);
  });

  it("splits, trims and drops empty specialty values", () => {
    expect(parse("specialty=First Home Buyers,, Refinancing ", false).specialties).toEqual([
      "First Home Buyers",
      "Refinancing",
    ]);
    expect(parse("specialty=", false).specialties).toBeUndefined();
  });

  it("ignores type/state params when route-scoped", () => {
    const result = parse("type=financial_planner&state=NSW&sort=name", true);
    expect(result.types).toBeUndefined();
    expect(result.state).toBeUndefined();
    expect(result.sort).toBeUndefined();
  });

  it("reads type/state/sort/q/language when not route-scoped", () => {
    const result = parse(
      "type=mortgage_broker,buyers_agent&state=VIC&sort=name&q=smith&language=Mandarin",
      false,
    );
    expect(result.types).toEqual(["mortgage_broker", "buyers_agent"]);
    expect(result.state).toBe("VIC");
    expect(result.sort).toBe("name");
    expect(result.search).toBe("smith");
    expect(result.language).toBe("Mandarin");
  });

  it("filters out unknown type keys and ignores invalid states", () => {
    expect(parse("type=not_a_type", false).types).toBeUndefined();
    expect(parse("type=mortgage_broker,not_a_type", false).types).toEqual([
      "mortgage_broker",
    ]);
    expect(parse("state=ZZ", false).state).toBeUndefined();
  });

  it("resolves the First Home Buyer broker deep-link to the FHB specialty", () => {
    const qs = firstHomeBuyerBrokerDirectoryUrl().split("?")[1] ?? "";
    const result = resolveDirectoryFilters(new URLSearchParams(qs), {
      routeScoped: true,
      validType,
    });
    expect(result.specialties).toEqual([FHB_MORTGAGE_BROKER_SPECIALTY]);
  });
});
