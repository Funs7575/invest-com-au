import { describe, it, expect } from "vitest";
import { buildWealthStack, type StackAnswers } from "@/lib/quiz-stack";
import { SUPER_WARNING_SHORT, CRYPTO_WARNING } from "@/lib/compliance";
import type { Broker, PlatformType } from "@/lib/types";

// Minimal mock broker factory — mirrors __tests__/lib/quiz-scoring.test.ts.
const mockBroker = (overrides: Partial<Broker>): Broker =>
  ({
    id: 1,
    name: "Test Broker",
    slug: "test",
    color: "#000",
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    deal: false,
    editors_pick: false,
    status: "active",
    rating: 4,
    platform_type: "share_broker",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  }) as Broker;

const product = (
  slug: string,
  platform_type: PlatformType,
  rating: number,
  extra: Partial<Broker> = {},
): Broker =>
  mockBroker({ slug, name: slug, platform_type, rating, ...extra });

// A representative pool covering every category the stack reads.
const POOL: Broker[] = [
  product("cmc", "share_broker", 4.6, { asx_fee_value: 0 }),
  product("commsec", "share_broker", 4.2),
  product("aussuper", "super_fund", 4.5),
  product("hostplus", "super_fund", 4.7),
  product("ubank", "savings_account", 4.4),
  product("td-12mo", "term_deposit", 4.1),
  product("stockspot", "robo_advisor", 4.6),
];

describe("buildWealthStack", () => {
  it("always includes a broker pick and chooses the highest-rated share broker", () => {
    const stack = buildWealthStack(POOL, { goal: "grow" });
    const broker = stack.find((p) => p.category === "broker");
    expect(broker).toBeDefined();
    expect(broker?.broker.slug).toBe("cmc"); // 4.6 beats commsec 4.2
  });

  it("gates super to retirement/safety/high-amount answers", () => {
    const noSuper = buildWealthStack(POOL, { goal: "grow", amount: "small" });
    expect(noSuper.some((p) => p.category === "super")).toBe(false);

    const withSuper = buildWealthStack(POOL, { goal: "super" });
    const superPick = withSuper.find((p) => p.category === "super");
    expect(superPick?.broker.slug).toBe("hostplus"); // 4.7 top super fund
    expect(superPick?.disclaimer).toBe(SUPER_WARNING_SHORT);
  });

  it("includes super on a high amount even for a non-retirement goal", () => {
    const stack = buildWealthStack(POOL, { goal: "grow", amount: "whale" });
    expect(stack.some((p) => p.category === "super")).toBe(true);
  });

  it("gates savings to DIY mode or a meaningful amount", () => {
    expect(
      buildWealthStack(POOL, { goal: "grow", amount: "small" }).some(
        (p) => p.category === "savings",
      ),
    ).toBe(false);

    const diy = buildWealthStack(POOL, { goal: "grow", mode: "diy" });
    expect(diy.some((p) => p.category === "savings")).toBe(true);

    const meaningful = buildWealthStack(POOL, { goal: "grow", amount: "medium" });
    const savings = meaningful.find((p) => p.category === "savings");
    expect(savings?.broker.slug).toBe("ubank"); // 4.4 beats td 4.1
  });

  it("gates robo to automate/simple/hands-free/beginner answers", () => {
    expect(
      buildWealthStack(POOL, { goal: "grow", experience: "pro" }).some(
        (p) => p.category === "robo",
      ),
    ).toBe(false);

    const automate = buildWealthStack(POOL, { goal: "automate" });
    expect(automate.find((p) => p.category === "robo")?.broker.slug).toBe(
      "stockspot",
    );
  });

  it("returns the stack in canonical order: broker, super, savings, robo", () => {
    const stack = buildWealthStack(POOL, {
      goal: "super",
      mode: "diy",
      experience: "beginner",
      amount: "large",
    });
    expect(stack.map((p) => p.category)).toEqual([
      "broker",
      "super",
      "savings",
      "robo",
    ]);
  });

  it("omits a category when no active product of that type exists", () => {
    const noSuperPool = POOL.filter((b) => b.platform_type !== "super_fund");
    const stack = buildWealthStack(noSuperPool, { goal: "super" });
    expect(stack.some((p) => p.category === "super")).toBe(false);
  });

  it("ignores inactive products", () => {
    const pool = [
      product("cmc", "share_broker", 4.6),
      product("dead-super", "super_fund", 4.9, { status: "inactive" }),
      product("live-super", "super_fund", 4.0),
    ];
    const stack = buildWealthStack(pool, { goal: "super" });
    expect(stack.find((p) => p.category === "super")?.broker.slug).toBe(
      "live-super",
    );
  });

  it("prefers a sponsored product within 0.5 rating of the top organic pick", () => {
    const pool = [
      product("organic-super", "super_fund", 4.6),
      product("sponsored-super", "super_fund", 4.3, {
        sponsorship_tier: "featured_partner",
      }),
    ];
    const stack = buildWealthStack(pool, { goal: "super" });
    expect(stack.find((p) => p.category === "super")?.broker.slug).toBe(
      "sponsored-super",
    );
  });

  it("does NOT boost a sponsored product more than 0.5 rating below the top", () => {
    const pool = [
      product("organic-super", "super_fund", 4.9),
      product("sponsored-super", "super_fund", 4.0, {
        sponsorship_tier: "featured_partner",
      }),
    ];
    const stack = buildWealthStack(pool, { goal: "super" });
    expect(stack.find((p) => p.category === "super")?.broker.slug).toBe(
      "organic-super",
    );
  });

  it("attaches the crypto warning to a crypto-flagged robo pick", () => {
    const pool = [
      product("crypto-robo", "robo_advisor", 4.5, { is_crypto: true }),
    ];
    const stack = buildWealthStack(pool, { goal: "automate" });
    expect(stack.find((p) => p.category === "robo")?.disclaimer).toBe(
      CRYPTO_WARNING,
    );
  });

  it("does not recommend the same product slug across two categories", () => {
    // A product tagged super_fund cannot also fill the robo slot, but guard
    // against accidental dupes if a product matched multiple pools.
    const pool = [
      product("multi", "robo_advisor", 4.8),
      product("super", "super_fund", 4.2),
    ];
    const stack = buildWealthStack(pool, {
      goal: "automate",
      amount: "whale",
    });
    const slugs = stack.map((p) => p.broker.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
