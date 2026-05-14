import { describe, it, expect } from "vitest";
import { defaultRouteForIntent } from "@/lib/getmatched/intents";
import type { IntentDef } from "@/lib/getmatched/types";

const INTENTS: IntentDef[] = [
  {
    id: 1,
    slug: "smsf_property",
    label: "Invest through SMSF",
    description: null,
    default_route: "expert_team",
    default_brief_template: "smsf_property",
    risk_level: "medium",
    enabled: true,
    sort_order: 30,
    meta: {},
  },
  {
    id: 2,
    slug: "compare_platform",
    label: "Compare investing platforms",
    description: null,
    default_route: "compare",
    default_brief_template: null,
    risk_level: "low",
    enabled: true,
    sort_order: 10,
    meta: {},
  },
];

describe("defaultRouteForIntent", () => {
  it("returns the intent's default route", () => {
    expect(defaultRouteForIntent("smsf_property", INTENTS)).toBe("expert_team");
    expect(defaultRouteForIntent("compare_platform", INTENTS)).toBe("compare");
  });

  it("falls back to guide when intent is unknown", () => {
    expect(defaultRouteForIntent("unknown_intent", INTENTS)).toBe("guide");
  });

  it("falls back to guide when intent is null", () => {
    expect(defaultRouteForIntent(null, INTENTS)).toBe("guide");
  });
});
