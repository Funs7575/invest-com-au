import { describe, expect, it } from "vitest";

import type { Broker } from "@/lib/types";
import { buildWealthStack, kindsForGoal, STACK_KINDS } from "@/lib/wealth-stack";

function makeBroker(overrides: Partial<Broker> & Pick<Broker, "slug" | "name">): Broker {
  return {
    id: 0,
    color: "#000",
    icon: "",
    tagline: "",
    asx_fee: "",
    us_fee: "",
    fx_rate: 0,
    chess_sponsored: false,
    inactivity_fee: "",
    payment_methods: [],
    smsf_support: false,
    is_crypto: false,
    min_deposit: "",
    platforms: [],
    pros: [],
    cons: [],
    affiliate_url: "",
    rating: 4.5,
    layer: 1,
    deal: "",
    editors_pick: false,
    status: "active",
    ...overrides,
  } as unknown as Broker;
}

function flatWeights(slug: string, base = 10) {
  return {
    [slug]: {
      beginner: base,
      low_fee: base,
      us_shares: base,
      smsf: base,
      crypto: base,
      advanced: base,
      property: base,
      robo: base,
    },
  };
}

describe("STACK_KINDS", () => {
  it("includes the 5 canonical product kinds", () => {
    expect(STACK_KINDS).toEqual([
      "share_broker",
      "super_fund",
      "savings_account",
      "crypto_exchange",
      "robo_advisor",
    ]);
  });
});

describe("kindsForGoal", () => {
  it("returns a balanced starter stack for an empty/unknown goal", () => {
    expect(kindsForGoal(undefined)).toEqual(["share_broker", "super_fund", "savings_account"]);
    expect(kindsForGoal(null)).toEqual(["share_broker", "super_fund", "savings_account"]);
    expect(kindsForGoal("unknown")).toEqual(["share_broker", "super_fund", "savings_account"]);
  });

  it("leads with broker for trade goals", () => {
    expect(kindsForGoal("trade")[0]).toBe("share_broker");
  });

  it("leads with crypto for crypto goals", () => {
    expect(kindsForGoal("crypto")[0]).toBe("crypto_exchange");
  });

  it("leads with savings for property goals (deposit-first)", () => {
    expect(kindsForGoal("property")[0]).toBe("savings_account");
  });

  it("returns single-kind stack for super-only", () => {
    expect(kindsForGoal("super")).toEqual(["super_fund"]);
  });

  it("leads with robo for automate goals", () => {
    expect(kindsForGoal("automate")[0]).toBe("robo_advisor");
  });
});

describe("buildWealthStack", () => {
  const stackId = "stack_test_1";

  it("returns an empty stack when no per-kind slices are supplied", () => {
    const stack = buildWealthStack({
      answers: ["grow"],
      perKind: {},
      stackId,
    });
    expect(stack.components).toEqual([]);
    expect(stack.stackId).toBe(stackId);
  });

  it("returns a single-kind stack when only one kind has products", () => {
    const stack = buildWealthStack({
      answers: ["super"],
      goal: "super",
      perKind: {
        super_fund: {
          brokers: [makeBroker({ slug: "aware", name: "Aware Super" })],
          weights: flatWeights("aware"),
        },
      },
      stackId,
    });
    expect(stack.components).toHaveLength(1);
    expect(stack.components[0]?.kind).toBe("super_fund");
    expect(stack.components[0]?.slug).toBe("aware");
    expect(stack.components[0]?.fitness).toBe(1.0);
  });

  it("returns multiple components in goal-order with decreasing fitness", () => {
    const stack = buildWealthStack({
      answers: ["grow"],
      goal: "grow",
      perKind: {
        share_broker: {
          brokers: [makeBroker({ slug: "stake", name: "Stake" })],
          weights: flatWeights("stake"),
        },
        super_fund: {
          brokers: [makeBroker({ slug: "aware", name: "Aware Super" })],
          weights: flatWeights("aware"),
        },
        savings_account: {
          brokers: [makeBroker({ slug: "macquarie", name: "Macquarie" })],
          weights: flatWeights("macquarie"),
        },
      },
      stackId,
    });
    expect(stack.components.map((c) => c.kind)).toEqual([
      "share_broker",
      "super_fund",
      "savings_account",
    ]);
    expect(stack.components[0]?.fitness).toBe(1.0);
    expect(stack.components[1]?.fitness).toBe(0.7);
    expect(stack.components[2]?.fitness).toBe(0.5);
  });

  it("skips kinds with no products without breaking the rest of the stack", () => {
    const stack = buildWealthStack({
      answers: ["grow"],
      goal: "grow",
      perKind: {
        share_broker: {
          brokers: [makeBroker({ slug: "stake", name: "Stake" })],
          weights: flatWeights("stake"),
        },
        // super_fund missing — should skip
        savings_account: {
          brokers: [makeBroker({ slug: "macquarie", name: "Macquarie" })],
          weights: flatWeights("macquarie"),
        },
      },
      stackId,
    });
    expect(stack.components.map((c) => c.kind)).toEqual(["share_broker", "savings_account"]);
    // Fitness reflects the GOAL ORDER position, not the compacted index —
    // a missing super_fund shouldn't make savings_account look like a
    // headline pick when the user's stated goal said it was third-tier.
    expect(stack.components[0]?.fitness).toBe(1.0);
    expect(stack.components[1]?.fitness).toBe(0.5);
  });

  it("picks the top-scoring product within each kind", () => {
    const stack = buildWealthStack({
      answers: ["grow"],
      goal: "grow",
      perKind: {
        share_broker: {
          brokers: [
            makeBroker({ slug: "weaker", name: "Weaker", rating: 3.0 }),
            makeBroker({ slug: "stronger", name: "Stronger", rating: 5.0 }),
          ],
          weights: { ...flatWeights("weaker", 10), ...flatWeights("stronger", 12) },
        },
      },
      stackId,
    });
    expect(stack.components[0]?.slug).toBe("stronger");
  });

  it("preserves the supplied stackId on the output", () => {
    const stack = buildWealthStack({
      answers: ["grow"],
      perKind: {},
      stackId: "stack_abc_42",
    });
    expect(stack.stackId).toBe("stack_abc_42");
  });
});
