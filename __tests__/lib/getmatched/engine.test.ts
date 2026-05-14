import { describe, it, expect } from "vitest";
import {
  buildChecklist,
  deriveRoute,
  goalLabel,
} from "@/lib/getmatched/engine";
import type { IntentDef, ResultTemplate } from "@/lib/getmatched/types";

const INTENTS: IntentDef[] = [
  {
    id: 1,
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
  {
    id: 2,
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
    id: 3,
    slug: "not_sure",
    label: "Not sure yet",
    description: null,
    default_route: "guide",
    default_brief_template: null,
    risk_level: "low",
    enabled: true,
    sort_order: 999,
    meta: {},
  },
];

describe("deriveRoute", () => {
  it("falls back to the intent default when no help_preference", () => {
    const result = deriveRoute({ intent: "smsf_property" }, INTENTS);
    expect(result.intent).toBe("smsf_property");
    expect(result.route).toBe("expert_team");
  });

  it("respects an explicit help_preference override", () => {
    const result = deriveRoute(
      { intent: "smsf_property", help_preference: "compare" },
      INTENTS,
    );
    expect(result.route).toBe("compare");
  });

  it("treats help_preference=not_sure as no override", () => {
    const result = deriveRoute(
      { intent: "smsf_property", help_preference: "not_sure" },
      INTENTS,
    );
    expect(result.route).toBe("expert_team");
  });

  it("falls back to guide when no intent is set", () => {
    const result = deriveRoute({}, INTENTS);
    expect(result.intent).toBe(null);
    expect(result.route).toBe("guide");
  });

  it("derives a secondary intent from help_needed", () => {
    const result = deriveRoute(
      {
        intent: "smsf_property",
        help_needed: ["lending"],
      },
      INTENTS,
    );
    expect(result.secondary).toBe("mortgage_help");
  });
});

describe("buildChecklist", () => {
  it("clones items with done=false", () => {
    const template = {
      checklist: [{ label: "Step 1" }, { label: "Step 2", href: "/x" }],
    } as unknown as ResultTemplate;
    expect(buildChecklist(template)).toEqual([
      { label: "Step 1", done: false },
      { label: "Step 2", href: "/x", done: false },
    ]);
  });
});

describe("goalLabel", () => {
  it("returns the intent label", () => {
    expect(goalLabel("smsf_property", INTENTS)).toBe("Invest through SMSF");
  });
  it("returns null for unknown intent", () => {
    expect(goalLabel(null, INTENTS)).toBe(null);
  });
});
